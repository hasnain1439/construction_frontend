"use client";

import { Boxes, PackageCheck, PackageMinus, PackagePlus, Wallet } from "lucide-react";
import { useState } from "react";
import { useGetMaterialVarianceQuery } from "@/api/services/control.api";
import type { MaterialVariance, MaterialVarianceItem } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { SectionCard } from "@/components/common/SectionCard";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useEnumT, useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { formatPKRShort } from "@/lib/money";
import { formatQty } from "@/lib/quantity";
import { ControlAlertsCard, SignedPercent, VarianceBadge } from "../components/ControlShared";

const ALL = "ALL";

const qtyOr = (v: number | null, unit: string) => (v === null ? "—" : formatQty(v, unit));

/** Material variance content (fixture-testable). Rupee columns only when the API sent them. */
export function MaterialVarianceBoard({ data, milestoneId, onMilestone }: { data: MaterialVariance; milestoneId: string; onMilestone: (id: string) => void }) {
  const t = useT();
  const te = useEnumT();
  const showMoney = data.totals !== undefined;
  const perMilestone = Boolean(data.milestone);

  const columns: Column<MaterialVarianceItem>[] = [
    {
      id: "material",
      header: t("control.material.material"),
      sortValue: (r) => r.description,
      cell: (r) => (
        <div>
          <bdi className="font-medium">{r.description}</bdi>
          {r.ownerSupplied ? <p className="text-xs text-muted-foreground">{t("control.material.ownerSupplied")}</p> : null}
        </div>
      ),
    },
    {
      id: "estimated",
      header: t("control.material.estimated"),
      align: "right",
      cell: (r) => (
        <div>
          <span className="tabular">{qtyOr(r.estimatedToDateQty, r.unit)}</span>
          <p className="text-xs text-muted-foreground">{t("control.material.estimatedTotal", { total: formatQty(r.estimatedTotalQty, r.unit) })}</p>
        </div>
      ),
    },
    { id: "delivered", header: t("control.material.delivered"), align: "right", hidden: perMilestone, cell: (r) => qtyOr(r.deliveredQty, r.unit) },
    { id: "used", header: t("control.material.used"), align: "right", cell: (r) => formatQty(r.usedQty, r.unit) },
    { id: "loss", header: t("control.material.loss"), align: "right", hidden: perMilestone, cell: (r) => qtyOr(r.lossQty, r.unit) },
    { id: "stock", header: t("control.material.stock"), align: "right", hidden: perMilestone, cell: (r) => qtyOr(r.inStockQty, r.unit) },
    {
      id: "variance",
      header: t("control.material.variance"),
      align: "right",
      sortValue: (r) => r.variancePercent ?? -999,
      cell: (r) => (
        <div>
          <span className="tabular">{r.varianceQty === null ? "—" : formatQty(r.varianceQty, r.unit)}</span>
          <p className="text-xs">
            <SignedPercent value={r.variancePercent} />
          </p>
        </div>
      ),
    },
    {
      id: "impact",
      header: t("control.material.impact"),
      align: "right",
      hidden: !showMoney,
      sortValue: (r) => Number(r.impactPaisa ?? 0),
      cell: (r) =>
        r.impactPaisa === null || r.impactPaisa === undefined ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div>
            <MoneyText paisa={r.impactPaisa} short className={Number(r.impactPaisa) > 0 ? "font-semibold text-danger" : "font-semibold"} />
            <p className="text-xs text-muted-foreground">
              {t("control.material.qtyImpact", { amount: formatPKRShort(r.quantityImpactPaisa ?? "0") })}
              {" · "}
              {t("control.material.priceImpact", { amount: formatPKRShort(r.priceImpactPaisa ?? "0") })}
            </p>
          </div>
        ),
    },
    { id: "status", header: t("control.material.status"), cell: (r) => <VarianceBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t("control.common.asOf", { date: formatDate(data.asOf) })}
          {" · "}
          {t("control.common.threshold", { n: data.thresholdPercent })}
          {data.estimate ? ` · ${t("control.common.estimateRev", { n: data.estimate.revision })}` : ""}
        </p>
        {data.milestones.length ? (
          <div className="w-full sm:w-72">
            <Select value={milestoneId} onValueChange={onMilestone}>
              <SelectTrigger aria-label={t("control.material.filter")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("control.material.allMilestones")}</SelectItem>
                {data.milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {`${m.name} · ${te("scheduleStage", m.stageKey)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {!data.hasSchedule ? <InlineAlert tone="warning" title={t("control.common.noSchedule")}>{t("control.common.noScheduleNote")}</InlineAlert> : null}
      {!data.estimate ? <InlineAlert tone="info">{t("control.common.noEstimate")}</InlineAlert> : null}
      {perMilestone ? <p className="text-xs text-muted-foreground">{t("control.material.siteLevel")}</p> : null}

      <KpiGroup columns="grid-cols-2 lg:grid-cols-4" ariaLabel={t("control.material.title")}>
        <KpiCard variant="tile" label={t("control.material.over")} icon={PackagePlus} value={data.counts.over} tone={data.counts.over ? "danger" : "success"} />
        <KpiCard variant="tile" label={t("control.material.under")} icon={PackageMinus} value={data.counts.under} tone={data.counts.under ? "warning" : "success"} />
        <KpiCard variant="tile" label={t("control.material.onTrack")} icon={PackageCheck} value={data.counts.onTrack} />
        {showMoney ? (
          <KpiCard
            variant="tile"
            label={t("control.material.totalImpact")}
            icon={Wallet}
            value={<MoneyText paisa={data.totals!.impactPaisa} short />}
            tone={Number(data.totals!.impactPaisa) > 0 ? "danger" : "success"}
            hint={t("control.material.totalImpactHint", { qty: formatPKRShort(data.totals!.quantityImpactPaisa), price: formatPKRShort(data.totals!.priceImpactPaisa) })}
          />
        ) : (
          <KpiCard variant="tile" label={t("control.common.progress")} value={t("control.common.progressValue", { n: data.progress.percent })} hint={t("control.common.moneyHidden")} />
        )}
      </KpiGroup>

      <SectionCard
        title={data.milestone ? data.milestone.name : t("control.material.title")}
        description={`${t("control.material.desc")} ${t("control.common.basis", { basis: te("progressBasis", data.progress.basis) })}`}
        flush
      >
        <DataTable
          rows={data.items}
          columns={columns}
          getRowId={(r) => `${r.materialId ?? r.estimateKey ?? r.description}:${r.unit}`}
          clientPageSize={0}
          empty={{ title: t("control.material.emptyTitle"), description: t("control.material.emptyDesc"), icon: Boxes }}
        />
      </SectionCard>
    </div>
  );
}

/** Project → Control → Material Variance. */
export function MaterialVarianceView({ projectId }: { projectId: string }) {
  const t = useT();
  const [milestoneId, setMilestoneId] = useState(ALL);
  const { data, isLoading } = useGetMaterialVarianceQuery({ projectId, ...(milestoneId === ALL ? {} : { milestoneId }) });
  return (
    <ProjectPageShell projectId={projectId} crumb={t("control.crumb.material")}>
      {() => (
        <div className="space-y-5">
          {isLoading ? (
            <CardsSkeleton count={3} height="h-32" />
          ) : data ? (
            <MaterialVarianceBoard data={data} milestoneId={milestoneId} onMilestone={setMilestoneId} />
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
