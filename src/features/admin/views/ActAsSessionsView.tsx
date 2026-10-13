"use client";

import { LifeBuoy, LogOut } from "lucide-react";
import { useState } from "react";
import { useEndActAsSessionMutation, useGetActAsSessionsQuery } from "@/api/services/admin/actAs.api";
import { useGetTenantsQuery } from "@/api/services/admin/tenants.api";
import type { ActAsSession, ActAsSessionsQuery, ActAsStatus } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Combobox } from "@/components/forms/ComboboxField";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { actingSessionId, clearActingTenant } from "@/lib/actingCompany";
import { formatDateTime } from "@/lib/dates";

const STATUS_TONE: Record<ActAsStatus, "danger" | "neutral" | "warning"> = {
  ACTIVE: "danger",
  EXPIRED: "warning",
  ENDED: "neutral",
};
const STATUS_LABEL: Record<ActAsStatus, string> = { ACTIVE: "Live", EXPIRED: "Expired", ENDED: "Ended" };

/**
 * Admin console → Support Sessions: every time a super admin opened a company (act-as), with
 * the reason, the write-mode reason and how it ended. Live sessions can be ended from here.
 */
export function ActAsSessionsView() {
  const list = useListState({ tenantId: "", active: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetActAsSessionsQuery(
    list.query as ActAsSessionsQuery,
  );
  const tenants = useGetTenantsQuery({ limit: 100 });
  const [ending, setEnding] = useState<ActAsSession | null>(null);
  const [endSession, { isLoading: endingNow }] = useEndActAsSessionMutation();
  const run = useMutationToast();

  const columns: Column<ActAsSession>[] = [
    {
      id: "started",
      header: "Started",
      cell: (s) => <span className="whitespace-nowrap">{formatDateTime(s.startedAt)}</span>,
    },
    { id: "company", header: "Company", cell: (s) => <span className="font-medium">{s.tenant.name}</span> },
    { id: "admin", header: "Admin", cell: (s) => s.admin.name },
    {
      id: "reason",
      header: "Reason",
      className: "max-w-md",
      cell: (s) => (
        <div className="space-y-1 text-sm">
          <p className="line-clamp-2">{s.reason}</p>
          {s.writeReason ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              <span className="font-medium text-danger">Write:</span> {s.writeReason}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "mode",
      header: "Mode",
      cell: (s) => (
        <StatusBadge
          tone={s.mode === "WRITE" ? "danger" : "info"}
          label={s.mode === "WRITE" ? "Write" : "Read-only"}
        />
      ),
    },
    {
      id: "ends",
      header: "Ends / ended",
      cell: (s) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDateTime(s.endedAt ?? s.expiresAt)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (s) => <StatusBadge tone={STATUS_TONE[s.status]} label={STATUS_LABEL[s.status]} />,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (s) =>
        s.status === "ACTIVE" ? (
          <Button size="sm" variant="outline" onClick={() => setEnding(s)}>
            <LogOut data-icon="inline-start" />
            End
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Support Sessions"
        description="Every time a super admin opened a company, with the reason. Sessions start read-only, last 60 minutes by default and need a second reason for write mode."
        breadcrumbs={[{ label: "Support Sessions" }]}
      />
      <InlineAlert tone="info">
        The company owner gets an app notification and an email when a session starts, and sees every session
        in their own audit log.
      </InlineAlert>
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <div className="w-56">
          <Combobox
            value={list.filters.tenantId || null}
            onChange={(v) => list.setFilter("tenantId", (v as string | null) ?? "")}
            options={(tenants.data?.items ?? []).map((t) => ({ value: t.id, label: t.name }))}
            placeholder="Company: All"
          />
        </div>
        <FilterSelect
          label="Status"
          value={list.filters.active}
          onChange={(v) => list.setFilter("active", v)}
          options={[
            { value: "true", label: "Live" },
            { value: "false", label: "Ended or expired" },
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
          empty={{ title: "No support sessions", icon: LifeBuoy }}
          pagination={
            data
              ? {
                  page: list.page,
                  pageSize: list.pageSize,
                  total: data.meta.total,
                  onPageChange: list.setPage,
                  onPageSizeChange: list.setPageSize,
                }
              : undefined
          }
        />
      </SectionCard>
      <ConfirmDialog
        open={Boolean(ending)}
        onOpenChange={(o) => !o && setEnding(null)}
        title="End this support session?"
        description={ending ? `${ending.admin.name} leaves ${ending.tenant.name} at once.` : undefined}
        confirmLabel="End session"
        loading={endingNow}
        onConfirm={async () => {
          if (!ending) return;
          const ok = await run(() => endSession(ending.id).unwrap(), { success: "Support session ended" });
          if (ok) {
            // Our own current session: leave the company here too.
            if (actingSessionId() === ending.id) clearActingTenant();
            setEnding(null);
          }
        }}
      />
    </>
  );
}
