"use client";

import { Undo2 } from "lucide-react";
import Link from "next/link";
import { useGetPurchaseReturnsQuery } from "@/api/services/procurement.api";
import type { PurchaseReturn, PurchaseReturnsQuery } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { InlineAlert } from "@/components/common/InlineAlert";
import { MoneyText } from "@/components/common/MoneyText";
import { SectionCard } from "@/components/common/SectionCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { useListState } from "@/hooks/useListState";
import { useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import { useSupplierOptions } from "../options";

export function PurchaseReturnsView() {
  const t = useT();
  const suppliers = useSupplierOptions();
  const list = useListState({ supplierId: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetPurchaseReturnsQuery(list.query as PurchaseReturnsQuery);

  const columns: Column<PurchaseReturn>[] = [
    { id: "number", header: t("procurement.returns.colReturn"), cell: (r) => <span className="font-medium tabular">{r.number}</span> },
    { id: "date", header: t("field.date"), cell: (r) => formatDate(r.createdAt), sortValue: (r) => r.createdAt },
    { id: "supplier", header: t("field.supplier"), cell: (r) => r.supplier.name },
    {
      id: "purchase",
      header: t("procurement.common.purchase"),
      cell: (r) => (
        <Link className="text-primary hover:underline" href={`/suppliers-stock/purchases/${r.purchase.id}`} onClick={(e) => e.stopPropagation()}>
          {r.purchase.number}
        </Link>
      ),
    },
    { id: "items", header: t("field.materials"), cell: (r) => r.items.map((i) => `${formatQty(i.qty, i.material.unit)} ${i.material.name}`).join(", ") },
    { id: "reason", header: t("field.reason"), cell: (r) => <span className="text-muted-foreground">{r.reason}</span> },
    { id: "total", header: t("procurement.returns.colCredited"), align: "right", cell: (r) => <MoneyText paisa={r.totalPaisa} /> },
  ];

  return (
    <>
      <PageHeader title={t("procurement.returns.title")} description={t("procurement.returns.desc")} breadcrumbs={[{ label: t("crumb.suppliersStock") }, { label: t("procurement.crumb.purchaseReturns") }]} />
      <InlineAlert tone="info">{t("procurement.returns.hint")}</InlineAlert>
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <FilterSelect label={t("field.supplier")} value={list.filters.supplierId} onChange={(v) => list.setFilter("supplierId", v)} options={suppliers.options.map((o) => ({ value: o.value, label: o.label }))} />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(r) => r.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{ title: t("procurement.returns.emptyTitle"), description: t("procurement.returns.emptyDesc"), icon: Undo2 }}
          pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
        />
      </SectionCard>
    </>
  );
}
