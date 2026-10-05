"use client";

import { Building2, CircleCheck, Clock, CreditCard, Hourglass, Lock, TriangleAlert, Wallet } from "lucide-react";
import { useGetAuditLogsQuery } from "@/api/services/admin/auditLogs.api";
import { useGetAdminHealthQuery, useGetAdminOverviewQuery } from "@/api/services/admin/overview.api";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { KpiCard } from "@/components/common/KpiCard";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { formatPKRShort } from "@/lib/money";
import { PlanDistribution, RevenueChart } from "../components/Charts";

function HealthList() {
  const { data, error } = useGetAdminHealthQuery(undefined, { pollingInterval: 60_000 });
  if (error) return <p className="text-sm text-danger">Health check failed.</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Checking…</p>;
  const job = data.jobs.subscriptionLifecycle;
  const rows = [
    { name: "API", ok: data.api.ok, detail: `v${data.version} · ${data.environment}` },
    { name: "Database", ok: data.database.ok, detail: data.database.latencyMs !== undefined ? `${data.database.latencyMs} ms` : (data.database.error ?? "") },
    { name: "SMS gateway", ok: true, detail: data.smsProvider },
    { name: "Mail", ok: true, detail: data.mailProvider },
    { name: "File storage", ok: true, detail: data.storageProvider },
    {
      name: "Subscription job",
      ok: job?.lastStatus === "SUCCESS",
      detail: job?.lastRunAt ? `${job.lastStatus ?? "—"} · ${formatRelative(job.lastRunAt)}` : "Never ran",
    },
  ];
  return (
    <ul className="divide-y">
      {rows.map((row) => (
        <li key={row.name} className="flex items-center gap-3 py-2.5 text-sm">
          {row.ok ? <CircleCheck className="size-4 text-success" aria-hidden /> : <TriangleAlert className="size-4 text-warning" aria-hidden />}
          <span className="flex-1 font-medium">{row.name}</span>
          <span className="text-muted-foreground">{row.detail}</span>
          <span className="sr-only">{row.ok ? "OK" : "Needs attention"}</span>
        </li>
      ))}
    </ul>
  );
}

function RecentActivity() {
  const { data, isLoading, error, refetch } = useGetAuditLogsQuery({ limit: 8 });
  return (
    <DataTable
      rows={data?.items}
      loading={isLoading}
      error={error}
      onRetry={refetch}
      getRowId={(a) => a.id}
      clientPageSize={0}
      empty={{ title: "No activity yet" }}
      columns={[
        { id: "when", header: "When", cell: (a) => <span title={formatDateTime(a.createdAt)}>{formatRelative(a.createdAt)}</span> },
        { id: "action", header: "Action", cell: (a) => <span className="font-mono text-xs">{a.action}</span> },
        { id: "company", header: "Company", cell: (a) => a.tenant?.name ?? <span className="text-muted-foreground">Platform</span> },
        { id: "actor", header: "By", cell: (a) => <StatusBadge tone={a.actorType === "PLATFORM_ADMIN" ? "info" : a.actorType === "SYSTEM" ? "neutral" : "success"} label={a.actorType.replace("_", " ").toLowerCase()} /> },
      ]}
    />
  );
}

export function AdminOverviewView() {
  const query = useGetAdminOverviewQuery();
  return (
    <>
      <PageHeader title="Overview" breadcrumbs={[{ label: "Overview" }]} description="Companies, revenue and platform health." />
      <QueryState query={query}>
        {(o) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard label="Active companies" icon={Building2} value={o.activeCompanies} hint={`${o.graceCompanies} in grace · ${o.suspendedCompanies} suspended`} />
              <KpiCard label="Monthly recurring revenue" icon={Wallet} tone="success" value={formatPKRShort(o.mrrPaisa)} hint="Active + grace subscriptions" />
              <KpiCard label="Payments awaiting approval" icon={CreditCard} tone="warning" value={o.paymentsAwaitingReview} />
              <KpiCard label="Trials ending this week" icon={Hourglass} tone="warning" value={o.trialsEndingThisWeek} hint={`${o.trialCompanies} on trial`} />
              <KpiCard label="Read-only" icon={Lock} tone="danger" value={o.readOnlyCompanies} hint="Lapsed — waiting for payment" />
            </div>
            <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
              <SectionCard title="Approved revenue by month" description="Last 12 months, Pakistan time.">
                {o.revenueByMonth.length ? <RevenueChart data={o.revenueByMonth} /> : <EmptyState compact icon={Clock} title="No approved payments yet" />}
              </SectionCard>
              <SectionCard title="Companies per plan">
                {o.planDistribution.length ? <PlanDistribution data={o.planDistribution} /> : <EmptyState compact title="No subscriptions yet" />}
              </SectionCard>
            </div>
            <div className="grid gap-4 xl:grid-cols-[1fr_2fr]">
              <SectionCard title="Service health">
                <HealthList />
              </SectionCard>
              <SectionCard title="Recent activity" flush>
                <RecentActivity />
              </SectionCard>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
