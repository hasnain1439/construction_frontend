"use client";

import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetScheduleQuery } from "@/api/services/schedule.api";
import type { ScheduleDetail } from "@/api/types";
import { EmptyState } from "@/components/common/EmptyState";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { usePermissions } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { BILLING_ACCESS } from "@/lib/navigation";
import { GanttChart, HATCH_CURING, HATCH_WARNING } from "../gantt/GanttChart";
import { buildGanttModel } from "../gantt/ganttModel";
import { MilestonePanel } from "../components/MilestonePanel";
import { useMoveMilestone } from "../components/MoveMilestone";
import { ReplanButton, ScheduleEmpty } from "../components/PlanDialogs";
import { PLAN_EDITABLE } from "../labels";

function Legend() {
  const t = useT();
  const items: { label: string; swatch: string }[] = [
    { label: t("schedule.gantt.legendPlanned"), swatch: "border border-primary/60 bg-primary/15" },
    { label: t("schedule.gantt.legendProgress"), swatch: "bg-primary/70" },
    {
      label: t("schedule.gantt.legendBaseline"),
      swatch: "border border-dashed border-muted-foreground/60 bg-muted-foreground/15 h-1.5",
    },
    { label: t("schedule.gantt.legendCuring"), swatch: cn("border border-primary/30", HATCH_CURING) },
    { label: t("schedule.gantt.legendStoppageApproved"), swatch: "bg-warning/40" },
    { label: t("schedule.gantt.legendStoppagePending"), swatch: HATCH_WARNING },
    { label: t("schedule.gantt.legendOff"), swatch: "bg-muted" },
    { label: t("schedule.gantt.legendRamadan"), swatch: "bg-success/50 h-1" },
    { label: t("schedule.gantt.legendToday"), swatch: "w-0.5 bg-danger" },
  ];
  return (
    <ul
      className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"
      aria-label={t("schedule.gantt.legend")}
    >
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span className={cn("inline-block h-3 w-5 rounded-sm", i.swatch)} aria-hidden />
          {i.label}
        </li>
      ))}
      <li className="inline-flex items-center gap-1.5">
        <TriangleAlert className="size-3.5 text-danger" aria-hidden />
        {t("schedule.gantt.legendLate")}
      </li>
    </ul>
  );
}

/** The schedule with its header numbers, the chart, the side panel and the move confirmation. */
export function GanttBoard({
  detail,
  projectId,
  canManage,
  canProgress,
  seesBilling,
}: {
  detail: ScheduleDetail;
  projectId: string;
  canManage: boolean;
  canProgress: boolean;
  seesBilling: boolean;
}) {
  const t = useT();
  const model = useMemo(() => buildGanttModel(detail), [detail]);
  const [selected, setSelected] = useState<string | null>(null);
  const move = useMoveMilestone(projectId);
  const projectedLate = detail.projectedEnd && detail.plannedEnd && detail.projectedEnd > detail.plannedEnd;

  return (
    <div className="space-y-4">
      <KpiGroup columns="grid-cols-2 md:grid-cols-4" ariaLabel={t("schedule.crumb.gantt")}>
        <KpiCard
          variant="tile"
          label={t("schedule.gantt.plannedEnd")}
          value={formatDate(detail.plannedEnd)}
        />
        <KpiCard
          variant="tile"
          label={t("schedule.gantt.baselineEnd")}
          value={formatDate(detail.baselineEnd)}
        />
        <KpiCard
          variant="tile"
          label={t("schedule.gantt.projectedEnd")}
          value={formatDate(detail.projectedEnd)}
          tone={projectedLate ? "danger" : "primary"}
        />
        <KpiCard
          variant="tile"
          label={t("schedule.gantt.version", { n: detail.schedule?.version ?? 1 })}
          value={
            <span className="text-base">
              {t("schedule.gantt.startedFrom", {
                date: formatDate(detail.schedule?.startDate),
                teams: detail.schedule?.teams ?? 1,
              })}
            </span>
          }
        />
      </KpiGroup>
      <p className="text-sm text-muted-foreground">
        {canManage ? t("schedule.gantt.dragHint") : t("schedule.gantt.readHint")}{" "}
        {t("schedule.gantt.timelineNote")}
      </p>
      {model ? (
        <GanttChart
          model={model}
          selectedId={selected}
          onSelect={setSelected}
          onMove={canManage ? (m, date) => void move.request(m, date) : undefined}
        />
      ) : null}
      <Legend />
      <MilestonePanel
        projectId={projectId}
        milestoneId={selected}
        onClose={() => setSelected(null)}
        milestones={detail.milestones}
        canProgress={canProgress}
        onMove={canManage ? (m, date) => void move.request(m, date) : undefined}
        moving={move.checking}
        seesBilling={seesBilling}
      />
      {move.dialog}
    </div>
  );
}

/** Project → Schedule → Gantt. */
export function GanttView({ projectId }: { projectId: string }) {
  const t = useT();
  const { can, canAccess } = usePermissions();
  const { data, isLoading } = useGetScheduleQuery(projectId);
  const seesBilling = canAccess(BILLING_ACCESS);

  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("schedule.crumb.gantt")}
      actions={(project) =>
        data?.schedule && can("schedule.plan.manage") && PLAN_EDITABLE.includes(project.status) ? (
          <ReplanButton projectId={projectId} teams={data.schedule.teams} />
        ) : null
      }
    >
      {(project, flags) => {
        const editable = !flags.readOnly && PLAN_EDITABLE.includes(project.status);
        if (isLoading) return <CardsSkeleton count={2} height="h-48" />;
        if (!data)
          return (
            <SectionCard>
              <EmptyState title={t("schedule.common.loadFailed")} />
            </SectionCard>
          );
        if (!data.schedule)
          return (
            <ScheduleEmpty
              detail={data}
              projectId={projectId}
              canGenerate={can("schedule.plan.manage") && editable}
            />
          );
        return (
          <GanttBoard
            detail={data}
            projectId={projectId}
            canManage={can("schedule.plan.manage") && editable}
            canProgress={can("schedule.progress.edit") && !flags.readOnly}
            seesBilling={seesBilling}
          />
        );
      }}
    </ProjectPageShell>
  );
}
