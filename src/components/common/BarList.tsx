import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface BarListItem {
  key: string;
  label: ReactNode;
  /** Plotted size (any unit — only the ratio to the largest matters). */
  value: number;
  /** What is written at the end (e.g. "Rs 4.5 L"). */
  display: ReactNode;
  hint?: ReactNode;
}

/**
 * One-series comparison as labelled horizontal bars (easier to read than a pie): label and
 * value in text colours, the bar in the primary colour, longest = full width.
 */
export function BarList({ items, ariaLabel, className, empty = "Nothing yet" }: { items: BarListItem[]; ariaLabel: string; className?: string; empty?: ReactNode }) {
  const max = Math.max(0, ...items.map((i) => i.value));
  if (!items.length || max <= 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className={cn("space-y-3", className)} aria-label={ariaLabel}>
      {items.map((item) => (
        <li key={item.key} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{item.label}</span>
            <span className="shrink-0 tabular">{item.display}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-full rounded-full bg-chart-1" style={{ width: `${Math.max(item.value > 0 ? 2 : 0, (item.value / max) * 100)}%` }} />
          </div>
          {item.hint ? <p className="text-xs text-muted-foreground">{item.hint}</p> : null}
        </li>
      ))}
    </ul>
  );
}
