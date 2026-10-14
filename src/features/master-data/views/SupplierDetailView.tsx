"use client";

import { History, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
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
import { usePermissions } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { RequireAccess } from "@/components/common/RequireAccess";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Combobox } from "@/components/forms/ComboboxField";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupplierLedgerPanel, SupplierPaymentsPanel } from "@/features/procurement/views/SupplierMoneyViews";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useT } from "@/i18n/useT";
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
  const t = useT();
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
    .map((m) => ({ value: m.id, label: m.name, description: t("masterData.suppliers.perUnit", { group: m.group.name, unit: m.unit }) }));

  const addRow = (materialId: string | null) => {
    const material = materials.data?.find((m) => m.id === materialId);
    if (!material) return;
    setRows((current) => [...current, { materialId: material.id, name: material.name, unit: material.unit, ratePaisa: null, original: null }]);
    setAdding(null);
  };

  const onSave = async () => {
    const ok = await run(
      () => save({ id: supplier.id, body: { rates: changed.map((r) => ({ materialId: r.materialId, ratePaisa: r.ratePaisa as string })) } }).unwrap(),
      { success: changed.length === 1 ? t("masterData.common.oneRateSaved") : t("masterData.common.nRatesSaved", { n: changed.length }) },
    );
    if (ok !== undefined) setRows((current) => current.map((r) => ({ ...r, original: r.ratePaisa })));
  };

  return (
    <SectionCard
      title={t("masterData.suppliers.agreedRates")}
      description={t("masterData.suppliers.agreedRatesDesc")}
      flush
      actions={
        editable ? (
          <Button size="sm" disabled={!changed.length || isLoading} onClick={() => void onSave()}>
            <Save data-icon="inline-start" />
            {changed.length ? t("masterData.common.saveRatesCount", { n: changed.length }) : t("masterData.common.saveRates")}
          </Button>
        ) : null
      }
    >
      <DataTable
        rows={rows}
        getRowId={(r) => r.materialId}
        clientPageSize={0}
        empty={{ title: t("masterData.suppliers.noAgreedRates"), description: editable ? t("masterData.suppliers.noAgreedRatesDesc") : undefined }}
        columns={[
          { id: "material", header: t("field.material"), cell: (r) => <span className="font-medium">{r.name}</span>, sortValue: (r) => r.name },
          { id: "unit", header: t("field.unit"), cell: (r) => r.unit },
          {
            id: "rate",
            header: t("field.rate"),
            align: "right",
            className: "w-56",
            cell: (r) =>
              editable ? (
                <MoneyInput
                  aria-label={t("masterData.common.rateAria", { name: r.name })}
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
            header: t("masterData.suppliers.since"),
            cell: (r) => (r.effectiveFrom ? formatDate(r.effectiveFrom) : <StatusBadge tone="warning" label={t("masterData.suppliers.newBadge")} />),
          },
          {
            id: "remove",
            header: <span className="sr-only">{t("action.remove")}</span>,
            align: "right",
            hidden: !editable,
            cell: (r) =>
              r.original === null ? (
                <Button variant="ghost" size="icon-sm" aria-label={t("masterData.common.removeAria", { name: r.name })} onClick={() => setRows((c) => c.filter((x) => x.materialId !== r.materialId))}>
                  <Trash2 />
                </Button>
              ) : null,
          },
        ]}
      />
      {editable ? (
        <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
          <div className="w-72">
            <Combobox value={adding} onChange={(v) => addRow(v as string | null)} options={options} loading={materials.isLoading} placeholder={t("masterData.suppliers.addMaterial")} />
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Plus className="size-3.5" aria-hidden />
            {t("masterData.suppliers.pickHint")}
          </span>
        </div>
      ) : null}
    </SectionCard>
  );
}

function RateHistory({ supplierId }: { supplierId: string }) {
  const t = useT();
  const { data, isLoading, error, refetch } = useGetSupplierRatesQuery(supplierId);
  return (
    <SectionCard title={t("masterData.common.rateHistory")} flush>
      <DataTable
        rows={data?.history}
        loading={isLoading}
        error={error}
        onRetry={refetch}
        getRowId={(h) => h.id}
        clientPageSize={10}
        empty={{ title: t("masterData.suppliers.noRateChanges"), icon: History }}
        columns={[
          { id: "date", header: t("field.date"), cell: (h) => formatDateTime(h.effectiveFrom), sortValue: (h) => h.effectiveFrom },
          { id: "material", header: t("field.material"), cell: (h) => h.material.name, sortValue: (h) => h.material.name },
          { id: "rate", header: t("field.rate"), align: "right", cell: (h) => <MoneyText paisa={h.ratePaisa} /> },
          { id: "by", header: t("masterData.common.changedBy"), cell: (h) => h.changedBy?.name ?? "—" },
        ]}
      />
    </SectionCard>
  );
}

function SupplierDetailBody({ supplierId }: { supplierId: string }) {
  const t = useT();
  const readOnly = useReadOnly();
  const { can, canSee } = usePermissions();
  const canEdit = can("masterdata.supplier.edit") && !readOnly;
  const isOwner = can("masterdata.supplier.manage") && !readOnly;
  const seesLedger = can("procurement.ledger.view");
  const seesPayments = can("procurement.payment.view");
  const query = useGetSupplierQuery(supplierId);
  const [editOpen, setEditOpen] = useState(false);
  const seesRates = canSee("rates");
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") ?? "info");
  const [setActive, { isLoading: toggling }] = useSetSupplierActiveMutation();
  const run = useMutationToast();

  return (
    <QueryState query={query}>
      {(supplier) => (
        <>
          <PageHeader
            title={supplier.name}
            meta={<StatusBadge domain="active" value={supplier.isActive} />}
            breadcrumbs={[
              { label: t("crumb.suppliersStock") },
              { label: t("masterData.suppliers.title"), href: "/suppliers-stock/suppliers" },
              { label: supplier.name },
            ]}
            actions={
              <>
                {isOwner ? (
                  <ActiveToggle
                    name={supplier.name}
                    isActive={supplier.isActive}
                    size="default"
                    loading={toggling}
                    consequence={t("masterData.suppliers.consequence")}
                    onToggle={(active) => run(() => setActive({ id: supplier.id, active }).unwrap(), {
                        success: t(active ? "masterData.common.activated" : "masterData.common.deactivated", { name: supplier.name }),
                      })}
                  />
                ) : null}
                {canEdit ? (
                  <Button variant="outline" onClick={() => setEditOpen(true)}>
                    <Pencil data-icon="inline-start" />
                    {t("common.edit")}
                  </Button>
                ) : null}
              </>
            }
          />
          <Tabs value={tab} onValueChange={setTab} className="gap-5">
            <TabsList>
              <TabsTrigger value="info">{t("masterData.suppliers.tabInfo")}</TabsTrigger>
              <TabsTrigger value="rates">{t("masterData.suppliers.tabRates")}</TabsTrigger>
              {seesRates && seesLedger ? <TabsTrigger value="ledger">{t("masterData.suppliers.tabLedger")}</TabsTrigger> : null}
              {seesRates && seesPayments ? <TabsTrigger value="payments">{t("field.payments")}</TabsTrigger> : null}
            </TabsList>
            <TabsContent value="info" className="space-y-5">
              <SectionCard title={t("masterData.suppliers.details")}>
                <InfoList
                  columns={3}
                  items={[
                    { label: t("field.category"), value: supplier.category },
                    { label: t("field.phone"), value: supplier.phone ? <bdi dir="ltr">{formatPhone(supplier.phone)}</bdi> : null },
                    { label: t("field.city"), value: supplier.city },
                    { label: t("field.address"), value: supplier.address },
                    { label: t("field.ntn"), value: supplier.ntn ? <bdi dir="ltr">{supplier.ntn}</bdi> : null },
                    { label: t("masterData.common.colAdded"), value: formatDate(supplier.createdAt) },
                    ...(seesRates ? [{ label: t("masterData.suppliers.udhaarBalance"), value: <MoneyText paisa={supplier.udhaarBalancePaisa} className="font-semibold" /> }] : []),
                    { label: t("field.notes"), value: supplier.notes },
                  ]}
                />
              </SectionCard>
            </TabsContent>
            <TabsContent value="rates" className="space-y-5">
              <AgreedRates supplier={supplier} editable={isOwner} />
              <RateHistory supplierId={supplier.id} />
            </TabsContent>
            {seesRates ? (
              <TabsContent value="ledger">
                <SupplierLedgerPanel supplierId={supplier.id} />
              </TabsContent>
            ) : null}
            {seesRates ? (
              <TabsContent value="payments">
                <SupplierPaymentsPanel supplierId={supplier.id} />
              </TabsContent>
            ) : null}
          </Tabs>
          <SupplierSlideOver open={editOpen} supplier={supplier} onOpenChange={setEditOpen} />
        </>
      )}
    </QueryState>
  );
}

export function SupplierDetailView({ supplierId }: { supplierId: string }) {
  return (
    <RequireAccess permission="masterdata.supplier.view">
      <SupplierDetailBody supplierId={supplierId} />
    </RequireAccess>
  );
}
