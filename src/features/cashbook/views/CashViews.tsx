"use client";

import { ArrowDownLeft, ArrowUpRight, Calculator, Clock, HandCoins, Hourglass, Inbox, Plus, Repeat, Send, TriangleAlert, Wallet } from "lucide-react";
import { useState } from "react";
import {
  useAcknowledgeFloatMutation,
  useApproveExpenseMutation,
  useGetCashAccountsQuery,
  useGetCashCountsQuery,
  useGetCashEntriesQuery,
  useGetExpensesQuery,
  useGetProjectCashbookQuery,
  useGetTopupsQuery,
  useRejectExpenseMutation,
  useRejectTopupMutation,
} from "@/api/services/cashbook.api";
import { useGetCashFloatsQuery } from "@/api/services/finance.api";
import type { CashAccount, CashEntry, CashFloatItem, ProjectDetail, TopupRequest } from "@/api/types";
import { ApprovalActions } from "@/components/common/ApprovalActions";
import { BalanceCard } from "@/components/common/BalanceCard";
import { categoryLabel, CategoryChips, type KharchaCategory } from "@/components/common/CategoryChips";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CASH_ENTRY_LABELS } from "@/features/labor/options";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useMutationToast } from "@/hooks/useMutationToast";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatPKR, formatPKRShort, toPaisaBigInt } from "@/lib/money";
import { useMe } from "@/store/hooks";
import { ApproveTopupSlideOver, CashCountSlideOver, HandoverSlideOver, KharchaSlideOver, SendFloatSlideOver, TopupRequestSlideOver } from "../components/CashSlideOvers";

const OFFICE = { roles: ["THEKEDAR", "PM"] } as const;
const OWNER = { roles: ["THEKEDAR"] } as const;
const isOpen = (p: ProjectDetail) => p.status === "ACTIVE" || p.status === "CLOSEOUT";

function useMyAccount() {
  const me = useMe();
  const accounts = useGetCashAccountsQuery();
  return { accounts, mine: accounts.data?.items.find((a) => a.holder.id === me?.user.id), userId: me?.user.id };
}

function SignedAmount({ paisa }: { paisa: string }) {
  const negative = paisa.startsWith("-");
  return (
    <span className={cn("inline-flex items-center gap-1 tabular", negative ? "text-danger" : "text-success")}>
      {negative ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownLeft className="size-3.5" aria-hidden />}
      <MoneyText paisa={negative ? paisa.slice(1) : paisa} />
      <span className="sr-only">{negative ? "out" : "in"}</span>
    </span>
  );
}

const entryColumns = (withHolder: boolean): Column<CashEntry>[] => [
  { id: "date", header: "Date", sortValue: (e) => e.occurredAt, cell: (e) => formatDate(e.occurredAt) },
  ...(withHolder ? [{ id: "holder", header: "By", cell: (e: CashEntry) => e.holder?.name ?? "—" } satisfies Column<CashEntry>] : []),
  {
    id: "what",
    header: "Entry",
    cell: (e) => (
      <div>
        <p className="font-medium">{e.description}</p>
        <p className="text-xs text-muted-foreground">{e.type === "EXPENSE" ? categoryLabel(e.category) : (CASH_ENTRY_LABELS[e.type] ?? e.type)}</p>
      </div>
    ),
  },
  { id: "amount", header: "Amount", align: "right", sortValue: (e) => Number(e.amountPaisa), cell: (e) => <SignedAmount paisa={e.amountPaisa} /> },
  ...(!withHolder ? [{ id: "running", header: "Balance", align: "right" as const, cell: (e: CashEntry) => <MoneyText paisa={e.runningBalancePaisa} /> } satisfies Column<CashEntry>] : []),
  {
    id: "status",
    header: "Status",
    cell: (e) => (
      <span className="inline-flex flex-wrap items-center gap-1">
        <StatusBadge domain="cashEntry" value={e.status} />
        {e.recoverableFromHolder ? <StatusBadge tone="danger" icon={TriangleAlert} label="To pay back" /> : null}
      </span>
    ),
  },
];

/** Spend by category: one bar per category, value labelled (single series → no legend). */
function SpendChart({ rows }: { rows: Array<{ category: string | null; amountPaisa: string }> }) {
  const max = rows.reduce((m, r) => Math.max(m, Number(r.amountPaisa)), 0);
  if (!rows.length) return <EmptyState title="No kharcha yet" compact />;
  return (
    <ul className="space-y-2.5" aria-label="Spend by category">
      {rows.map((r) => (
        <li key={r.category ?? "none"} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm" title={`${categoryLabel(r.category)}: ${formatPKR(r.amountPaisa)}`}>
          <span className="truncate text-muted-foreground">{categoryLabel(r.category)}</span>
          <span className="h-3 rounded-r bg-muted">
            <span className="block h-3 rounded-r bg-primary" style={{ width: `${max ? Math.max(2, (Number(r.amountPaisa) / max) * 100) : 0}%` }} />
          </span>
          <MoneyText paisa={r.amountPaisa} short className="text-right font-medium" />
        </li>
      ))}
    </ul>
  );
}

export function PendingKharcha({ projectId }: { projectId?: string }) {
  const pending = useGetExpensesQuery({ status: "PENDING_APPROVAL", limit: 50, ...(projectId ? { projectId } : {}) });
  const [approve, { isLoading: approving }] = useApproveExpenseMutation();
  const [reject, { isLoading: rejecting }] = useRejectExpenseMutation();
  const run = useMutationToast();
  if (!pending.data?.items.length) return null;
  return (
    <SectionCard flush title={`Kharcha waiting for approval (${pending.data.items.length})`} description="Above the company limit. The cash is already spent; rejecting makes it owed back.">
      <DataTable
        rows={pending.data.items}
        getRowId={(e) => e.id}
        empty={{ title: "Nothing waiting", compact: true }}
        columns={[
          { id: "date", header: "Date", cell: (e) => formatDate(e.occurredAt) },
          { id: "by", header: "By", cell: (e) => e.holder?.name ?? "—" },
          {
            id: "what",
            header: "For",
            cell: (e) => (
              <div>
                <p className="font-medium">{e.description}</p>
                <p className="text-xs text-muted-foreground">{categoryLabel(e.category)}</p>
              </div>
            ),
          },
          { id: "amount", header: "Amount", align: "right", cell: (e) => <MoneyText paisa={e.amountPaisa} className="font-semibold" /> },
          {
            id: "actions",
            header: "",
            align: "right",
            cell: (e) => (
              <ApprovalActions
                size="sm"
                decline="reject"
                approving={approving}
                declining={rejecting}
                onApprove={() => run(() => approve({ id: e.id }).unwrap(), { success: "Kharcha approved" })}
                onDecline={async (note) => {
                  const ok = await run(() => reject({ id: e.id, note }).unwrap(), { success: "Rejected — the holder owes it back" });
                  if (!ok) throw new Error("failed");
                }}
              />
            ),
          },
        ]}
      />
    </SectionCard>
  );
}

// ─── Site kharcha ───────────────────────────────────────────────────────────

export function KharchaView({ projectId }: { projectId: string }) {
  const office = useCan(OFFICE);
  const { mine } = useMyAccount();
  const [category, setCategory] = useState<KharchaCategory | undefined>();
  const book = useGetProjectCashbookQuery({ projectId, limit: 100, ...(category ? { category } : {}) });
  const [open, setOpen] = useState<"kharcha" | "topup" | null>(null);
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb="Site Kharcha"
      actions={(p) =>
        isOpen(p) && mine ? (
          <Button onClick={() => setOpen("kharcha")}>
            <Plus data-icon="inline-start" />
            Add kharcha
          </Button>
        ) : null
      }
    >
      {(project) => (
        <>
          {mine ? (
            <BalanceCard
              account={mine}
              actions={
                <Button variant="outline" onClick={() => setOpen("topup")}>
                  <HandCoins data-icon="inline-start" />
                  Ask for top-up
                </Button>
              }
            />
          ) : !office ? (
            <InlineAlert tone="info" title="No site cash yet">
              The office sends a float first; you will get an SMS.
            </InlineAlert>
          ) : null}
          {office && book.data?.accounts.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {book.data.accounts
                .filter((a) => a.id !== mine?.id)
                .map((a) => (
                  <BalanceCard key={a.id} account={a} title="Site cash" />
                ))}
            </div>
          ) : null}
          {office ? <PendingKharcha projectId={project.id} /> : null}
          <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
            <SectionCard flush title="Cash book">
              <div className="border-b p-3">
                <CategoryChips allowAll value={category} onChange={setCategory} ariaLabel="Filter by category" />
              </div>
              <DataTable
                rows={book.data?.entries}
                getRowId={(e) => e.id}
                loading={book.isLoading}
                error={book.error}
                onRetry={book.refetch}
                columns={entryColumns(true)}
                empty={{ title: "No cash entries on this project", icon: Wallet }}
              />
            </SectionCard>
            <SectionCard title="Spend by category" description={book.data ? `This week: ${formatPKR(book.data.summary.kharchaThisWeekPaisa)}` : undefined}>
              <SpendChart rows={book.data?.summary.spentByCategory ?? []} />
            </SectionCard>
          </div>
          {open === "kharcha" ? <KharchaSlideOver open onOpenChange={(o) => setOpen(o ? "kharcha" : null)} projectId={project.id} balancePaisa={mine?.balancePaisa} /> : null}
          {open === "topup" ? <TopupRequestSlideOver open onOpenChange={(o) => setOpen(o ? "topup" : null)} /> : null}
        </>
      )}
    </ProjectPageShell>
  );
}

// ─── Floats ─────────────────────────────────────────────────────────────────

function AccountPicker({ accounts, value, onChange }: { accounts: CashAccount[]; value: string | undefined; onChange: (id: string) => void }) {
  if (accounts.length < 2) return null;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-56" aria-label="Cash holder">
        <SelectValue placeholder="Choose holder" />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.holder.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Accounts relevant on a project page: holders on the project, plus my own. */
function useProjectAccounts(projectId: string) {
  const { mine, userId } = useMyAccount();
  const book = useGetProjectCashbookQuery({ projectId, limit: 1 });
  const accounts = [...(mine ? [mine] : []), ...(book.data?.accounts ?? []).filter((a) => a.id !== mine?.id)];
  return { accounts, mine, userId, loading: book.isLoading };
}

export function FloatsView({ projectId }: { projectId: string }) {
  const owner = useCan(OWNER);
  const { accounts, mine, userId } = useProjectAccounts(projectId);
  const [picked, setPicked] = useState<string | undefined>();
  const accountId = picked ?? accounts[0]?.id;
  const account = accounts.find((a) => a.id === accountId);
  const floats = useGetCashEntriesQuery({ accountId: accountId ?? "", type: "FLOAT_IN", limit: 100 }, { skip: !accountId });
  const [ack, { isLoading: acking }] = useAcknowledgeFloatMutation();
  const run = useMutationToast();
  const [sending, setSending] = useState(false);
  const columns: Column<CashEntry>[] = [
    { id: "date", header: "Sent", cell: (e) => formatDateTime(e.occurredAt) },
    { id: "amount", header: "Amount", align: "right", cell: (e) => <MoneyText paisa={e.amountPaisa} className="font-semibold" /> },
    { id: "method", header: "By", cell: (e) => [e.method ? e.method.charAt(0) + e.method.slice(1).toLowerCase() : null, e.reference].filter(Boolean).join(" · ") || "—" },
    { id: "note", header: "Note", cell: (e) => <span className="text-sm text-muted-foreground">{e.description}</span> },
    { id: "status", header: "Status", cell: (e) => <StatusBadge domain="cashEntry" value={e.status} label={e.status === "POSTED" ? "Received" : undefined} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (e) =>
        e.status === "PENDING_ACK" && account?.holder.id === userId ? (
          <Button size="sm" disabled={acking} onClick={() => run(() => ack(e.id).unwrap(), { success: `${formatPKR(e.amountPaisa)} received` })}>
            <Inbox data-icon="inline-start" />
            Mil gaye (received)
          </Button>
        ) : null,
    },
  ];
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb="Cash Floats"
      actions={() =>
        owner ? (
          <Button onClick={() => setSending(true)}>
            <Send data-icon="inline-start" />
            Send float
          </Button>
        ) : null
      }
    >
      {(project) => (
        <>
          {mine && toPaisaBigInt(mine.pendingAckPaisa)! > BigInt(0) ? (
            <InlineAlert tone="info" title={`${formatPKR(mine.pendingAckPaisa)} sent to you`}>
              Confirm when the money reaches you — it is added to your cash in hand.
            </InlineAlert>
          ) : null}
          <SectionCard flush title={account ? `Floats — ${account.holder.name}` : "Floats"} actions={<AccountPicker accounts={accounts} value={accountId} onChange={setPicked} />}>
            {accountId ? (
              <DataTable rows={floats.data?.items} getRowId={(e) => e.id} loading={floats.isLoading} error={floats.error} onRetry={floats.refetch} columns={columns} empty={{ title: "No floats yet", icon: Send }} />
            ) : (
              <EmptyState title="Nobody holds site cash on this project yet" description={owner ? "Send a float to the munshi to start." : undefined} icon={Wallet} />
            )}
          </SectionCard>
          {sending ? <SendFloatSlideOver open onOpenChange={setSending} projectId={project.id} holderUserId={project.team.munshis[0]?.id} /> : null}
        </>
      )}
    </ProjectPageShell>
  );
}

// ─── Top-ups ────────────────────────────────────────────────────────────────

export function TopupTable({ status }: { status?: "PENDING" | "APPROVED" | "REJECTED" }) {
  const owner = useCan(OWNER);
  const list = useGetTopupsQuery({ limit: 50, ...(status ? { status } : {}) });
  const [reject, { isLoading: rejecting }] = useRejectTopupMutation();
  const run = useMutationToast();
  const [approving, setApproving] = useState<TopupRequest | null>(null);
  const columns: Column<TopupRequest>[] = [
    { id: "date", header: "Asked", cell: (t) => formatDateTime(t.createdAt) },
    { id: "holder", header: "By", cell: (t) => <span className="font-medium">{t.holder.name}</span> },
    { id: "amount", header: "Amount", align: "right", cell: (t) => <MoneyText paisa={t.amountPaisa} className="font-semibold" /> },
    { id: "balance", header: "Has now", align: "right", cell: (t) => <MoneyText paisa={t.balancePaisa} /> },
    { id: "note", header: "For", cell: (t) => <span className="text-sm text-muted-foreground">{t.note ?? ""}</span> },
    { id: "status", header: "Status", cell: (t) => <StatusBadge domain="topup" value={t.status} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      hidden: !owner,
      cell: (t) =>
        t.status === "PENDING" ? (
          <ApprovalActions
            size="sm"
            decline="reject"
            approveLabel="Approve & send"
            declining={rejecting}
            onApprove={() => setApproving(t)}
            onDecline={async (note) => {
              const ok = await run(() => reject({ id: t.id, note }).unwrap(), { success: "Top-up rejected" });
              if (!ok) throw new Error("failed");
            }}
          />
        ) : t.decisionNote ? (
          <span className="text-xs text-muted-foreground">“{t.decisionNote}”</span>
        ) : null,
    },
  ];
  return (
    <>
      <DataTable rows={list.data?.items} getRowId={(t) => t.id} loading={list.isLoading} error={list.error} onRetry={list.refetch} columns={columns} empty={{ title: "No top-up requests", icon: HandCoins, compact: true }} />
      {approving ? <ApproveTopupSlideOver open onOpenChange={(o) => (!o ? setApproving(null) : undefined)} topup={approving} /> : null}
    </>
  );
}

export function TopupsView({ projectId }: { projectId: string }) {
  const owner = useCan(OWNER);
  const [open, setOpen] = useState(false);
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb="Top-up Requests"
      actions={() =>
        !owner ? (
          <Button onClick={() => setOpen(true)}>
            <HandCoins data-icon="inline-start" />
            Ask for top-up
          </Button>
        ) : null
      }
    >
      {() => (
        <>
          <SectionCard flush title="Waiting">
            <TopupTable status="PENDING" />
          </SectionCard>
          <SectionCard flush title="All requests">
            <TopupTable />
          </SectionCard>
          {open ? <TopupRequestSlideOver open onOpenChange={setOpen} /> : null}
        </>
      )}
    </ProjectPageShell>
  );
}

// ─── Counts & handover ──────────────────────────────────────────────────────

export function CashCountsView({ projectId }: { projectId: string }) {
  const office = useCan(OFFICE);
  const { accounts } = useProjectAccounts(projectId);
  const [picked, setPicked] = useState<string | undefined>();
  const account = accounts.find((a) => a.id === (picked ?? accounts[0]?.id));
  const counts = useGetCashCountsQuery({ accountId: account?.id, limit: 50 }, { skip: !account });
  const [open, setOpen] = useState<"count" | "handover" | null>(null);
  return (
    <ProjectPageShell projectId={projectId} crumb="Cash Counts & Handover">
      {(project) => {
        const people = [...(project.team.pm ? [{ ...project.team.pm, description: "Project manager" }] : []), ...project.team.munshis.map((m) => ({ ...m, description: "Munshi" }))];
        return account ? (
          <>
            <div className="flex justify-end">
              <AccountPicker accounts={accounts} value={account.id} onChange={setPicked} />
            </div>
            <BalanceCard
              account={account}
              actions={
                <>
                  <Button onClick={() => setOpen("count")}>
                    <Calculator data-icon="inline-start" />
                    Count cash
                  </Button>
                  <Button variant="outline" onClick={() => setOpen("handover")} disabled={toPaisaBigInt(account.balancePaisa)! <= BigInt(0)}>
                    <Repeat data-icon="inline-start" />
                    Hand over
                  </Button>
                </>
              }
            />
            <SectionCard flush title="Counts">
              <DataTable
                rows={counts.data?.items}
                getRowId={(c) => c.id}
                loading={counts.isLoading}
                error={counts.error}
                onRetry={counts.refetch}
                columns={[
                  { id: "at", header: "Counted", cell: (c) => formatDateTime(c.countedAt) },
                  { id: "book", header: "Book", align: "right", cell: (c) => <MoneyText paisa={c.systemPaisa} /> },
                  { id: "counted", header: "Counted", align: "right", cell: (c) => <MoneyText paisa={c.countedPaisa} /> },
                  {
                    id: "diff",
                    header: "Difference",
                    align: "right",
                    cell: (c) => (c.differencePaisa === "0" ? <StatusBadge tone="success" label="Matches" /> : <SignedAmount paisa={c.differencePaisa} />),
                  },
                  { id: "note", header: "Reason", cell: (c) => <span className="text-sm text-muted-foreground">{c.note ?? ""}</span> },
                ]}
                empty={{ title: "Never counted", description: "Count the cash every week — differences are explained here.", icon: Calculator }}
              />
            </SectionCard>
            {open === "count" ? <CashCountSlideOver open onOpenChange={(o) => setOpen(o ? "count" : null)} account={account} /> : null}
            {open === "handover" ? <HandoverSlideOver open onOpenChange={(o) => setOpen(o ? "handover" : null)} account={account} people={people} /> : null}
          </>
        ) : (
          <SectionCard>
            <EmptyState title="No site cash on this project" description={office ? "Send a float to the munshi first (Cash Floats)." : "The office sends a float first."} icon={Wallet} />
          </SectionCard>
        );
      }}
    </ProjectPageShell>
  );
}

// ─── Company: cash floats overview (THEKEDAR) ───────────────────────────────

export function CashFloatsOverviewView() {
  const accounts = useGetCashFloatsQuery();
  const [sending, setSending] = useState<string | null | undefined>(undefined);
  const t = accounts.data?.totals;
  const columns: Column<CashFloatItem>[] = [
    {
      id: "holder",
      header: "Holder",
      sortValue: (a) => a.holder.name,
      cell: (a) => (
        <div>
          <p className="font-medium">{a.holder.name}</p>
          <p className="text-xs text-muted-foreground">
            {a.holder.role === "PM" ? "Project manager" : "Munshi"} · {a.holder.phone}
          </p>
        </div>
      ),
    },
    { id: "sites", header: "Sites", cell: (a) => (a.projects.length ? a.projects.map((p) => p.code).join(", ") : "—") },
    { id: "balance", header: "In hand", align: "right", sortValue: (a) => Number(a.balancePaisa), cell: (a) => <MoneyText paisa={a.balancePaisa} className="font-semibold" /> },
    { id: "week", header: "Spent this week", align: "right", cell: (a) => (a.spentThisWeekPaisa === "0" ? "—" : <MoneyText paisa={a.spentThisWeekPaisa} />) },
    { id: "floated", header: "Floated (total)", align: "right", cell: (a) => <MoneyText paisa={a.totalFloatedPaisa} short /> },
    { id: "ack", header: "Not received yet", align: "right", cell: (a) => (a.pendingAckPaisa === "0" ? "—" : <MoneyText paisa={a.pendingAckPaisa} />) },
    { id: "approval", header: "Waiting approval", align: "right", cell: (a) => (a.pendingApprovalPaisa === "0" ? "—" : <MoneyText paisa={a.pendingApprovalPaisa} className="text-warning" />) },
    { id: "recover", header: "To pay back", align: "right", cell: (a) => (a.recoverablePaisa === "0" ? "—" : <MoneyText paisa={a.recoverablePaisa} className="text-danger" />) },
    {
      id: "count",
      header: "Last count",
      cell: (a) =>
        a.lastCount ? (
          <span>
            {formatDate(a.lastCount.countedAt)}
            {a.lastCount.differencePaisa !== "0" ? <MoneyText paisa={a.lastCount.differencePaisa} className="block text-xs text-danger" /> : <span className="block text-xs text-success">Matched</span>}
          </span>
        ) : (
          <StatusBadge tone="warning" label="Never" />
        ),
    },
    { id: "topup", header: "Top-up asked", align: "right", cell: (a) => (a.pendingTopup ? <MoneyText paisa={a.pendingTopup.amountPaisa} className="text-warning" /> : "—") },
    { id: "last", header: "Last entry", cell: (a) => formatDate(a.lastEntryAt) },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (a) => (
        <Button size="sm" variant="outline" onClick={() => setSending(a.holder.id)}>
          <Send data-icon="inline-start" />
          Float
        </Button>
      ),
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Floats Overview"
        description="Site cash with munshis and project managers."
        breadcrumbs={[{ label: "Finance" }, { label: "Cash Floats" }]}
        actions={
          <Button onClick={() => setSending(null)}>
            <Send data-icon="inline-start" />
            Send float
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Cash with site staff" icon={Wallet} value={formatPKRShort(t?.balancePaisa ?? "0")} loading={accounts.isLoading} />
        <KpiCard label="Floats not received yet" icon={Clock} value={formatPKRShort(t?.pendingAckPaisa ?? "0")} loading={accounts.isLoading} hint={t ? `Spent this week ${formatPKRShort(t.spentThisWeekPaisa)}` : undefined} />
        <KpiCard label="Kharcha waiting approval" icon={Hourglass} tone="warning" value={formatPKRShort(t?.pendingApprovalPaisa ?? "0")} loading={accounts.isLoading} />
        <KpiCard label="To pay back" icon={TriangleAlert} tone="danger" value={formatPKRShort(t?.recoverablePaisa ?? "0")} loading={accounts.isLoading} />
      </div>
      <SectionCard flush title="Holders" description={t ? `${t.holders} holder${t.holders === 1 ? "" : "s"} · ${t.pendingTopups} top-up${t.pendingTopups === 1 ? "" : "s"} waiting` : undefined}>
        <DataTable rows={accounts.data?.items} getRowId={(a) => a.id} loading={accounts.isLoading} error={accounts.error} onRetry={accounts.refetch} columns={columns} empty={{ title: "Nobody holds site cash yet", icon: Wallet }} />
      </SectionCard>
      <SectionCard flush title="Top-up requests waiting">
        <TopupTable status="PENDING" />
      </SectionCard>
      <PendingKharcha />
      {sending !== undefined ? <SendFloatSlideOver open onOpenChange={(o) => (!o ? setSending(undefined) : undefined)} holderUserId={sending ?? undefined} /> : null}
    </div>
  );
}
