"use client";

import type { ReactNode } from "react";
import { Area, Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPKR, formatPKRShort, toPaisaBigInt } from "@/lib/money";
import { ChartCard, ChartLegend, SERIES_COLORS, type LegendItem } from "./ChartCard";

/** Paisa string → number of paisa for plotting (exact amounts stay in the tooltip). */
export const plotPaisa = (v: string | null | undefined) => Number(toPaisaBigInt(v ?? "0") ?? BigInt(0));

export interface Series {
  key: string;
  label: string;
  /** Defaults to the next categorical colour. */
  color?: string;
  kind?: "bar" | "area" | "line";
}

const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };
const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" };

function withColors(series: Series[]) {
  return series.map((s, i) => ({ ...s, color: s.color ?? SERIES_COLORS[i % SERIES_COLORS.length]! }));
}

/**
 * Money over a category axis (months, methods …) on ONE axis. Bars (4px rounded tops, 2px
 * surface gap), areas or 2px lines; hover tooltip with exact rupees; legend for ≥ 2 series.
 */
function MoneyComposed({ data, xKey, series, height = 288, stacked, label }: { data: Array<Record<string, string | number>>; xKey: string; series: Series[]; height?: number; stacked?: boolean; label: string }) {
  const colored = withColors(series);
  return (
    <div className="w-full" style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={axisTick} />
          <YAxis tickLine={false} axisLine={false} width={76} tick={axisTick} tickFormatter={(v: number) => formatPKRShort(Math.round(v))} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            contentStyle={tooltipStyle}
            formatter={(value, name) => [formatPKR(Math.round(Number(value))), colored.find((s) => s.key === name)?.label ?? String(name)]}
          />
          {colored.map((s) =>
            s.kind === "area" ? (
              <Area key={s.key} dataKey={s.key} name={s.key} type="monotone" stroke={s.color} strokeWidth={2} fill={s.color} fillOpacity={0.15} stackId={stacked ? "a" : undefined} />
            ) : s.kind === "line" ? (
              <Line key={s.key} dataKey={s.key} name={s.key} type="monotone" stroke={s.color} strokeWidth={2} dot={{ r: 4, fill: s.color, stroke: "var(--card)", strokeWidth: 2 }} />
            ) : (
              <Bar key={s.key} dataKey={s.key} name={s.key} fill={s.color} radius={stacked ? 0 : [4, 4, 0, 0]} maxBarSize={32} stackId={stacked ? "a" : undefined} stroke="var(--card)" strokeWidth={stacked ? 2 : 0} />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarChartCard({
  title,
  description,
  data,
  xKey,
  series,
  stacked,
  empty,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: Series[];
  stacked?: boolean;
  empty?: boolean;
  actions?: ReactNode;
}) {
  const colored = withColors(series.map((s) => ({ ...s, kind: s.kind ?? "bar" })));
  return (
    <ChartCard title={title} description={description} actions={actions} empty={empty ?? !data.length} legend={colored.map((s) => ({ label: s.label, color: s.color }))}>
      <MoneyComposed data={data} xKey={xKey} series={colored} stacked={stacked} label={typeof title === "string" ? title : "Chart"} />
    </ChartCard>
  );
}

/** Areas (and optional bars / a line) over time — e.g. receipts vs outflows + own money. */
export function AreaChartCard({
  title,
  description,
  data,
  xKey,
  series,
  empty,
  actions,
  footer,
}: {
  title: ReactNode;
  description?: ReactNode;
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: Series[];
  empty?: boolean;
  actions?: ReactNode;
  footer?: ReactNode;
}) {
  const colored = withColors(series.map((s) => ({ ...s, kind: s.kind ?? "area" })));
  return (
    <ChartCard title={title} description={description} actions={actions} empty={empty ?? !data.length} legend={colored.map((s) => ({ label: s.label, color: s.color }))}>
      <MoneyComposed data={data} xKey={xKey} series={colored} label={typeof title === "string" ? title : "Chart"} />
      {footer}
    </ChartCard>
  );
}

export interface DonutSlice {
  key: string;
  label: string;
  paisa: string;
  color?: string;
}

/**
 * Parts of a whole (≤ 6 slices, fixed colour order): 2px surface gaps between slices, the
 * total in the middle and a legend with every value and share (identity never by colour alone).
 */
export function DonutChartCard({ title, description, slices, totalLabel = "Total", actions }: { title: ReactNode; description?: ReactNode; slices: DonutSlice[]; totalLabel?: string; actions?: ReactNode }) {
  const colored = slices.map((s, i) => ({ ...s, color: s.color ?? SERIES_COLORS[i % SERIES_COLORS.length]!, value: plotPaisa(s.paisa) }));
  const total = colored.reduce((s, x) => s + x.value, 0);
  const legend: LegendItem[] = colored.map((s) => ({
    label: s.label,
    color: s.color,
    value: `${formatPKRShort(s.paisa)} · ${total ? Math.round((s.value / total) * 100) : 0}%`,
  }));
  return (
    <ChartCard title={title} description={description} actions={actions} empty={total <= 0}>
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative size-48 shrink-0" role="img" aria-label={`${typeof title === "string" ? title : "Breakdown"}: ${legend.map((l) => `${l.label} ${l.value}`).join(", ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={colored.filter((s) => s.value > 0)} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="100%" stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
                {colored
                  .filter((s) => s.value > 0)
                  .map((s) => (
                    <Cell key={s.key} fill={s.color} />
                  ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [formatPKR(Math.round(Number(value))), String(name)]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-muted-foreground">{totalLabel}</span>
            <span className="text-base font-semibold tabular">{formatPKRShort(Math.round(total))}</span>
          </div>
        </div>
        <ChartLegend items={legend} rows />
      </div>
    </ChartCard>
  );
}
