"use client";

import { FlaskConical } from "lucide-react";
import { InlineAlert } from "@/components/common/InlineAlert";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";

/** "DEMO" pill on anything created by "Try with demo data". Renders nothing for real records. */
export function DemoBadge({ isDemo, className }: { isDemo?: boolean | null; className?: string }) {
  const t = useT();
  if (!isDemo) return null;
  return (
    <span title={t("demo.badgeHint")} className={cn("inline-flex", className)}>
      <StatusBadge tone="warning" icon={FlaskConical} label={t("demo.badge")} />
    </span>
  );
}

/** Banner on top of the demo project's pages. */
export function DemoProjectBanner({ isDemo }: { isDemo?: boolean | null }) {
  const t = useT();
  if (!isDemo) return null;
  return (
    <InlineAlert tone="warning" title={t("demo.bannerTitle")} className="mb-4">
      {t("demo.bannerDesc")}
    </InlineAlert>
  );
}
