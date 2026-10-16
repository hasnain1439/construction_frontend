"use client";

import { ArrowRight, BellRing, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useGetProjectControlAlertsQuery, useRunControlAlertsMutation } from "@/api/services/control.api";
import type { BucketStatus, ControlAlert, VarianceStatus } from "@/api/types";
import { EmptyState } from "@/components/common/EmptyState";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useEnumT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { statusMeta, TONE_CLASSES, type StatusTone } from "@/lib/status";

const VARIANCE_TONE: Record<VarianceStatus, StatusTone> = {
  OVER: "danger",
  UNDER: "info",
  ON_TRACK: "success",
  UNPLANNED: "warning",
  NOT_STARTED: "neutral",
  NO_SCHEDULE: "neutral",
};
const BUCKET_TONE: Record<BucketStatus, StatusTone> = { OVER: "danger", UNDER: "info", ON_TRACK: "success", NO_ESTIMATE: "warning" };

export function VarianceBadge({ status }: { status: VarianceStatus }) {
  const te = useEnumT();
  return <StatusBadge tone={VARIANCE_TONE[status]} label={te("varianceStatus", status)} />;
}

export function BucketBadge({ status }: { status: BucketStatus }) {
  const te = useEnumT();
  return <StatusBadge tone={BUCKET_TONE[status]} label={te("bucketStatus", status)} />;
}

/** "+12.5%" / "−3%" with a sign (LTR island). */
export function SignedPercent({ value, className }: { value: number | null | undefined; className?: string }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return (
    <span dir="ltr" className={cn("tabular", value > 0 ? "text-danger" : value < 0 ? "text-primary" : undefined, className)}>
      {`${sign}${Math.abs(value)}%`}
    </span>
  );
}

/** Thin horizontal bar 0–100 (logical: fills from the inline start). */
export function PercentBar({ value, label, tone = "primary" }: { value: number; label: string; tone?: "primary" | "danger" | "warning" }) {
  const fill = tone === "danger" ? "bg-danger" : tone === "warning" ? "bg-warning" : "bg-primary";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full rounded-full", fill)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="tabular text-xs text-muted-foreground">{`${value}%`}</span>
    </div>
  );
}

function AlertRow({ a }: { a: ControlAlert }) {
  const t = useT();
  const te = useEnumT();
  const meta = statusMeta("severity", a.severity);
  const Icon = meta.icon;
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-muted p-3" data-testid={`control-alert-${a.rule}`}>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full border", TONE_CLASSES[meta.tone])}>
        <Icon className="size-4" aria-hidden />
        <span className="sr-only">{te("severity", a.severity, meta.label)}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{te("controlRule", a.rule, a.rule)}</p>
        <p className="text-sm font-medium">{a.title}</p>
        <p className="text-xs text-muted-foreground">{a.body}</p>
        <p className="text-xs text-muted-foreground">
          {t("control.alerts.since", { date: formatDate(a.openedAt) })}
          {a.occurrences > 1 ? ` · ${t("control.alerts.times", { n: a.occurrences })}` : ""}
        </p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href={a.actionUrl}>
          {t("common.open")}
          <ArrowRight data-icon="inline-end" className="rtl:-scale-x-100" />
        </Link>
      </Button>
    </li>
  );
}

/** The alert list itself (separate so it can be tested on a fixture). */
export function ControlAlertList({ alerts }: { alerts: ControlAlert[] }) {
  const t = useT();
  return alerts.length ? (
    <ul className="space-y-2" aria-label={t("control.alerts.title")}>
      {alerts.map((a) => (
        <AlertRow key={a.id} a={a} />
      ))}
    </ul>
  ) : (
    <EmptyState compact icon={ShieldCheck} title={t("control.alerts.empty")} description={t("control.alerts.emptyDesc")} />
  );
}

/** Open control alerts of a project, with "Check now" for control.manage. */
export function ControlAlertsCard({ projectId }: { projectId: string }) {
  const t = useT();
  const canRun = useCan("control.manage");
  const { data, isLoading } = useGetProjectControlAlertsQuery({ projectId });
  const [runCheck, { isLoading: running }] = useRunControlAlertsMutation();
  const run = useMutationToast();
  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-2">
          <BellRing className="size-4" aria-hidden />
          {t("control.alerts.title")}
        </span>
      }
      description={t("control.alerts.desc")}
      actions={
        canRun ? (
          <Button
            size="sm"
            variant="outline"
            disabled={running}
            onClick={() =>
              void run(() => runCheck({ projectId }).unwrap(), {
                success: (r: { opened: number; resolved: number }) => t("control.alerts.ran", { opened: r.opened, resolved: r.resolved }),
              })
            }
          >
            <RefreshCw data-icon="inline-start" />
            {t("control.alerts.runNow")}
          </Button>
        ) : undefined
      }
    >
      {isLoading ? <Skeleton className="h-20 w-full" /> : <ControlAlertList alerts={data?.items ?? []} />}
    </SectionCard>
  );
}
