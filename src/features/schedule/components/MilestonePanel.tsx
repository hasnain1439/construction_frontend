"use client";

import { CalendarClock, Eraser, Link2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useGetMilestoneQuery } from "@/api/services/schedule.api";
import type { Milestone, Quota } from "@/api/types";
import { InfoList } from "@/components/common/InfoList";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnumT, useStatusT, useT } from "@/i18n/useT";
import { formatDate, formatDateTime } from "@/lib/dates";
import { projectHref } from "@/lib/navigation";
import { formatQty } from "@/lib/quantity";
import { isMovable } from "../gantt/ganttModel";
import { useDayShift, useMilestoneName } from "../labels";
import { ProgressForm } from "./ProgressForm";

export interface MilestonePanelProps {
  projectId: string;
  milestoneId: string | null;
  onClose: () => void;
  /** Every milestone of the schedule (names of the dependencies). */
  milestones: Milestone[];
  canProgress: boolean;
  /** Present with schedule.plan.manage on an editable project. */
  onMove?: (milestone: Milestone, date: string | null) => void;
  moving?: boolean;
  seesBilling: boolean;
}

/** Quota lines of a milestone: planned vs used vs remaining (quantities only, never money). */
export function QuotaTable({ quotas }: { quotas: Quota[] }) {
  const t = useT();
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5 text-start font-medium">{t("schedule.quotas.material")}</th>
            <th className="px-2 py-1.5 text-end font-medium">{t("schedule.quotas.planned")}</th>
            <th className="px-2 py-1.5 text-end font-medium">{t("schedule.quotas.used")}</th>
            <th className="px-2 py-1.5 text-end font-medium">{t("schedule.quotas.remaining")}</th>
          </tr>
        </thead>
        <tbody>
          {quotas.map((q) => (
            <tr key={q.id} className="border-t" data-testid={`quota-${q.material}`}>
              <td className="px-2 py-1.5">
                <bdi>{q.description}</bdi>
                {q.ownerSupplied ? (
                  <span className="ms-1 text-xs text-muted-foreground">
                    ({t("schedule.quotas.ownerSupplied")})
                  </span>
                ) : null}
              </td>
              <td className="tabular px-2 py-1.5 text-end whitespace-nowrap">
                {formatQty(q.plannedQty, q.unit)}
              </td>
              <td
                className={`tabular px-2 py-1.5 text-end whitespace-nowrap ${q.over ? "font-semibold text-danger" : ""}`}
              >
                {formatQty(q.usedQty, q.unit)}
                {q.usedPercent !== null ? (
                  <span className="ms-1 text-xs text-muted-foreground">({q.usedPercent}%)</span>
                ) : null}
              </td>
              <td className="tabular px-2 py-1.5 text-end whitespace-nowrap">
                {q.over ? (
                  <span className="text-xs font-medium text-danger">{t("schedule.quotas.over")}</span>
                ) : (
                  formatQty(q.remainingQty, q.unit)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Side panel of one milestone: dates, dependencies, quota, progress history, progress update, move start. */
export function MilestonePanel({
  projectId,
  milestoneId,
  onClose,
  milestones,
  canProgress,
  onMove,
  moving,
  seesBilling,
}: MilestonePanelProps) {
  const t = useT();
  const msName = useMilestoneName();
  const ts = useStatusT();
  const te = useEnumT();
  const dayShift = useDayShift();
  const fromList = milestones.find((m) => m.id === milestoneId) ?? null;
  const { data } = useGetMilestoneQuery(milestoneId ?? "", { skip: !milestoneId });
  const m = data && data.id === milestoneId ? data : fromList;
  const names = new Map(milestones.map((x) => [x.id, msName(x)]));
  const [limit, setLimit] = useState<string | null>(null);
  const limitValue = limit ?? m?.startNoEarlierThan ?? m?.plannedStart ?? "";

  return (
    <SlideOver
      open={Boolean(milestoneId)}
      onOpenChange={(o) => {
        if (!o) {
          setLimit(null);
          onClose();
        }
      }}
      size="lg"
      title={m ? <bdi>{msName(m)}</bdi> : t("common.loading")}
      description={
        m ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            {te("scheduleStage", m.stageKey)}
            <StatusBadge domain="milestone" value={m.status} />
            <span className="tabular">{m.progressPercent}%</span>
            {m.late ? <StatusBadge tone="danger" label={t("schedule.common.late")} /> : null}
          </span>
        ) : undefined
      }
    >
      {!m ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t("schedule.panel.dates")}</h3>
            <InfoList
              items={[
                { label: t("schedule.panel.plannedStart"), value: formatDate(m.plannedStart) },
                { label: t("schedule.panel.plannedEnd"), value: formatDate(m.plannedEnd) },
                {
                  label: t("schedule.panel.baselineStart"),
                  value: formatDate(m.baselineStart),
                  hidden: !m.baselineStart,
                },
                {
                  label: t("schedule.panel.baselineEnd"),
                  value: formatDate(m.baselineEnd),
                  hidden: !m.baselineEnd,
                },
                {
                  label: t("schedule.panel.variance"),
                  value: dayShift(m.varianceDays),
                  hidden: !m.baselineEnd,
                },
                {
                  label: t("schedule.panel.actualStart"),
                  value: formatDate(m.actualStart),
                  hidden: !m.actualStart,
                },
                {
                  label: t("schedule.panel.actualEnd"),
                  value: formatDate(m.actualEnd),
                  hidden: !m.actualEnd,
                },
                {
                  label: t("schedule.panel.effort"),
                  value: t("schedule.common.teamDays", { n: m.workDays }),
                },
                {
                  label: t("schedule.panel.duration"),
                  value: t("schedule.common.days", { n: m.durationDays }),
                },
                {
                  label: t("schedule.panel.curing"),
                  value:
                    m.curingDays && m.curingUntil
                      ? t("schedule.panel.curingUntil", { n: m.curingDays, date: formatDate(m.curingUntil) })
                      : t("schedule.panel.noCuring"),
                },
                {
                  label: t("schedule.panel.startLimit"),
                  value: formatDate(m.startNoEarlierThan),
                  hidden: !m.startNoEarlierThan,
                },
              ]}
            />
          </section>

          {onMove ? (
            <section className="space-y-2 rounded-lg border p-3">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <CalendarClock className="size-4" aria-hidden />
                {t("schedule.panel.moveTitle")}
              </h3>
              {isMovable(m) ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="milestone-start-limit">{t("schedule.panel.startLimit")}</Label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        id="milestone-start-limit"
                        type="date"
                        className="w-44"
                        value={limitValue}
                        onChange={(e) => setLimit(e.target.value)}
                        aria-describedby="milestone-start-limit-hint"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!limitValue || moving}
                        onClick={() => onMove(m, limitValue)}
                      >
                        {t("schedule.panel.previewMove")}
                      </Button>
                      {m.startNoEarlierThan ? (
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={moving}
                          onClick={() => onMove(m, null)}
                        >
                          <Eraser data-icon="inline-start" />
                          {t("schedule.panel.clearLimit")}
                        </Button>
                      ) : null}
                    </div>
                    <p id="milestone-start-limit-hint" className="text-xs text-muted-foreground">
                      {t("schedule.panel.startLimitHint")}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("schedule.panel.lockedDates")}</p>
              )}
            </section>
          ) : null}

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t("schedule.panel.dependencies")}</h3>
            {m.dependsOn.length ? (
              <ul className="space-y-1 text-sm">
                {m.dependsOn.map((d) => (
                  <li key={d.milestoneId} className="flex flex-wrap items-center gap-x-2">
                    <Link2 className="size-3.5 text-muted-foreground" aria-hidden />
                    <bdi className="font-medium">{names.get(d.milestoneId) ?? d.key}</bdi>
                    <span className="text-muted-foreground">
                      {te("dependencyType", d.type)} ·{" "}
                      {d.lagDays ? t("schedule.panel.lag", { n: d.lagDays }) : t("schedule.panel.noLag")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("schedule.panel.noDependencies")}</p>
            )}
          </section>

          <section className="space-y-1">
            <h3 className="text-sm font-semibold">{t("schedule.panel.billing")}</h3>
            {m.billingStage ? (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <bdi>{m.billingStage.label}</bdi>
                {seesBilling ? (
                  <Link href={projectHref(projectId, "/billing/schedule")} className="text-primary underline">
                    {t("schedule.panel.openBilling")}
                  </Link>
                ) : null}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("schedule.panel.billingNone")}</p>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t("schedule.panel.quotas")}</h3>
            {m.quotas.length ? (
              <QuotaTable quotas={m.quotas} />
            ) : (
              <p className="text-sm text-muted-foreground">{t("schedule.panel.noQuotas")}</p>
            )}
          </section>

          {canProgress && m.status !== "DONE" ? (
            <section className="space-y-3 rounded-lg border p-3">
              <h3 className="text-sm font-semibold">{t("schedule.progress.title")}</h3>
              <ProgressForm milestone={m} projectId={projectId} />
            </section>
          ) : null}

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t("schedule.panel.history")}</h3>
            {data?.updates.length ? (
              <ol className="space-y-2 text-sm" data-testid="progress-history">
                {data.updates.map((u) => (
                  <li key={u.id} className="rounded-md border px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        {t("schedule.panel.historyLine", {
                          progress: u.progressPercent,
                          status: ts("milestone", u.status),
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDate(u.date)}</span>
                    </div>
                    {u.note ? <p className="mt-1 text-muted-foreground">{u.note}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {u.by?.name ? <bdi>{u.by.name}</bdi> : null} · {formatDateTime(u.at)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">{t("schedule.panel.noHistory")}</p>
            )}
          </section>

          {m.basis.length ? (
            <section className="space-y-1">
              <h3 className="text-sm font-semibold">{t("schedule.panel.basis")}</h3>
              <ul className="list-disc space-y-0.5 ps-5 text-xs text-muted-foreground">
                {m.basis.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </SlideOver>
  );
}
