"use client";

import { Check } from "lucide-react";
import type { AppNotification } from "@/api/types";
import { Button } from "@/components/ui/button";
import { useEnumT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatDate, formatRelative, todayPK } from "@/lib/dates";
import { statusMeta, TONE_CLASSES } from "@/lib/status";

/** Words for the two relative days (English by default). */
export interface DayNames {
  today: string;
  yesterday: string;
}

const ENGLISH_DAYS: DayNames = { today: "Today", yesterday: "Yesterday" };

/** "Today" / "Yesterday" / "3 Oct 2026" for a notification's Karachi day. */
export function dayLabel(iso: string, today = todayPK(), names: DayNames = ENGLISH_DAYS): string {
  const day = todayPK(new Date(iso));
  if (day === today) return names.today;
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (day === yesterday.toISOString().slice(0, 10)) return names.yesterday;
  return formatDate(day);
}

export function groupByDay(items: AppNotification[], today = todayPK(), names: DayNames = ENGLISH_DAYS): Array<{ label: string; items: AppNotification[] }> {
  const groups: Array<{ label: string; items: AppNotification[] }> = [];
  for (const n of items) {
    const label = dayLabel(n.createdAt, today, names);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }
  return groups;
}

/**
 * Notifications grouped by day: severity icon + label, title, body, project, time. Clicking
 * opens its page (and marks it read); unread rows have a dot and a "Mark read" button.
 */
export function NotificationList({
  items,
  onOpen,
  onMarkRead,
  compact,
  busyId,
}: {
  items: AppNotification[];
  onOpen: (n: AppNotification) => void;
  onMarkRead?: (n: AppNotification) => void;
  compact?: boolean;
  busyId?: string | null;
}) {
  const t = useT();
  const te = useEnumT();
  return (
    <div className="space-y-4">
      {groupByDay(items, todayPK(), { today: t("common.today"), yesterday: t("common.yesterday") }).map((group) => (
        <section key={group.label} aria-label={group.label} className="space-y-1">
          <h3 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group.label}</h3>
          <ul className="space-y-1">
            {group.items.map((n) => {
              const meta = statusMeta("severity", n.severity);
              const Icon = meta.icon;
              const severity = te("severity", n.severity, meta.label);
              return (
                <li key={n.id} className={cn("group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted", !n.read && "bg-accent/40")}>
                  <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border", TONE_CLASSES[meta.tone])} title={severity}>
                    <Icon className="size-4" aria-hidden />
                    <span className="sr-only">{severity}</span>
                  </span>
                  <button type="button" onClick={() => onOpen(n)} className="min-w-0 flex-1 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                    <span className="flex items-center gap-2">
                      {!n.read ? <span className="size-2 shrink-0 rounded-full bg-primary" aria-label={t("common.unread")} /> : null}
                      <span className={cn("truncate text-sm", n.read ? "font-medium" : "font-semibold")}>{n.title}</span>
                    </span>
                    <span className={cn("block text-sm text-muted-foreground", compact && "line-clamp-2")}>{n.body}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {n.project ? `${n.project.code} · ` : ""}
                      {formatRelative(n.createdAt)}
                    </span>
                  </button>
                  {!n.read && onMarkRead ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("common.markAsRead", { title: n.title })}
                      title={t("common.markRead")}
                      disabled={busyId === n.id}
                      onClick={() => onMarkRead(n)}
                    >
                      <Check />
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
