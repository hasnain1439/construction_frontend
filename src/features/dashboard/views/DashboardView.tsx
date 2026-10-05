"use client";

import {
  BadgeCheck,
  Banknote,
  CircleCheck,
  CircleDashed,
  ClipboardCheck,
  FolderKanban,
  ImageUp,
  Milestone,
  PackageSearch,
  Plus,
  Truck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useGetProjectsQuery } from "@/api/services/projects.api";
import { useGetSubscriptionQuery } from "@/api/services/subscription.api";
import { useGetUsersQuery } from "@/api/services/team.api";
import type { ProjectListItem, ProjectStatus } from "@/api/types";
import { ComingSoonCard } from "@/components/common/ComingSoonCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { sumPaisa } from "@/lib/money";
import { cn } from "@/lib/cn";
import { useMe } from "@/store/hooks";

const STATUS_ORDER: ProjectStatus[] = ["ACTIVE", "CLOSEOUT", "DRAFT", "HANDED_OVER", "CLOSED", "READ_ONLY"];

function OnboardingChecklist({ hasLogo, hasTeam, hasProject }: { hasLogo: boolean; hasTeam: boolean; hasProject: boolean }) {
  const isOwner = useCan({ roles: ["THEKEDAR"] });
  const steps = [
    { done: hasLogo, label: "Add your company logo", href: "/settings/company", icon: ImageUp, owner: true },
    { done: hasTeam, label: "Invite your PMs and Munshis", href: "/team/invitations?new=1", icon: UserPlus, owner: true },
    { done: false, label: "Check materials and set your rates", href: "/settings/price-list", icon: PackageSearch, owner: true },
    { done: hasProject, label: "Create your first project", href: "/projects/new", icon: FolderKanban, owner: false },
  ].filter((s) => isOwner || !s.owner);
  return (
    <SectionCard title="Get started" description="A few steps to set up your company.">
      <ul className="grid gap-3 md:grid-cols-2">
        {steps.map(({ done, label, href, icon: Icon }) => (
          <li key={label}>
            <Link
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 transition-colors hover:border-primary/50 hover:bg-accent/40",
                done && "bg-success-soft/50",
              )}
            >
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

/** Company overview with real data only; modules that don't exist yet show "next phase" cards. */
export function DashboardView() {
  const router = useRouter();
  const me = useMe();
  const isOwner = useCan({ roles: ["THEKEDAR"] });
  const isOffice = useCan({ roles: ["THEKEDAR", "PM"] });
  const seesMoney = useCan({ permission: "billing.view" });
  const canCreate = useCan({ permission: "projects.manage" });
  const projects = useGetProjectsQuery({ limit: 100 });
  const users = useGetUsersQuery({ limit: 1 }, { skip: !isOffice });
  const subscription = useGetSubscriptionQuery(undefined, { skip: !isOwner });

  const items = projects.data?.items;
  const byStatus = useMemo(() => {
    const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<ProjectStatus, number>;
    for (const p of items ?? []) counts[p.status] += 1;
    return counts;
  }, [items]);
  const activeValue = useMemo(
    () => sumPaisa((items ?? []).filter((p) => p.status === "ACTIVE" || p.status === "CLOSEOUT").map((p) => p.contractValuePaisa)),
    [items],
  );

  const usage = users.data?.meta.usage;
  const sub = subscription.data;
  const recent = (items ?? []).slice(0, 6);

  const columns: Column<ProjectListItem>[] = [
    {
      id: "name",
      header: "Project",
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{p.name}</p>
          <p className="text-xs text-muted-foreground">{p.code}</p>
        </div>
      ),
    },
    { id: "client", header: "Client", cell: (p) => p.client?.name ?? "—" },
    { id: "status", header: "Status", cell: (p) => <StatusBadge domain="project" value={p.status} /> },
    { id: "value", header: "Contract", align: "right", cell: (p) => <MoneyText paisa={p.contractValuePaisa} short />, hidden: !isOffice },
    { id: "pm", header: "PM", cell: (p) => p.pm?.name ?? <span className="text-muted-foreground">—</span> },
    { id: "end", header: "End date", cell: (p) => formatDate(p.endDate) },
  ];

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

      {projects.data && projects.data.meta.total === 0 ? (
        <OnboardingChecklist hasLogo={Boolean(me?.tenant.logoUrl)} hasTeam={(usage?.officeUsers ?? 1) > 1} hasProject={false} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active projects"
          icon={FolderKanban}
          value={byStatus.ACTIVE}
          loading={projects.isLoading}
          hint={`${byStatus.CLOSEOUT} in closeout · ${byStatus.DRAFT} draft${byStatus.DRAFT === 1 ? "" : "s"}`}
        />
        <KpiCard
          label="Contract value (running)"
          icon={Wallet}
          tone="success"
          value={seesMoney ? <MoneyText paisa={activeValue} short /> : <MoneyText paisa={undefined} />}
          loading={projects.isLoading}
          hint="Active + closeout projects"
        />
        {isOffice ? (
          <KpiCard
            label="Office users"
            icon={Users}
            tone="primary"
            value={usage ? `${usage.officeUsers}${usage.maxOfficeUsers !== null ? ` / ${usage.maxOfficeUsers}` : ""}` : "—"}
            loading={users.isLoading}
            hint="Munshis are free"
          />
        ) : null}
        <KpiCard
          label="Subscription"
          icon={BadgeCheck}
          tone={sub?.status === "GRACE" || sub?.status === "TRIAL" ? "warning" : sub?.status === "LAPSED" ? "danger" : "success"}
          value={<span className="text-2xl">{sub?.plan.name ?? me?.subscription?.plan.name ?? "—"}</span>}
          loading={isOwner && subscription.isLoading}
          hint={
            sub ? (
              <span className="inline-flex items-center gap-2">
                <StatusBadge domain="subscription" value={sub.status} className="h-5 px-2 text-[11px]" />
                {sub.daysLeft} day{sub.daysLeft === 1 ? "" : "s"} left
              </span>
            ) : me?.subscription ? (
              <StatusBadge domain="subscription" value={me.subscription.status} className="h-5 px-2 text-[11px]" />
            ) : undefined
          }
        />
      </div>

      <SectionCard title="Projects by status">
        <div className="flex flex-wrap gap-3">
          {STATUS_ORDER.map((status) => (
            <Link
              key={status}
              href={status === "CLOSED" || status === "HANDED_OVER" ? "/projects/closed" : `/projects?status=${status}`}
              className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-muted"
            >
              <StatusBadge domain="project" value={status} />
              <span className="text-lg font-semibold tabular">{projects.isLoading ? "…" : byStatus[status]}</span>
            </Link>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Recent projects"
        flush
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/projects">All projects</Link>
          </Button>
        }
      >
        <DataTable
          rows={projects.data ? recent : undefined}
          columns={columns}
          getRowId={(p) => p.id}
          loading={projects.isLoading}
          error={projects.error}
          onRetry={projects.refetch}
          clientPageSize={0}
          onRowClick={(p) => router.push(p.status === "DRAFT" ? `/projects/${p.id}/edit` : `/projects/${p.id}/overview`)}
          empty={{ title: "No projects yet", description: "Create your first project to see it here.", icon: CircleDashed }}
        />
      </SectionCard>

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Coming next</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ComingSoonCard title="Receivables" icon={Banknote} description="Owner payments due, collected and outstanding." />
          <ComingSoonCard title="Supplier Udhaar" icon={Truck} description="What you owe suppliers and for how long." />
          <ComingSoonCard title="Store Stock Value" icon={PackageSearch} description="Central store stock and dispatches on the way." />
          <ComingSoonCard title="Milestones" icon={Milestone} description="Stages completed this month." />
          <ComingSoonCard title="Pending Approvals" icon={ClipboardCheck} description="Kharcha, shortages and slips waiting for you." />
          <ComingSoonCard title="Site Stats" icon={Users} description="Hazri, peshgi, site kharcha and deliveries today." />
        </div>
      </div>
    </>
  );
}
