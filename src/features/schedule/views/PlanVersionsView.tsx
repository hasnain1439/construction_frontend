"use client";

import { GitCompareArrows, History } from "lucide-react";
import { useState } from "react";
import {
  useGetScheduleBaselineQuery,
  useGetScheduleQuery,
  useGetScheduleVersionsQuery,
} from "@/api/services/schedule.api";
import type { Milestone, PlanVersion, ScheduleBaseline } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { RowActions, ACTIONS_COLUMN } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useEnumT, useT } from "@/i18n/useT";
import { errorCode } from "@/lib/apiErrors";
import { formatDate, formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { diffDays } from "../gantt/ganttModel";
import { useDayShift } from "../labels";
import { NoSchedule } from "./MilestonesQuotasView";

function ShiftText({ days }: { days: number }) {
  const shift = useDayShift();
  return (
    <span
      className={cn(
        "tabular",
        days > 0 ? "text-danger" : days < 0 ? "text-success" : "text-muted-foreground",
      )}
    >
      {shift(days)}
    </span>
  );
}

/** One version's milestone dates against the baseline. */
function CompareSlideOver({
  version,
  baseline,
  names,
  onClose,
}: {
  version: PlanVersion | null;
  baseline: ScheduleBaseline | undefined;
  names: Map<string, string>;
  onClose: () => void;
}) {
  const t = useT();
  const base = new Map((baseline?.milestones ?? []).map((m) => [m.key, m]));
  return (
    <SlideOver
      open={Boolean(version)}
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={version ? t("schedule.versions.compareTitle", { n: version.version }) : ""}
      description={t("schedule.versions.compareDesc")}
    >
      {version ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-start font-medium">{t("schedule.shift.colMilestone")}</th>
                <th className="px-2 py-1.5 text-start font-medium">{t("schedule.versions.colBaseline")}</th>
                <th className="px-2 py-1.5 text-start font-medium">
                  {t("schedule.versions.colVersion", { n: version.version })}
                </th>
                <th className="px-2 py-1.5 text-end font-medium">{t("schedule.versions.shift")}</th>
              </tr>
            </thead>
            <tbody>
              {version.milestones.map((m) => {
                const b = base.get(m.key);
                return (
                  <tr key={m.key} className="border-t">
                    <td className="px-2 py-1.5">
                      <bdi>{names.get(m.key) ?? b?.name ?? m.key}</bdi>
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">
                      {b ? `${formatDate(b.plannedStart)} – ${formatDate(b.plannedEnd)}` : "—"}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{`${formatDate(m.plannedStart)} – ${formatDate(m.plannedEnd)}`}</td>
                    <td className="px-2 py-1.5 text-end">
                      {b ? <ShiftText days={diffDays(b.plannedEnd, m.plannedEnd)} /> : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </SlideOver>
  );
}

/** Baseline vs current plan and the list of plan versions (separate from the page shell for tests). */
export function PlanVersionsBoard({
  versions,
  baseline,
  milestones,
  currentEnd,
}: {
  versions: PlanVersion[];
  baseline: ScheduleBaseline | undefined;
  milestones: Milestone[];
  currentEnd: string | null;
}) {
  const t = useT();
  const te = useEnumT();
  const [comparing, setComparing] = useState<PlanVersion | null>(null);
  const names = new Map(milestones.map((m) => [m.key, m.name]));
  const baseEnd = baseline?.plannedEnd ?? null;

  const columns: Column<PlanVersion>[] = [
    {
      id: "version",
      header: t("schedule.versions.version"),
      cell: (v) => <span className="tabular font-semibold">{v.version}</span>,
      sortValue: (v) => v.version,
    },
    { id: "reason", header: t("schedule.versions.reason"), cell: (v) => te("planVersionReason", v.reason) },
    {
      id: "note",
      header: t("schedule.versions.note"),
      cell: (v) => (v.note ? <span className="line-clamp-2 max-w-72 text-sm">{v.note}</span> : "—"),
    },
    {
      id: "end",
      header: t("schedule.versions.end"),
      cell: (v) => <span className="whitespace-nowrap">{formatDate(v.plannedEnd)}</span>,
    },
    {
      id: "shift",
      header: t("schedule.versions.shift"),
      align: "right",
      cell: (v) => (baseEnd ? <ShiftText days={diffDays(baseEnd, v.plannedEnd)} /> : "—"),
    },
    {
      id: "saved",
      header: t("schedule.versions.saved"),
      cell: (v) => (
        <div className="text-xs">
          {v.createdBy ? <bdi className="block font-medium">{v.createdBy.name}</bdi> : null}
          <span className="text-muted-foreground">{formatDateTime(v.createdAt)}</span>
        </div>
      ),
    },
    {
      ...ACTIONS_COLUMN,
      cell: (v) => (
        <RowActions
          name={t("schedule.versions.colVersion", { n: v.version })}
          actions={[
            {
              label: t("schedule.versions.compare"),
              icon: GitCompareArrows,
              onSelect: () => setComparing(v),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <KpiGroup columns="grid-cols-1 sm:grid-cols-2" ariaLabel={t("schedule.crumb.versions")}>
        <KpiCard
          label={t("schedule.versions.baselineTitle")}
          value={formatDate(baseEnd)}
          hint={
            baseline
              ? `${t("schedule.versions.baselineDesc")} · ${t("schedule.versions.start")} ${formatDate(baseline.startDate)}`
              : undefined
          }
        />
        <KpiCard
          label={t("schedule.versions.currentTitle")}
          value={formatDate(currentEnd)}
          hint={baseEnd && currentEnd ? <ShiftText days={diffDays(baseEnd, currentEnd)} /> : undefined}
          tone={baseEnd && currentEnd && currentEnd > baseEnd ? "danger" : "primary"}
        />
      </KpiGroup>
      <SectionCard title={t("schedule.crumb.versions")} description={t("schedule.versions.desc")} flush>
        <DataTable
          rows={versions}
          columns={columns}
          getRowId={(v) => v.id}
          onRowClick={setComparing}
          clientPageSize={25}
          empty={{ title: t("schedule.versions.emptyTitle"), icon: History }}
        />
      </SectionCard>
      <CompareSlideOver
        version={comparing}
        baseline={baseline}
        names={names}
        onClose={() => setComparing(null)}
      />
    </div>
  );
}

/** Project → Schedule → Plan Versions. */
export function PlanVersionsView({ projectId }: { projectId: string }) {
  const t = useT();
  const versions = useGetScheduleVersionsQuery(projectId);
  const baseline = useGetScheduleBaselineQuery(projectId);
  const schedule = useGetScheduleQuery(projectId);
  return (
    <ProjectPageShell projectId={projectId} crumb={t("schedule.crumb.versions")}>
      {() =>
        versions.isLoading || schedule.isLoading ? (
          <CardsSkeleton count={2} height="h-32" />
        ) : errorCode(versions.error) === "SCHEDULE_NOT_FOUND" ||
          (schedule.data && !schedule.data.schedule) ? (
          <NoSchedule projectId={projectId} />
        ) : !versions.data ? (
          <SectionCard>
            <EmptyState title={t("schedule.common.loadFailed")} />
          </SectionCard>
        ) : (
          <PlanVersionsBoard
            versions={versions.data}
            baseline={baseline.data}
            milestones={schedule.data?.milestones ?? []}
            currentEnd={schedule.data?.plannedEnd ?? null}
          />
        )
      }
    </ProjectPageShell>
  );
}
