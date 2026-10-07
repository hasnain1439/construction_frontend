import { StatusBadge } from "@/components/common/StatusBadge";

export const LATE_SYNC_HINT = "Entered on a phone without signal and synced more than 48 hours later";

/** "📱 late sync" — the entry reached the server more than 48 h after it was made on a phone. */
export function LateSyncBadge({ className }: { className?: string }) {
  return (
    <span title={LATE_SYNC_HINT} className={className}>
      <StatusBadge tone="warning" label="📱 late sync" />
    </span>
  );
}
