"use client";

import { useState, type ReactNode } from "react";
import { useGetReportQuery } from "@/api/services/reports.api";
import type { ReportBookName, ReportCell, ReportTable, Step18ReportName } from "@/api/types";
import { BarChartCard } from "@/components/common/Charts";
import { ChartCard } from "@/components/common/ChartCard";
import { ExportMenu } from "@/components/common/ExportMenu";
import { FilterSelect } from "@/components/common/FilterBar";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { EMPTY_REPORT_FILTERS, ReportFilterBar, reportParams, type ReportFilters } from "@/components/common/ReportFilterBar";
import { ShareColumns } from "@/components/common/ShareColumns";
import { PageHeader } from "@/components/layout/PageHeader";
import { useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { canSeeField } from "@/lib/permissions";
import { useMe } from "@/store/hooks";
import { COUNT_FORMAT, PERCENT_FORMAT, ReportBookPanel, ReportTableCard, useReportLabels } from "../components/ReportParts";
import { BOOK_REPORTS, REPORTS } from "../reports.config";

const CO_STATUSES = ["DRAFT", "SENT", "APPROVED", "REJECTED", "IN_PROGRESS", "COMPLETED", "BILLED"] as const;
const CO_TYPES = ["ADDITION", "DEDUCTION"] as const;
const CATEGORIES = ["SHUTTERING_PLATE", "PROP", "SCAFFOLDING", "MIXER", "VIBRATOR", "GENERATOR", "PUMP", "TOOL", "OTHER"] as const;

interface Extra {
  status: string;
  type: string;
  category: string;
  group: string;
}
const EMPTY_EXTRA: Extra = { status: "", type: "", category: "", group: "" };

const num = (v: ReportCell | undefined) => Number(v ?? 0);

/** Charts / KPIs above the table, per report (fixture-testable). */
export function ReportVisuals({ name, report }: { name: Step18ReportName; report: ReportTable }) {
  const t = useT();
  const labels = useReportLabels();
  const rows = report.rows;
  if (name === "delay-analysis") {
    const data = rows.map((r) => ({ project: String(r["code"]), owner: num(r["ownerDays"]), excusable: num(r["excusableDays"]), contractor: num(r["contractorDays"]), changeOrders: num(r["changeOrderDays"]) }));
    return (
      <BarChartCard
        title={t("reports.chart.delayDays")}
        data={data}
        xKey="project"
        stacked
        format={COUNT_FORMAT}
        series={[
          { key: "owner", label: t("reports.v.delayCategory.OWNER") },
          { key: "excusable", label: t("reports.v.delayCategory.EXCUSABLE") },
          { key: "contractor", label: t("reports.v.delayCategory.CONTRACTOR") },
          { key: "changeOrders", label: t("reports.v.reason.CHANGE_ORDER") },
        ]}
      />
    );
  }
  if (name === "variance") {
    const data = rows.map((r) => ({ project: String(r["code"]), done: num(r["progressPercent"]), planned: num(r["plannedProgressPercent"]) }));
    return (
      <BarChartCard
        title={t("reports.chart.progress")}
        data={data}
        xKey="project"
        format={PERCENT_FORMAT}
        series={[
          { key: "done", label: t("reports.chart.done") },
          { key: "planned", label: t("reports.chart.planned") },
        ]}
      />
    );
  }
  if (name === "change-orders") {
    const byStatus = report.extra?.byStatus ?? {};
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <KpiGroup columns="sm:grid-cols-2">
          <KpiCard variant="tile" label={t("reports.kpi.changeOrders")} value={rows.length} />
          <KpiCard variant="tile" label={t("reports.kpi.approved")} value={report.extra?.approvedCount ?? 0} />
          {report.extra?.approvedTotalPaisa !== undefined ? <KpiCard variant="tile" label={t("reports.kpi.approvedValue")} value={<MoneyText paisa={report.extra.approvedTotalPaisa} />} /> : null}
          <KpiCard variant="tile" label={t("reports.kpi.approvedDays")} value={num(report.totals?.["days"])} />
        </KpiGroup>
        <ChartCard title={t("reports.chart.coStatus")}>
          <ShareColumns
            ariaLabel={t("reports.chart.coStatus")}
            items={Object.entries(byStatus).map(([status, n]) => ({ key: status, label: labels.value("coStatus", status), value: n, display: String(n) }))}
          />
        </ChartCard>
      </div>
    );
  }
  if (name === "equipment-utilisation") {
    const data = rows.map((r) => ({ item: String(r["equipment"] ?? labels.value("category", r["category"]) ?? ""), utilisation: num(r["utilisationPercent"]) }));
    return <BarChartCard title={t("reports.chart.utilisation")} description={t("reports.chart.utilisationDesc")} data={data} xKey="item" format={PERCENT_FORMAT} series={[{ key: "utilisation", label: t("reports.chart.utilisation") }]} />;
  }
  // snags
  const open = rows.reduce((s, r) => s + num(r["open"]), 0);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
      <KpiGroup columns="grid-cols-1">
        <KpiCard variant="tile" label={t("reports.kpi.openSnags")} value={open} />
        <KpiCard variant="tile" label={t("reports.kpi.overdue")} value={num(report.totals?.["overdue"])} />
        <KpiCard variant="tile" label={t("reports.kpi.defect")} value={num(report.totals?.["defectPeriod"])} />
      </KpiGroup>
      <BarChartCard
        title={t("reports.chart.snags")}
        data={rows.map((r) => ({ project: String(r["code"]), open: num(r["open"]), fixed: num(r["fixed"]), verified: num(r["verified"]) }))}
        xKey="project"
        stacked
        format={COUNT_FORMAT}
        series={[
          { key: "open", label: t("reports.v.snagStatus.OPEN") },
          { key: "fixed", label: t("reports.v.snagStatus.FIXED") },
          { key: "verified", label: t("reports.v.snagStatus.VERIFIED") },
        ]}
      />
    </div>
  );
}

/** The table of a Step 18 report with its custom cells (delay reasons from the structured data). */
export function ReportTableFor({ name, report, loading, error, onRetry }: { name: Step18ReportName; report: ReportTable | undefined; loading?: boolean; error?: unknown; onRetry?: () => void }) {
  const t = useT();
  const labels = useReportLabels();
  const render: Record<string, (row: Record<string, ReportCell>) => ReactNode> = {};
  if (name === "delay-analysis") {
    render["topReasons"] = (row) => {
      const p = report?.extra?.projects?.find((x) => x.code === row["code"]);
      return (
        <bdi>
          {(p?.reasons ?? [])
            .slice(0, 3)
            .map((r) => `${labels.value("reason", r.reason)} ${r.days}`)
            .join(" · ") || "—"}
        </bdi>
      );
    };
  }
  const count = report?.rows.length ?? 0;
  return (
    <ReportTableCard
      title={report ? (count === 1 ? t("reports.common.oneRow") : t("reports.common.rows", { n: count })) : t(REPORTS[name].titleKey)}
      columns={report?.columns ?? []}
      rows={report?.rows}
      totals={report?.totals}
      loading={loading}
      error={error}
      onRetry={onRetry}
      render={render}
    />
  );
}

/** Whether the reader is missing a money permission this report would show. */
function useMoneyHidden(name: Step18ReportName) {
  const me = useMe();
  const rates = canSeeField(me, "rates");
  const amounts = canSeeField(me, "amounts");
  if (name === "variance") return !rates || !amounts || !canSeeField(me, "contract") || !canSeeField(me, "profit");
  if (name === "change-orders") return !rates && !amounts;
  if (name === "equipment-utilisation") return !rates;
  if (name === "snags") return !amounts;
  return false;
}

/**
 * Reports → a Step 18 report: filters (project / dates + the report's own), charts, the table,
 * CSV / Excel / PDF with the same filters, and — for delay, variance and snags — the picked
 * project's full report (book) with its own export.
 */
export function Step18ReportView({ name }: { name: Step18ReportName }) {
  const t = useT();
  const labels = useReportLabels();
  const def = REPORTS[name];
  const title = t(def.titleKey);
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_REPORT_FILTERS);
  const [extra, setExtra] = useState<Extra>(EMPTY_EXTRA);
  const params = {
    ...reportParams({ projectId: filters.projectId, from: def.dates ? filters.from : "", to: def.dates ? filters.to : "" }),
    ...(name === "change-orders" && extra.status ? { status: extra.status as (typeof CO_STATUSES)[number] } : {}),
    ...(name === "change-orders" && extra.type ? { type: extra.type as (typeof CO_TYPES)[number] } : {}),
    ...(name === "equipment-utilisation" && extra.category ? { category: extra.category as (typeof CATEGORIES)[number] } : {}),
    ...(name === "equipment-utilisation" && extra.group ? { group: extra.group as "item" | "category" } : {}),
  };
  const q = useGetReportQuery({ name, ...params }, { refetchOnMountOrArgChange: true });
  const report = q.data;
  const moneyHidden = useMoneyHidden(name);
  const book = (BOOK_REPORTS as readonly string[]).includes(name) ? (name as ReportBookName) : null;
  const clear = (f: ReportFilters) => {
    setFilters(f);
    if (!f.projectId && !f.from && !f.to) setExtra(EMPTY_EXTRA);
  };
  const period = report?.extra?.from && report.extra.to ? t("reports.common.period", { from: formatDate(report.extra.from), to: formatDate(report.extra.to), n: report.extra.days ?? 0 }) : null;

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={t(def.descriptionKey)} breadcrumbs={[{ label: t("crumb.reports") }, { label: title }]} actions={<ExportMenu name={name} filters={params} disabled={!report} />} />
      <ReportFilterBar value={filters} onChange={clear} showProject showDates={def.dates} dateLabel={name === "equipment-utilisation" ? t("reports.filter.last30") : undefined}>
        {name === "change-orders" ? (
          <>
            <FilterSelect label={t("reports.filter.status")} value={extra.status} onChange={(status) => setExtra({ ...extra, status })} allLabel={t("reports.filter.allStatuses")} options={CO_STATUSES.map((v) => ({ value: v, label: labels.value("coStatus", v)! }))} />
            <FilterSelect label={t("reports.filter.type")} value={extra.type} onChange={(type) => setExtra({ ...extra, type })} allLabel={t("reports.filter.allTypes")} options={CO_TYPES.map((v) => ({ value: v, label: labels.value("coType", v)! }))} />
          </>
        ) : null}
        {name === "equipment-utilisation" ? (
          <>
            <FilterSelect label={t("reports.filter.category")} value={extra.category} onChange={(category) => setExtra({ ...extra, category })} allLabel={t("reports.filter.allCategories")} options={CATEGORIES.map((v) => ({ value: v, label: labels.value("category", v)! }))} />
            <FilterSelect
              label={t("reports.filter.group")}
              value={extra.group}
              onChange={(group) => setExtra({ ...extra, group })}
              allLabel={t("reports.filter.item")}
              options={[{ value: "category", label: t("reports.filter.byCategory") }]}
            />
          </>
        ) : null}
      </ReportFilterBar>
      <InlineAlert tone="info">
        <p>{t(`reports.notes.${name}`)}</p>
        {period ? <p className="mt-1 text-xs">{period}</p> : <p className="mt-1 text-xs">{t("reports.common.asOf", { date: formatDate(report?.generatedAt?.slice(0, 10) ?? "") })}</p>}
        {moneyHidden ? <p className="mt-1 text-xs">{t("reports.common.moneyHidden")}</p> : null}
      </InlineAlert>
      {report && report.rows.length ? <ReportVisuals name={name} report={report} /> : null}
      <ReportTableFor name={name} report={report} loading={q.isLoading || q.isFetching} error={q.error} onRetry={q.refetch} />
      {book ? filters.projectId ? <ReportBookPanel name={book} projectId={filters.projectId} from={name === "snags" ? filters.from || undefined : undefined} to={name === "snags" ? filters.to || undefined : undefined} /> : <p className="text-sm text-muted-foreground">{t("reports.common.pickProject")}</p> : null}
    </div>
  );
}
