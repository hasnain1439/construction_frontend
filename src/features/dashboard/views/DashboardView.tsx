"use client";

import { CircleCheck, ClipboardList, FolderKanban, ImageUp, PackageSearch, PackageX, Plus, Store, Truck, UserPlus, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useGetDashboardOverviewQuery } from "@/api/services/dashboard.api";
import { useGetProjectsQuery } from "@/api/services/projects.api";
import { useGetUsersQuery } from "@/api/services/team.api";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { EMPTY_REPORT_FILTERS, ReportFilterBar, reportParams, type ReportFilters } from "@/components/common/ReportFilterBar";
import { RingKpiCard } from "@/components/common/RingKpiCard";
import { SectionCard } from "@/components/common/SectionCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { formatPKRShort } from "@/lib/money";
import { useMe } from "@/store/hooks";
import { AlertsList, LaborAnalysis, PaymentAnalysis, ProjectsSummary, SiteStats } from "../components/OverviewSections";
import { SiteDashboardView } from "./SiteDashboardView";

function OnboardingChecklist({ hasLogo, hasTeam }: { hasLogo: boolean; hasTeam: boolean }) {
  const isOwner = useCan({ roles: ["THEKEDAR"] });
  const steps = [
    { done: hasLogo, label: "Add your company logo", href: "/settings/company", icon: ImageUp, owner: true },
    { done: hasTeam, label: "Invite your PMs and Munshis", href: "/team/invitations?new=1", icon: UserPlus, owner: true },
    { done: false, label: "Check materials and set your rates", href: "/settings/price-list", icon: PackageSearch, owner: true },
    { done: false, label: "Create your first project", href: "/projects/new", icon: FolderKanban, owner: false },
  ].filter((s) => isOwner || !s.owner);
  return (
    <SectionCard title="Get started" description="A few steps to set up your company.">
      <ul className="grid gap-3 md:grid-cols-2">
        {steps.map(({ done, label, href, icon: Icon }) => (
          <li key={label}>
            <Link href={href} className={cn("flex items-center gap-3 rounded-xl border p-4 transition-colors hover:border-primary/50 hover:bg-accent/40", done && "bg-success-soft/50")}>
              <span className={cn("flex size-9 items-center justify-center rounded-lg", done ? "bg-success text-white" : "bg-accent text-primary")}>
                {done ? <CircleCheck className="size-5" aria-hidden /> : <Icon className="size-5" aria-hidden />}
              </span>
              <span className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>{label}</span>
              <span className="sr-only">{done ? "(done)" : "(to do)"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

/**
 * Dashboard → Company Overview (design brief §6) from GET /dashboard/overview. Money (row 2,
 * project money columns, payment analysis) only comes — and only shows — with billing.view.
 * A MUNSHI lands on their site dashboard instead.
 */
export function DashboardView() {
  const me = useMe();
  if (me?.user.role === "MUNSHI") return <SiteDashboardView />;
  return <CompanyOverview />;
}

function CompanyOverview() {
  const me = useMe();
  const isOffice = useCan({ roles: ["THEKEDAR", "PM"] });
  const canCreate = useCan({ permission: "projects.manage" });
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_REPORT_FILTERS);
  const overview = useGetDashboardOverviewQuery(reportParams(filters), { refetchOnMountOrArgChange: 30 });
  const projects = useGetProjectsQuery({ limit: 1 });
  const users = useGetUsersQuery({ limit: 1 }, { skip: !isOffice });
  const d = overview.data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={me ? `Assalam-o-Alaikum, ${me.user.name.split(" ")[0]}.` : undefined}
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/projects/new">
                <Plus data-icon="inline-start" />
                New project
              </Link>
            </Button>
          ) : null
        }
      />

      {projects.data && projects.data.meta.total === 0 ? <OnboardingChecklist hasLogo={Boolean(me?.tenant.logoUrl)} hasTeam={(users.data?.meta.usage?.officeUsers ?? 1) > 1} /> : null}

      <ReportFilterBar value={filters} onChange={setFilters} dateLabel="Last 30 days" trailing={d ? <span className="px-2 text-xs text-muted-foreground">{formatDate(d.period.from)} – {formatDate(d.period.to)}</span> : null} />

      <QueryState query={overview} skeleton={<OverviewSkeleton />}>
        {(data) => {
          const k = data.kpis;
          const money = data.seesFinancials;
          return (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <KpiCard
                  label="Active projects"
                  icon={FolderKanban}
                  value={k.activeProjects.count}
                  tone={k.activeProjects.atRisk ? "warning" : "primary"}
                  hint={money ? `${k.activeProjects.atRisk} at risk` : `${k.dispatchesOnTheWay} dispatch${k.dispatchesOnTheWay === 1 ? "" : "es"} on the way`}
                />
                <Link href="/dashboard/approvals" className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  <KpiCard label="Pending approvals" icon={ClipboardList} value={k.pendingApprovals} tone={k.pendingApprovals ? "warning" : "success"} hint="Open My Approvals" className="h-full transition-colors hover:border-primary/50" />
                </Link>
                <KpiCard label="Open shortages" icon={PackageX} value={k.openShortages} tone={k.openShortages ? "danger" : "success"} hint={k.openShortages ? "Waiting for your decision" : "Nothing short"} />
              </div>

              {money ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <RingKpiCard
                    label="Receivables"
                    value={<MoneyText paisa={k.receivablesOutstandingPaisa} short />}
                    percent={k.collectedPercent ?? 0}
                    ringLabel="collected"
                    tone={k.overduePaisa && k.overduePaisa !== "0" ? "warning" : "success"}
                    hint={k.overduePaisa && k.overduePaisa !== "0" ? `${formatPKRShort(k.overduePaisa)} overdue` : "Nothing overdue"}
                  />
                  <RingKpiCard
                    label="Supplier udhaar"
                    value={<MoneyText paisa={k.supplierUdhaarPaisa} short />}
                    percent={k.supplierPaidPercent ?? 0}
                    ringLabel="paid"
                    tone="warning"
                    hint={k.supplierOldestDays ? `Oldest ${k.supplierOldestDays} days` : "Nothing owed"}
                  />
                  <KpiCard
                    label="Store stock value"
                    icon={Store}
                    value={<MoneyText paisa={k.storeStockValuePaisa} short />}
                    hint={
                      <span className="inline-flex items-center gap-1">
                        <Truck className="size-3.5" aria-hidden />
                        {k.dispatchesOnTheWay} dispatch{k.dispatchesOnTheWay === 1 ? "" : "es"} on the way
                      </span>
                    }
                  />
                </div>
              ) : null}

              {money ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <KpiCard label="Cash with site staff" icon={Wallet} value={<MoneyText paisa={k.cashWithSiteStaffPaisa} short />} hint={<Link className="underline-offset-2 hover:underline" href="/finance/cash-floats">Cash floats overview</Link>} />
                  <KpiCard
                    label="Own money invested"
                    icon={Wallet}
                    tone={k.ownMoneyInvestedPaisa && !k.ownMoneyInvestedPaisa.startsWith("-") && k.ownMoneyInvestedPaisa !== "0" ? "warning" : "success"}
                    value={<MoneyText paisa={k.ownMoneyInvestedPaisa} short />}
                    hint="Spent to date − received (negative: owners have paid ahead)"
                  />
                </div>
              ) : null}

              <ProjectsSummary rows={data.projects} money={money} />

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-4">
                  <SiteStats site={data.site} />
                  <LaborAnalysis labor={data.labor} />
                </div>
                <div className="space-y-4">
                  {data.payments ? <PaymentAnalysis payments={data.payments} /> : null}
                  <AlertsList alerts={data.alerts} />
                </div>
              </div>
            </div>
          );
        }}
      </QueryState>
    </>
  );
}
