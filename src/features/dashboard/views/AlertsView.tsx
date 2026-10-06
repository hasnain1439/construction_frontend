"use client";

import { BellOff, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGetNotificationsQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation } from "@/api/services/notifications.api";
import type { AppNotification, NotificationSeverity, NotificationType } from "@/api/types";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { NotificationList } from "@/components/common/NotificationList";
import { Pagination } from "@/components/common/Pagination";
import { SectionCard } from "@/components/common/SectionCard";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useMutationToast } from "@/hooks/useMutationToast";
import { humanize } from "@/lib/status";

const TYPES: NotificationType[] = [
  "CHEQUE_BOUNCED",
  "INVOICE_OVERDUE",
  "STAGE_READY_UNBILLED",
  "PREVIOUS_STAGE_UNPAID",
  "SHORTAGE_CREATED",
  "LOW_STOCK",
  "DISPATCH_CREATED",
  "PURCHASE_PENDING_RATE",
  "SETTLEMENT_SUBMITTED",
  "SETTLEMENT_RETURNED",
  "EXPENSE_PENDING_APPROVAL",
  "TOPUP_REQUESTED",
  "FLOAT_SENT",
  "MEASUREMENT_RECORDED",
  "SUBCONTRACTOR_OVERPAID",
  "SUBSCRIPTION_RENEWAL",
  "SUBSCRIPTION_PAYMENT_APPROVED",
  "SUBSCRIPTION_PAYMENT_REJECTED",
  "INVITE_ACCEPTED",
];

/** Dashboard → Alerts & Notifications: every notification of the signed-in user, with filters and "mark all read". */
export function AlertsView() {
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const query = useGetNotificationsQuery(
    {
      page,
      limit: pageSize,
      ...(unreadOnly ? { unreadOnly: "true" as const } : {}),
      ...(type ? { type: type as NotificationType } : {}),
      ...(severity ? { severity: severity as NotificationSeverity } : {}),
    },
    { refetchOnMountOrArgChange: true },
  );
  const [markRead, markState] = useMarkNotificationReadMutation();
  const [markAll, markAllState] = useMarkAllNotificationsReadMutation();
  const run = useMutationToast();

  const open = (n: AppNotification) => {
    if (!n.read) void markRead(n.id);
    if (n.actionUrl) router.push(n.actionUrl);
  };
  const filtered = unreadOnly || type || severity;

  return (
    <>
      <PageHeader
        title="Alerts & Notifications"
        description="Everything the app told you about, newest first."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Alerts & Notifications" }]}
        actions={
          <Button variant="outline" onClick={() => void run(() => markAll().unwrap(), { success: (r) => `${r.updated} marked as read` })} disabled={markAllState.isLoading}>
            <CheckCheck data-icon="inline-start" />
            Mark all read
          </Button>
        }
      />
      <FilterBar
        canClear={Boolean(filtered)}
        onClear={() => {
          setUnreadOnly(false);
          setType("");
          setSeverity("");
          setPage(1);
        }}
      >
        <label className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
          <Switch checked={unreadOnly} onCheckedChange={(v) => (setUnreadOnly(v), setPage(1))} aria-label="Unread only" />
          Unread only
        </label>
        <FilterSelect label="Severity" value={severity} onChange={(v) => (setSeverity(v), setPage(1))} options={["CRITICAL", "WARNING", "INFO"].map((s) => ({ value: s, label: humanize(s) }))} />
        <FilterSelect label="Type" value={type} onChange={(v) => (setType(v), setPage(1))} options={TYPES.map((t) => ({ value: t, label: humanize(t) }))} />
      </FilterBar>
      <SectionCard>
        {query.isLoading ? (
          <TableSkeleton rows={6} />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data?.items.length ? (
          <div className="space-y-4">
            <NotificationList items={query.data.items} onOpen={open} onMarkRead={(n) => void markRead(n.id)} busyId={markState.isLoading ? markState.originalArgs : null} />
            <Pagination page={page} pageSize={pageSize} total={query.data.meta.total} onPageChange={setPage} onPageSizeChange={(s) => (setPageSize(s), setPage(1))} />
          </div>
        ) : (
          <EmptyState icon={BellOff} title={filtered ? "No notifications match" : "No notifications yet"} description={filtered ? "Try clearing the filters." : "Bounced cheques, shortages, wages to approve and more will show up here."} />
        )}
      </SectionCard>
    </>
  );
}
