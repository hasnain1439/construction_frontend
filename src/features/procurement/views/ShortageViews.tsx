"use client";

import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useGetShortagesQuery } from "@/api/services/dispatch.api";
import type { Shortage, ShortagesQuery } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useReadOnly } from "@/hooks/useReadOnly";
import { formatDate } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import { humanize } from "@/lib/status";
import { ResolveShortageSlideOver } from "../components/DispatchSlideOvers";
import { useSiteProjectOptions } from "../options";

function useShortageColumns(onResolve?: (s: Shortage) => void): Column<Shortage>[] {
  return [
    { id: "kind", header: "Type", cell: (s) => <StatusBadge domain="shortageKind" value={s.kind} /> },
    {
      id: "what",
      header: "Material",
      cell: (s) => (
        <div>
          <p className="font-medium">
            {formatQty(s.qty, s.material.unit)} {s.material.name}
          </p>
          {s.note ? <p className="line-clamp-1 text-xs text-muted-foreground">{s.note}</p> : null}
        </div>
      ),
    },
    {
      id: "source",
      header: "From",
      cell: (s) =>
        s.dispatch ? (
          <Link className="text-primary hover:underline" href={`/suppliers-stock/dispatches/${s.dispatch.id}`} onClick={(e) => e.stopPropagation()}>
            {s.dispatch.number}
          </Link>
        ) : s.purchase ? (
          <Link className="text-primary hover:underline" href={`/suppliers-stock/purchases/${s.purchase.id}`} onClick={(e) => e.stopPropagation()}>
            {s.purchase.number} · {s.purchase.supplier.name}
          </Link>
        ) : (
          "—"
        ),
    },
    { id: "site", header: "Site", cell: (s) => s.project?.name ?? s.location.name },
    { id: "value", header: "Value", align: "right", cell: (s) => <MoneyText paisa={s.valuePaisa} /> },
    { id: "date", header: "Found", cell: (s) => formatDate(s.createdAt), sortValue: (s) => s.createdAt },
    {
      id: "status",
      header: "Status",
      cell: (s) =>
        s.status === "OPEN" && onResolve ? (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onResolve(s);
            }}
          >
            Resolve
          </Button>
        ) : (
          <div className="space-y-0.5">
            <StatusBadge domain="shortage" value={s.status} />
            {s.resolution ? <p className="text-xs text-muted-foreground">{humanize(s.resolution)}{s.newDispatch ? ` · ${s.newDispatch.number}` : ""}</p> : null}
          </div>
        ),
    },
  ];
}

export function ShortagesView() {
  const readOnly = useReadOnly();
  const owner = useCan({ roles: ["THEKEDAR"] }) && !readOnly;
  const projects = useSiteProjectOptions();
  const list = useListState({ status: "OPEN", kind: "", source: "", projectId: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetShortagesQuery(list.query as ShortagesQuery);
  const [resolving, setResolving] = useState<Shortage | null>(null);
  const columns = useShortageColumns(owner ? setResolving : undefined);
  return (
    <>
      <PageHeader title="Shortages" description="Differences found when deliveries were counted. Each stays open until you decide." breadcrumbs={[{ label: "Suppliers & Stock" }, { label: "Shortages" }]} />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <FilterSelect
          label="Status"
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v)}
          options={[
            { value: "OPEN", label: "Open" },
            { value: "RESOLVED", label: "Resolved" },
          ]}
        />
        <FilterSelect
          label="Type"
          value={list.filters.kind}
          onChange={(v) => list.setFilter("kind", v)}
          options={[
            { value: "DISPATCH_SHORT", label: "Short" },
            { value: "DAMAGED", label: "Damaged" },
            { value: "EXCESS", label: "Excess" },
            { value: "SUPPLIER_SHORT", label: "Supplier short" },
          ]}
        />
        <FilterSelect
          label="From"
          value={list.filters.source}
          onChange={(v) => list.setFilter("source", v)}
          options={[
            { value: "DISPATCH", label: "Dispatches" },
            { value: "PURCHASE", label: "Purchases" },
          ]}
        />
        <FilterSelect label="Site" value={list.filters.projectId} onChange={(v) => list.setFilter("projectId", v)} options={projects.options.map((o) => ({ value: o.value, label: o.label }))} />
      </FilterBar>
      <SectionCard
        flush
        title={data ? `${data.meta.openCount} open` : undefined}
        description={data?.meta.openValuePaisa !== undefined ? <>Open value <MoneyText paisa={data.meta.openValuePaisa} /></> : undefined}
      >
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(s) => s.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{ title: list.filters.status === "OPEN" ? "No open shortages" : "No shortages", description: "Short, damaged or extra material found at a count shows up here.", icon: ClipboardCheck }}
          pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
        />
      </SectionCard>
      <ResolveShortageSlideOver shortage={resolving} open={Boolean(resolving)} onOpenChange={(o) => (!o ? setResolving(null) : undefined)} />
    </>
  );
}

