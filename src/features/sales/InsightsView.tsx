"use client";

import { BellRing, FileText, Percent, Trophy, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGetQuoteInsightsQuery } from "@/api/services/sales.api";
import type { QuoteInsights } from "@/api/types";
import { ChartCard, SERIES_COLORS } from "@/components/common/ChartCard";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { ShareColumns } from "@/components/common/ShareColumns";
import { PageHeader } from "@/components/layout/PageHeader";
import { useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { QuoteStatusBadge, useLostReasonLabel } from "./shared";

type Months = "6" | "12" | "24";
const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };

/** Quotes made / won / lost per month (counts, not money). */
function PerMonthChart({ data }: { data: QuoteInsights["perMonth"] }) {
  const t = useT();
  const series = [
    { key: "created", label: t("sales.insights.created"), color: SERIES_COLORS[0] },
    { key: "won", label: t("sales.insights.won"), color: SERIES_COLORS[1] },
    { key: "lost", label: t("sales.insights.lost"), color: SERIES_COLORS[2] },
  ];
  const empty = data.every((m) => m.created + m.won + m.lost === 0);
  return (
    <ChartCard title={t("sales.insights.perMonth")} empty={empty} legend={series.map((s) => ({ label: s.label, color: s.color }))}>
      <div className="h-72 w-full" role="img" aria-label={t("sales.insights.perMonth")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barGap={3} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} tick={axisTick} />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 16 }} />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={8} maxBarSize={18} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function InsightsBody({ data }: { data: QuoteInsights }) {
  const t = useT();
  const lostLabel = useLostReasonLabel();
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("sales.insights.winRate")} value={data.winRate === null ? "—" : `${data.winRate}%`} hint={t("sales.insights.winRateHint")} icon={Percent} highlight />
        <KpiCard label={t("sales.insights.quotes")} value={data.totals.quotes} hint={t("sales.insights.quotesHint", { sent: data.totals.sent, open: data.totals.open })} icon={FileText} />
        <KpiCard label={t("sales.insights.won")} value={data.totals.won} hint={<MoneyText paisa={data.wonValuePaisa} short />} icon={Trophy} tone="success" />
        <KpiCard label={t("sales.insights.lost")} value={data.totals.lost + data.totals.expired} hint={`${t("sales.insights.expired")}: ${data.totals.expired}`} icon={XCircle} tone="danger" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("sales.insights.avgQuoted")} value={<MoneyText paisa={data.avgRateQuotedPaisa} />} hint={t("sales.insights.perSqftHint")} />
        <KpiCard label={t("sales.insights.avgWon")} value={<MoneyText paisa={data.avgRateWonPaisa} />} hint={t("sales.insights.perSqftHint")} tone="success" />
        <KpiCard label={t("sales.insights.pipelineValue")} value={<MoneyText paisa={data.pipelineValuePaisa} short />} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <PerMonthChart data={data.perMonth} />
        <SectionCard title={t("sales.insights.lossReasons")}>
          <ShareColumns
            ariaLabel={t("sales.insights.lossReasons")}
            empty={t("sales.insights.noLosses")}
            items={data.lossReasons.map((r) => ({ key: r.reason, label: lostLabel(r.reason), value: r.count, display: String(r.count) }))}
          />
        </SectionCard>
      </div>
      <SectionCard title={t("sales.insights.followUps")} description={t("sales.insights.followUpsDesc")}>
        {data.followUps.length ? (
          <ul className="divide-y text-sm" data-testid="follow-ups">
            {data.followUps.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <Link href={`/sales/quotes/${q.id}`} className="min-w-0 hover:underline">
                  <span className="font-medium">{q.title}</span> <span className="text-muted-foreground">· {q.client.name}</span>
                </Link>
                <span className="flex items-center gap-3">
                  <QuoteStatusBadge status={q.status} />
                  <span className="inline-flex items-center gap-1 text-warning">
                    <BellRing className="size-3.5" aria-hidden />
                    {t("sales.pipeline.followUpHint", { days: q.daysSinceActivity })}
                  </span>
                  <span className="text-muted-foreground">{formatDate(q.sentAt)}</span>
                  <MoneyText paisa={q.pricePaisa} short />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("sales.insights.followUpsEmpty")}</p>
        )}
      </SectionCard>
    </div>
  );
}

/** Sales → Win / loss insights: KPIs, quotes per month, loss reasons, follow-up list. */
export function InsightsView() {
  const t = useT();
  const [months, setMonths] = useState<Months>("12");
  const query = useGetQuoteInsightsQuery({ months: Number(months) });
  return (
    <>
      <PageHeader
        title={t("sales.insights.title")}
        description={t("sales.insights.description")}
        breadcrumbs={[{ label: t("crumb.sales") }, { label: t("sales.insights.title") }]}
        actions={
          <SegmentedControl<Months>
            size="sm"
            ariaLabel={t("sales.insights.period")}
            value={months}
            onChange={setMonths}
            options={(["6", "12", "24"] as const).map((m) => ({ value: m, label: t("sales.insights.months", { n: m }) }))}
          />
        }
      />
      <QueryState query={query}>{(data) => <InsightsBody data={data} />}</QueryState>
    </>
  );
}
