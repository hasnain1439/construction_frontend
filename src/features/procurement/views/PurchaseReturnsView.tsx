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
import { formatDate } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import { useSupplierOptions } from "../options";

export function PurchaseReturnsView() {
  const suppliers = useSupplierOptions();
  const list = useListState({ supplierId: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetPurchaseReturnsQuery(list.query as PurchaseReturnsQuery);

  const columns: Column<PurchaseReturn>[] = [
    { id: "number", header: "Return", cell: (r) => <span className="font-medium tabular">{r.number}</span> },
    { id: "date", header: "Date", cell: (r) => formatDate(r.createdAt), sortValue: (r) => r.createdAt },
    { id: "supplier", header: "Supplier", cell: (r) => r.supplier.name },
    {
      id: "purchase",
      header: "Purchase",
      cell: (r) => (
        <Link className="text-primary hover:underline" href={`/suppliers-stock/purchases/${r.purchase.id}`} onClick={(e) => e.stopPropagation()}>
          {r.purchase.number}
        </Link>
      ),
    },
    { id: "items", header: "Materials", cell: (r) => r.items.map((i) => `${formatQty(i.qty, i.material.unit)} ${i.material.name}`).join(", ") },
    { id: "reason", header: "Reason", cell: (r) => <span className="text-muted-foreground">{r.reason}</span> },
    { id: "total", header: "Credited", align: "right", cell: (r) => <MoneyText paisa={r.totalPaisa} /> },
  ];

  return (
    <>
      <PageHeader title="Purchase Returns (Maal Wapsi)" description="Goods sent back to suppliers — credited to their account at the purchase rate." breadcrumbs={[{ label: "Suppliers & Stock" }, { label: "Purchase Returns" }]} />
      <InlineAlert tone="info">To return goods, open the purchase and choose “Create return”.</InlineAlert>
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <FilterSelect label="Supplier" value={list.filters.supplierId} onChange={(v) => list.setFilter("supplierId", v)} options={suppliers.options.map((o) => ({ value: o.value, label: o.label }))} />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(r) => r.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{ title: "No returns", description: "Returns you make from a purchase show up here.", icon: Undo2 }}
          pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
        />
      </SectionCard>
    </>
  );
}
