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
import { formatDate } from "@/lib/dates";
import { PAYMENT_MODE_OPTIONS, useSupplierOptions } from "../options";

export function PurchasesView() {
  const router = useRouter();
  const readOnly = useReadOnly();
  const canCreate = useCan({ roles: ["THEKEDAR", "PM"] }) && !readOnly;
  const suppliers = useSupplierOptions();
  const list = useListState({ supplierId: "", locationId: "", paymentMode: "", status: "", from: "", to: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetPurchasesQuery(list.query as PurchasesQuery);
  const locations = useGetStockLocationsQuery();
  const locationOptions = (locations.data ?? []).filter((l) => l.type !== "TRANSIT").map((l) => ({ value: l.id, label: l.type === "STORE" ? "Central Store" : l.name }));

  const columns: Column<PurchaseListRow>[] = [
    {
      id: "number",
      header: "Purchase",
      cell: (p) => (
        <div className="min-w-0">
          <p className="font-medium tabular">{p.number}</p>
          <p className="text-xs text-muted-foreground">Challan {p.challanNo}</p>
        </div>
      ),
    },
    { id: "date", header: "Date", cell: (p) => formatDate(p.purchaseDate), sortValue: (p) => p.purchaseDate },
    { id: "supplier", header: "Supplier", cell: (p) => p.supplier.name, sortValue: (p) => p.supplier.name },
    {
      id: "to",
      header: "Delivered to",
      cell: (p) => (p.deliverTo === "STORE" ? "Central Store" : (p.project?.name ?? p.location.name)),
    },
    { id: "materials", header: "Materials", cell: (p) => <span className="line-clamp-1 text-sm text-muted-foreground">{p.materials.join(", ")}</span> },
    { id: "total", header: "Bill", align: "right", cell: (p) => <MoneyText paisa={p.totalPaisa} /> },
    { id: "mode", header: "Payment", cell: (p) => <StatusBadge domain="paymentMode" value={p.paymentMode} /> },
    {
      id: "status",
      header: "Status",
      cell: (p) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge domain="purchase" value={p.status} />
          {p.openShortages ? <StatusBadge tone="danger" label={`${p.openShortages} shortage${p.openShortages > 1 ? "s" : ""}`} /> : null}
          {p.lateSync ? <LateSyncBadge /> : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Purchases (Maal Kharida)"
        description="Every supplier challan — into the Central Store or straight to a site."
        breadcrumbs={[{ label: "Suppliers & Stock" }, { label: "Purchases" }]}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/suppliers-stock/purchases/new">
                <Plus data-icon="inline-start" />
                New purchase
              </Link>
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Purchase or challan no.…" />
        <FilterSelect label="Supplier" value={list.filters.supplierId} onChange={(v) => list.setFilter("supplierId", v)} options={suppliers.options.map((o) => ({ value: o.value, label: o.label }))} />
        <FilterSelect label="Location" value={list.filters.locationId} onChange={(v) => list.setFilter("locationId", v)} options={locationOptions} />
        <FilterSelect label="Payment" value={list.filters.paymentMode} onChange={(v) => list.setFilter("paymentMode", v)} options={PAYMENT_MODE_OPTIONS} />
        <FilterSelect
          label="Status"
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v)}
          options={[
            { value: "SAVED", label: "Saved" },
            { value: "PENDING_RATE", label: "Rates pending" },
            { value: "PENDING_RECEIPT", label: "Waiting at site" },
            { value: "RECEIVED", label: "Received" },
            { value: "RECEIVED_WITH_SHORTAGE", label: "Received — short" },
          ]}
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
        title={data?.meta.totalPaisa !== undefined ? <>Total <MoneyText paisa={data.meta.totalPaisa} /></> : undefined}
        description={data?.meta.paidNowPaisa !== undefined ? <>Paid with the purchase: <MoneyText paisa={data.meta.paidNowPaisa} /></> : undefined}
      >
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(p) => p.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          onRowClick={(p) => router.push(`/suppliers-stock/purchases/${p.id}`)}
          empty={{ title: "No purchases yet", description: "Record the first challan when material arrives.", icon: ReceiptText }}
          pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
        />
      </SectionCard>
    </>
  );
}
