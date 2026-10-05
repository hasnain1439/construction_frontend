"use client";

import { History, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useGetMaterialsQuery,
  useGetSupplierQuery,
  useGetSupplierRatesQuery,
  useSetSupplierActiveMutation,
  useSetSupplierRatesMutation,
} from "@/api/services/masterData.api";
import type { SupplierDetail } from "@/api/types";
import { DataTable } from "@/components/common/DataTable";
import { InfoList } from "@/components/common/InfoList";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { RequireAccess } from "@/components/common/RequireAccess";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Combobox } from "@/components/forms/ComboboxField";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { ActiveToggle } from "../components/ActiveToggle";
import { SupplierSlideOver } from "../components/SupplierSlideOver";

interface RateRow {
  materialId: string;
  name: string;
  unit: string;
  ratePaisa: string | null;
  original: string | null;
  effectiveFrom?: string;
}

/** Agreed rates: edit existing rows, add materials, save only what changed. */
function AgreedRates({ supplier, editable }: { supplier: SupplierDetail; editable: boolean }) {
  const materials = useGetMaterialsQuery(undefined, { skip: !editable });
  const [save, { isLoading }] = useSetSupplierRatesMutation();
  const run = useMutationToast();
  const initial = useMemo<RateRow[]>(
    () =>
      supplier.rates.map((r) => ({
        materialId: r.material.id,
        name: r.material.name,
        unit: r.material.unit,
        ratePaisa: r.ratePaisa,
        original: r.ratePaisa,
        effectiveFrom: r.effectiveFrom,
      })),
    [supplier.rates],
  );
  const [rows, setRows] = useState<RateRow[]>(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setRows(initial);
  }
  const [adding, setAdding] = useState<string | null>(null);

  const changed = rows.filter((r) => r.ratePaisa && r.ratePaisa !== r.original);
  const options = (materials.data ?? [])
    .filter((m) => !rows.some((r) => r.materialId === m.id))
    .map((m) => ({ value: m.id, label: m.name, description: `${m.group.name} · per ${m.unit}` }));

  const addRow = (materialId: string | null) => {
    const material = materials.data?.find((m) => m.id === materialId);
    if (!material) return;
    setRows((current) => [...current, { materialId: material.id, name: material.name, unit: material.unit, ratePaisa: null, original: null }]);
    setAdding(null);
  };

  const onSave = async () => {
    const ok = await run(
      () => save({ id: supplier.id, body: { rates: changed.map((r) => ({ materialId: r.materialId, ratePaisa: r.ratePaisa as string })) } }).unwrap(),
      { success: `${changed.length} rate${changed.length === 1 ? "" : "s"} saved` },
    );
    if (ok !== undefined) setRows((current) => current.map((r) => ({ ...r, original: r.ratePaisa })));
  };

  return (
    <SectionCard
      title="Agreed rates"
      description="Rates you've agreed with this supplier. New purchases start from these."
      flush
      actions={
        editable ? (
          <Button size="sm" disabled={!changed.length || isLoading} onClick={() => void onSave()}>
            <Save data-icon="inline-start" />
            Save rates{changed.length ? ` (${changed.length})` : ""}
          </Button>
        ) : null
      }
    >
      <DataTable
        rows={rows}
        getRowId={(r) => r.materialId}
        clientPageSize={0}
        empty={{ title: "No agreed rates yet", description: editable ? "Add the materials you buy from this supplier." : undefined }}
        columns={[
          { id: "material", header: "Material", cell: (r) => <span className="font-medium">{r.name}</span>, sortValue: (r) => r.name },
          { id: "unit", header: "Unit", cell: (r) => r.unit },
          {
            id: "rate",
            header: "Rate",
            align: "right",
            className: "w-56",
            cell: (r) =>
              editable ? (
                <MoneyInput
                  aria-label={`${r.name} rate`}
                  value={r.ratePaisa}
                  onChange={(v) => setRows((current) => current.map((x) => (x.materialId === r.materialId ? { ...x, ratePaisa: v } : x)))}
                  suffix={`/ ${r.unit}`}
                />
              ) : (
                <MoneyText paisa={r.ratePaisa} />
              ),
          },
          {
            id: "since",
            header: "Since",
            cell: (r) => (r.effectiveFrom ? formatDate(r.effectiveFrom) : <StatusBadge tone="warning" label="New" />),
          },
          {
            id: "remove",
            header: <span className="sr-only">Remove</span>,
            align: "right",
            hidden: !editable,
            cell: (r) =>
              r.original === null ? (
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${r.name}`} onClick={() => setRows((c) => c.filter((x) => x.materialId !== r.materialId))}>
                  <Trash2 />
                </Button>
              ) : null,
          },
        ]}
      />
      {editable ? (
        <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
          <div className="w-72">
            <Combobox value={adding} onChange={(v) => addRow(v as string | null)} options={options} loading={materials.isLoading} placeholder="Add a material…" />
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Plus className="size-3.5" aria-hidden />
            Pick a material, then enter its rate.
          </span>
        </div>
      ) : null}
    </SectionCard>
  );
}

function RateHistory({ supplierId }: { supplierId: string }) {
  const { data, isLoading, error, refetch } = useGetSupplierRatesQuery(supplierId);
  return (
    <SectionCard title="Rate history" flush>
      <DataTable
        rows={data?.history}
        loading={isLoading}
        error={error}
        onRetry={refetch}
        getRowId={(h) => h.id}
        clientPageSize={10}
        empty={{ title: "No rate changes yet", icon: History }}
        columns={[
          { id: "date", header: "Date", cell: (h) => formatDateTime(h.effectiveFrom), sortValue: (h) => h.effectiveFrom },
          { id: "material", header: "Material", cell: (h) => h.material.name, sortValue: (h) => h.material.name },
          { id: "rate", header: "Rate", align: "right", cell: (h) => <MoneyText paisa={h.ratePaisa} /> },
          { id: "by", header: "Changed by", cell: (h) => h.changedBy?.name ?? "—" },
        ]}
      />
    </SectionCard>
  );
}

function SupplierDetailBody({ supplierId }: { supplierId: string }) {
  const readOnly = useReadOnly();
  const canEdit = useCan({ roles: ["THEKEDAR", "PM"] }) && !readOnly;
  const isOwner = useCan({ roles: ["THEKEDAR"] }) && !readOnly;
  const query = useGetSupplierQuery(supplierId);
  const [editOpen, setEditOpen] = useState(false);
  const [setActive, { isLoading: toggling }] = useSetSupplierActiveMutation();
  const run = useMutationToast();

  return (
    <QueryState query={query}>
      {(supplier) => (
        <>
          <PageHeader
            title={supplier.name}
            meta={<StatusBadge domain="active" value={supplier.isActive} />}
            breadcrumbs={[{ label: "Suppliers & Stock" }, { label: "All Suppliers", href: "/suppliers-stock/suppliers" }, { label: supplier.name }]}
            actions={
              <>
                {isOwner ? (
                  <ActiveToggle
                    name={supplier.name}
                    isActive={supplier.isActive}
                    size="default"
                    loading={toggling}
                    consequence="They won't appear in new purchases. History and balances are kept."
                    onToggle={(active) => run(() => setActive({ id: supplier.id, active }).unwrap(), { success: `${supplier.name} ${active ? "activated" : "deactivated"}` })}
                  />
                ) : null}
                {canEdit ? (
                  <Button variant="outline" onClick={() => setEditOpen(true)}>
                    <Pencil data-icon="inline-start" />
                    Edit
                  </Button>
                ) : null}
              </>
            }
          />
          <SectionCard title="Details">
            <InfoList
              columns={3}
              items={[
                { label: "Category", value: supplier.category },
                { label: "Phone", value: formatPhone(supplier.phone) },
                { label: "City", value: supplier.city },
                { label: "Address", value: supplier.address },
                { label: "NTN", value: supplier.ntn },
                { label: "Added", value: formatDate(supplier.createdAt) },
                { label: "Notes", value: supplier.notes },
              ]}
            />
          </SectionCard>
          <AgreedRates supplier={supplier} editable={isOwner} />
          <RateHistory supplierId={supplier.id} />
          <SupplierSlideOver open={editOpen} supplier={supplier} onOpenChange={setEditOpen} />
        </>
      )}
    </QueryState>
  );
}

export function SupplierDetailView({ supplierId }: { supplierId: string }) {
  return (
    <RequireAccess roles={["THEKEDAR", "PM"]}>
      <SupplierDetailBody supplierId={supplierId} />
    </RequireAccess>
  );
}
