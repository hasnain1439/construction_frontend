import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  /** Small line under the number ("1 at risk · 1 delayed"). */
  hint?: ReactNode;
  loading?: boolean;
  className?: string;
  tone?: "primary" | "success" | "warning" | "danger";
}

const toneClass = {
  primary: "bg-accent text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
} as const;

/** Icon on top, grey label, big blue number (design brief §6). */
export function KpiCard({ label, value, icon: Icon, hint, loading, className, tone = "primary" }: KpiCardProps) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-card", className)}>
      {Icon ? (
        <span className={cn("flex size-10 items-center justify-center rounded-xl", toneClass[tone])}>
          <Icon className="size-6" aria-hidden />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <p className="text-kpi font-semibold text-primary tabular">{value}</p>
        )}
        {hint && !loading ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
