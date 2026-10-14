"use client";

import { ImportButton } from "@/features/onboarding/components/ImportWizard";
import { DemoBadge } from "@/features/onboarding/components/DemoBadge";
import { Pencil, Plus, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGetSuppliersQuery, useSetSupplierActiveMutation } from "@/api/services/masterData.api";
import type { Supplier, SuppliersQuery } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan, usePermissions } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useSearchFlag } from "@/hooks/useSearchFlag";
import { useT } from "@/i18n/useT";
import { formatPhone } from "@/lib/phone";
import { AgeingText } from "@/features/procurement/views/SupplierMoneyViews";
import { activeToggleAction, useActiveToggleLabels } from "../components/ActiveToggle";
import { SupplierSlideOver } from "../components/SupplierSlideOver";

export function SuppliersView() {
  const router = useRouter();
  const readOnly = useReadOnly();
  const canCreate = useCan("masterdata.supplier.create") && !readOnly;
  const canEdit = useCan("masterdata.supplier.edit") && !readOnly;
  const canToggle = useCan("masterdata.supplier.manage") && !readOnly;
  const seesRates = usePermissions().canSee("rates");
  const list = useListState({ isActive: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetSuppliersQuery(list.query as SuppliersQuery);
  const [setActive, { isLoading: toggling }] = useSetSupplierActiveMutation();
  const [addOpen, setAddOpen] = useSearchFlag();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const run = useMutationToast();
  const t = useT();
  const toggleLabels = useActiveToggleLabels();

  const columns: Column<Supplier>[] = [
    {
      id: "name",
      header: t("field.supplier"),
      sortValue: (s) => s.name,
      cell: (s) => (
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {s.name}
            <DemoBadge isDemo={s.isDemo} />
          </p>
          {s.address ? <p className="truncate text-xs text-muted-foreground">{s.address}</p> : null}
        </div>
      ),
    },
    { id: "category", header: t("field.category"), cell: (s) => s.category ?? "—", sortValue: (s) => s.category ?? "" },
    { id: "phone", header: t("field.phone"), cell: (s) => <span className="tabular" dir="ltr">{formatPhone(s.phone)}</span> },
    { id: "city", header: t("field.city"), cell: (s) => s.city ?? "—", sortValue: (s) => s.city ?? "" },
    {
      id: "udhaar",
      header: t("masterData.suppliers.udhaar"),
      align: "right",
      hidden: !seesRates,
      sortValue: (s) => Number(s.udhaarBalancePaisa ?? 0),
      cell: (s) => <MoneyText paisa={s.udhaarBalancePaisa} className="font-medium" />,
    },
    { id: "age", header: t("masterData.suppliers.oldestUnpaid"), align: "right", hidden: !seesRates, sortValue: (s) => s.oldestUnpaidDays ?? -1, cell: (s) => <AgeingText days={s.oldestUnpaidDays} /> },
    { id: "status", header: t("field.status"), cell: (s) => <StatusBadge domain="active" value={s.isActive} /> },
    {
      ...ACTIONS_COLUMN,
      hidden: !canEdit && !canToggle,
      cell: (s) => (
        <RowActions
          name={s.name}
          actions={[
            { label: t("common.edit"), icon: Pencil, onSelect: () => setEditing(s) },
            {
              ...activeToggleAction({
                name: s.name,
                isActive: s.isActive,
                loading: toggling,
                labels: toggleLabels(s.name),
                consequence: t("masterData.suppliers.consequence"),
                onToggle: (active) =>
                  run(() => setActive({ id: s.id, active }).unwrap(), { success: t(active ? "masterData.common.activated" : "masterData.common.deactivated", { name: s.name }) }),
              }),
              hidden: !canToggle,
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("masterData.suppliers.title")}
        description={t("masterData.suppliers.description")}
        breadcrumbs={[{ label: t("crumb.suppliersStock") }, { label: t("masterData.suppliers.title") }]}
        actions={
          <>
            <ImportButton entity="suppliers" />
            {canCreate ? (
              <Button onClick={() => setAddOpen(true)}>
                <Plus data-icon="inline-start" />
                {t("masterData.suppliers.add")}
              </Button>
            ) : null}
          </>
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder={t("masterData.suppliers.search")} />
        <FilterSelect
          label={t("field.status")}
          value={list.filters.isActive}
          onChange={(v) => list.setFilter("isActive", v)}
          options={[
            { value: "true", label: t("common.active") },
            { value: "false", label: t("common.inactive") },
          ]}
        />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(s) => s.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          onRowClick={(s) => router.push(`/suppliers-stock/suppliers/${s.id}`)}
          empty={{ title: t("masterData.suppliers.emptyTitle"), description: t("masterData.suppliers.emptyDesc"), icon: Truck }}
          pagination={
            data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined
          }
        />
      </SectionCard>
      <SupplierSlideOver
        open={addOpen || Boolean(editing)}
        supplier={editing}
        onOpenChange={(o) => {
          if (o) return;
          setAddOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
}
