"use client";

import { CircleCheck, ClipboardList, FolderKanban, ImageUp, PackageSearch, PackageX, Plus, Store, Truck, UserPlus, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useGetDashboardOverviewQuery } from "@/api/services/dashboard.api";
import { useGetProjectsQuery } from "@/api/services/projects.api";
import { useGetUsersQuery } from "@/api/services/team.api";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { EMPTY_REPORT_FILTERS, ReportFilterBar, reportParams, type ReportFilters } from "@/components/common/ReportFilterBar";
import { RingKpiCard } from "@/components/common/RingKpiCard";
import { SectionCard } from "@/components/common/SectionCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { formatPKRShort } from "@/lib/money";
import { useMe } from "@/store/hooks";
import { AlertsList, LaborAnalysis, PaymentAnalysis, ProjectsSummary, SiteStats } from "../components/OverviewSections";
import { SiteDashboardView } from "./SiteDashboardView";

function OnboardingChecklist({ hasLogo, hasTeam }: { hasLogo: boolean; hasTeam: boolean }) {
  const t = useT();
  const isOwner = useCan({ roles: ["THEKEDAR"] });
  const steps = [
    { done: hasLogo, label: t("dashboard.stepLogo"), href: "/settings/company", icon: ImageUp, owner: true },
    { done: hasTeam, label: t("dashboard.stepInvite"), href: "/team/invitations?new=1", icon: UserPlus, owner: true },
    { done: false, label: t("dashboard.stepRates"), href: "/settings/price-list", icon: PackageSearch, owner: true },
    { done: false, label: t("dashboard.stepFirstProject"), href: "/projects/new", icon: FolderKanban, owner: false },
  ].filter((s) => isOwner || !s.owner);
  return (
    <SectionCard title={t("dashboard.getStarted")} description={t("dashboard.getStartedDesc")}>
      <ul className="grid gap-3 md:grid-cols-2">
        {steps.map(({ done, label, href, icon: Icon }) => (
          <li key={label}>
            <Link href={href} className={cn("flex items-center gap-3 rounded-2xl bg-muted p-3 pe-4 transition-colors hover:bg-accent", done && "bg-success-soft")}>
              <span className={cn("flex size-10 items-center justify-center rounded-full", done ? "bg-success text-white" : "bg-card text-foreground shadow-card")}>
                {done ? <CircleCheck className="size-5" aria-hidden /> : <Icon className="size-5" aria-hidden />}
              </span>
              <span className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>{label}</span>
              <span className="sr-only">{done ? t("dashboard.stepDone") : t("dashboard.stepToDo")}</span>
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
      <div className="grid gap-3 rounded-3xl bg-card p-4 shadow-card sm:p-5 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-3xl" />
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
  const t = useT();
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
        title={t("dashboard.title")}
        description={me ? t("dashboard.greeting", { name: me.user.name.split(" ")[0] }) : undefined}
        breadcrumbs={[{ label: t("dashboard.title") }]}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href="/projects/new">
                <Plus data-icon="inline-start" />
                {t("dashboard.newProject")}
              </Link>
            </Button>
          ) : null
        }
      />

      {projects.data && projects.data.meta.total === 0 ? <OnboardingChecklist hasLogo={Boolean(me?.tenant.logoUrl)} hasTeam={(users.data?.meta.usage?.officeUsers ?? 1) > 1} /> : null}

      <ReportFilterBar value={filters} onChange={setFilters} dateLabel={t("dashboard.last30Days")} trailing={d ? <span dir="ltr" className="px-2 text-xs text-muted-foreground">{formatDate(d.period.from)} – {formatDate(d.period.to)}</span> : null} />

      <QueryState query={overview} skeleton={<OverviewSkeleton />}>
        {(data) => {
          const k = data.kpis;
          const money = data.seesFinancials;
          const onTheWay = t(k.dispatchesOnTheWay === 1 ? "dashboard.dispatchOnWay" : "dashboard.dispatchesOnWay", { n: k.dispatchesOnTheWay });
          return (
            <div className="space-y-4">
              <KpiGroup>
                <KpiCard
                  variant="tile"
                  highlight
                  label={t("dashboard.activeProjects")}
                  icon={FolderKanban}
                  value={k.activeProjects.count}
                  tone={k.activeProjects.atRisk ? "warning" : "primary"}
                  hint={money ? t("dashboard.atRisk", { n: k.activeProjects.atRisk }) : onTheWay}
                />
                <Link href="/dashboard/approvals" className="rounded-2xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  <KpiCard variant="tile" label={t("dashboard.pendingApprovals")} icon={ClipboardList} value={k.pendingApprovals} tone={k.pendingApprovals ? "warning" : "success"} hint={t("dashboard.openMyApprovals")} className="h-full transition-colors hover:bg-accent" />
                </Link>
                <KpiCard variant="tile" label={t("dashboard.openShortages")} icon={PackageX} value={k.openShortages} tone={k.openShortages ? "danger" : "success"} hint={k.openShortages ? t("dashboard.waitingDecision") : t("dashboard.nothingShort")} />
              </KpiGroup>

              {money ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <RingKpiCard
                    label={t("dashboard.receivables")}
                    value={<MoneyText paisa={k.receivablesOutstandingPaisa} short />}
                    percent={k.collectedPercent ?? 0}
                    ringLabel={t("dashboard.collected")}
                    tone={k.overduePaisa && k.overduePaisa !== "0" ? "warning" : "success"}
                    hint={k.overduePaisa && k.overduePaisa !== "0" ? t("dashboard.overdue", { amount: formatPKRShort(k.overduePaisa) }) : t("dashboard.nothingOverdue")}
                  />
                  <RingKpiCard
                    label={t("dashboard.supplierCredit")}
                    value={<MoneyText paisa={k.supplierUdhaarPaisa} short />}
                    percent={k.supplierPaidPercent ?? 0}
                    ringLabel={t("dashboard.paid")}
                    tone="warning"
                    hint={k.supplierOldestDays ? t("dashboard.oldestDays", { n: k.supplierOldestDays }) : t("dashboard.nothingOwed")}
                  />
                  <KpiCard
                    className="sm:col-span-2 lg:col-span-1"
                    label={t("dashboard.storeStockValue")}
                    icon={Store}
                    value={<MoneyText paisa={k.storeStockValuePaisa} short />}
                    hint={
                      <span className="inline-flex items-center gap-1">
                        <Truck className="size-3.5" aria-hidden />
                        {onTheWay}
                      </span>
                    }
                  />
                </div>
              ) : null}

              {money ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <KpiCard label={t("dashboard.cashWithSiteStaff")} icon={Wallet} value={<MoneyText paisa={k.cashWithSiteStaffPaisa} short />} hint={<Link className="underline-offset-2 hover:underline" href="/finance/cash-floats">{t("dashboard.cashFloatsOverview")}</Link>} />
                  <KpiCard
                    label={t("dashboard.ownMoneyInvested")}
                    icon={Wallet}
                    tone={k.ownMoneyInvestedPaisa && !k.ownMoneyInvestedPaisa.startsWith("-") && k.ownMoneyInvestedPaisa !== "0" ? "warning" : "success"}
                    value={<MoneyText paisa={k.ownMoneyInvestedPaisa} short />}
                    hint={t("dashboard.ownMoneyHint")}
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
