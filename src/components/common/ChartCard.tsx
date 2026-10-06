"use client";

import { ChartNoAxesColumn } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { EmptyState } from "./EmptyState";
import { SectionCard } from "./SectionCard";
import { SegmentedControl, type SegmentOption } from "./SegmentedControl";

/** Validated categorical order (globals.css --chart-1 … --chart-6); assign in this order, never cycle. */
export const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"] as const;

export interface LegendItem {
  label: string;
  color: string;
  value?: ReactNode;
}

/** Legend for ≥ 2 series: swatch + label (+ value) in text colours — never colour alone. `rows`: one per line, value right-aligned. */
export function ChartLegend({ items, rows, className }: { items: LegendItem[]; rows?: boolean; className?: string }) {
  return (
    <ul className={cn(rows ? "grid w-full gap-2 text-sm text-muted-foreground" : "flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground", className)} aria-label="Legend">
      {items.map((item) => (
        <li key={item.label} className={cn("flex items-center gap-1.5", rows && "gap-2")}>
          <span className="size-2.5 shrink-0 rounded-sm" style={{ background: item.color }} aria-hidden />
          <span className={cn(rows && "flex-1")}>{item.label}</span>
          {item.value !== undefined ? <span className="font-medium whitespace-nowrap text-foreground tabular">{item.value}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Card for a chart: title, optional period chips, legend, and an empty state when there is
 * nothing to plot (no fake zeros).
 */
export function ChartCard<P extends string = string>({
  title,
  description,
  period,
  actions,
  legend,
  empty,
  emptyText = "Nothing to show for this period yet.",
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  period?: { value: P; options: SegmentOption<P>[]; onChange: (value: P) => void };
  actions?: ReactNode;
  legend?: LegendItem[];
  empty?: boolean;
  emptyText?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <SectionCard
      title={title}
      description={description}
      className={className}
      actions={
        period || actions ? (
          <div className="flex flex-wrap items-center gap-2">
            {period ? <SegmentedControl<P> size="sm" ariaLabel="Period" value={period.value} onChange={period.onChange} options={period.options} /> : null}
            {actions}
          </div>
        ) : undefined
      }
    >
      {empty ? (
        <EmptyState compact icon={ChartNoAxesColumn} title="No data" description={emptyText} />
      ) : (
        <div className="space-y-3">
          {legend && legend.length > 1 ? <ChartLegend items={legend} /> : null}
          {children}
        </div>
      )}
    </SectionCard>
  );
}
