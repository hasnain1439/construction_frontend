"use client";

import { StatusBadge } from "@/components/common/StatusBadge";
import { en } from "@/i18n/en";
import { useT } from "@/i18n/useT";

/** English hint (tests compare against it); on screen the current language's `app.components.lateSync.hint` is used. */
export const LATE_SYNC_HINT = en.app.components.lateSync.hint;

/** "📱 late sync" — the entry reached the server more than 48 h after it was made on a phone. */
export function LateSyncBadge({ className }: { className?: string }) {
  const t = useT();
  return (
    <span title={t("app.components.lateSync.hint")} className={className}>
      <StatusBadge tone="warning" label={t("app.components.lateSync.badge")} />
    </span>
  );
}
