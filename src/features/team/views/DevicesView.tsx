"use client";

import { AlertTriangle, LogOut, Smartphone } from "lucide-react";
import { useState } from "react";
import { useGetSyncStatusQuery } from "@/api/services/dailyLogs.api";
import { useGetDevicesQuery, useRevokeDeviceMutation } from "@/api/services/team.api";
import type { DeviceRow, SyncRejection } from "@/api/types";
import { AvatarName } from "@/components/common/AvatarName";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { PLATFORM_LABEL, ROLE_LABEL } from "@/lib/options";

export function DevicesView() {
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
      header: "User",
      cell: (d) => <AvatarName name={d.user.name} subtitle={ROLE_LABEL[d.user.role]} />,
      sortValue: (d) => d.user.name,
    },
    {
      id: "platform",
      header: "Platform",
      cell: (d) => PLATFORM_LABEL[d.platform] ?? d.platform,
      sortValue: (d) => d.platform,
    },
    {
      id: "model",
      header: "Model",
      cell: (d) => d.model ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: "lastActive",
      header: "Last active",
      cell: (d) => formatRelative(d.lastActiveAt, "Never"),
      sortValue: (d) => d.lastActiveAt ?? "",
    },
    { id: "lastSync", header: "Last sync", cell: (d) => formatRelative(d.lastSyncAt, "—") },
    {
      id: "pending",
      header: "Pending uploads",
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
      header: "Last rejected",
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
            {items[0]!.code ?? "Rejected"}
            {items.length > 1 ? ` +${items.length - 1}` : ""}
          </Button>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: (d) =>
        d.current ? (
          <StatusBadge tone="info" label="This device" />
        ) : (
          <StatusBadge domain="device" value={d.revokedAt ? "REVOKED" : "ACTIVE"} />
        ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (d) =>
        !d.current && !d.revokedAt ? (
          <Button variant="ghost" size="sm" className="text-danger" onClick={() => setToRevoke(d)}>
            <LogOut data-icon="inline-start" />
            Log out device
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Devices"
        description="Phones and browsers signed in to your company."
        breadcrumbs={[{ label: "Team" }, { label: "Devices" }]}
      />
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(d) => d.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{ title: "No devices yet", icon: Smartphone }}
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
        title={`Refused entries · ${rejections?.device.user.name ?? ""}`}
        description="The last entries this phone sent that the server refused. The phone undid them and shows them under Sync problems."
      >
        <ul className="divide-y rounded-lg border text-sm">
          {(rejections?.items ?? []).map((r) => (
            <li key={r.clientId} className="space-y-1 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{SYNC_TYPE_LABEL[r.type] ?? r.type}</span>
                <StatusBadge tone="danger" label={r.code ?? "REJECTED"} />
              </div>
              {r.message ? <p className="text-muted-foreground">{r.message}</p> : null}
              <p className="text-xs text-muted-foreground">
                Made {formatDateTime(r.deviceCreatedAt)} · received {formatDateTime(r.at)}
              </p>
            </li>
          ))}
        </ul>
      </SlideOver>
      <ConfirmDialog
        open={Boolean(toRevoke)}
        onOpenChange={(o) => !o && setToRevoke(null)}
        title={`Log out ${toRevoke?.user.name ?? ""}'s ${toRevoke ? (PLATFORM_LABEL[toRevoke.platform] ?? "device") : "device"}?`}
        description="Use this if a phone is lost. They must sign in again on that device; nothing they entered is deleted."
        confirmLabel="Log out device"
        loading={revoking}
        onConfirm={async () => {
          if (!toRevoke) return;
          const ok = await run(() => revoke(toRevoke.id).unwrap(), { success: "Device logged out" });
          if (ok) setToRevoke(null);
        }}
      />
    </>
  );
}

/** Phone mutation types in office words. */
export const SYNC_TYPE_LABEL: Record<string, string> = {
  WORKER_CREATE: "New worker",
  PROJECT_WORKER_ASSIGN: "Worker added to site",
  ATTENDANCE_UPSERT: "Hazri",
  ADVANCE_CREATE: "Peshgi",
  WORK_MEASUREMENT_CREATE: "Work measurement",
  SETTLEMENT_GENERATE: "Weekly wages made",
  SETTLEMENT_SUBMIT: "Wages sent for approval",
  SETTLEMENT_PAY: "Wages paid",
  DISPATCH_RECEIVE: "Gate pass received",
  PURCHASE_RECEIVE: "Purchase received",
  OWNER_DELIVERY_CREATE: "Owner delivery",
  MATERIAL_USAGE_CREATE: "Material usage",
  STOCK_COUNT_CREATE: "Stock count",
  CASH_EXPENSE_CREATE: "Kharcha",
  FLOAT_ACKNOWLEDGE: "Cash float confirmed",
  TOPUP_REQUEST_CREATE: "Top-up request",
  DAILY_LOG_UPSERT: "Daily log",
  SITE_PURCHASE_CREATE: "Site purchase",
};
