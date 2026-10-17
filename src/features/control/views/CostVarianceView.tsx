"use client";

import { Calculator, Percent, TrendingDown, TrendingUp } from "lucide-react";
import { useGetCostVarianceQuery } from "@/api/services/control.api";
import type { CostBucketRow, CostVariance, Projection } from "@/api/types";
import { BarChartCard, plotPaisa } from "@/components/common/Charts";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { SectionCard } from "@/components/common/SectionCard";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useEnumT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { formatPKRShort } from "@/lib/money";
import { BucketBadge, ControlAlertsCard, ControlSetupHints, PercentBar, SignedPercent } from "../components/ControlShared";

/** Projected margin at completion (shown only when the API sent it). */
export function ProjectionCard({ p }: { p: Projection }) {
  const t = useT();
  const rows: Array<[string, string | null]> = [
    [t("control.cost.contract"), p.contractPaisa],
    [t("control.cost.approvedChanges"), p.approvedChangesPaisa],
    [t("control.cost.revisedContract"), p.revisedContractPaisa],
    [t("control.cost.budget"), p.budgetAtCompletionPaisa],
    [t("control.cost.actualToDate"), p.actualToDatePaisa],
    [t("control.cost.earnedValue"), p.earnedValuePaisa],
    [t("control.cost.eac"), p.estimateAtCompletionPaisa],
    [t("control.cost.remaining"), p.remainingCostPaisa],
  ];
  const negative = (p.projectedMarginPercent ?? 0) < 0;
  return (
    <SectionCard title={t("control.cost.projectionTitle")} description={t("control.cost.projectionDesc")}>
      <div className="space-y-4" data-testid="projection">
        <div>
          <p className="text-sm text-muted-foreground">{t("control.cost.margin")}</p>
          <p className={cn("text-2xl font-semibold", negative ? "text-danger" : "text-success")}>
            {p.projectedMarginPercent === null ? t("control.cost.notYet") : `${p.projectedMarginPercent}%`}
            {p.projectedMarginPaisa ? <span className="ms-2 text-base font-medium text-muted-foreground">{formatPKRShort(p.projectedMarginPaisa)}</span> : null}
          </p>
          <p className="text-xs text-muted-foreground">{p.note}</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value === null ? "—" : <MoneyText paisa={value} short />}</dd>
            </div>
          ))}
          <div>
            <dt className="text-muted-foreground">{t("control.cost.cpi")}</dt>
            <dd className="tabular font-medium">{p.costPerformanceIndex ?? "—"}</dd>
          </div>
        </dl>
      </div>
    </SectionCard>
  );
}

/** Cost variance content (fixture-testable). Money columns only when the API sent them. */
export function CostVarianceBoard({ data }: { data: CostVariance }) {
  const t = useT();
  const te = useEnumT();
  const money = data.totals !== undefined;
  const columns: Column<CostBucketRow>[] = [
    { id: "bucket", header: t("control.cost.bucket"), cell: (r) => <span className="font-medium">{te("controlBucket", r.bucket)}</span> },
    { id: "total", header: t("control.cost.estimateTotal"), align: "right", hidden: !money, cell: (r) => <MoneyText paisa={r.estimateTotalPaisa} short /> },
    { id: "toDate", header: t("control.cost.estimateToDate"), align: "right", hidden: !money, cell: (r) => <MoneyText paisa={r.estimateToDatePaisa} short /> },
    { id: "actual", header: t("control.cost.actual"), align: "right", hidden: !money, cell: (r) => <MoneyText paisa={r.actualPaisa} short className="font-semibold" /> },
    {
      id: "variance",
      header: t("control.cost.variance"),
      align: "right",
      hidden: !money,
      cell: (r) => (
        <div>
          <MoneyText paisa={r.variancePaisa} short className={Number(r.variancePaisa ?? 0) > 0 ? "text-danger" : undefined} />
          <p className="text-xs">
            <SignedPercent value={r.variancePercent} />
          </p>
        </div>
      ),
    },
    { id: "status", header: t("control.cost.status"), cell: (r) => <BucketBadge status={r.status} /> },
  ];
  const tot = data.totals;
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {t("control.common.asOf", { date: formatDate(data.asOf) })}
        {data.estimate ? ` · ${t("control.common.estimateRev", { n: data.estimate.revision })}` : ""}
        {" · "}
        {t("control.common.basis", { basis: te("progressBasis", data.progress.basis) })}
      </p>
      <ControlSetupHints projectId={data.project.id} hasSchedule={data.hasSchedule} hasEstimate={Boolean(data.estimate)} />
      {!money ? <InlineAlert tone="info">{t("control.common.moneyHidden")}</InlineAlert> : null}

      <KpiGroup columns="grid-cols-2 lg:grid-cols-4" ariaLabel={t("control.cost.title")}>
        <KpiCard variant="tile" label={t("control.common.progress")} icon={Percent} value={`${data.progress.percent}%`} />
        {tot ? (
          <>
            <KpiCard variant="tile" label={t("control.cost.estimateToDate")} icon={Calculator} value={<MoneyText paisa={tot.estimateToDatePaisa} short />} />
            <KpiCard variant="tile" label={t("control.cost.actual")} icon={Calculator} value={<MoneyText paisa={tot.actualPaisa} short />} />
            <KpiCard
              variant="tile"
              label={t("control.cost.variance")}
              icon={Number(tot.variancePaisa) > 0 ? TrendingUp : TrendingDown}
              tone={Number(tot.variancePaisa) > 0 ? "danger" : "success"}
              value={<MoneyText paisa={tot.variancePaisa} short />}
              hint={<SignedPercent value={tot.variancePercent} />}
            />
          </>
        ) : null}
      </KpiGroup>

      {money ? (
        <BarChartCard
          title={t("control.cost.chartTitle")}
          description={t("control.cost.chartDesc")}
          xKey="label"
          data={data.buckets.map((b) => ({ label: te("controlBucket", b.bucket), estimate: plotPaisa(b.estimateToDatePaisa), actual: plotPaisa(b.actualPaisa) }))}
          series={[
            { key: "estimate", label: t("control.cost.estimateToDate") },
            { key: "actual", label: t("control.cost.actual") },
          ]}
          empty={data.buckets.every((b) => b.estimateToDatePaisa === "0" && b.actualPaisa === "0")}
        />
      ) : null}

      <SectionCard title={t("control.cost.title")} description={t("control.cost.desc")} flush>
        <DataTable rows={data.buckets} columns={columns} getRowId={(r) => r.bucket} clientPageSize={0} empty={{ title: t("control.common.loadFailed") }} />
      </SectionCard>

      {data.labourCombined ? (
        <InlineAlert tone="info" title={t("control.cost.labourCombined")}>
          {t("control.cost.labourCombinedDesc", {
            estimate: formatPKRShort(data.labourCombined.estimateToDatePaisa),
            actual: formatPKRShort(data.labourCombined.actualPaisa),
            variance: data.labourCombined.variancePercent === null ? "—" : `${data.labourCombined.variancePercent > 0 ? "+" : ""}${data.labourCombined.variancePercent}%`,
          })}
        </InlineAlert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title={t("control.cost.stagesTitle")}>
          <ul className="space-y-2 text-sm">
            {data.stages.map((s) => (
              <li key={s.stageKey} className="flex flex-wrap items-center justify-between gap-2">
                <span>{te("scheduleStage", s.stageKey)}</span>
                <span className="flex items-center gap-3">
                  {s.estimatePaisa !== undefined ? <MoneyText paisa={s.estimatePaisa} short className="text-xs text-muted-foreground" /> : null}
                  <PercentBar value={s.progressPercent} label={te("scheduleStage", s.stageKey)} />
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
        {data.projection ? <ProjectionCard p={data.projection} /> : null}
      </div>
    </div>
  );
}

/** Project → Control → Cost Variance. */
export function CostVarianceView({ projectId }: { projectId: string }) {
  const t = useT();
  const { data, isLoading } = useGetCostVarianceQuery(projectId);
  return (
    <ProjectPageShell projectId={projectId} crumb={t("control.crumb.cost")}>
      {() => (
        <div className="space-y-5">
          {isLoading ? (
            <CardsSkeleton count={3} height="h-32" />
          ) : data ? (
            <CostVarianceBoard data={data} />
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
