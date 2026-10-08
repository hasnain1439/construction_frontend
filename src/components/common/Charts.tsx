"use client";

import { useId, type ReactNode } from "react";
import { Area, Bar, CartesianGrid, Cell, ComposedChart, LabelList, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };
const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 16, color: "var(--popover-foreground)", boxShadow: "var(--shadow-card)" };

/** One series → the brand sand; several → the validated categorical order. */
function withColors(series: Series[]) {
  return series.map((s, i) => ({ ...s, color: s.color ?? (series.length === 1 ? "var(--chart-brand)" : SERIES_COLORS[i % SERIES_COLORS.length]!) }));
}

type Colored = Series & { color: string };

/** Hover card: the category, then each series with its colour dot and exact rupees. */
function MoneyTooltip({ active, label, payload, series }: { active?: boolean; label?: ReactNode; payload?: Array<{ dataKey?: unknown; value?: unknown }>; series: Colored[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-40 rounded-xl border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-flyout">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <ul className="space-y-1">
        {payload.map((p) => {
          const s = series.find((x) => x.key === String(p.dataKey));
          return (
            <li key={String(p.dataKey)} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ background: s?.color }} aria-hidden />
                {s?.label ?? String(p.dataKey)}
              </span>
              <span className="font-semibold tabular">{formatPKR(Math.round(Number(p.value)))}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Money over a category axis (months, methods …) on ONE axis. Slim pill-shaped bars
 * (one bar series: only its highest bar carries a value label), soft gradient areas or 2px
 * smooth lines, dashed recessive grid; hover card with exact rupees; legend for ≥ 2 series.
 */
function MoneyComposed({ data, xKey, series, height = 288, stacked, label }: { data: Array<Record<string, string | number>>; xKey: string; series: Series[]; height?: number; stacked?: boolean; label: string }) {
  const uid = useId().replace(/:/g, "");
  const colored = withColors(series);
  const bars = colored.filter((s) => s.kind !== "area" && s.kind !== "line");
  const singleBar = !stacked && bars.length === 1 ? bars[0] : undefined;
  // Label one bar only — the highest (first one on a tie) — instead of a number on every bar.
  const topIndex = singleBar ? data.reduce((best, row, i) => (Number(row[singleBar.key]) > Number(data[best]?.[singleBar.key] ?? 0) ? i : best), 0) : -1;
  const topValue = singleBar ? Number(data[topIndex]?.[singleBar.key] ?? 0) : 0;
  return (
    <div className="w-full" style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: singleBar ? 22 : 8, right: 4, bottom: 0, left: 4 }} barGap={3} barCategoryGap="30%">
          <defs>
            {colored
              .filter((s) => s.kind === "area")
              .map((s) => (
                <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={axisTick} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={64} tickCount={5} tick={axisTick} tickFormatter={(v: number) => formatPKRShort(Math.round(v))} />
          <Tooltip
            cursor={bars.length ? { fill: "var(--muted)", opacity: 0.5, radius: 8 } : { stroke: "var(--border)", strokeWidth: 1 }}
            content={<MoneyTooltip series={colored} />}
          />
          {colored.map((s) =>
            s.kind === "area" ? (
              <Area key={s.key} dataKey={s.key} name={s.key} type="monotone" stroke={s.color} strokeWidth={2} fill={`url(#${uid}-${s.key})`} fillOpacity={1} activeDot={{ r: 4, fill: s.color, stroke: "var(--card)", strokeWidth: 2 }} stackId={stacked ? "a" : undefined} />
            ) : s.kind === "line" ? (
              <Line key={s.key} dataKey={s.key} name={s.key} type="monotone" stroke={s.color} strokeWidth={2} dot={{ r: 4, fill: s.color, stroke: "var(--card)", strokeWidth: 2 }} />
            ) : (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.key}
                fill={s.color}
                radius={stacked ? 0 : bars.length === 1 ? 16 : 11}
                maxBarSize={stacked || bars.length === 1 ? 32 : 22}
                stackId={stacked ? "a" : undefined}
                stroke="var(--card)"
                strokeWidth={stacked ? 2 : 0}
              >
                {singleBar && s.key === singleBar.key && topValue > 0 ? (
                  <LabelList
                    valueAccessor={(_entry, index) => (index === topIndex ? formatPKRShort(Math.round(topValue)) : "")}
                    content={(props) => {
                      const { x, y, width, value } = props as { x?: number | string; y?: number | string; width?: number | string; value?: unknown };
                      if (!value) return null;
                      // Drawn by hand: recharts' own label wraps at the bar's width.
                      return (
                        <text x={Number(x) + Number(width) / 2} y={Number(y) - 8} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
                          {String(value)}
                        </text>
                      );
                    }}
                  />
                ) : null}
              </Bar>
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
              <Pie data={colored.filter((s) => s.value > 0)} dataKey="value" nameKey="label" innerRadius="64%" outerRadius="100%" cornerRadius={6} paddingAngle={1} stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
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
