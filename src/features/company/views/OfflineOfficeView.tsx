"use client";

import { Check, ChevronDown, ChevronUp, CloudOff, Monitor, ShieldOff, X } from "lucide-react";
import { useState } from "react";
import {
  useApproveOfficeDeviceMutation,
  useGetOfficeDevicesQuery,
  useGetSyncProblemsQuery,
  useRevokeOfficeDeviceMutation,
} from "@/api/services/edge.api";
import type { OfficeDevice, SyncProblem } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { InlineAlert } from "@/components/common/InlineAlert";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { changedFields, describePk } from "@/features/company/offlineOffice";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useEnumT, useT } from "@/i18n/useT";
import { formatDateTime, formatRelative } from "@/lib/dates";

/**
 * Settings → Offline office (owner / administrator, `company.settings.manage`): approve the office
 * computers that keep a local copy of the company's data, and — on the office computer itself —
 * see the changes the cloud did not accept.
 */
export function OfflineOfficeView() {
  const t = useT();
  const query = useGetOfficeDevicesQuery();
  return (
    <>
      <PageHeader
        title={t("offlineOffice.title")}
        description={t("offlineOffice.desc")}
        breadcrumbs={[{ label: t("crumb.settings") }, { label: t("offlineOffice.title") }]}
      />
      <QueryState query={query}>
        {(data) =>
          data.allowed ? (
            <div className="space-y-6">
              <OfficeDevicesCard devices={data.devices} />
              <SyncProblemsCard />
            </div>
          ) : (
            <SectionCard>
              <EmptyState
                icon={ShieldOff}
                title={t("offlineOffice.notAllowedTitle")}
                description={t("offlineOffice.notAllowedBody")}
              />
            </SectionCard>
          )
        }
      </QueryState>
    </>
  );
}

function OfficeDevicesCard({ devices }: { devices: OfficeDevice[] }) {
  const t = useT();
  const te = useEnumT();
  const run = useMutationToast();
  const [approve, { isLoading: approving, originalArgs: approvingId }] = useApproveOfficeDeviceMutation();
  const [revoke, { isLoading: revoking }] = useRevokeOfficeDeviceMutation();
  const [toRevoke, setToRevoke] = useState<OfficeDevice | null>(null);
  const nameOf = (d: OfficeDevice) => d.model ?? t("offlineOffice.officeComputer");

  const columns: Column<OfficeDevice>[] = [
    {
      id: "computer",
      header: t("offlineOffice.colComputer"),
      sortValue: (d) => nameOf(d),
      cell: (d) => (
        <div className="min-w-0">
          <p className="font-medium">{nameOf(d)}</p>
          <p className="text-xs text-muted-foreground">{te("platform", d.platform, d.platform)}</p>
        </div>
      ),
    },
    { id: "user", header: t("offlineOffice.colUser"), sortValue: (d) => d.userName, cell: (d) => d.userName },
    {
      id: "requested",
      header: t("offlineOffice.colRequested"),
      sortValue: (d) => d.requestedAt,
      cell: (d) => formatDateTime(d.requestedAt),
    },
    {
      id: "approved",
      header: t("offlineOffice.colApproved"),
      sortValue: (d) => d.approvedAt ?? "",
      cell: (d) =>
        d.approvedAt ? (
          <div className="space-y-1">
            <StatusBadge tone="success" icon={Check} label={t("offlineOffice.approvedBadge")} />
            <p className="text-xs text-muted-foreground">{formatDateTime(d.approvedAt)}</p>
          </div>
        ) : (
          <StatusBadge tone="warning" label={t("offlineOffice.waiting")} />
        ),
    },
    {
      id: "lastSync",
      header: t("offlineOffice.colLastSync"),
      sortValue: (d) => d.lastSyncAt ?? "",
      cell: (d) => <span title={formatDateTime(d.lastSyncAt)}>{formatRelative(d.lastSyncAt)}</span>,
    },
    {
      id: "actions",
      header: t("common.actions"),
      align: "right",
      cell: (d) =>
        d.approvedAt ? (
          <Button variant="destructive-soft" size="sm" onClick={() => setToRevoke(d)}>
            <X data-icon="inline-start" />
            {t("offlineOffice.revoke")}
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={approving && approvingId === d.id}
            onClick={() =>
              void run(() => approve(d.id).unwrap(), {
                success: t("offlineOffice.approved", { name: nameOf(d) }),
              })
            }
          >
            <Check data-icon="inline-start" />
            {t("offlineOffice.approve")}
          </Button>
        ),
    },
  ];

  return (
    <SectionCard title={t("offlineOffice.devicesTitle")} description={t("offlineOffice.devicesDesc")} flush>
      <DataTable
        rows={devices}
        columns={columns}
        getRowId={(d) => d.id}
        clientPageSize={0}
        defaultSort={{ id: "requested", direction: "desc" }}
        empty={{
          title: t("offlineOffice.emptyTitle"),
          description: t("offlineOffice.emptyBody"),
          icon: Monitor,
        }}
      />
      <ConfirmDialog
        open={Boolean(toRevoke)}
        onOpenChange={(o) => !o && setToRevoke(null)}
        title={t("offlineOffice.revokeTitle", { name: toRevoke ? nameOf(toRevoke) : "" })}
        description={t("offlineOffice.revokeBody")}
        confirmLabel={t("offlineOffice.revoke")}
        loading={revoking}
        onConfirm={async () => {
          if (!toRevoke) return;
          const ok = await run(() => revoke(toRevoke.id).unwrap(), {
            success: t("offlineOffice.revoked", { name: nameOf(toRevoke) }),
          });
          if (ok) setToRevoke(null);
        }}
      />
    </SectionCard>
  );
}

function SyncProblemsCard() {
  const t = useT();
  const { data, isLoading, error, refetch } = useGetSyncProblemsQuery();
  if (isLoading) return <CardsSkeleton count={1} height="h-32" />;
  if (error || !data) {
    return (
      <SectionCard title={t("offlineOffice.problemsTitle")}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </SectionCard>
    );
  }
  // In the cloud the list is always empty: one line says where to look instead.
  if (!data.officeMode) return <InlineAlert tone="info">{t("offlineOffice.problemsElsewhere")}</InlineAlert>;
  return (
    <SectionCard title={t("offlineOffice.problemsTitle")} description={t("offlineOffice.problemsDesc")}>
      {data.problems.length ? (
        <ul className="space-y-3">
          {data.problems.map((p) => (
            <SyncProblemItem key={p.id} problem={p} />
          ))}
        </ul>
      ) : (
        <EmptyState
          compact
          icon={CloudOff}
          title={t("offlineOffice.problemsEmpty")}
          description={t("offlineOffice.problemsEmptyBody")}
        />
      )}
    </SectionCard>
  );
}

function SyncProblemItem({ problem }: { problem: SyncProblem }) {
  const t = useT();
  const te = useEnumT();
  const [open, setOpen] = useState(false);
  const changes = changedFields(problem.officeRow, problem.cloudRow);
  const pk = describePk(problem.pk);
  const valueOf = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? t("common.yes") : t("common.no");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };
  return (
    <li className="rounded-xl border px-4 py-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium">
            <span className="text-muted-foreground">{t("offlineOffice.record")}: </span>
            <span className="font-mono">{problem.tableName}</span>
          </p>
          {pk ? <p className="font-mono text-xs break-all text-muted-foreground">{pk}</p> : null}
          <p className="text-xs text-muted-foreground">{formatDateTime(problem.at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            tone={problem.status === "CONFLICT" ? "warning" : "danger"}
            label={te("syncProblemStatus", problem.status)}
          />
          <StatusBadge tone="info" label={t("offlineOffice.cloudKept")} />
        </div>
      </div>
      {problem.message || problem.code ? (
        <p className="mt-2 text-muted-foreground">
          {problem.code ? <span className="font-mono text-xs">{problem.code}</span> : null}
          {problem.code && problem.message ? " · " : null}
          {problem.message}
        </p>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        className="-ms-2 mt-1"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronUp data-icon="inline-start" /> : <ChevronDown data-icon="inline-start" />}
        {open ? t("offlineOffice.hideChanges") : t("offlineOffice.showChanges")}
      </Button>
      {open ? (
        changes.length ? (
          <div className="mt-2 overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">{t("offlineOffice.colField")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("offlineOffice.colOffice")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("offlineOffice.colCloud")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {changes.map((c) => (
                  <tr key={c.field}>
                    <td className="px-3 py-2 font-mono">{c.field}</td>
                    <td className="px-3 py-2 break-all">
                      {problem.officeRow ? valueOf(c.office) : t("offlineOffice.deletedOffice")}
                    </td>
                    <td className="px-3 py-2 break-all">
                      {problem.cloudRow ? valueOf(c.cloud) : t("offlineOffice.missingCloud")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-muted-foreground">{t("offlineOffice.noDifference")}</p>
        )
      ) : null}
    </li>
  );
}
