"use client";

import { Boxes, CalendarRange } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useGetScheduleQuotasQuery } from "@/api/services/schedule.api";
import type { MaterialQuotaTotal, ScheduleQuotas } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useEnumT, useT } from "@/i18n/useT";
import { errorCode } from "@/lib/apiErrors";
import { projectHref } from "@/lib/navigation";
import { formatQty } from "@/lib/quantity";
import { QuotaTable } from "../components/MilestonePanel";
import { useDateRange, useMilestoneName } from "../labels";

/** "No schedule yet — open the Gantt" for pages that need one. */
export function NoSchedule({ projectId }: { projectId: string }) {
  const t = useT();
  return (
    <SectionCard>
      <EmptyState
        icon={CalendarRange}
        title={t("schedule.common.noSchedule")}
        description={t("schedule.common.noScheduleDesc")}
        action={
          <Button asChild variant="outline">
            <Link href={projectHref(projectId, "/schedule/gantt")}>{t("schedule.common.openGantt")}</Link>
          </Button>
        }
      />
    </SectionCard>
  );
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-24 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="tabular text-xs text-muted-foreground">{value}%</span>
    </div>
  );
}

/** Milestones & Quotas content (separate from the page shell so it can be tested on a fixture). */
export function QuotasBoard({ data }: { data: ScheduleQuotas }) {
  const t = useT();
  const milestoneName = useMilestoneName();
  const te = useEnumT();
  const range = useDateRange();
  const [stage, setStage] = useState<string>("ALL");
  const stageKeys = [...new Set(data.milestones.map((m) => m.milestone.stageKey))];
  const shown = data.milestones.filter((m) => stage === "ALL" || m.milestone.stageKey === stage);

  const columns: Column<MaterialQuotaTotal>[] = [
    {
      id: "material",
      header: t("schedule.quotas.material"),
      cell: (m) => <bdi className="font-medium">{m.description}</bdi>,
      sortValue: (m) => m.description,
    },
    {
      id: "planned",
      header: t("schedule.quotas.planned"),
      align: "right",
      cell: (m) => formatQty(m.plannedQty, m.unit),
    },
    {
      id: "used",
      header: t("schedule.quotas.used"),
      align: "right",
      cell: (m) => (
        <span className={m.over ? "font-semibold text-danger" : undefined}>
          {formatQty(m.usedQty, m.unit)}
        </span>
      ),
    },
    {
      id: "remaining",
      header: t("schedule.quotas.remaining"),
      align: "right",
      cell: (m) =>
        m.over ? (
          <StatusBadge tone="danger" label={t("schedule.quotas.over")} />
        ) : (
          formatQty(m.remainingQty, m.unit)
        ),
    },
    {
      id: "pct",
      header: t("schedule.quotas.usedPercent"),
      align: "right",
      cell: (m) => (m.usedPercent === null ? "—" : `${m.usedPercent}%`),
      sortValue: (m) => m.usedPercent ?? 0,
    },
  ];

  return (
    <div className="space-y-5">
      <SectionCard
        title={t("schedule.quotas.totalsTitle")}
        description={t("schedule.quotas.totalsDesc")}
        flush
      >
        <DataTable
          rows={data.materials}
          columns={columns}
          getRowId={(m) => m.materialId ?? m.material}
          clientPageSize={0}
          empty={{
            title: t("schedule.quotas.emptyTitle"),
            description: t("schedule.quotas.emptyDesc"),
            icon: Boxes,
          }}
        />
      </SectionCard>

      <section className="space-y-3" aria-label={t("schedule.quotas.milestonesTitle")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t("schedule.quotas.milestonesTitle")}</h2>
          <SegmentedControl
            size="sm"
            ariaLabel={t("schedule.quotas.filterStage")}
            value={stage}
            onChange={setStage}
            options={[
              { value: "ALL", label: t("schedule.quotas.allStages") },
              ...stageKeys.map((k) => ({ value: k, label: te("scheduleStage", k) })),
            ]}
            className="max-w-full overflow-x-auto"
          />
        </div>
        {shown.map(({ milestone: m, quotas }) => (
          <SectionCard
            key={m.id}
            title={
              <span className="flex flex-wrap items-center gap-2">
                <bdi>{milestoneName(m)}</bdi>
                <StatusBadge domain="milestone" value={m.status} />
              </span>
            }
            description={`${te("scheduleStage", m.stageKey)} · ${range(m.plannedStart, m.plannedEnd)}`}
            actions={
              <ProgressBar
                value={m.progressPercent}
                label={t("schedule.quotas.progressDone", { n: m.progressPercent })}
              />
            }
          >
            <div data-testid={`milestone-quota-${m.key}`}>
              {quotas.length ? (
                <QuotaTable quotas={quotas} />
              ) : (
                <p className="text-sm text-muted-foreground">{t("schedule.quotas.noQuota")}</p>
              )}
            </div>
          </SectionCard>
        ))}
      </section>

      {data.unlinked.length ? (
        <SectionCard
          title={t("schedule.quotas.unlinkedTitle")}
          description={t("schedule.quotas.unlinkedDesc")}
        >
          <ul className="space-y-1 text-sm">
            {data.unlinked.map((u) => (
              <li key={u.materialId} className="flex justify-between gap-2">
                <bdi>{u.name}</bdi>
                <span className="tabular">{formatQty(u.usedQty, u.unit)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}

/** Project → Schedule → Milestones & Quotas: planned vs used vs remaining per material (no money). */
export function MilestonesQuotasView({ projectId }: { projectId: string }) {
  const t = useT();
  const { data, isLoading, error } = useGetScheduleQuotasQuery(projectId);
  return (
    <ProjectPageShell projectId={projectId} crumb={t("schedule.crumb.milestones")}>
      {() =>
        isLoading ? (
          <CardsSkeleton count={3} height="h-32" />
        ) : errorCode(error) === "SCHEDULE_NOT_FOUND" ? (
          <NoSchedule projectId={projectId} />
        ) : !data ? (
          <SectionCard>
            <EmptyState title={t("schedule.common.loadFailed")} />
          </SectionCard>
        ) : (
          <QuotasBoard data={data} />
        )
      }
    </ProjectPageShell>
  );
}
