"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMonth } from "@/lib/dates";
import { formatPKR, formatPKRShort, toPaisaBigInt } from "@/lib/money";

/**
 * Approved revenue per month — one series, so no legend (the card title names it).
 * Bars: 4px rounded tops, recessive grid, hover tooltip with the exact amount.
 */
export function RevenueChart({ data }: { data: Array<{ month: string; amountPaisa: string }> }) {
  const rows = data.map((d) => ({ month: formatMonth(d.month), paisa: Number(toPaisaBigInt(d.amountPaisa) ?? BigInt(0)), raw: d.amountPaisa }));
  return (
    <div className="h-72 w-full" role="img" aria-label="Approved revenue by month">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={72}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(v: number) => formatPKRShort(Math.round(v))}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }}
            formatter={(_value, _name, item) => [formatPKR((item.payload as { raw: string }).raw), "Approved"]}
          />
          <Bar dataKey="paisa" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Companies per plan as labelled horizontal bars (easier to compare than a donut). */
export function PlanDistribution({ data }: { data: Array<{ planCode: string; count: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <ul className="space-y-3" aria-label="Companies per plan">
      {data.map((d) => (
        <li key={d.planCode} className="space-y-1" title={`${d.planCode}: ${d.count} of ${total}`}>
          <div className="flex justify-between text-sm">
            <span className="font-medium">{d.planCode}</span>
            <span className="text-muted-foreground tabular">
              {d.count} · {total ? Math.round((d.count / total) * 100) : 0}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-muted">
            <div className="h-full rounded-full bg-chart-1" style={{ width: `${(d.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
