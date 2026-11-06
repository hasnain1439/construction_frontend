"use client";

import { CircleAlert, CircleCheck, CloudOff, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useGetOfficeSyncStatusQuery } from "@/api/services/edge.api";
import { Button } from "@/components/ui/button";
import { pickLabel, useLanguage, useT } from "@/i18n/useT";
import { FOOTER_ACTIONS } from "@/lib/navigation";
import { canAccess } from "@/lib/permissions";
import { cn } from "@/lib/cn";
import { useMe } from "@/store/hooks";

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0";

const POLL_MS = 30_000;
const MINUTE = 60_000;

/**
 * The sync badge. On an office PC it follows what the sync agent last did, with the time of the last
 * sync that reached the cloud. The cloud has nothing to sync: every save is already there.
 */
export function SyncBadge() {
  const t = useT();
  const { data } = useGetOfficeSyncStatusQuery();
  const office = Boolean(data?.officeMode);
  // The same query, polled only on an office PC.
  useGetOfficeSyncStatusQuery(undefined, { skip: !office, pollingInterval: office ? POLL_MS : 0 });

  // Keeps "5 min ago" moving between polls.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!office) return;
    const timer = setInterval(() => setNow(Date.now()), POLL_MS);
    return () => clearInterval(timer);
  }, [office]);

  const ago = () => {
    if (!data?.lastSyncAt) return t("shell.agoNever");
    const minutes = Math.max(0, Math.floor((now - new Date(data.lastSyncAt).getTime()) / MINUTE));
    if (minutes < 1) return t("shell.agoNow");
    if (minutes < 60) return t("shell.agoMinutes", { n: minutes });
    if (minutes < 48 * 60) return t("shell.agoHours", { n: Math.floor(minutes / 60) });
    return t("shell.agoDays", { n: Math.floor(minutes / (24 * 60)) });
  };

  const pill = (tone: "success" | "warning" | "danger", Icon: typeof CircleCheck, text: string) => (
    <span
      data-testid="sync-badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium",
        tone === "success" && "bg-success-soft text-success",
        tone === "warning" && "bg-warning-soft text-warning",
        tone === "danger" && "bg-danger-soft text-danger",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {text}
    </span>
  );

  if (!office) return pill("success", CircleCheck, t("shell.allSynced"));
  if (data?.state === "copying" || data?.state === null) return pill("warning", RefreshCw, t("shell.syncing"));
  if (data?.state === "offline") return pill("warning", CloudOff, t("shell.syncOffline", { ago: ago() }));
  if (data?.state !== "ok") return pill("danger", CircleAlert, t("shell.syncProblem", { ago: ago() }));
  if (data.pending > 0) return pill("warning", RefreshCw, t("shell.syncPending", { n: data.pending, ago: ago() }));
  return pill("success", CircleCheck, t("shell.syncedAgo", { ago: ago() }));
}

/** Always-visible footer: quick actions that exist today, version, sync status. */
export function StickyFooter() {
  const t = useT();
  const language = useLanguage();
  const me = useMe();
  const actions = FOOTER_ACTIONS.filter((action) => canAccess(me, action.access));
  // Same look as the top bar: page background, no border, a soft shadow above.
  return (
    <footer className="relative z-10 flex h-14 items-center justify-between gap-3 bg-transparent px-4 shadow-(--shadow-footer)">
      <div className="flex items-center gap-2 overflow-x-auto">
        {actions.map((action, index) => (
          <Button key={action.id} asChild size="sm" variant={index === 0 ? "default" : "outline"}>
            <Link href={action.href}>{pickLabel(action.label, language)}</Link>
          </Button>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        <span className="hidden sm:inline">{t("shell.version", { version: VERSION })}</span>
        <SyncBadge />
      </div>
    </footer>
  );
}
