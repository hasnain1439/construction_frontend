"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  UNREAD_POLL_MS,
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/api/services/notifications.api";
import type { AppNotification } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { NotificationList } from "./NotificationList";

export const ALERTS_PAGE = "/dashboard/alerts";

/** "99+" above 99. */
export const badgeText = (count: number) => (count > 99 ? "99+" : String(count));

/**
 * Top-bar bell: the unread count (polled every 60 s and on window focus; red when something
 * critical is unread), a dropdown with the latest 10 and "View all".
 */
export function NotificationBell() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const count = useGetUnreadCountQuery(undefined, { pollingInterval: UNREAD_POLL_MS, refetchOnFocus: true, skipPollingIfUnfocused: true });
  const latest = useGetNotificationsQuery({ limit: 10 }, { skip: !open, refetchOnMountOrArgChange: true });
  const [markRead, markState] = useMarkNotificationReadMutation();
  const [markAll, markAllState] = useMarkAllNotificationsReadMutation();

  const unread = count.data?.count ?? 0;
  const critical = (count.data?.critical ?? 0) > 0;

  const openItem = (n: AppNotification) => {
    if (!n.read) void markRead(n.id);
    setOpen(false);
    if (n.actionUrl) router.push(n.actionUrl);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread ? `${t("shell.notifications")}: ${unread} unread` : t("shell.notifications")}>
          <Bell />
          {unread ? (
            <span
              data-testid="notification-badge"
              className={cn(
                "absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold text-white tabular",
                critical ? "bg-danger" : "bg-primary",
              )}
            >
              {badgeText(unread)}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">{t("shell.notifications")}</p>
          {unread ? (
            <Button variant="ghost" size="xs" onClick={() => void markAll()} disabled={markAllState.isLoading}>
              <CheckCheck data-icon="inline-start" />
              Mark all read
            </Button>
          ) : null}
        </div>
        <div className="max-h-[26rem] overflow-y-auto p-2">
          {latest.isLoading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : latest.data?.items.length ? (
            <NotificationList items={latest.data.items} onOpen={openItem} onMarkRead={(n) => void markRead(n.id)} busyId={markState.isLoading ? markState.originalArgs : null} compact />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">{t("shell.noNotifications")}</p>
          )}
        </div>
        <div className="border-t p-2">
          <Button asChild variant="ghost" className="w-full" onClick={() => setOpen(false)}>
            <Link href={ALERTS_PAGE}>View all</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
