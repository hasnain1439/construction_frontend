import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

export interface RingKpiCardProps {
  label: string;
  value: ReactNode;
  /** 0–100 */
  percent: number;
  ringLabel?: string;
  hint?: ReactNode;
  loading?: boolean;
  tone?: "primary" | "success" | "warning" | "danger";
  className?: string;
}

const strokeClass = {
  primary: "stroke-primary",
  success: "stroke-success",
  warning: "stroke-warning",
  danger: "stroke-danger",
} as const;

/** KPI with a progress ring ("72 % collected"). */
export function RingKpiCard({ label, value, percent, ringLabel, hint, loading, tone = "primary", className }: RingKpiCardProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className={cn("flex items-center gap-5 rounded-3xl border border-transparent bg-card p-5 shadow-card", className)}>
      <div
        className="relative size-20 shrink-0"
        role="img"
        aria-label={`${Math.round(clamped)}%${ringLabel ? ` ${ringLabel}` : ""}`}
      >
        <svg viewBox="0 0 72 72" className="size-20 -rotate-90">
          <circle cx="36" cy="36" r={radius} fill="none" strokeWidth="8" className="stroke-secondary" />
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped / 100)}
            className={strokeClass[tone]}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular">
          {Math.round(clamped)}%
        </span>
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        {loading ? <Skeleton className="h-9 w-28" /> : <p className="text-kpi font-semibold text-foreground tabular">{value}</p>}
        {ringLabel ? <p className="text-xs text-muted-foreground">{ringLabel}</p> : null}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
