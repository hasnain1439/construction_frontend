"use client";

import { CalendarClock, CircleAlert, CircleCheck, Hourglass } from "lucide-react";
import { useGetDelayAnalysisQuery } from "@/api/services/control.api";
import type { DelayAnalysis, DelayMilestone, DelayTimelineEvent } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { DelayBreakdown } from "@/features/schedule/components/DelayCards";
import { useDateRange } from "@/features/schedule/labels";
import { NoSchedule } from "@/features/schedule/views/MilestonesQuotasView";
import { useEnumT, useStatusT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { ControlAlertsCard, PercentBar } from "../components/ControlShared";

function TimelineItem({ e }: { e: DelayTimelineEvent }) {
  const t = useT();
  const te = useEnumT();
  const ts = useStatusT();
  const text =
    e.kind === "STOPPAGE"
      ? t("control.delay.stoppage", { reason: te("delayReason", e.title), days: e.days ?? 0, category: te("delayCategory", e.category) })
      : e.kind === "PLAN_VERSION"
        ? t("control.delay.planVersion", { version: e.status ?? "", reason: te("planVersionReason", e.title) })
        : t("control.delay.update", { name: e.title, status: ts("milestone", e.status), n: e.progressPercent ?? 0 });
  const dot = e.kind === "STOPPAGE" ? "bg-warning" : e.kind === "PLAN_VERSION" ? "bg-primary" : "bg-success";
  return (
    <li className="relative ps-6">
      <span className={cn("absolute start-0 top-1.5 size-2.5 rounded-full", dot)} aria-hidden />
      <p className="text-xs text-muted-foreground">{formatDate(e.date)}</p>
      <p className="text-sm font-medium">
        <bdi>{text}</bdi>
      </p>
      {e.plannedEnd ? <p className="text-xs text-muted-foreground">{t("control.delay.newEnd", { date: formatDate(e.plannedEnd) })}</p> : null}
      {e.detail ? <p className="text-xs text-muted-foreground">{e.detail}</p> : null}
    </li>
  );
}

/** Delay analysis content (fixture-testable): Step 13 delay cards + milestones vs plan + timeline. */
export function DelayAnalysisBoard({ data }: { data: DelayAnalysis }) {
  const t = useT();
  const te = useEnumT();
  const range = useDateRange();
  const columns: Column<DelayMilestone>[] = [
    {
      id: "milestone",
      header: t("control.delay.milestone"),
      cell: (m) => (
        <div>
          <bdi className="font-medium">{m.name}</bdi>
          <p className="text-xs text-muted-foreground">{te("scheduleStage", m.stageKey)}</p>
        </div>
      ),
    },
    { id: "window", header: t("control.delay.window"), cell: (m) => <span className="text-sm">{range(m.plannedStart, m.plannedEnd)}</span> },
    { id: "planned", header: t("control.delay.planned"), align: "right", cell: (m) => `${m.plannedProgressPercent}%` },
    { id: "actual", header: t("control.delay.actual"), cell: (m) => <PercentBar value={m.progressPercent} label={m.name} tone={m.behind ? "danger" : "primary"} /> },
    {
      id: "behind",
      header: t("control.delay.behindBy"),
      align: "right",
      sortValue: (m) => m.behindPoints + m.lateDays,
      cell: (m) => (
        <div className={cn(m.behind && "text-danger")}>
          {m.behindPoints ? <span className="tabular">{t("control.common.points", { n: m.behindPoints })}</span> : "—"}
          {m.lateDays ? <p className="text-xs">{t("control.delay.lateDays", { n: m.lateDays })}</p> : null}
        </div>
      ),
    },
    {
      id: "status",
      header: t("control.delay.status"),
      cell: (m) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusBadge domain="milestone" value={m.status} />
          {m.behind ? <StatusBadge tone="danger" label={t("control.delay.behind")} /> : null}
        </span>
      ),
    },
  ];
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{t("control.common.asOf", { date: formatDate(data.asOf) })}</p>
      <KpiGroup columns="grid-cols-2 lg:grid-cols-4" ariaLabel={t("control.delay.title")}>
        <KpiCard variant="tile" label={t("control.delay.behind")} icon={CircleAlert} value={data.summary.behind} tone={data.summary.behind ? "danger" : "success"} />
        <KpiCard variant="tile" label={t("control.delay.lateLabel")} icon={Hourglass} value={data.summary.late} tone={data.summary.late ? "warning" : "success"} />
        <KpiCard variant="tile" label={t("control.delay.actual")} icon={CircleCheck} value={`${data.summary.finished} / ${data.summary.total}`} />
        <KpiCard variant="tile" label={t("schedule.delays.projectedEnd")} icon={CalendarClock} value={data.delays ? formatDate(data.delays.projectedEnd) : "—"} />
      </KpiGroup>
      {data.delays ? (
        <SectionCard title={t("control.delay.title")} description={t("control.delay.desc")}>
          <DelayBreakdown delays={data.delays} />
        </SectionCard>
      ) : null}
      <SectionCard
        title={t("control.delay.milestonesTitle")}
        description={`${t("control.delay.milestonesDesc", { points: data.thresholdPoints, days: data.graceDays })} ${t("control.delay.summary", data.summary)}`}
        flush
      >
        <DataTable rows={data.milestones} columns={columns} getRowId={(m) => m.id} clientPageSize={0} empty={{ title: t("control.common.noSchedule") }} />
      </SectionCard>
      <SectionCard title={t("control.delay.timelineTitle")}>
        {data.timeline.length ? (
          <ol className="space-y-3 border-s ps-3" aria-label={t("control.delay.timelineTitle")}>
            {data.timeline.map((e, i) => (
              <TimelineItem key={`${e.kind}:${e.refId}:${i}`} e={e} />
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">{t("control.delay.timelineEmpty")}</p>
        )}
      </SectionCard>
    </div>
  );
}

/** Project → Control → Delay Analysis (was "Coming soon"). */
export function DelayAnalysisView({ projectId }: { projectId: string }) {
  const t = useT();
  const { data, isLoading } = useGetDelayAnalysisQuery(projectId);
  return (
    <ProjectPageShell projectId={projectId} crumb={t("control.crumb.delay")}>
      {() => (
        <div className="space-y-5">
          {isLoading ? (
            <CardsSkeleton count={3} height="h-32" />
          ) : !data ? (
            <SectionCard>
              <EmptyState title={t("control.common.loadFailed")} />
            </SectionCard>
          ) : !data.hasSchedule ? (
            <NoSchedule projectId={projectId} />
          ) : (
            <DelayAnalysisBoard data={data} />
          )}
          <ControlAlertsCard projectId={projectId} />
        </div>
      )}
    </ProjectPageShell>
  );
}
