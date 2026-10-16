"use client";

import { ArrowDownRight, ArrowUpRight, Calculator, CircleDollarSign, Info, Percent, Scale, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGetCashFlowQuery, useGetProfitAndLossQuery } from "@/api/services/finance.api";
import type { CashFlowMonth, CostBuckets, PnlBucket, PnlProject } from "@/api/types";
import { AreaChartCard, BarChartCard, DonutChartCard, plotPaisa } from "@/components/common/Charts";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ExportMenu } from "@/components/common/ExportMenu";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { ProgressPair } from "@/components/common/ProgressPair";
import { QueryState } from "@/components/common/QueryState";
import { EMPTY_REPORT_FILTERS, ReportFilterBar, reportParams, type ReportFilters } from "@/components/common/ReportFilterBar";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useEnumT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatDate, formatMonth } from "@/lib/dates";
import { formatPKRShort, sumPaisa } from "@/lib/money";

const negative = (p: string) => p.startsWith("-");

// ─── Cash flow outlook ──────────────────────────────────────────────────────

type Horizon = "3" | "6" | "12";

/** Finance → Cash Flow Outlook: an honest estimate with its rules shown, never hidden. */
export function CashFlowView() {
  const t = useT();
  const [months, setMonths] = useState<Horizon>("6");
  const q = useGetCashFlowQuery({ months: Number(months) }, { refetchOnMountOrArgChange: 60 });
  const columns: Column<CashFlowMonth>[] = [
    { id: "month", header: t("billing.finance.colMonth"), cell: (m) => <span className="font-medium">{formatMonth(m.month)}</span> },
    {
      id: "in",
      header: t("billing.finance.expectedIn"),
      align: "right",
      cell: (m) => (
        <span>
          <MoneyText paisa={m.expectedReceipts.totalPaisa} className="font-semibold text-success" />
          <span className="block text-xs text-muted-foreground">
            {t("billing.finance.inBreakdown", { invoices: formatPKRShort(m.expectedReceipts.invoicesPaisa), stages: formatPKRShort(m.expectedReceipts.stagesPaisa) })}
          </span>
        </span>
      ),
    },
    {
      id: "out",
      header: t("billing.finance.plannedOut"),
      align: "right",
      cell: (m) => (
        <span>
          <MoneyText paisa={m.plannedOutflows.totalPaisa} className="font-semibold text-warning" />
          <span className="block text-xs text-muted-foreground">
            {t("billing.finance.outBreakdown", { suppliers: formatPKRShort(m.plannedOutflows.suppliersPaisa), wages: formatPKRShort(m.plannedOutflows.wagesPaisa), subcontract: formatPKRShort(m.plannedOutflows.subcontractPaisa), kharcha: formatPKRShort(m.plannedOutflows.expensesPaisa) })}
          </span>
        </span>
      ),
    },
    { id: "net", header: t("billing.finance.net"), align: "right", cell: (m) => <MoneyText paisa={m.netPaisa} className={cn("font-semibold", negative(m.netPaisa) ? "text-danger" : "text-success")} /> },
    { id: "own", header: t("billing.finance.ownMoneyAfter"), align: "right", cell: (m) => <MoneyText paisa={m.ownMoneyInvestedAfterPaisa} /> },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("billing.finance.cashFlowTitle")}
        description={t("billing.finance.cashFlowDesc")}
        breadcrumbs={[{ label: t("crumb.finance") }, { label: t("billing.finance.cashFlowTitle") }]}
        actions={<SegmentedControl<Horizon> ariaLabel={t("billing.finance.monthsAhead")} value={months} onChange={setMonths} options={(["3", "6", "12"] as const).map((n) => ({ value: n, label: t("billing.finance.nMonths", { n }) }))} />}
      />
      <InlineAlert tone="info">{t("billing.finance.estimateNote")}</InlineAlert>
      <QueryState query={q} skeleton={<CardsSkeleton count={4} height="h-32" />}>
        {(d) => {
          const totalIn = sumPaisa(d.months.map((m) => m.expectedReceipts.totalPaisa));
          const totalOut = sumPaisa(d.months.map((m) => m.plannedOutflows.totalPaisa));
          const net = sumPaisa(d.months.map((m) => m.netPaisa));
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label={t("billing.finance.expectedIn")} icon={ArrowDownRight} tone="success" value={formatPKRShort(totalIn)} hint={t("billing.finance.nMonths", { n: d.months.length })} />
                <KpiCard label={t("billing.finance.plannedOut")} icon={ArrowUpRight} tone="warning" value={formatPKRShort(totalOut)} hint={t("billing.finance.plannedOutHint")} />
                <KpiCard label={t("billing.finance.net")} icon={Scale} tone={negative(net) ? "danger" : "success"} value={formatPKRShort(net)} />
                <KpiCard label={t("billing.finance.ownMoneyInvested")} icon={Wallet} value={formatPKRShort(d.openingOwnMoneyInvestedPaisa)} hint={t("billing.finance.ownMoneyBy", { amount: formatPKRShort(d.closingOwnMoneyInvestedPaisa), month: formatMonth(d.months.at(-1)?.month ?? "") })} />
              </div>
              <AreaChartCard
                title={t("billing.finance.inVsOut")}
                description={t("billing.finance.inVsOutDesc")}
                xKey="label"
                data={d.months.map((m) => ({
                  label: formatMonth(m.month),
                  receipts: plotPaisa(m.expectedReceipts.totalPaisa),
                  outflows: plotPaisa(m.plannedOutflows.totalPaisa),
                }))}
                series={[
                  { key: "receipts", label: t("billing.finance.expectedIn"), kind: "bar" },
                  { key: "outflows", label: t("billing.finance.plannedOut"), kind: "bar" },
                ]}
              />
              <SectionCard flush title={t("billing.finance.monthByMonth")}>
                <DataTable rows={d.months} columns={columns} getRowId={(m) => m.month} clientPageSize={0} empty={{ title: t("billing.finance.nothingToShow") }} />
              </SectionCard>
              <SectionCard title={<span className="flex items-center gap-2"><Info className="size-4 text-primary" aria-hidden />{t("billing.finance.howEstimated")}</span>}>
                <ul className="list-disc space-y-1.5 ps-5 text-sm">
                  {d.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("billing.finance.runRate", { wages: formatPKRShort(d.weeklyRunRate.wagesPaisa), subcontract: formatPKRShort(d.weeklyRunRate.subcontractPaisa), kharcha: formatPKRShort(d.weeklyRunRate.expensesPaisa) })}
                  {d.beyondHorizonReceiptsPaisa !== "0" ? ` ${t("billing.finance.beyondHorizon", { amount: formatPKRShort(d.beyondHorizonReceiptsPaisa) })}` : null}
                </p>
              </SectionCard>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}

// ─── Profit & loss ──────────────────────────────────────────────────────────

/** Cost buckets in display order (labels: `te("pnlBucket", b)`). */
const BUCKETS: PnlBucket[] = ["MATERIALS", "LABOR_WAGES", "SUBCONTRACT", "SITE_OVERHEAD", "EQUIPMENT", "LOSSES"];

/** "12.3% (Rs 1.2 Cr)" or "Not enough data yet". */
function useProjected() {
  const t = useT();
  return (percent: number | null | undefined, paisa?: string | null) =>
    percent === null || percent === undefined ? t("billing.finance.projectedNotYet") : paisa ? `${percent}% (${formatPKRShort(paisa)})` : `${percent}%`;
}

function PnlKpis({ totals }: { totals: { billedToDatePaisa: string; costToDatePaisa: string; grossProfitToDatePaisa: string; marginToDatePercent: number | null; projectedMarginPercent?: number | null; projectedMarginPaisa?: string | null } }) {
  const t = useT();
  const projected = useProjected();
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label={t("billing.finance.billedToDate")} icon={CircleDollarSign} value={formatPKRShort(totals.billedToDatePaisa)} hint={t("billing.finance.beforeSalesTax")} />
      <KpiCard label={t("billing.finance.costToDate")} icon={Calculator} tone="warning" value={formatPKRShort(totals.costToDatePaisa)} />
      <KpiCard label={t("billing.finance.grossProfitToDate")} icon={TrendingUp} tone={negative(totals.grossProfitToDatePaisa) ? "danger" : "success"} value={formatPKRShort(totals.grossProfitToDatePaisa)} />
      <KpiCard label={t("billing.finance.marginToDate")} icon={Percent} value={totals.marginToDatePercent === null ? "—" : `${totals.marginToDatePercent}%`} hint={t("billing.finance.projectedMarginHint", { value: projected(totals.projectedMarginPercent, totals.projectedMarginPaisa) })} />
    </div>
  );
}

const bucketSlices = (cost: CostBuckets, te: ReturnType<typeof useEnumT>) => BUCKETS.map((b) => ({ key: b, label: te("pnlBucket", b), paisa: cost[b] }));

/** Finance → Profit & Loss: company totals, billed-vs-cost trend and every project. */
export function ProfitLossView() {
  const router = useRouter();
  const t = useT();
  const te = useEnumT();
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_REPORT_FILTERS);
  const { projectId: _project, ...dates } = reportParams(filters);
  const q = useGetProfitAndLossQuery(dates, { refetchOnMountOrArgChange: 60 });
  const columns: Column<PnlProject>[] = [
    {
      id: "project",
      header: t("field.project"),
      sortValue: (r) => r.project.name,
      cell: (r) => (
        <div>
          <p className="font-medium">{r.project.name}</p>
          <p className="text-xs text-muted-foreground">{[r.project.code, r.client?.name].filter(Boolean).join(" · ")}</p>
        </div>
      ),
    },
    { id: "billed", header: t("field.billed"), align: "right", sortValue: (r) => Number(r.billedToDatePaisa), cell: (r) => <MoneyText paisa={r.billedToDatePaisa} short /> },
    ...BUCKETS.map<Column<PnlProject>>((b) => ({ id: b, header: te("pnlBucket", b), align: "right", cell: (r) => (r.cost[b] === "0" ? <span className="text-muted-foreground">—</span> : <MoneyText paisa={r.cost[b]} short />) })),
    { id: "cost", header: t("billing.finance.costToDate"), align: "right", sortValue: (r) => Number(r.costToDatePaisa), cell: (r) => <MoneyText paisa={r.costToDatePaisa} short className="font-semibold" /> },
    {
      id: "gp",
      header: t("billing.finance.grossProfit"),
      align: "right",
      sortValue: (r) => Number(r.grossProfitToDatePaisa),
      cell: (r) => <MoneyText paisa={r.grossProfitToDatePaisa} short className={cn("font-semibold", negative(r.grossProfitToDatePaisa) ? "text-danger" : "text-success")} />,
    },
    { id: "margin", header: t("billing.finance.margin"), align: "right", sortValue: (r) => r.marginToDatePercent ?? -999, cell: (r) => (r.marginToDatePercent === null ? "—" : `${r.marginToDatePercent}%`) },
    { id: "progress", header: t("billing.finance.billedVsSpent"), cell: (r) => <ProgressPair billed={r.percentBilled} spent={r.percentCostOfContract} /> },
    {
      id: "projected",
      header: t("billing.finance.projectedMargin"),
      align: "right",
      sortValue: (r) => r.projectedMarginPercent ?? -999,
      cell: (r) =>
        r.projectedMarginPercent === null ? (
          <span className="text-xs text-muted-foreground" title={r.projectedMarginNote}>{t("billing.finance.projectedNotYet")}</span>
        ) : (
          <span className={cn("font-semibold", r.projectedMarginPercent < 0 ? "text-danger" : undefined)} title={r.projectedMarginNote}>
            {r.projectedMarginPercent}%
          </span>
        ),
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("billing.finance.pnlTitle")}
        description={t("billing.finance.pnlDesc")}
        breadcrumbs={[{ label: t("crumb.finance") }, { label: t("billing.finance.pnlTitle") }]}
        actions={<ExportMenu name="project-summary" filters={dates} />}
      />
      <ReportFilterBar value={filters} onChange={(f) => (f.projectId ? router.push(`/finance/profit-loss/${f.projectId}`) : setFilters(f))} dateLabel={t("field.allTime")} />
      <QueryState query={q} skeleton={<CardsSkeleton count={4} height="h-32" />}>
        {(d) => (
          <>
            <PnlKpis totals={d.totals} />
            <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
              <BarChartCard
                title={t("billing.finance.billedVsCost")}
                description={t("billing.finance.last12Months")}
                xKey="label"
                data={d.trend.map((m) => ({ label: formatMonth(m.month), billed: plotPaisa(m.billedPaisa), cost: plotPaisa(m.costPaisa) }))}
                series={[
                  { key: "billed", label: t("field.billed") },
                  { key: "cost", label: t("billing.finance.cost") },
                ]}
                empty={d.trend.every((m) => m.billedPaisa === "0" && m.costPaisa === "0")}
              />
              <DonutChartCard title={t("billing.finance.whereMoneyWent")} description={t("billing.finance.whereMoneyWentDesc")} slices={bucketSlices(d.totals.cost, te)} totalLabel={t("billing.finance.cost")} />
            </div>
            <SectionCard flush title={t("field.projects")}>
              <DataTable
                rows={d.projects}
                columns={columns}
                getRowId={(r) => r.project.id}
                clientPageSize={0}
                onRowClick={(r) => router.push(`/finance/profit-loss/${r.project.id}`)}
                empty={{ title: t("billing.finance.noProjects") }}
                defaultSort={{ id: "gp", direction: "desc" }}
              />
            </SectionCard>
          </>
        )}
      </QueryState>
    </div>
  );
}

/** One project's P&L: totals, cost donut and its trend. */
export function ProjectProfitView({ projectId }: { projectId: string }) {
  const t = useT();
  const projected = useProjected();
  const te = useEnumT();
  const q = useGetProfitAndLossQuery({ projectId }, { refetchOnMountOrArgChange: 60 });
  const row = q.data?.projects[0];
  return (
    <div className="space-y-6">
      <PageHeader
        title={row ? t("billing.finance.projectPnlTitle", { name: row.project.name }) : t("billing.finance.projectPnl")}
        description={row ? `${row.project.code}${row.client ? ` · ${row.client.name}` : ""}` : undefined}
        breadcrumbs={[{ label: t("crumb.finance") }, { label: t("billing.finance.pnlTitle"), href: "/finance/profit-loss" }, { label: row?.project.code ?? t("field.project") }]}
        actions={
          <Button asChild variant="outline">
            <Link href={`/projects/${projectId}/overview`}>{t("billing.finance.openProject")}</Link>
          </Button>
        }
      />
      <QueryState query={q} skeleton={<CardsSkeleton count={4} height="h-32" />}>
        {(d) =>
          row ? (
            <>
              <PnlKpis totals={{ billedToDatePaisa: row.billedToDatePaisa, costToDatePaisa: row.costToDatePaisa, grossProfitToDatePaisa: row.grossProfitToDatePaisa, marginToDatePercent: row.marginToDatePercent, projectedMarginPercent: row.projectedMarginPercent, projectedMarginPaisa: row.projectedMarginPaisa }} />
              <div className="grid gap-4 xl:grid-cols-2">
                <DonutChartCard title={t("billing.finance.costByBucket")} slices={bucketSlices(row.cost, te)} totalLabel={t("billing.finance.costToDate")} />
                <SectionCard title={t("field.contract")}>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground">{t("billing.finance.revisedContract")}</dt>
                      <dd className="text-lg font-semibold"><MoneyText paisa={row.revisedContractPaisa} /></dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t("billing.finance.receivedToDate")}</dt>
                      <dd className="text-lg font-semibold"><MoneyText paisa={row.receivedToDatePaisa} /></dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="mb-1 text-muted-foreground">{t("billing.finance.billedVsSpentContract")}</dt>
                      <dd><ProgressPair billed={row.percentBilled} spent={row.percentCostOfContract} /></dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">{t("billing.finance.projectedMargin")}</dt>
                      <dd className={cn("text-lg font-semibold", (row.projectedMarginPercent ?? 0) < 0 && "text-danger")} data-testid="projected-margin">
                        {projected(row.projectedMarginPercent, row.projectedMarginPaisa)}
                      </dd>
                      <dd className="text-xs text-muted-foreground">{row.projectedMarginNote}</dd>
                    </div>
                  </dl>
                </SectionCard>
              </div>
              <BarChartCard
                title={t("billing.finance.billedVsCost")}
                xKey="label"
                data={d.trend.map((m) => ({ label: formatMonth(m.month), billed: plotPaisa(m.billedPaisa), cost: plotPaisa(m.costPaisa) }))}
                series={[
                  { key: "billed", label: t("field.billed") },
                  { key: "cost", label: t("billing.finance.cost") },
                ]}
                empty={d.trend.every((m) => m.billedPaisa === "0" && m.costPaisa === "0")}
              />
              <p className="text-xs text-muted-foreground">{t("billing.finance.asOf", { date: formatDate(d.period.to) })}</p>
            </>
          ) : (
            <SectionCard>
              <p className="text-sm text-muted-foreground">{t("billing.finance.noPnl")}</p>
            </SectionCard>
          )
        }
      </QueryState>
    </div>
  );
}
