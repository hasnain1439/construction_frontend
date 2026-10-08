"use client";

import { formatInTimeZone } from "date-fns-tz";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ShareColumns } from "@/components/common/ShareColumns";
import { formatMonth, TIME_ZONE } from "@/lib/dates";
import { formatPKR, formatPKRShort, toPaisaBigInt } from "@/lib/money";

type RevenueRow = { key: string; tick: string; label: string; paisa: number; raw: string; current: boolean; best: boolean };

function RevenueTooltip({ active, payload, total }: { active?: boolean; payload?: Array<{ payload: RevenueRow }>; total: number }) {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) return null;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-flyout">
      <p className="text-xs text-muted-foreground">
        {row.label}
        {row.current ? " · so far" : ""}
      </p>
      <p className="font-semibold tabular">{formatPKR(row.raw)}</p>
      {total > 0 ? <p className="text-xs text-muted-foreground tabular">{Math.round((row.paisa / total) * 100)}% of the 12 months</p> : null}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular">{value}</p>
      {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * Approved revenue per month — one series, so no legend (the card title names it).
 * Headline stats on top; pill-shaped sand bars; the running month is hatched (not final yet);
 * only the best month carries a value label; exact amount on hover.
 */
export function RevenueChart({ data }: { data: Array<{ month: string; amountPaisa: string }> }) {
  const thisMonth = formatInTimeZone(new Date(), TIME_ZONE, "yyyy-MM");
  const base = data.map((d, i) => {
    const label = formatMonth(d.month);
    const [mon, year] = label.split(" ");
    // Month names only; the year is shown where it changes (and on the first bar).
    const prevYear = i > 0 ? formatMonth(data[i - 1]!.month).split(" ")[1] : undefined;
    return {
      key: d.month,
      tick: year && year !== prevYear ? `${mon} '${year.slice(2)}` : (mon ?? label),
      label,
      paisa: Number(toPaisaBigInt(d.amountPaisa) ?? BigInt(0)),
      raw: d.amountPaisa,
      current: d.month.slice(0, 7) === thisMonth,
    };
  });
  const total = base.reduce((s, r) => s + r.paisa, 0);
  const bestPaisa = Math.max(0, ...base.map((r) => r.paisa));
  // Only the first best month is labelled (ties would repeat the same number).
  const bestKey = bestPaisa > 0 ? base.find((r) => r.paisa === bestPaisa)?.key : undefined;
  const rows: RevenueRow[] = base.map((r) => ({ ...r, best: r.key === bestKey }));
  const best = rows.find((r) => r.best);
  const current = rows.find((r) => r.current);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 rounded-2xl bg-muted px-4 py-3">
        <Stat label="Last 12 months" value={formatPKRShort(total)} />
        <Stat label="This month so far" value={formatPKRShort(current?.paisa ?? 0)} hint={current?.label} />
        <Stat label="Best month" value={best ? formatPKRShort(best.paisa) : "—"} hint={best?.label} />
      </div>
      <div className="h-64 w-full" role="img" aria-label={`Approved revenue by month, ${formatPKR(String(total))} in the last 12 months`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 22, right: 4, bottom: 0, left: 4 }} barCategoryGap="30%">
            <defs>
              <pattern id="revenue-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="var(--chart-brand)" opacity="0.45" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--chart-brand)" strokeWidth="3" />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
            <XAxis dataKey="tick" interval={0} tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={64}
              tickCount={4}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(v: number) => formatPKRShort(Math.round(v))}
            />
            <Tooltip cursor={false} content={<RevenueTooltip total={total} />} />
            <Bar dataKey="paisa" radius={15} maxBarSize={30} isAnimationActive>
              {rows.map((r) => (
                <Cell key={r.key} fill={r.current ? "url(#revenue-hatch)" : "var(--chart-brand)"} />
              ))}
              <LabelList
                valueAccessor={(entry) => {
                  const row = entry.payload as RevenueRow;
                  return row.best ? formatPKRShort(row.paisa) : "";
                }}
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
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {current ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block size-3 rounded-sm bg-chart-brand/50" aria-hidden />
          Striped bar: {current.label} is still running.
        </p>
      ) : null}
    </div>
  );
}

/** Companies per plan as share columns (biggest first) with a legend of counts and shares. */
export function PlanDistribution({ data }: { data: Array<{ planCode: string; count: number }> }) {
  return (
    <ShareColumns
      ariaLabel="Companies per plan"
      items={data.map((d) => ({ key: d.planCode, label: d.planCode, value: d.count, display: `${d.count} compan${d.count === 1 ? "y" : "ies"}` }))}
      empty="No subscriptions yet"
    />
  );
}
