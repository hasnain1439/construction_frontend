"use client";

import { ScrollText } from "lucide-react";
import { useState } from "react";
import { useGetAuditLogsQuery } from "@/api/services/admin/auditLogs.api";
import { useGetTenantsQuery } from "@/api/services/admin/tenants.api";
import type { AuditLogRow, AuditLogsQuery } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Combobox } from "@/components/forms/ComboboxField";
import { InfoList } from "@/components/common/InfoList";
import { useListState } from "@/hooks/useListState";
import { formatDateTime } from "@/lib/dates";

const ACTOR_TONE = { USER: "success", PLATFORM_ADMIN: "info", SYSTEM: "neutral" } as const;

export function AuditLogsView() {
  const list = useListState({ actorType: "", tenantId: "", from: "", to: "" });
  // The search box filters by action prefix.
  const { search, ...filters } = list.query as typeof list.query & { search?: string };
  const { data, isLoading, isFetching, error, refetch } = useGetAuditLogsQuery({ ...filters, ...(search ? { action: search } : {}) } as AuditLogsQuery);
  const tenants = useGetTenantsQuery({ limit: 100 });
  const [selected, setSelected] = useState<AuditLogRow | null>(null);

  const columns: Column<AuditLogRow>[] = [
    { id: "when", header: "When", cell: (a) => <span className="whitespace-nowrap">{formatDateTime(a.createdAt)}</span> },
    { id: "action", header: "Action", cell: (a) => <span className="font-mono text-xs">{a.action}</span> },
    { id: "company", header: "Company", cell: (a) => a.tenant?.name ?? <span className="text-muted-foreground">Platform</span> },
    { id: "actor", header: "Actor", cell: (a) => <StatusBadge tone={ACTOR_TONE[a.actorType]} label={a.actorType.replace("_", " ").toLowerCase()} /> },
    { id: "entity", header: "Entity", cell: (a) => a.entityType ?? "—" },
    { id: "ip", header: "IP", cell: (a) => <span className="text-xs text-muted-foreground">{a.ip ?? "—"}</span> },
  ];

  return (
    <>
      <PageHeader title="Audit Logs" description="Every sign-in and change, newest first. Secrets are always redacted." breadcrumbs={[{ label: "Audit Logs" }]} />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SearchInput value={list.search} onChange={list.setSearch} placeholder="Action starts with… e.g. auth. or subscription.payment" />
        <FilterSelect
          label="Actor"
          value={list.filters.actorType}
          onChange={(v) => list.setFilter("actorType", v)}
          options={[
            { value: "USER", label: "Company user" },
            { value: "PLATFORM_ADMIN", label: "Platform admin" },
            { value: "SYSTEM", label: "System" },
          ]}
        />
        <div className="w-56">
          <Combobox
            value={list.filters.tenantId || null}
            onChange={(v) => list.setFilter("tenantId", (v as string | null) ?? "")}
            options={(tenants.data?.items ?? []).map((t) => ({ value: t.id, label: t.name }))}
            placeholder="Company: All"
          />
        </div>
        <DateRangePicker
          label="Any date"
          value={{ from: list.filters.from, to: list.filters.to }}
          onChange={(range) => {
            list.setFilter("from", range.from);
            list.setFilter("to", range.to);
          }}
        />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(a) => a.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          onRowClick={setSelected}
          empty={{ title: "No events match", icon: ScrollText }}
          pagination={
            data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined
          }
        />
      </SectionCard>
      <SlideOver open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)} title={selected?.action ?? "Event"} description={selected ? formatDateTime(selected.createdAt) : undefined}>
        {selected ? (
          <div className="space-y-4">
            <InfoList
              columns={1}
              items={[
                { label: "Company", value: selected.tenant?.name ?? "Platform" },
                { label: "Actor", value: `${selected.actorType} ${selected.actorId ?? ""}` },
                { label: "Entity", value: selected.entityType ? `${selected.entityType} ${selected.entityId ?? ""}` : "—" },
                { label: "IP", value: selected.ip },
                { label: "User agent", value: selected.userAgent },
                { label: "Request id", value: selected.requestId },
              ]}
            />
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Details</p>
              <pre className="overflow-x-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(selected.details ?? {}, null, 2)}</pre>
            </div>
          </div>
        ) : null}
      </SlideOver>
    </>
  );
}
