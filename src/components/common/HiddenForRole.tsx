"use client";

import { EyeOff } from "lucide-react";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";

/** Subtle placeholder where the API omitted a field the user's role can't see. */
export function HiddenForRole({ className, compact }: { className?: string; compact?: boolean }) {
  const t = useT();
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-normal text-muted-foreground italic", className)}
      title={t("common.hiddenForRole")}
    >
      <EyeOff className="size-3.5" aria-hidden />
      {compact ? <span className="sr-only">{t("common.hiddenForRole")}</span> : t("common.hiddenForRole")}
    </span>
  );
}
