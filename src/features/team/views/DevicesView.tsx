"use client";

import { AlertTriangle, LogOut, Smartphone } from "lucide-react";
import { useState } from "react";
import { useGetSyncStatusQuery } from "@/api/services/dailyLogs.api";
import { useGetDevicesQuery, useRevokeDeviceMutation } from "@/api/services/team.api";
import type { DeviceRow, SyncRejection } from "@/api/types";
import { AvatarName } from "@/components/common/AvatarName";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { useEnumT, useT } from "@/i18n/useT";

export function DevicesView() {
  const t = useT();
  const te = useEnumT();
  const { page, setPage, pageSize, setPageSize } = useListState({});
  const { data, isLoading, isFetching, error, refetch } = useGetDevicesQuery({ page, limit: pageSize });
  const [revoke, { isLoading: revoking }] = useRevokeDeviceMutation();
  const [toRevoke, setToRevoke] = useState<DeviceRow | null>(null);
  const run = useMutationToast();
  // Sync health per phone (last refused entries) comes from /sync/status.
  const sync = useGetSyncStatusQuery();
  const rejectedOf = (d: DeviceRow) => sync.data?.find((x) => x.id === d.id)?.lastRejected ?? [];
  const [rejections, setRejections] = useState<{ device: DeviceRow; items: SyncRejection[] } | null>(null);

  const columns: Column<DeviceRow>[] = [
    {
      id: "user",
      header: t("teamCompany.devices.colUser"),
      cell: (d) => <AvatarName name={d.user.name} subtitle={t(`role.${d.user.role}`)} />,
      sortValue: (d) => d.user.name,
    },
    {
      id: "platform",
      header: t("teamCompany.devices.colPlatform"),
      cell: (d) => te("platform", d.platform),
      sortValue: (d) => d.platform,
    },
    {
      id: "model",
      header: t("teamCompany.devices.colModel"),
      cell: (d) => d.model ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: "lastActive",
      header: t("teamCompany.edit.lastActive"),
      cell: (d) => formatRelative(d.lastActiveAt, t("teamCompany.edit.never")),
      sortValue: (d) => d.lastActiveAt ?? "",
    },
    { id: "lastSync", header: t("teamCompany.devices.colLastSync"), cell: (d) => formatRelative(d.lastSyncAt, "—") },
    {
      id: "pending",
      header: t("teamCompany.devices.colPending"),
      align: "right",
      sortValue: (d) => d.pendingUploads,
      cell: (d) => (
        <span className={d.pendingUploads > 0 ? "tabular font-semibold text-warning" : "tabular"}>
          {d.pendingUploads}
        </span>
      ),
    },
    {
      id: "rejected",
      header: t("teamCompany.devices.colRejected"),
      cell: (d) => {
        const items = rejectedOf(d);
        if (!items.length) return <span className="text-muted-foreground">—</span>;
        return (
          <Button
            variant="ghost"
            size="sm"
            className="text-danger"
            onClick={() => setRejections({ device: d, items })}
          >
            <AlertTriangle data-icon="inline-start" />
            {items[0]!.code ?? t("teamCompany.devices.rejected")}
            {items.length > 1 ? ` +${items.length - 1}` : ""}
          </Button>
        );
      },
    },
    {
      id: "status",
      header: t("field.status"),
      cell: (d) =>
        d.current ? (
          <StatusBadge tone="info" label={t("teamCompany.devices.thisDevice")} />
        ) : (
          <StatusBadge domain="device" value={d.revokedAt ? "REVOKED" : "ACTIVE"} />
        ),
    },
    {
      ...ACTIONS_COLUMN,
      cell: (d) => (
        <RowActions
          name={d.user.name}
          actions={[{ label: t("teamCompany.devices.logOutDevice"), icon: LogOut, destructive: true, hidden: d.current || Boolean(d.revokedAt), onSelect: () => setToRevoke(d) }]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("teamCompany.devices.title")}
        description={t("teamCompany.devices.desc")}
        breadcrumbs={[{ label: t("crumb.team") }, { label: t("teamCompany.devices.title") }]}
      />
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(d) => d.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{ title: t("teamCompany.devices.empty"), icon: Smartphone }}
          pagination={
            data
              ? {
                  page,
                  pageSize,
                  total: data.meta.total,
                  onPageChange: setPage,
                  onPageSizeChange: setPageSize,
                }
              : undefined
          }
        />
      </SectionCard>
      <SlideOver
        open={Boolean(rejections)}
        onOpenChange={(o) => (!o ? setRejections(null) : undefined)}
        title={t("teamCompany.devices.refusedTitle", { name: rejections?.device.user.name ?? "" })}
        description={t("teamCompany.devices.refusedDesc")}
      >
        <ul className="divide-y rounded-lg border text-sm">
          {(rejections?.items ?? []).map((r) => (
            <li key={r.clientId} className="space-y-1 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{te("syncType", r.type)}</span>
                <StatusBadge tone="danger" label={r.code ?? t("teamCompany.devices.rejected")} />
              </div>
              {r.message ? <p className="text-muted-foreground">{r.message}</p> : null}
              <p className="text-xs text-muted-foreground">
                {t("teamCompany.devices.madeReceived", { made: formatDateTime(r.deviceCreatedAt), received: formatDateTime(r.at) })}
              </p>
            </li>
          ))}
        </ul>
      </SlideOver>
      <ConfirmDialog
        open={Boolean(toRevoke)}
        onOpenChange={(o) => !o && setToRevoke(null)}
        title={t("teamCompany.devices.revokeTitle", { name: toRevoke?.user.name ?? "", device: toRevoke ? te("platform", toRevoke.platform, t("teamCompany.devices.device")) : t("teamCompany.devices.device") })}
        description={t("teamCompany.devices.revokeBody")}
        confirmLabel={t("teamCompany.devices.logOutDevice")}
        loading={revoking}
        onConfirm={async () => {
          if (!toRevoke) return;
          const ok = await run(() => revoke(toRevoke.id).unwrap(), { success: t("teamCompany.devices.loggedOut") });
          if (ok) setToRevoke(null);
        }}
      />
    </>
  );
}

