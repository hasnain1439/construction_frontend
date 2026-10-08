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
import { cn } from "@/lib/cn";
import { formatDate, formatRelative } from "@/lib/dates";
import { formatPKRShort, toPaisaBigInt } from "@/lib/money";
import { humanize, statusMeta, TONE_CLASSES } from "@/lib/status";

const plot = (p: string | undefined) => Number(toPaisaBigInt(p ?? "0") ?? BigInt(0));

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
  const router = useRouter();
  const shown = rows ? mostRelevant(rows) : undefined;
  const total = rows?.length ?? 0;
  const columns: Column<OverviewProjectRow>[] = [
    {
      id: "project",
      header: "Project",
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
    { id: "contract", header: "Contract", align: "right", hidden: !money, cell: (r) => <MoneyText paisa={r.contractPaisa} short /> },
    { id: "progress", header: "Billed vs spent", hidden: !money, cell: (r) => <ProgressPair billed={r.percentBilled ?? 0} spent={r.percentSpentOfContract ?? 0} /> },
    { id: "received", header: "Received", align: "right", hidden: !money, cell: (r) => <MoneyText paisa={r.receivedPaisa} short /> },
    {
      id: "outstanding",
      header: "Outstanding",
      align: "right",
      hidden: !money,
      cell: (r) => (
        <span className={cn(r.overduePaisa && r.overduePaisa !== "0" && "text-danger")}>
          <MoneyText paisa={r.outstandingPaisa} short />
          {r.overduePaisa && r.overduePaisa !== "0" ? <span className="block text-xs">overdue {formatPKRShort(r.overduePaisa)}</span> : null}
        </span>
      ),
    },
    {
      id: "own",
      header: "Own money in",
      align: "right",
      hidden: !money,
      cell: (r) => (plot(r.ownMoneyInvestedPaisa) > 0 ? <MoneyText paisa={r.ownMoneyInvestedPaisa} short className="text-warning" /> : <span className="text-success">Owner ahead</span>),
    },
    {
      id: "next",
      header: "Next stage",
      hidden: !money,
      cell: (r) => (r.nextBillableStage ? <span className="text-sm">{r.nextBillableStage.label}</span> : <span className="text-muted-foreground">—</span>),
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusBadge domain="project" value={r.project.status} />
          {r.atRisk ? <span className={cn("rounded-full border px-2 text-xs font-medium", TONE_CLASSES.danger)}>At risk</span> : null}
        </span>
      ),
    },
  ];
  return (
    <SectionCard title="Projects summary" flush actions={<Button asChild variant="outline" size="sm"><Link href="/projects">All projects</Link></Button>}>
      <DataTable
        rows={shown}
        columns={columns}
        getRowId={(r) => r.project.id}
        loading={loading}
        clientPageSize={0}
        onRowClick={(r) => router.push(`/projects/${r.project.id}/overview`)}
        empty={{ title: "No running projects", description: "Active, closeout and handed-over projects show up here.", icon: CircleDashed }}
      />
      {total > SUMMARY_LIMIT ? (
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
          <span>
            Showing {SUMMARY_LIMIT} of {total} projects
          </span>
          <Link href="/projects" className="font-medium text-foreground underline-offset-2 hover:underline">
            View all
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
  const h = site.hazriToday;
  return (
    <SectionCard title="Site stats" description={`Week ${formatDate(site.week.weekStart)} – ${formatDate(site.week.weekEnd)}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Chip icon={Users} label="Hazri today" value={h.total} hint={`Mistri ${h.mistri} · Mazdoor ${h.mazdoor} · Other ${h.other} (of ${site.assignedWorkers})`} />
        <Chip icon={Wallet} label="Peshgi this week" value={<MoneyText paisa={site.peshgiThisWeekPaisa} />} />
        <Chip icon={HardHat} label="Site kharcha this week" value={<MoneyText paisa={site.siteKharchaThisWeekPaisa} />} />
        <Chip icon={PackageCheck} label="Deliveries today" value={site.deliveriesToday} hint={site.openShortages ? `${site.openShortages} open shortage${site.openShortages === 1 ? "" : "s"}` : "No open shortages"} />
      </div>
    </SectionCard>
  );
}

export function LaborAnalysis({ labor }: { labor: DashboardOverview["labor"] }) {
  return (
    <SectionCard title="Labour analysis" description={`Wages from weekly settlements · ${formatDate(labor.period.from)} – ${formatDate(labor.period.to)}`}>
      <ShareColumns
        ariaLabel="Wages by worker type"
        items={labor.byWorkerType.map((t) => ({ key: t.type, label: humanize(t.type), value: plot(t.wagesPaisa), display: <MoneyText paisa={t.wagesPaisa} short />, hint: `${t.days} days` }))}
        empty="No weekly settlements in this period."
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
        <span>
          Total wages <MoneyText paisa={labor.wagesPaisa} className="font-semibold" />
        </span>
        {labor.subcontractorsOverpaid ? (
          <span className="flex items-center gap-1.5 text-warning">
            <FileWarning className="size-4" aria-hidden />
            {labor.subcontractorsOverpaid} sub-contractor{labor.subcontractorsOverpaid === 1 ? "" : "s"} overpaid
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-success">
            <ShieldCheck className="size-4" aria-hidden />
            No sub-contractor overpaid
          </span>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Payments + alerts ──────────────────────────────────────────────────────

const METHOD_LABEL: Record<string, string> = { CASH: "Cash", BANK_TRANSFER: "Bank transfer", CHEQUE: "Cheque (cleared + pending)", JAZZCASH: "JazzCash", EASYPAISA: "Easypaisa", RAAST: "Raast" };

export function PaymentAnalysis({ payments }: { payments: NonNullable<DashboardOverview["payments"]> }) {
  return (
    <SectionCard title="Payment analysis" description={`Received from owners · ${formatDate(payments.period.from)} – ${formatDate(payments.period.to)}`}>
      <ShareColumns
        ariaLabel="Payments by method"
        items={payments.byMethod
          .filter((m) => m.count > 0)
          .map((m) => ({ key: m.method, label: METHOD_LABEL[m.method] ?? humanize(m.method), value: plot(m.amountPaisa), display: <MoneyText paisa={m.amountPaisa} short />, hint: `${m.count} payment${m.count === 1 ? "" : "s"}` }))}
        empty="No payments received in this period."
      />
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-sm">
        {(
          [
            ["Cleared", payments.cheques.clearedPaisa, "text-success"],
            ["Pending", payments.cheques.pendingPaisa, "text-warning"],
            ["Bounced", payments.cheques.bouncedPaisa, "text-danger"],
          ] as const
        ).map(([label, paisa, tone]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">Cheques {label.toLowerCase()}</dt>
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
  return (
    <SectionCard title="Alerts" actions={<Button asChild variant="ghost" size="sm"><Link href="/dashboard/alerts">All notifications</Link></Button>}>
      {alerts.length ? (
        <ul className="space-y-2" aria-label="Alerts">
          {alerts.map((a) => {
            const meta = statusMeta("severity", a.severity);
            const Icon = meta.icon;
            return (
              <li key={`${a.source}:${a.id}`} className="flex items-center gap-3 rounded-2xl bg-muted p-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full border", TONE_CLASSES[meta.tone])}>
                  <Icon className="size-4" aria-hidden />
                  <span className="sr-only">{meta.label}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">{humanize(a.type)}</p>
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.project ? `${a.project.name} · ` : ""}
                    {formatRelative(a.at)}
                  </p>
                </div>
                {a.actionUrl ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={a.actionUrl}>
                      Open
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState compact icon={ShieldCheck} title="All clear" description="No overdue invoices, bounced cheques or critical alerts." />
      )}
    </SectionCard>
  );
}
