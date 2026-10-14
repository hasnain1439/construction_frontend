"use client";

import { Plus, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGetStockLocationsQuery } from "@/api/services/inventory.api";
import { useGetPurchasesQuery } from "@/api/services/procurement.api";
import type { PurchaseListRow, PurchasesQuery } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { LateSyncBadge } from "@/components/common/LateSyncBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useStatusT, useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { usePaymentModeOptions, useSupplierOptions } from "../options";

const PURCHASE_STATUSES = ["SAVED", "PENDING_RATE", "PENDING_RECEIPT", "RECEIVED", "RECEIVED_WITH_SHORTAGE"] as const;

export function PurchasesView() {
  const t = useT();
  const ts = useStatusT();
  const paymentModes = usePaymentModeOptions();
  const router = useRouter();
  const readOnly = useReadOnly();
  const canCreate = useCan("procurement.purchase.create") && !readOnly;
  const suppliers = useSupplierOptions();
  const list = useListState({ supplierId: "", locationId: "", paymentMode: "", status: "", from: "", to: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetPurchasesQuery(list.query as PurchasesQuery);
  const locations = useGetStockLocationsQuery();
  const locationOptions = (locations.data ?? []).filter((l) => l.type !== "TRANSIT").map((l) => ({ value: l.id, label: l.type === "STORE" ? t("field.centralStore") : l.name }));

  const columns: Column<PurchaseListRow>[] = [
    {
      id: "number",
      header: t("procurement.common.purchase"),
      cell: (p) => (
        <div className="min-w-0">
          <p className="font-medium tabular">{p.number}</p>
          <p className="text-xs text-muted-foreground">{t("procurement.purchases.challanLine", { no: p.challanNo })}</p>
        </div>
      ),
    },
    { id: "date", header: t("field.date"), cell: (p) => formatDate(p.purchaseDate), sortValue: (p) => p.purchaseDate },
    { id: "supplier", header: t("field.supplier"), cell: (p) => p.supplier.name, sortValue: (p) => p.supplier.name },
    {
      id: "to",
      header: t("procurement.purchases.colDeliveredTo"),
      cell: (p) => (p.deliverTo === "STORE" ? t("field.centralStore") : (p.project?.name ?? p.location.name)),
    },
    { id: "materials", header: t("field.materials"), cell: (p) => <span className="line-clamp-1 text-sm text-muted-foreground">{p.materials.join(", ")}</span> },
    { id: "total", header: t("procurement.purchases.colBill"), align: "right", cell: (p) => <MoneyText paisa={p.totalPaisa} /> },
    { id: "mode", header: t("field.payment"), cell: (p) => <StatusBadge domain="paymentMode" value={p.paymentMode} /> },
    {
      id: "status",
      header: t("field.status"),
      cell: (p) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge domain="purchase" value={p.status} />
          {p.openShortages ? <StatusBadge tone="danger" label={p.openShortages > 1 ? t("procurement.purchases.nShortages", { n: p.openShortages }) : t("procurement.purchases.oneShortage")} /> : null}
          {p.lateSync ? <LateSyncBadge /> : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("procurement.purchases.title")}
        description={t("procurement.purchases.desc")}
        breadcrumbs={[{ label: t("crumb.suppliersStock") }, { label: t("procurement.crumb.purchases") }]}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/suppliers-stock/purchases/new">
                <Plus data-icon="inline-start" />
                {t("procurement.purchases.newPurchase")}
              </Link>
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder={t("procurement.purchases.searchPlaceholder")} />
        <FilterSelect label={t("field.supplier")} value={list.filters.supplierId} onChange={(v) => list.setFilter("supplierId", v)} options={suppliers.options.map((o) => ({ value: o.value, label: o.label }))} />
        <FilterSelect label={t("procurement.purchases.location")} value={list.filters.locationId} onChange={(v) => list.setFilter("locationId", v)} options={locationOptions} />
        <FilterSelect label={t("field.payment")} value={list.filters.paymentMode} onChange={(v) => list.setFilter("paymentMode", v)} options={paymentModes} />
        <FilterSelect
          label={t("field.status")}
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v)}
          options={PURCHASE_STATUSES.map((value) => ({ value, label: ts("purchase", value) }))}
        />
        <DateRangePicker
          value={{ from: list.filters.from, to: list.filters.to }}
          onChange={(range) => {
            list.setFilter("from", range.from);
            list.setFilter("to", range.to);
          }}
        />
      </FilterBar>
      <SectionCard
        flush
        title={data?.meta.totalPaisa !== undefined ? <>{t("common.total")} <MoneyText paisa={data.meta.totalPaisa} /></> : undefined}
        description={data?.meta.paidNowPaisa !== undefined ? <>{t("procurement.purchases.paidWithPurchase")} <MoneyText paisa={data.meta.paidNowPaisa} /></> : undefined}
      >
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(p) => p.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          onRowClick={(p) => router.push(`/suppliers-stock/purchases/${p.id}`)}
          empty={{ title: t("procurement.purchases.emptyTitle"), description: t("procurement.purchases.emptyDesc"), icon: ReceiptText }}
          pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
        />
      </SectionCard>
    </>
  );
}
