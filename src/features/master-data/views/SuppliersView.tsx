"use client";

import { Plus, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGetSuppliersQuery, useSetSupplierActiveMutation } from "@/api/services/masterData.api";
import type { Supplier, SuppliersQuery } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { useCan } from "@/components/common/PermissionGate";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useSearchFlag } from "@/hooks/useSearchFlag";
import { formatPhone } from "@/lib/phone";
import { ActiveToggle } from "../components/ActiveToggle";
import { SupplierSlideOver } from "../components/SupplierSlideOver";

export function SuppliersView() {
  const router = useRouter();
  const readOnly = useReadOnly();
  const canEdit = useCan({ roles: ["THEKEDAR", "PM"] }) && !readOnly;
  const canToggle = useCan({ roles: ["THEKEDAR"] }) && !readOnly;
  const list = useListState({ isActive: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetSuppliersQuery(list.query as SuppliersQuery);
  const [setActive, { isLoading: toggling }] = useSetSupplierActiveMutation();
  const [addOpen, setAddOpen] = useSearchFlag();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const run = useMutationToast();

  const columns: Column<Supplier>[] = [
    {
      id: "name",
      header: "Supplier",
      sortValue: (s) => s.name,
      cell: (s) => (
        <div className="min-w-0">
          <p className="font-medium">{s.name}</p>
          {s.address ? <p className="truncate text-xs text-muted-foreground">{s.address}</p> : null}
        </div>
      ),
    },
    { id: "category", header: "Category", cell: (s) => s.category ?? "—", sortValue: (s) => s.category ?? "" },
    { id: "phone", header: "Phone", cell: (s) => <span className="tabular">{formatPhone(s.phone)}</span> },
    { id: "city", header: "City", cell: (s) => s.city ?? "—", sortValue: (s) => s.city ?? "" },
    { id: "status", header: "Status", cell: (s) => <StatusBadge domain="active" value={s.isActive} /> },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      hidden: !canEdit,
      cell: (s) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(s);
            }}
          >
            Edit
          </Button>
          {canToggle ? (
            <ActiveToggle
              name={s.name}
              isActive={s.isActive}
              loading={toggling}
              consequence="They won't appear in new purchases. History and balances are kept."
              onToggle={(active) =>
                run(() => setActive({ id: s.id, active }).unwrap(), { success: `${s.name} ${active ? "activated" : "deactivated"}` })
              }
            />
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="All Suppliers"
        description="Dealers you buy from, with the rates you've agreed."
        breadcrumbs={[{ label: "Suppliers & Stock" }, { label: "All Suppliers" }]}
        actions={
          canEdit ? (
            <Button onClick={() => setAddOpen(true)}>
              <Plus data-icon="inline-start" />
              Add supplier
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search name, phone or city…" />
        <FilterSelect
          label="Status"
          value={list.filters.isActive}
          onChange={(v) => list.setFilter("isActive", v)}
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
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
          empty={{ title: "No suppliers yet", description: "Add the dealers you buy cement, steel, bricks and sand from.", icon: Truck }}
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
