"use client";

import {
  ArrowLeftRight,
  CalendarPlus,
  KeyRound,
  Lock,
  Monitor,
  MonitorOff,
  Smartphone,
  PhoneOff,
  PauseCircle,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useGetAdminPlansQuery } from "@/api/services/admin/plans.api";
import {
  useGetTenantQuery,
  useSetTenantOfflineOfficeMutation,
  useSetTenantMobileAppMutation,
  useSetTenantOwnerAccountMutation,
  useSetTenantPlanMutation,
  useSetTenantStatusMutation,
} from "@/api/services/admin/tenants.api";
import type { TenantDetail, TenantStatusBody } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { InfoList } from "@/components/common/InfoList";
import { InlineAlert } from "@/components/common/InlineAlert";
import { MoneyText } from "@/components/common/MoneyText";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UsageBar } from "@/components/common/UsageBar";
import { PageHeader } from "@/components/layout/PageHeader";
import { NumberInput } from "@/components/forms/NumberField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CompanyActivityTab,
  CompanyProjectsTab,
  CompanyTeamTab,
} from "@/features/admin/views/CompanyDataTabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { LANGUAGE_LABEL, REGION_LABEL } from "@/lib/options";
import { paidToText } from "../paidTo";
import { formatPhone } from "@/lib/phone";

type Action = TenantStatusBody["action"];

const ACTIONS: Array<{
  action: Action;
  label: string;
  icon: typeof Lock;
  tone: "default" | "danger";
  noteRequired?: boolean;
  description: string;
}> = [
  {
    action: "EXTEND_TRIAL",
    label: "Extend trial",
    icon: CalendarPlus,
    tone: "default",
    description: "Adds days to the trial (a lapsed trial becomes active again).",
  },
  {
    action: "REACTIVATE",
    label: "Reactivate",
    icon: PlayCircle,
    tone: "default",
    description: "Restores access according to the subscription.",
  },
  {
    action: "SET_READ_ONLY",
    label: "Set read-only",
    icon: Lock,
    tone: "danger",
    description: "The company can view and pay, but can't change records.",
  },
  {
    action: "SUSPEND",
    label: "Suspend",
    icon: PauseCircle,
    tone: "danger",
    noteRequired: true,
    description: "Signs everyone out and blocks access.",
  },
  {
    action: "CLOSE",
    label: "Close",
    icon: XCircle,
    tone: "danger",
    noteRequired: true,
    description: "Permanently closes the company. Every session is revoked.",
  },
];

function StatusActionDialog({
  tenant,
  action,
  onClose,
}: {
  tenant: TenantDetail;
  action: (typeof ACTIONS)[number] | null;
  onClose: () => void;
}) {
  const [setStatus, { isLoading }] = useSetTenantStatusMutation();
  const run = useMutationToast();
  const [note, setNote] = useState("");
  const [days, setDays] = useState<number | null>(7);
  const noteMissing = Boolean(action?.noteRequired) && note.trim().length < 3;
  return (
    <ConfirmDialog
      open={Boolean(action)}
      onOpenChange={(o) => !o && onClose()}
      tone={action?.tone === "danger" ? "danger" : "default"}
      title={`${action?.label ?? ""} — ${tenant.name}`}
      description={action?.description}
      confirmLabel={action?.label ?? "Confirm"}
      loading={isLoading}
      confirmDisabled={
        noteMissing || (action?.action === "EXTEND_TRIAL" && !(days && days >= 1 && days <= 30))
      }
      onConfirm={async () => {
        if (!action) return;
        const ok = await run(
          () =>
            setStatus({
              id: tenant.id,
              body: {
                action: action.action,
                ...(action.action === "EXTEND_TRIAL" ? { days: days ?? 7 } : {}),
                ...(note.trim() ? { note: note.trim() } : {}),
              },
            }).unwrap(),
          { success: `${tenant.name}: ${action.label.toLowerCase()} done` },
        );
        if (ok) {
          setNote("");
          onClose();
        }
      }}
    >
      <div className="space-y-3">
        {action?.action === "EXTEND_TRIAL" ? (
          <div className="space-y-1.5">
            <Label htmlFor="extend-days">Days (1–30)</Label>
            <NumberInput id="extend-days" value={days} onChange={setDays} decimals={0} unit="days" />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="status-note">
            Note{action?.noteRequired ? <span className="text-destructive">*</span> : " (optional)"}
          </Label>
          <Textarea
            id="status-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-invalid={noteMissing || undefined}
          />
          {action?.noteRequired ? (
            <p className="text-xs text-muted-foreground">Required — saved in the audit log.</p>
          ) : null}
        </div>
      </div>
    </ConfirmDialog>
  );
}

function ChangePlanDialog({
  tenant,
  open,
  onClose,
}: {
  tenant: TenantDetail;
  open: boolean;
  onClose: () => void;
}) {
  const plans = useGetAdminPlansQuery(undefined, { skip: !open });
  const [setPlan, { isLoading }] = useSetTenantPlanMutation();
  const run = useMutationToast();
  const [planId, setPlanId] = useState("");
  const [effective, setEffective] = useState<"IMMEDIATE" | "NEXT_RENEWAL">("IMMEDIATE");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      tone="default"
      title={`Change plan — ${tenant.name}`}
      description="The company must fit the new plan's limits."
      confirmLabel="Change plan"
      loading={isLoading}
      confirmDisabled={!planId}
      onConfirm={async () => {
        setProblem(null);
        const ok = await run(
          () => setPlan({ id: tenant.id, body: { planId, effective, ...(note ? { note } : {}) } }).unwrap(),
          {
            success: "Plan changed",
            onError: (code) => {
              if (
                code === "KEEP_PROJECTS_REQUIRED" ||
                code === "TOO_MANY_PROJECTS" ||
                code === "DOWNGRADE_USERS_OVER_LIMIT"
              ) {
                setProblem(
                  code === "DOWNGRADE_USERS_OVER_LIMIT"
                    ? "The company has more office users than this plan allows."
                    : "The company has more active projects than this plan allows. Ask the owner to downgrade from their Subscription page (they choose which projects stay active).",
                );
                return true;
              }
              return false;
            },
          },
        );
        if (ok) onClose();
      }}
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="new-plan">New plan</Label>
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger id="new-plan" className="w-full">
              <SelectValue placeholder="Choose a plan" />
            </SelectTrigger>
            <SelectContent>
              {(plans.data ?? [])
                .filter((p) => p.isActive && p.id !== tenant.subscription?.plan.id)
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {formatPKR(p.pricePaisa)}/month
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">When</p>
          <SegmentedControl
            ariaLabel="When"
            value={effective}
            onChange={setEffective}
            options={[
              { value: "IMMEDIATE", label: "Immediately" },
              { value: "NEXT_RENEWAL", label: "At next renewal" },
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="plan-note">Note (optional)</Label>
          <Textarea
            id="plan-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />
        </div>
        {problem ? <InlineAlert tone="warning">{problem}</InlineAlert> : null}
      </div>
    </ConfirmDialog>
  );
}

/** Allow / stop offline office (an office PC with a local copy of the company's data). */
function OfflineOfficeDialog({
  tenant,
  open,
  onClose,
}: {
  tenant: TenantDetail;
  open: boolean;
  onClose: () => void;
}) {
  const [setOfflineOffice, { isLoading }] = useSetTenantOfflineOfficeMutation();
  const run = useMutationToast();
  const [note, setNote] = useState("");
  const allowed = Boolean(tenant.settings?.offlineOfficeAllowed);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      tone={allowed ? "danger" : "default"}
      title={`${allowed ? "Stop offline office" : "Allow offline office"} — ${tenant.name}`}
      description={
        allowed
          ? "Office PCs of this company stop syncing. Their approvals stay, so allowing it again resumes them."
          : "The owner or an administrator can then approve office PCs that keep a local copy and work without internet."
      }
      confirmLabel={allowed ? "Stop offline office" : "Allow offline office"}
      loading={isLoading}
      onConfirm={async () => {
        const ok = await run(
          () =>
            setOfflineOffice({
              id: tenant.id,
              body: { allowed: !allowed, ...(note.trim() ? { note: note.trim() } : {}) },
            }).unwrap(),
          { success: `${tenant.name}: offline office ${allowed ? "stopped" : "allowed"}` },
        );
        if (ok) {
          setNote("");
          onClose();
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="offline-office-note">Note (optional)</Label>
        <Textarea
          id="offline-office-note"
          rows={2}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Saved in the audit log.</p>
      </div>
    </ConfirmDialog>
  );
}

/** Allow / stop the phone app for the company's people (stopping signs every phone out). */
function MobileAppDialog({ tenant, open, onClose }: { tenant: TenantDetail; open: boolean; onClose: () => void }) {
  const [setMobileApp, { isLoading }] = useSetTenantMobileAppMutation();
  const run = useMutationToast();
  const [note, setNote] = useState("");
  const allowed = Boolean(tenant.settings?.mobileAppAllowed);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      tone={allowed ? "danger" : "default"}
      title={`${allowed ? "Stop the mobile app" : "Allow the mobile app"} — ${tenant.name}`}
      description={
        allowed
          ? "Everyone of this company is signed out of the phone app at once and can't sign in on it again. The website keeps working."
          : "The company's people can then sign in on the phone app."
      }
      confirmLabel={allowed ? "Stop the mobile app" : "Allow the mobile app"}
      loading={isLoading}
      onConfirm={async () => {
        const res = await run(() => setMobileApp({ id: tenant.id, body: { allowed: !allowed, ...(note.trim() ? { note: note.trim() } : {}) } }).unwrap(), {
          success: (r) => (r.mobileAppAllowed ? `${tenant.name}: mobile app allowed` : `${tenant.name}: mobile app stopped (${r.signedOut} phone sign-ins ended)`),
        });
        if (res) {
          setNote("");
          onClose();
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="mobile-app-note">Note (optional)</Label>
        <Textarea id="mobile-app-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        <p className="text-xs text-muted-foreground">Saved in the audit log.</p>
      </div>
    </ConfirmDialog>
  );
}

/**
 * Support fix: the owner's login email / password and the company email, when the owner lost the
 * old mailbox or forgot the password. Only changed fields are sent; a new password signs the owner out.
 */
function OwnerAccountDialog({ tenant, open, onClose }: { tenant: TenantDetail; open: boolean; onClose: () => void }) {
  const [save, { isLoading }] = useSetTenantOwnerAccountMutation();
  const run = useMutationToast();
  const [ownerEmail, setOwnerEmail] = useState(tenant.owner?.email ?? "");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [companyEmail, setCompanyEmail] = useState(tenant.email ?? "");
  const [note, setNote] = useState("");

  const body = {
    ...(tenant.owner && ownerEmail.trim() && ownerEmail.trim().toLowerCase() !== (tenant.owner.email ?? "") ? { ownerEmail: ownerEmail.trim() } : {}),
    ...(tenant.owner && ownerPassword ? { ownerPassword } : {}),
    ...(companyEmail.trim() !== (tenant.email ?? "") ? { companyEmail: companyEmail.trim() || null } : {}),
    ...(note.trim() ? { note: note.trim() } : {}),
  };
  const changed = "ownerEmail" in body || "ownerPassword" in body || "companyEmail" in body;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Owner login & email — ${tenant.name}`}
      description="For when the owner lost the old email or forgot the password. No current password is needed. A new password signs the owner out on every device."
      confirmLabel="Save changes"
      loading={isLoading}
      confirmDisabled={!changed}
      onConfirm={async () => {
        const ok = await run(() => save({ id: tenant.id, body }).unwrap(), { success: `${tenant.name}: owner account updated` });
        if (ok) {
          setOwnerPassword("");
          setNote("");
          onClose();
        }
      }}
    >
      <div className="space-y-4">
        {tenant.owner ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="owner-email">Owner login email</Label>
              <Input id="owner-email" type="email" autoComplete="off" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="owner-password">New owner password (leave empty to keep)</Label>
              <Input id="owner-password" type="text" autoComplete="new-password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} />
              <p className="text-xs text-muted-foreground">At least 8 characters with a letter and a number. Give it to the owner and ask them to change it from My account.</p>
            </div>
          </>
        ) : (
          <InlineAlert tone="warning" title="Invite pending">
            The owner hasn&apos;t accepted the invitation yet, so there is no login to change. Only the company email can be changed.
          </InlineAlert>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="company-email">Company email (invoices &amp; documents)</Label>
          <Input id="company-email" type="email" autoComplete="off" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="owner-account-note">Note (optional)</Label>
          <Textarea id="owner-account-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          <p className="text-xs text-muted-foreground">Saved in the audit log (the password never is).</p>
        </div>
      </div>
    </ConfirmDialog>
  );
}

function CompanyBody({ tenant }: { tenant: TenantDetail }) {
  const [action, setAction] = useState<(typeof ACTIONS)[number] | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileAllowed = Boolean(tenant.settings?.mobileAppAllowed);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const offlineAllowed = Boolean(tenant.settings?.offlineOfficeAllowed);
  const sub = tenant.subscription;
  const visibleActions = ACTIONS.filter((a) => {
    if (tenant.status === "CLOSED") return false;
    if (a.action === "EXTEND_TRIAL")
      return sub?.status === "TRIAL" || (sub?.status === "LAPSED" && Boolean(sub.trialEndsAt));
    if (a.action === "REACTIVATE") return tenant.status !== "ACTIVE";
    if (a.action === "SET_READ_ONLY") return tenant.status === "ACTIVE";
    if (a.action === "SUSPEND") return tenant.status !== "SUSPENDED";
    return true;
  });

  return (
    <>
      <PageHeader
        title={tenant.name}
        meta={
          <>
            <StatusBadge domain="tenant" value={tenant.status} />
            {sub ? <StatusBadge domain="subscription" value={sub.status} /> : null}
          </>
        }
        description={tenant.slug}
        breadcrumbs={[{ label: "Companies", href: "/admin/companies" }, { label: tenant.name }]}
        actions={
          <>
            {visibleActions.map((a) => (
              <Button
                key={a.action}
                variant={a.tone === "danger" ? "destructive-soft" : "outline"}
                size="sm"
                onClick={() => setAction(a)}
              >
                <a.icon data-icon="inline-start" />
                {a.label}
              </Button>
            ))}
            {tenant.status !== "CLOSED" ? (
              <Button size="sm" onClick={() => setPlanOpen(true)}>
                <ArrowLeftRight data-icon="inline-start" />
                Change plan
              </Button>
            ) : null}
          </>
        }
      />
      <Tabs defaultValue="overview" className="gap-4">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="team">Team &amp; devices</TabsTrigger>
          <TabsTrigger value="activity">Activity &amp; money</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <SectionCard title="Profile">
              <InfoList
                columns={1}
                items={[
                  { label: "Phone", value: formatPhone(tenant.phone) },
                  { label: "Email", value: tenant.email },
                  { label: "NTN", value: tenant.ntn },
                  { label: "Address", value: tenant.address },
                  { label: "Region", value: REGION_LABEL[tenant.region] },
                  { label: "Created", value: formatDate(tenant.createdAt) },
                ]}
              />
            </SectionCard>
            <SectionCard
              title="Owner"
              actions={
                tenant.status !== "CLOSED" ? (
                  <Button variant="outline" size="sm" onClick={() => setOwnerOpen(true)}>
                    <KeyRound data-icon="inline-start" />
                    Login &amp; email
                  </Button>
                ) : null
              }
            >
              {tenant.owner ? (
                <InfoList
                  columns={1}
                  items={[
                    { label: "Name", value: tenant.owner.name },
                    { label: "Phone", value: formatPhone(tenant.owner.phone) },
                    { label: "Email", value: tenant.owner.email },
                    { label: "Status", value: <StatusBadge domain="user" value={tenant.owner.status} /> },
                    { label: "Last sign-in", value: formatDateTime(tenant.owner.lastLoginAt, "Never") },
                  ]}
                />
              ) : (
                <InlineAlert tone="warning" title="Invite pending">
                  The owner hasn&apos;t accepted the invitation yet.
                </InlineAlert>
              )}
            </SectionCard>
            <SectionCard title="Usage">
              <div className="space-y-4">
                <UsageBar
                  label="Active projects"
                  used={tenant.usage.activeProjects.used}
                  limit={tenant.usage.activeProjects.limit}
                />
                <UsageBar
                  label="Office users"
                  used={tenant.usage.officeUsers.used}
                  limit={tenant.usage.officeUsers.limit}
                />
                {tenant.settings ? (
                  <p className="text-xs text-muted-foreground">
                    Marla {tenant.settings.marlaStandard} ·{" "}
                    {LANGUAGE_LABEL[tenant.settings.defaultLanguage] ?? tenant.settings.defaultLanguage} · tax{" "}
                    {tenant.settings.taxEnabled ? "on" : "off"}
                  </p>
                ) : null}
              </div>
            </SectionCard>
            <SectionCard title="Subscription">
              {sub ? (
                <InfoList
                  columns={1}
                  items={[
                    { label: "Plan", value: `${sub.plan.name} · ${formatPKR(sub.plan.pricePaisa)}/month` },
                    { label: "Trial ends", value: formatDate(sub.trialEndsAt), hidden: !sub.trialEndsAt },
                    {
                      label: "Period",
                      value: sub.currentPeriodStart
                        ? `${formatDate(sub.currentPeriodStart)} – ${formatDate(sub.currentPeriodEnd)}`
                        : "—",
                    },
                    { label: "Grace ends", value: formatDate(sub.graceEndsAt), hidden: !sub.graceEndsAt },
                    {
                      label: "Pending change",
                      value: sub.pendingPlan
                        ? `${sub.pendingPlan.name ?? sub.pendingPlan.code}${sub.pendingEffectiveOn ? ` on ${formatDate(sub.pendingEffectiveOn)}` : " (after payment)"}`
                        : "None",
                    },
                  ]}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No subscription.</p>
              )}
            </SectionCard>
            <SectionCard title="Recent payments" flush className="lg:col-span-2">
              <DataTable
                rows={tenant.payments}
                getRowId={(p) => p.id}
                clientPageSize={0}
                empty={{ title: "No payments yet" }}
                columns={[
                  { id: "date", header: "Paid on", cell: (p) => formatDate(p.paidOn) },
                  { id: "plan", header: "Plan", cell: (p) => p.plan.name },
                  {
                    id: "amount",
                    header: "Amount",
                    align: "right",
                    cell: (p) => <MoneyText paisa={p.amountPaisa} />,
                  },
                  { id: "paidTo", header: "Paid to", cell: (p) => paidToText(p) },
                  {
                    id: "txn",
                    header: "Transaction",
                    cell: (p) => <span className="font-mono text-xs">{p.transactionId}</span>,
                  },
                  {
                    id: "status",
                    header: "Status",
                    cell: (p) => <StatusBadge domain="payment" value={p.status} />,
                  },
                  { id: "receipt", header: "Receipt", cell: (p) => p.receiptNo ?? "—" },
                ]}
              />
            </SectionCard>
            <SectionCard
              title="Offline office"
              description="An office PC keeps a local copy of the company's data and works without internet."
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <StatusBadge
                    tone={offlineAllowed ? "success" : "neutral"}
                    label={offlineAllowed ? "Allowed" : "Not allowed"}
                  />
                  {tenant.status !== "CLOSED" && tenant.settings ? (
                    <Button
                      size="sm"
                      variant={offlineAllowed ? "destructive-soft" : "outline"}
                      onClick={() => setOfflineOpen(true)}
                    >
                      {offlineAllowed ? (
                        <MonitorOff data-icon="inline-start" />
                      ) : (
                        <Monitor data-icon="inline-start" />
                      )}
                      {offlineAllowed ? "Stop" : "Allow"}
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {offlineAllowed
                    ? "The owner or an administrator approves each office PC under Settings → Offline office."
                    : "Off: the company can't connect an office PC."}
                </p>
              </div>
            </SectionCard>
            <SectionCard title="Mobile app" description="The company's people sign in on the phone app (Android / iPhone).">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <StatusBadge tone={mobileAllowed ? "success" : "neutral"} label={mobileAllowed ? "Allowed" : "Not allowed"} />
                  {tenant.status !== "CLOSED" && tenant.settings ? (
                    <Button size="sm" variant={mobileAllowed ? "destructive-soft" : "outline"} onClick={() => setMobileOpen(true)}>
                      {mobileAllowed ? <PhoneOff data-icon="inline-start" /> : <Smartphone data-icon="inline-start" />}
                      {mobileAllowed ? "Stop" : "Allow"}
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {mobileAllowed ? "On: phone sign-in works. Stop signs every phone of the company out." : "Off: sign-in on the phone app is refused; the website works."}
                </p>
              </div>
            </SectionCard>
          </div>
          <SectionCard title="Timeline" flush>
            <DataTable
              rows={tenant.auditEvents}
              getRowId={(a) => a.id}
              clientPageSize={10}
              empty={{ title: "No events yet" }}
              columns={[
                { id: "when", header: "When", cell: (a) => formatDateTime(a.createdAt) },
                {
                  id: "action",
                  header: "Action",
                  cell: (a) => <span className="font-mono text-xs">{a.action}</span>,
                },
                {
                  id: "actor",
                  header: "By",
                  // The person's name; the actor type only when there is none (system jobs) — QA-C-28.
                  cell: (a) =>
                    a.actorName ? (
                      <span>
                        {a.actorName}
                        {a.actorType === "PLATFORM_ADMIN" ? (
                          <span className="text-muted-foreground"> · admin</span>
                        ) : null}
                      </span>
                    ) : (
                      a.actorType.replace("_", " ").toLowerCase()
                    ),
                },
                { id: "entity", header: "Entity", cell: (a) => a.entityType ?? "—" },
              ]}
            />
          </SectionCard>
        </TabsContent>
        <TabsContent value="projects">
          <CompanyProjectsTab tenantId={tenant.id} />
        </TabsContent>
        <TabsContent value="team">
          <CompanyTeamTab tenantId={tenant.id} />
        </TabsContent>
        <TabsContent value="activity">
          <CompanyActivityTab tenantId={tenant.id} />
        </TabsContent>
      </Tabs>
      <StatusActionDialog tenant={tenant} action={action} onClose={() => setAction(null)} />
      <ChangePlanDialog tenant={tenant} open={planOpen} onClose={() => setPlanOpen(false)} />
      <OfflineOfficeDialog tenant={tenant} open={offlineOpen} onClose={() => setOfflineOpen(false)} />
      <MobileAppDialog tenant={tenant} open={mobileOpen} onClose={() => setMobileOpen(false)} />
      {ownerOpen ? <OwnerAccountDialog tenant={tenant} open onClose={() => setOwnerOpen(false)} /> : null}
    </>
  );
}

export function CompanyDetailView({ tenantId }: { tenantId: string }) {
  const query = useGetTenantQuery(tenantId);
  return <QueryState query={query}>{(tenant) => <CompanyBody tenant={tenant} />}</QueryState>;
}
