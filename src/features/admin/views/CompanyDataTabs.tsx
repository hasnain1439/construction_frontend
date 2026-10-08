"use client";

import {
  Banknote,
  ClipboardList,
  FolderKanban,
  HardHat,
  Receipt,
  Smartphone,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import {
  useGetCompanyActivityQuery,
  useGetCompanyProjectsQuery,
  useGetCompanyTeamQuery,
} from "@/api/services/admin/tenants.api";
import type { CompanyActivity, CompanyProjectRow, CompanyTeam } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatDate, formatDateTime, formatRelative } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { PLATFORM_LABEL, ROLE_LABEL } from "@/lib/options";
import { formatPhone } from "@/lib/phone";

/** Shown on every data tab: this is someone else's business data. */
export function ReadOnlyNotice() {
  return (
    <InlineAlert tone="info" title="Read-only view of this company's data">
      You can look, not change. Each look is written to this company&apos;s audit log (Timeline).
    </InlineAlert>
  );
}

// ─── Projects ───────────────────────────────────────────────────────────────

export function CompanyProjectsTab({ tenantId }: { tenantId: string }) {
  const q = useGetCompanyProjectsQuery(tenantId);
  const columns: Column<CompanyProjectRow>[] = [
    {
      id: "project",
      header: "Project",
      sortValue: (p) => p.name,
      cell: (p) => (
        <div>
          <p className="font-medium">{p.name}</p>
          <p className="text-xs text-muted-foreground">{[p.code, p.city].filter(Boolean).join(" · ")}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (p) => p.status,
      cell: (p) => <StatusBadge domain="project" value={p.status} />,
    },
    {
      id: "client",
      header: "Client",
      cell: (p) =>
        p.client ? (
          <div>
            <p>{p.client.name}</p>
            <p className="text-xs text-muted-foreground">{formatPhone(p.client.phone)}</p>
          </div>
        ) : (
          "—"
        ),
    },
    {
      id: "dates",
      header: "Dates",
      cell: (p) => (p.startDate ? `${formatDate(p.startDate)} – ${formatDate(p.endDate)}` : "—"),
    },
    {
      id: "contract",
      header: "Contract",
      align: "right",
      sortValue: (p) => Number(p.contractValuePaisa ?? 0),
      cell: (p) =>
        p.contractValuePaisa ? (
          <MoneyText paisa={p.contractValuePaisa} />
        ) : (
          <span className="text-muted-foreground">Not set</span>
        ),
    },
    {
      id: "billed",
      header: "Billed",
      align: "right",
      sortValue: (p) => Number(p.billedPaisa),
      cell: (p) => <MoneyText paisa={p.billedPaisa} />,
    },
    {
      id: "received",
      header: "Received",
      align: "right",
      sortValue: (p) => Number(p.receivedPaisa),
      cell: (p) => <MoneyText paisa={p.receivedPaisa} />,
    },
    {
      id: "owed",
      header: "Outstanding",
      align: "right",
      sortValue: (p) => Number(p.outstandingPaisa),
      cell: (p) =>
        BigInt(p.outstandingPaisa) > BigInt(0) ? (
          <MoneyText paisa={p.outstandingPaisa} className="text-warning" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "people",
      header: "Team / workers",
      align: "right",
      cell: (p) => <span className="tabular">{`${p.teamMembers} / ${p.activeWorkers}`}</span>,
    },
    {
      id: "log",
      header: "Last daily log",
      sortValue: (p) => p.lastDailyLog ?? "",
      cell: (p) =>
        p.lastDailyLog ? formatDate(p.lastDailyLog) : <span className="text-muted-foreground">None</span>,
    },
  ];
  return (
    <div className="space-y-4">
      <ReadOnlyNotice />
      <SectionCard title={q.data ? `Projects (${q.data.length})` : "Projects"} flush>
        <DataTable
          rows={q.data}
          columns={columns}
          getRowId={(p) => p.id}
          loading={q.isLoading}
          error={q.error}
          onRetry={q.refetch}
          clientPageSize={20}
          empty={{ title: "No projects yet", icon: FolderKanban }}
        />
      </SectionCard>
    </div>
  );
}

// ─── Team & devices ─────────────────────────────────────────────────────────

type TeamUser = CompanyTeam["users"][number];
type TeamDevice = CompanyTeam["devices"][number];

export function CompanyTeamTab({ tenantId }: { tenantId: string }) {
  const q = useGetCompanyTeamQuery(tenantId);
  const users: Column<TeamUser>[] = [
    {
      id: "name",
      header: "Name",
      sortValue: (u) => u.name,
      cell: (u) => (
        <div>
          <p className="font-medium">{u.name}</p>
          <p className="text-xs text-muted-foreground">
            {[formatPhone(u.phone), u.email].filter(Boolean).join(" · ")}
          </p>
        </div>
      ),
    },
    { id: "role", header: "Role", sortValue: (u) => u.role, cell: (u) => ROLE_LABEL[u.role] },
    { id: "status", header: "Status", cell: (u) => <StatusBadge domain="user" value={u.status} /> },
    {
      id: "projects",
      header: "Projects",
      align: "right",
      cell: (u) => (u.projects === null ? "All" : <span className="tabular">{u.projects}</span>),
    },
    {
      id: "money",
      header: "Sees money",
      cell: (u) => (u.role === "THEKEDAR" || u.canSeeFinancials ? "Yes" : "No"),
    },
    {
      id: "login",
      header: "Last sign-in",
      sortValue: (u) => u.lastLoginAt ?? "",
      cell: (u) => formatRelative(u.lastLoginAt, "Never"),
    },
  ];
  const devices: Column<TeamDevice>[] = [
    {
      id: "user",
      header: "User",
      sortValue: (d) => d.user.name,
      cell: (d) => `${d.user.name} · ${ROLE_LABEL[d.user.role]}`,
    },
    {
      id: "device",
      header: "Device",
      cell: (d) =>
        [PLATFORM_LABEL[d.platform] ?? d.platform, d.model, d.appVersion ? `v${d.appVersion}` : null]
          .filter(Boolean)
          .join(" · "),
    },
    {
      id: "active",
      header: "Last active",
      sortValue: (d) => d.lastActiveAt,
      cell: (d) => formatRelative(d.lastActiveAt, "—"),
    },
    {
      id: "sync",
      header: "Last sync",
      cell: (d) =>
        d.platform === "WEB" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          formatRelative(d.lastSyncAt, "Never")
        ),
    },
    {
      id: "pending",
      header: "Waiting on phone",
      align: "right",
      sortValue: (d) => d.pendingUploads,
      cell: (d) => (
        <span className={d.pendingUploads > 0 ? "tabular font-semibold text-warning" : "tabular"}>
          {d.pendingUploads}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (d) => <StatusBadge domain="device" value={d.revoked ? "REVOKED" : "ACTIVE"} />,
    },
  ];
  return (
    <div className="space-y-4">
      <ReadOnlyNotice />
      <SectionCard
        title={q.data ? `Users (${q.data.users.length})` : "Users"}
        description={
          q.data?.pendingInvites ? `${q.data.pendingInvites} invitation(s) not accepted yet` : undefined
        }
        flush
      >
        <DataTable
          rows={q.data?.users}
          columns={users}
          getRowId={(u) => u.id}
          loading={q.isLoading}
          error={q.error}
          onRetry={q.refetch}
          clientPageSize={20}
          empty={{ title: "No users", icon: Users }}
        />
      </SectionCard>
      <SectionCard
        title={q.data ? `Devices (${q.data.devices.length})` : "Devices"}
        description="Phones and browsers signed in to this company."
        flush
      >
        <DataTable
          rows={q.data?.devices}
          columns={devices}
          getRowId={(d) => d.id}
          loading={q.isLoading}
          clientPageSize={20}
          empty={{ title: "No devices yet", icon: Smartphone }}
        />
      </SectionCard>
    </div>
  );
}

// ─── Activity & money ───────────────────────────────────────────────────────

const STATUS_ORDER = ["DRAFT", "ACTIVE", "CLOSEOUT", "READ_ONLY", "HANDED_OVER", "CLOSED"];

export function CompanyActivityTab({ tenantId }: { tenantId: string }) {
  const q = useGetCompanyActivityQuery(tenantId);
  const a: CompanyActivity | undefined = q.data;
  return (
    <div className="space-y-4">
      <ReadOnlyNotice />
      {q.error ? (
        <InlineAlert tone="danger" title="Could not load the activity">
          Try again in a moment.
        </InlineAlert>
      ) : null}
      <SectionCard title="Money now" description={a ? `As of ${formatDateTime(a.asOf)}` : undefined}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <KpiCard
            loading={!a}
            label="Billed (issued invoices)"
            icon={Receipt}
            value={a ? formatPKR(a.money.billedPaisa) : ""}
          />
          <KpiCard
            loading={!a}
            label="Received from clients"
            icon={Banknote}
            tone="success"
            value={a ? formatPKR(a.money.receivedPaisa) : ""}
          />
          <KpiCard
            loading={!a}
            label="Receivables"
            icon={Wallet}
            tone="warning"
            value={a ? formatPKR(a.money.receivablesPaisa) : ""}
          />
          <KpiCard
            loading={!a}
            label="Supplier udhaar"
            icon={Truck}
            tone="danger"
            value={a ? formatPKR(a.money.supplierUdhaarPaisa) : ""}
          />
          <KpiCard
            loading={!a}
            label="Cash with site staff"
            icon={Wallet}
            value={a ? formatPKR(a.money.cashWithSiteStaffPaisa) : ""}
          />
        </div>
      </SectionCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Usage">
          {a ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Last activity</dt>
              <dd className="text-right">{formatRelative(a.lastActivityAt, "None")}</dd>
              <dt className="text-muted-foreground">Last sign-in</dt>
              <dd className="text-right">{formatRelative(a.lastLoginAt, "Never")}</dd>
              <dt className="text-muted-foreground">Active workers</dt>
              <dd className="tabular text-right">{a.activeWorkers}</dd>
              {STATUS_ORDER.filter((s) => a.projectsByStatus[s]).map((s) => (
                <div key={s} className="contents">
                  <dt className="text-muted-foreground">
                    <StatusBadge domain="project" value={s} />
                  </dt>
                  <dd className="tabular text-right">{a.projectsByStatus[s]}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
        </SectionCard>
        <SectionCard
          title="Last 30 days"
          description={a ? `Since ${formatDate(a.last30Days.from)}` : undefined}
        >
          {a ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Row icon={HardHat} label="Hazri marks" value={a.last30Days.hazriMarks} />
              <Row icon={ClipboardList} label="Daily logs" value={a.last30Days.dailyLogs} />
              <Row
                icon={Truck}
                label="Purchases"
                value={`${a.last30Days.purchases.count} · ${formatPKR(a.last30Days.purchases.totalPaisa)}`}
              />
              <Row icon={Truck} label="Dispatches to sites" value={a.last30Days.dispatches} />
              <Row
                icon={ClipboardList}
                label="Material usage entries"
                value={a.last30Days.materialUsageEntries}
              />
              <Row
                icon={Wallet}
                label="Kharcha"
                value={`${a.last30Days.kharcha.count} · ${formatPKR(a.last30Days.kharcha.totalPaisa)}`}
              />
              <Row
                icon={Receipt}
                label="Invoices issued"
                value={`${a.last30Days.invoicesIssued.count} · ${formatPKR(a.last30Days.invoicesIssued.totalPaisa)}`}
              />
              <Row
                icon={Banknote}
                label="Payments received"
                value={`${a.last30Days.paymentsReceived.count} · ${formatPKR(a.last30Days.paymentsReceived.totalPaisa)}`}
              />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string | number }) {
  return (
    <>
      <dt className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" aria-hidden />
        {label}
      </dt>
      <dd className="tabular text-right">{value}</dd>
    </>
  );
}
