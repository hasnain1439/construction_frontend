"use client";

import { CalendarRange } from "lucide-react";
import Link from "next/link";
import { useGetScheduleDelaysQuery } from "@/api/services/schedule.api";
import type { DelayCategory, ScheduleDelays } from "@/api/types";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnumT, useT } from "@/i18n/useT";
import { errorCode } from "@/lib/apiErrors";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { projectHref } from "@/lib/navigation";
import { useDateRange } from "../labels";

const CATEGORY_TONE: Record<DelayCategory, string> = {
  OWNER: "border-s-primary",
  EXCUSABLE: "border-s-warning",
  CONTRACTOR: "border-s-danger",
};

/** Original / revised / projected end and slippage by cause (Owner / Excusable / Contractor) with reasons. */
export function DelayBreakdown({ delays }: { delays: ScheduleDelays }) {
  const t = useT();
  const te = useEnumT();
  const range = useDateRange();
  const late = delays.days.contractor > 0;
  const status = late
    ? t("schedule.delays.lateBy", { n: delays.days.contractor })
    : delays.aheadDays > 0
      ? t("schedule.delays.ahead", { n: delays.aheadDays })
      : t("schedule.delays.onTrack");
  const pendingDays = delays.pending.reduce((s, p) => s + p.days, 0);

  return (
    <div className="space-y-4" data-testid="delay-cards">
      <KpiGroup columns="grid-cols-1 sm:grid-cols-3" ariaLabel={t("schedule.delays.title")}>
        <KpiCard
          label={t("schedule.delays.originalEnd")}
          value={formatDate(delays.originalEnd)}
          hint={t("schedule.delays.originalHint")}
        />
        <KpiCard
          label={t("schedule.delays.revisedEnd")}
          value={formatDate(delays.revisedEnd)}
          hint={t("schedule.delays.revisedHint")}
          tone="warning"
        />
        <KpiCard
          label={t("schedule.delays.projectedEnd")}
          value={formatDate(delays.projectedEnd)}
          hint={
            <>
              <span className={cn("block font-medium", late ? "text-danger" : "text-success")}>{status}</span>
              {t("schedule.delays.projectedHint", {
                pace: Math.round(delays.pace * 100),
                progress: delays.progressPercent,
              })}
            </>
          }
          tone={late ? "danger" : "success"}
        />
      </KpiGroup>
      <div>
        <h3 className="mb-2 text-sm font-semibold">{t("schedule.delays.slippage")}</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {delays.categories.map((c) => (
            <div
              key={c.category}
              className={cn("rounded-lg border border-s-4 bg-card p-3", CATEGORY_TONE[c.category])}
              data-testid={`delay-${c.category}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{te("delayCategory", c.category)}</p>
                <p className="tabular text-lg font-semibold">{t("schedule.common.days", { n: c.days })}</p>
              </div>
              <p className="text-xs text-muted-foreground">{te("delayCategoryDesc", c.category)}</p>
              {c.reasons.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {c.reasons.map((r, i) => (
                    <li key={r.stoppageId ?? `${r.reason}-${i}`}>
                      <span className="font-medium">
                        {t("schedule.delays.reasonDays", { reason: te("delayReason", r.reason), n: r.days })}
                      </span>
                      {r.dates.length ? (
                        <span className="block text-xs text-muted-foreground">
                          {range(r.dates[0]!, r.dates[r.dates.length - 1]!)}
                        </span>
                      ) : null}
                      {r.note ? <span className="block text-xs text-muted-foreground">{r.note}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">{t("schedule.delays.noReasons")}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      {delays.days.changeOrders ? (
        <p className="text-sm text-muted-foreground">
          {t("schedule.delays.changeOrders", { n: delays.days.changeOrders })}
        </p>
      ) : null}
      {pendingDays ? (
        <p className="text-sm text-warning">{t("schedule.delays.pending", { n: pendingDays })}</p>
      ) : null}
    </div>
  );
}

/** Project Overview card (schedule.plan.view). Without a schedule: a link to the Gantt. */
export function DelayCards({ projectId }: { projectId: string }) {
  const t = useT();
  const { data, isLoading, error } = useGetScheduleDelaysQuery(projectId);
  const noSchedule = errorCode(error) === "SCHEDULE_NOT_FOUND";
  return (
    <SectionCard
      title={t("schedule.delays.title")}
      description={noSchedule ? t("schedule.common.noScheduleDesc") : t("schedule.delays.desc")}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={projectHref(projectId, "/schedule/gantt")}>
            <CalendarRange data-icon="inline-start" />
            {t("schedule.common.openGantt")}
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : data ? (
        <DelayBreakdown delays={data} />
      ) : noSchedule ? (
        <p className="text-sm text-muted-foreground">{t("schedule.common.noSchedule")}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{t("schedule.common.loadFailed")}</p>
      )}
    </SectionCard>
  );
}
