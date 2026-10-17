"use client";

import { Flame, Gauge, Percent, Target } from "lucide-react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGetBurnRateQuery } from "@/api/services/control.api";
import type { BurnMonth, BurnRate } from "@/api/types";
import { ChartCard, SERIES_COLORS } from "@/components/common/ChartCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useEnumT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatDate, formatMonth } from "@/lib/dates";
import { formatPKRShort } from "@/lib/money";
import { ControlAlertsCard, ControlSetupHints } from "../components/ControlShared";

const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };

/** Spent % and progress % lines on one percent axis; the gap as bars, red where spending runs ahead. */
function BurnChart({ data }: { data: BurnRate }) {
  const t = useT();
  const money = data.months.some((m) => m.spentPercent !== undefined);
  const rows = data.months.map((m) => ({ label: formatMonth(m.month), progress: m.progressPercent, spent: m.spentPercent ?? null, gap: m.gapPoints ?? null, ahead: Boolean(m.ahead) }));
  const legend = [
    { label: t("control.burn.progressSeries"), color: SERIES_COLORS[0] },
    ...(money ? [{ label: t("control.burn.spentSeries"), color: SERIES_COLORS[1] }, { label: t("control.burn.gapCol"), color: "var(--muted-foreground)" }] : []),
  ];
  return (
    <ChartCard title={t("control.burn.chartTitle")} description={money ? t("control.burn.gapHint", { n: data.thresholdPoints }) : t("control.burn.progressOnly")} legend={legend} empty={!rows.length}>
      <div className="h-72 w-full" role="img" aria-label={t("control.burn.chartLabel")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} width={40} tick={axisTick} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip formatter={(v) => (typeof v === "number" ? `${v}%` : String(v))} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 16 }} />
            {money ? (
              <Bar dataKey="gap" name={t("control.burn.gapCol")} maxBarSize={18} radius={6}>
                {rows.map((r) => (
                  <Cell key={r.label} fill={r.ahead ? "var(--danger)" : "var(--muted-foreground)"} fillOpacity={r.ahead ? 0.85 : 0.3} />
                ))}
              </Bar>
            ) : null}
            <Line dataKey="progress" name={t("control.burn.progressSeries")} type="monotone" stroke={SERIES_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
            {money ? <Line dataKey="spent" name={t("control.burn.spentSeries")} type="monotone" stroke={SERIES_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} /> : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/** Burn rate content (fixture-testable). */
export function BurnRateBoard({ data }: { data: BurnRate }) {
  const t = useT();
  const te = useEnumT();
  const money = data.current.spentPercent !== undefined;
  const amounts = data.months.some((m) => m.costPaisa !== undefined);
  const gap = data.current.gapPoints;
  const columns: Column<BurnMonth>[] = [
    { id: "month", header: t("control.burn.month"), cell: (m) => formatMonth(m.month) },
    { id: "cost", header: t("control.burn.cost"), align: "right", hidden: !amounts, cell: (m) => <MoneyText paisa={m.costPaisa} short /> },
    { id: "cumulative", header: t("control.burn.cumulative"), align: "right", hidden: !amounts, cell: (m) => <MoneyText paisa={m.cumulativeCostPaisa} short /> },
    { id: "spent", header: t("control.burn.spent"), align: "right", hidden: !money, cell: (m) => (m.spentPercent === null || m.spentPercent === undefined ? "—" : `${m.spentPercent}%`) },
    { id: "progress", header: t("control.burn.progress"), align: "right", cell: (m) => `${m.progressPercent}%` },
    {
      id: "gap",
      header: t("control.burn.gapCol"),
      align: "right",
      hidden: !money,
      cell: (m) =>
        m.gapPoints === null || m.gapPoints === undefined ? (
          "—"
        ) : (
          <span className="inline-flex items-center gap-2">
            <span dir="ltr" className={cn("tabular", m.ahead && "font-semibold text-danger")}>{t("control.common.signedPoints", { sign: m.gapPoints > 0 ? "+" : m.gapPoints < 0 ? "−" : "", n: Math.abs(m.gapPoints) })}</span>
            {m.ahead ? <StatusBadge tone="danger" label={t("control.burn.ahead")} /> : null}
          </span>
        ),
    },
  ];
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {t("control.common.asOf", { date: formatDate(data.asOf) })}
        {" · "}
        {t("control.common.basis", { basis: te("progressBasis", data.progressBasis) })}
        {data.contractPaisa ? ` · ${t("control.burn.contract", { amount: formatPKRShort(data.contractPaisa) })}` : ""}
      </p>
      <ControlSetupHints projectId={data.project.id} hasSchedule={data.hasSchedule} />
      <KpiGroup columns="grid-cols-2 lg:grid-cols-4" ariaLabel={t("control.burn.title")}>
        <KpiCard variant="tile" label={t("control.burn.progressNow")} icon={Gauge} value={`${data.current.progressPercent}%`} hint={t("control.burn.plannedNow", { n: data.current.plannedProgressPercent })} />
        <KpiCard variant="tile" label={t("control.burn.plannedLabel")} icon={Target} value={`${data.current.plannedProgressPercent}%`} />
        {money ? (
          <>
            <KpiCard variant="tile" label={t("control.burn.spentNow")} icon={Percent} value={data.current.spentPercent === null ? "—" : `${data.current.spentPercent}%`} />
            <KpiCard
              variant="tile"
              label={t("control.burn.gap")}
              icon={Flame}
              tone={data.current.ahead ? "danger" : "success"}
              value={gap === null || gap === undefined ? "—" : t("control.common.signedPoints", { sign: gap > 0 ? "+" : gap < 0 ? "−" : "", n: Math.abs(gap) })}
              hint={data.current.ahead ? t("control.burn.ahead") : t("control.burn.inLine")}
            />
          </>
        ) : null}
      </KpiGroup>
      {!money ? <InlineAlert tone="info">{t("control.burn.progressOnly")}</InlineAlert> : null}
      <BurnChart data={data} />
      <SectionCard title={t("control.burn.title")} description={t("control.burn.desc")} flush>
        <DataTable rows={data.months} columns={columns} getRowId={(m) => m.month} clientPageSize={0} empty={{ title: t("control.common.loadFailed") }} />
      </SectionCard>
    </div>
  );
}

/** Project → Control → Burn Rate vs Progress. */
export function BurnRateView({ projectId }: { projectId: string }) {
  const t = useT();
  const { data, isLoading } = useGetBurnRateQuery(projectId);
  return (
    <ProjectPageShell projectId={projectId} crumb={t("control.crumb.burn")}>
      {() => (
        <div className="space-y-5">
          {isLoading ? (
            <CardsSkeleton count={3} height="h-32" />
          ) : data ? (
            <BurnRateBoard data={data} />
          ) : (
            <SectionCard>
              <EmptyState title={t("control.common.loadFailed")} />
            </SectionCard>
          )}
          <ControlAlertsCard projectId={projectId} />
        </div>
      )}
    </ProjectPageShell>
  );
}
