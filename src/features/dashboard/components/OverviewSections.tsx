"use client";

import { ArrowRight, CircleDashed, FileWarning, HardHat, PackageCheck, ShieldCheck, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { DashboardAlert, DashboardOverview, OverviewProjectRow } from "@/api/types";
import { ShareColumns } from "@/components/common/ShareColumns";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { MoneyText } from "@/components/common/MoneyText";
import { ProgressPair } from "@/components/common/ProgressPair";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { useEnumT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatDate, formatRelative } from "@/lib/dates";
import { formatPKRShort, toPaisaBigInt } from "@/lib/money";
import { humanize, statusMeta, TONE_CLASSES } from "@/lib/status";

const plot = (p: string | undefined) => Number(toPaisaBigInt(p ?? "0") ?? BigInt(0));

/** A Latin date inside a translated sentence: isolated so it keeps its order in right-to-left Urdu. */
const day = (value: string) => `\u2068${formatDate(value)}\u2069`;

// ─── Projects summary ───────────────────────────────────────────────────────

/** The dashboard shows a short list; the full one is on the Projects page. */
const SUMMARY_LIMIT = 5;
const STATUS_RANK: Record<string, number> = { ACTIVE: 0, CLOSEOUT: 1 };

/** At-risk first, then active, then closeout, then the rest (handed over…) — order kept within each group. */
function mostRelevant(rows: OverviewProjectRow[]): OverviewProjectRow[] {
  const rank = (r: OverviewProjectRow) => (r.atRisk ? 0 : 1) * 10 + (STATUS_RANK[r.project.status] ?? 2);
  return [...rows].sort((a, b) => rank(a) - rank(b)).slice(0, SUMMARY_LIMIT);
}

export function ProjectsSummary({ rows, money, loading }: { rows: OverviewProjectRow[] | undefined; money: boolean; loading?: boolean }) {
  const t = useT();
  const te = useEnumT();
  const router = useRouter();
  const shown = rows ? mostRelevant(rows) : undefined;
  const total = rows?.length ?? 0;
  const columns: Column<OverviewProjectRow>[] = [
    {
      id: "project",
      header: t("dashboard.colProject"),
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.project.name}</p>
          <p className="text-xs text-muted-foreground">
            {r.project.code}
            {r.client ? ` · ${r.client.name}` : ""}
          </p>
        </div>
      ),
    },
    { id: "contract", header: t("dashboard.colContract"), align: "right", hidden: !money, cell: (r) => <MoneyText paisa={r.contractPaisa} short /> },
    { id: "progress", header: t("dashboard.colBilledVsSpent"), hidden: !money, cell: (r) => <ProgressPair billed={r.percentBilled ?? 0} spent={r.percentSpentOfContract ?? 0} /> },
    { id: "received", header: t("dashboard.colReceived"), align: "right", hidden: !money, cell: (r) => <MoneyText paisa={r.receivedPaisa} short /> },
    {
      id: "outstanding",
      header: t("dashboard.colOutstanding"),
      align: "right",
      hidden: !money,
      cell: (r) => (
        <span className={cn(r.overduePaisa && r.overduePaisa !== "0" && "text-danger")}>
          <MoneyText paisa={r.outstandingPaisa} short />
          {r.overduePaisa && r.overduePaisa !== "0" ? <span className="block text-xs">{t("dashboard.overdueShort", { amount: formatPKRShort(r.overduePaisa) })}</span> : null}
        </span>
      ),
    },
    {
      id: "own",
      header: t("dashboard.colOwnMoney"),
      align: "right",
      hidden: !money,
      cell: (r) => (plot(r.ownMoneyInvestedPaisa) > 0 ? <MoneyText paisa={r.ownMoneyInvestedPaisa} short className="text-warning" /> : <span className="text-success">{t("dashboard.ownerAhead")}</span>),
    },
    {
      id: "next",
      header: t("dashboard.colNextStage"),
      hidden: !money,
      cell: (r) => (r.nextBillableStage ? <span className="text-sm">{r.nextBillableStage.label}</span> : <span className="text-muted-foreground">—</span>),
    },
    {
      id: "status",
      header: t("common.status"),
      cell: (r) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusBadge domain="project" value={r.project.status} label={te("projectStatus", r.project.status)} />
          {r.atRisk ? <span className={cn("rounded-full border px-2 text-xs font-medium", TONE_CLASSES.danger)}>{t("dashboard.atRiskBadge")}</span> : null}
        </span>
      ),
    },
  ];
  return (
    <SectionCard title={t("dashboard.projectsSummary")} flush actions={<Button asChild variant="outline" size="sm"><Link href="/projects">{t("shell.allProjects")}</Link></Button>}>
      <DataTable
        rows={shown}
        columns={columns}
        getRowId={(r) => r.project.id}
        loading={loading}
        clientPageSize={0}
        onRowClick={(r) => router.push(`/projects/${r.project.id}/overview`)}
        empty={{ title: t("dashboard.noRunningProjects"), description: t("dashboard.noRunningProjectsDesc"), icon: CircleDashed }}
      />
      {total > SUMMARY_LIMIT ? (
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
          <span>{t("dashboard.showingProjects", { shown: SUMMARY_LIMIT, total })}</span>
          <Link href="/projects" className="font-medium text-foreground underline-offset-2 hover:underline">
            {t("common.viewAll")}
          </Link>
        </div>
      ) : null}
    </SectionCard>
  );
}

// ─── Site stats + labour ────────────────────────────────────────────────────

function Chip({ icon: Icon, label, value, hint }: { icon: typeof Users; label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-foreground shadow-card">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

export function SiteStats({ site }: { site: DashboardOverview["site"] }) {
  const t = useT();
  const te = useEnumT();
  const h = site.hazriToday;
  return (
    <SectionCard title={t("dashboard.siteStats")} description={t("dashboard.weekRange", { from: day(site.week.weekStart), to: day(site.week.weekEnd) })}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Chip icon={Users} label={t("dashboard.attendanceToday")} value={h.total} hint={`${te("workerType", "MISTRI")} ${h.mistri} · ${te("workerType", "MAZDOOR")} ${h.mazdoor} · ${t("common.other")} ${h.other} ${t("dashboard.ofTotal", { n: site.assignedWorkers })}`} />
        <Chip icon={Wallet} label={t("dashboard.advancesThisWeek")} value={<MoneyText paisa={site.peshgiThisWeekPaisa} />} />
        <Chip icon={HardHat} label={t("dashboard.siteExpensesThisWeek")} value={<MoneyText paisa={site.siteKharchaThisWeekPaisa} />} />
        <Chip icon={PackageCheck} label={t("dashboard.deliveriesToday")} value={site.deliveriesToday} hint={site.openShortages ? t(site.openShortages === 1 ? "dashboard.openShortage" : "dashboard.openShortagesN", { n: site.openShortages }) : t("dashboard.noOpenShortages")} />
      </div>
    </SectionCard>
  );
}

export function LaborAnalysis({ labor }: { labor: DashboardOverview["labor"] }) {
  const t = useT();
  const te = useEnumT();
  return (
    <SectionCard title={t("dashboard.laborAnalysis")} description={t("dashboard.laborDesc", { from: day(labor.period.from), to: day(labor.period.to) })}>
      <ShareColumns
        ariaLabel={t("dashboard.wagesByWorkerType")}
        items={labor.byWorkerType.map((w) => ({ key: w.type, label: te("workerType", w.type, humanize(w.type)), value: plot(w.wagesPaisa), display: <MoneyText paisa={w.wagesPaisa} short />, hint: t("dashboard.days", { n: w.days }) }))}
        empty={t("dashboard.noSettlements")}
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
        <span>
          {t("dashboard.totalWages")} <MoneyText paisa={labor.wagesPaisa} className="font-semibold" />
        </span>
        {labor.subcontractorsOverpaid ? (
          <span className="flex items-center gap-1.5 text-warning">
            <FileWarning className="size-4" aria-hidden />
            {t(labor.subcontractorsOverpaid === 1 ? "dashboard.subOverpaid" : "dashboard.subsOverpaid", { n: labor.subcontractorsOverpaid })}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-success">
            <ShieldCheck className="size-4" aria-hidden />
            {t("dashboard.noSubOverpaid")}
          </span>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Payments + alerts ──────────────────────────────────────────────────────

export function PaymentAnalysis({ payments }: { payments: NonNullable<DashboardOverview["payments"]> }) {
  const t = useT();
  const te = useEnumT();
  return (
    <SectionCard title={t("dashboard.paymentAnalysis")} description={t("dashboard.paymentDesc", { from: day(payments.period.from), to: day(payments.period.to) })}>
      <ShareColumns
        ariaLabel={t("dashboard.paymentsByMethod")}
        items={payments.byMethod
          .filter((m) => m.count > 0)
          .map((m) => ({ key: m.method, label: te("paymentMethod", m.method, humanize(m.method)), value: plot(m.amountPaisa), display: <MoneyText paisa={m.amountPaisa} short />, hint: t(m.count === 1 ? "dashboard.payment" : "dashboard.payments", { n: m.count }) }))}
        empty={t("dashboard.noPayments")}
      />
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-sm">
        {(
          [
            [t("dashboard.chequesCleared"), payments.cheques.clearedPaisa, "text-success"],
            [t("dashboard.chequesPending"), payments.cheques.pendingPaisa, "text-warning"],
            [t("dashboard.chequesBounced"), payments.cheques.bouncedPaisa, "text-danger"],
          ] as const
        ).map(([label, paisa, tone]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={cn("font-semibold", paisa !== "0" && tone)}>
              <MoneyText paisa={paisa} short />
            </dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

export function AlertsList({ alerts }: { alerts: DashboardAlert[] }) {
  const t = useT();
  const te = useEnumT();
  return (
    <SectionCard title={t("dashboard.alerts")} actions={<Button asChild variant="ghost" size="sm"><Link href="/dashboard/alerts">{t("dashboard.allNotifications")}</Link></Button>}>
      {alerts.length ? (
        <ul className="space-y-2" aria-label={t("dashboard.alerts")}>
          {alerts.map((a) => {
            const meta = statusMeta("severity", a.severity);
            const Icon = meta.icon;
            return (
              <li key={`${a.source}:${a.id}`} className="flex items-center gap-3 rounded-2xl bg-muted p-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full border", TONE_CLASSES[meta.tone])}>
                  <Icon className="size-4" aria-hidden />
                  <span className="sr-only">{te("severity", a.severity, meta.label)}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">{te("notificationType", a.type, humanize(a.type))}</p>
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.project ? `${a.project.name} · ` : ""}
                    {formatRelative(a.at)}
                  </p>
                </div>
                {a.actionUrl ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={a.actionUrl}>
                      {t("common.open")}
                      <ArrowRight data-icon="inline-end" className="rtl:-scale-x-100" />
                    </Link>
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState compact icon={ShieldCheck} title={t("dashboard.allClear")} description={t("dashboard.allClearDesc")} />
      )}
    </SectionCard>
  );
}
