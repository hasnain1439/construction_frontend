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
import { cn } from "@/lib/cn";
import { formatDate, formatMonth } from "@/lib/dates";
import { formatPKRShort, sumPaisa } from "@/lib/money";

const negative = (p: string) => p.startsWith("-");

// ─── Cash flow outlook ──────────────────────────────────────────────────────

type Horizon = "3" | "6" | "12";

/** Finance → Cash Flow Outlook: an honest estimate with its rules shown, never hidden. */
export function CashFlowView() {
  const [months, setMonths] = useState<Horizon>("6");
  const q = useGetCashFlowQuery({ months: Number(months) }, { refetchOnMountOrArgChange: 60 });
  const columns: Column<CashFlowMonth>[] = [
    { id: "month", header: "Month", cell: (m) => <span className="font-medium">{formatMonth(m.month)}</span> },
    {
      id: "in",
      header: "Expected in",
      align: "right",
      cell: (m) => (
        <span>
          <MoneyText paisa={m.expectedReceipts.totalPaisa} className="font-semibold text-success" />
          <span className="block text-xs text-muted-foreground">
            invoices {formatPKRShort(m.expectedReceipts.invoicesPaisa)} · stages {formatPKRShort(m.expectedReceipts.stagesPaisa)}
          </span>
        </span>
      ),
    },
    {
      id: "out",
      header: "Planned out",
      align: "right",
      cell: (m) => (
        <span>
          <MoneyText paisa={m.plannedOutflows.totalPaisa} className="font-semibold text-warning" />
          <span className="block text-xs text-muted-foreground">
            suppliers {formatPKRShort(m.plannedOutflows.suppliersPaisa)} · wages {formatPKRShort(m.plannedOutflows.wagesPaisa)} · sub-contract {formatPKRShort(m.plannedOutflows.subcontractPaisa)} · kharcha {formatPKRShort(m.plannedOutflows.expensesPaisa)}
          </span>
        </span>
      ),
    },
    { id: "net", header: "Net", align: "right", cell: (m) => <MoneyText paisa={m.netPaisa} className={cn("font-semibold", negative(m.netPaisa) ? "text-danger" : "text-success")} /> },
    { id: "own", header: "Own money after", align: "right", cell: (m) => <MoneyText paisa={m.ownMoneyInvestedAfterPaisa} /> },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Flow Outlook"
        description="Estimate — what is expected to come in and go out, from today’s data."
        breadcrumbs={[{ label: "Finance" }, { label: "Cash Flow Outlook" }]}
        actions={<SegmentedControl<Horizon> ariaLabel="Months ahead" value={months} onChange={setMonths} options={[{ value: "3", label: "3 months" }, { value: "6", label: "6 months" }, { value: "12", label: "12 months" }]} />}
      />
      <InlineAlert tone="info">This is an estimate, not a forecast you can bank on — see “How this is estimated” below.</InlineAlert>
      <QueryState query={q} skeleton={<CardsSkeleton count={4} height="h-32" />}>
        {(d) => {
          const totalIn = sumPaisa(d.months.map((m) => m.expectedReceipts.totalPaisa));
          const totalOut = sumPaisa(d.months.map((m) => m.plannedOutflows.totalPaisa));
          const net = sumPaisa(d.months.map((m) => m.netPaisa));
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Expected in" icon={ArrowDownRight} tone="success" value={formatPKRShort(totalIn)} hint={`${d.months.length} months`} />
                <KpiCard label="Planned out" icon={ArrowUpRight} tone="warning" value={formatPKRShort(totalOut)} hint="Suppliers + wages + sub-contract + kharcha" />
                <KpiCard label="Net" icon={Scale} tone={negative(net) ? "danger" : "success"} value={formatPKRShort(net)} />
                <KpiCard label="Own money invested" icon={Wallet} value={formatPKRShort(d.openingOwnMoneyInvestedPaisa)} hint={`→ ${formatPKRShort(d.closingOwnMoneyInvestedPaisa)} by ${formatMonth(d.months.at(-1)?.month ?? "")}`} />
              </div>
              <AreaChartCard
                title="Expected in vs planned out"
                description="Per month. Own money invested after each month is in the table below (a different scale, so not on this chart)."
                xKey="label"
                data={d.months.map((m) => ({
                  label: formatMonth(m.month),
                  receipts: plotPaisa(m.expectedReceipts.totalPaisa),
                  outflows: plotPaisa(m.plannedOutflows.totalPaisa),
                }))}
                series={[
                  { key: "receipts", label: "Expected in", kind: "bar" },
                  { key: "outflows", label: "Planned out", kind: "bar" },
                ]}
              />
              <SectionCard flush title="Month by month">
                <DataTable rows={d.months} columns={columns} getRowId={(m) => m.month} clientPageSize={0} empty={{ title: "Nothing to show" }} />
              </SectionCard>
              <SectionCard title={<span className="flex items-center gap-2"><Info className="size-4 text-primary" aria-hidden />How this is estimated</span>}>
                <ul className="list-disc space-y-1.5 pl-5 text-sm">
                  {d.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-muted-foreground">
                  Weekly run-rate used: wages {formatPKRShort(d.weeklyRunRate.wagesPaisa)} · sub-contract {formatPKRShort(d.weeklyRunRate.subcontractPaisa)} · kharcha {formatPKRShort(d.weeklyRunRate.expensesPaisa)}.
                  {d.beyondHorizonReceiptsPaisa !== "0" ? ` ${formatPKRShort(d.beyondHorizonReceiptsPaisa)} is expected after this period.` : ""}
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

export const BUCKET_LABEL: Record<PnlBucket, string> = {
  MATERIALS: "Materials",
  LABOR_WAGES: "Labour",
  SUBCONTRACT: "Sub-contract",
  SITE_OVERHEAD: "Site overhead",
  EQUIPMENT: "Equipment",
  LOSSES: "Losses",
};
const BUCKETS = Object.keys(BUCKET_LABEL) as PnlBucket[];
const PHASE2 = "Available after estimates (Phase 2)";

function PnlKpis({ totals }: { totals: { billedToDatePaisa: string; costToDatePaisa: string; grossProfitToDatePaisa: string; marginToDatePercent: number | null } }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Billed to date" icon={CircleDollarSign} value={formatPKRShort(totals.billedToDatePaisa)} hint="Before sales tax" />
      <KpiCard label="Cost to date" icon={Calculator} tone="warning" value={formatPKRShort(totals.costToDatePaisa)} />
      <KpiCard label="Gross profit to date" icon={TrendingUp} tone={negative(totals.grossProfitToDatePaisa) ? "danger" : "success"} value={formatPKRShort(totals.grossProfitToDatePaisa)} />
      <KpiCard label="Margin to date" icon={Percent} value={totals.marginToDatePercent === null ? "—" : `${totals.marginToDatePercent}%`} hint={`Projected margin: ${PHASE2}`} />
    </div>
  );
}

const bucketSlices = (cost: CostBuckets) => BUCKETS.map((b) => ({ key: b, label: BUCKET_LABEL[b], paisa: cost[b] }));

/** Finance → Profit & Loss: company totals, billed-vs-cost trend and every project. */
export function ProfitLossView() {
  const router = useRouter();
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_REPORT_FILTERS);
  const { projectId: _project, ...dates } = reportParams(filters);
  const q = useGetProfitAndLossQuery(dates, { refetchOnMountOrArgChange: 60 });
  const columns: Column<PnlProject>[] = [
    {
      id: "project",
      header: "Project",
      sortValue: (r) => r.project.name,
      cell: (r) => (
        <div>
          <p className="font-medium">{r.project.name}</p>
          <p className="text-xs text-muted-foreground">{[r.project.code, r.client?.name].filter(Boolean).join(" · ")}</p>
        </div>
      ),
    },
    { id: "billed", header: "Billed", align: "right", sortValue: (r) => Number(r.billedToDatePaisa), cell: (r) => <MoneyText paisa={r.billedToDatePaisa} short /> },
    ...BUCKETS.map<Column<PnlProject>>((b) => ({ id: b, header: BUCKET_LABEL[b], align: "right", cell: (r) => (r.cost[b] === "0" ? <span className="text-muted-foreground">—</span> : <MoneyText paisa={r.cost[b]} short />) })),
    { id: "cost", header: "Cost to date", align: "right", sortValue: (r) => Number(r.costToDatePaisa), cell: (r) => <MoneyText paisa={r.costToDatePaisa} short className="font-semibold" /> },
    {
      id: "gp",
      header: "Gross profit",
      align: "right",
      sortValue: (r) => Number(r.grossProfitToDatePaisa),
      cell: (r) => <MoneyText paisa={r.grossProfitToDatePaisa} short className={cn("font-semibold", negative(r.grossProfitToDatePaisa) ? "text-danger" : "text-success")} />,
    },
    { id: "margin", header: "Margin", align: "right", sortValue: (r) => r.marginToDatePercent ?? -999, cell: (r) => (r.marginToDatePercent === null ? "—" : `${r.marginToDatePercent}%`) },
    { id: "progress", header: "Billed vs spent", cell: (r) => <ProgressPair billed={r.percentBilled} spent={r.percentCostOfContract} /> },
    { id: "projected", header: "Projected margin", cell: () => <span className="text-xs text-muted-foreground">{PHASE2}</span> },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit & Loss"
        description="Billed vs cost to date, per project and for the company."
        breadcrumbs={[{ label: "Finance" }, { label: "Profit & Loss" }]}
        actions={<ExportMenu name="project-summary" filters={dates} />}
      />
      <ReportFilterBar value={filters} onChange={(f) => (f.projectId ? router.push(`/finance/profit-loss/${f.projectId}`) : setFilters(f))} dateLabel="All time" />
      <QueryState query={q} skeleton={<CardsSkeleton count={4} height="h-32" />}>
        {(d) => (
          <>
            <PnlKpis totals={d.totals} />
            <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
              <BarChartCard
                title="Billed vs cost by month"
                description="The last 12 months."
                xKey="label"
                data={d.trend.map((m) => ({ label: formatMonth(m.month), billed: plotPaisa(m.billedPaisa), cost: plotPaisa(m.costPaisa) }))}
                series={[
                  { key: "billed", label: "Billed" },
                  { key: "cost", label: "Cost" },
                ]}
                empty={d.trend.every((m) => m.billedPaisa === "0" && m.costPaisa === "0")}
              />
              <DonutChartCard title="Where the money went" description="Company cost to date by bucket." slices={bucketSlices(d.totals.cost)} totalLabel="Cost" />
            </div>
            <SectionCard flush title="Projects">
              <DataTable
                rows={d.projects}
                columns={columns}
                getRowId={(r) => r.project.id}
                clientPageSize={0}
                onRowClick={(r) => router.push(`/finance/profit-loss/${r.project.id}`)}
                empty={{ title: "No projects yet" }}
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
  const q = useGetProfitAndLossQuery({ projectId }, { refetchOnMountOrArgChange: 60 });
  const row = q.data?.projects[0];
  return (
    <div className="space-y-6">
      <PageHeader
        title={row ? `P&L — ${row.project.name}` : "Project P&L"}
        description={row ? `${row.project.code}${row.client ? ` · ${row.client.name}` : ""}` : undefined}
        breadcrumbs={[{ label: "Finance" }, { label: "Profit & Loss", href: "/finance/profit-loss" }, { label: row?.project.code ?? "Project" }]}
        actions={
          <Button asChild variant="outline">
            <Link href={`/projects/${projectId}/overview`}>Open project</Link>
          </Button>
        }
      />
      <QueryState query={q} skeleton={<CardsSkeleton count={4} height="h-32" />}>
        {(d) =>
          row ? (
            <>
              <PnlKpis totals={{ billedToDatePaisa: row.billedToDatePaisa, costToDatePaisa: row.costToDatePaisa, grossProfitToDatePaisa: row.grossProfitToDatePaisa, marginToDatePercent: row.marginToDatePercent }} />
              <div className="grid gap-4 xl:grid-cols-2">
                <DonutChartCard title="Cost by bucket" slices={bucketSlices(row.cost)} totalLabel="Cost to date" />
                <SectionCard title="Contract">
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Revised contract</dt>
                      <dd className="text-lg font-semibold"><MoneyText paisa={row.revisedContractPaisa} /></dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Received to date</dt>
                      <dd className="text-lg font-semibold"><MoneyText paisa={row.receivedToDatePaisa} /></dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="mb-1 text-muted-foreground">Billed vs spent of the contract</dt>
                      <dd><ProgressPair billed={row.percentBilled} spent={row.percentCostOfContract} /></dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Projected margin</dt>
                      <dd className="text-muted-foreground">{PHASE2}</dd>
                    </div>
                  </dl>
                </SectionCard>
              </div>
              <BarChartCard
                title="Billed vs cost by month"
                xKey="label"
                data={d.trend.map((m) => ({ label: formatMonth(m.month), billed: plotPaisa(m.billedPaisa), cost: plotPaisa(m.costPaisa) }))}
                series={[
                  { key: "billed", label: "Billed" },
                  { key: "cost", label: "Cost" },
                ]}
                empty={d.trend.every((m) => m.billedPaisa === "0" && m.costPaisa === "0")}
              />
              <p className="text-xs text-muted-foreground">As of {formatDate(d.period.to)}.</p>
            </>
          ) : (
            <SectionCard>
              <p className="text-sm text-muted-foreground">No P&L for this project.</p>
            </SectionCard>
          )
        }
      </QueryState>
    </div>
  );
}
