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
import { CategoryChips, type KharchaCategory } from "@/components/common/CategoryChips";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { useApprovalLimitHint, useCan } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { LateSyncBadge } from "@/components/common/LateSyncBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useEnumT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatPKR, formatPKRShort, toPaisaBigInt } from "@/lib/money";
import { useMe } from "@/store/hooks";
import { ApproveTopupSlideOver, CashCountSlideOver, HandoverSlideOver, KharchaSlideOver, SendFloatSlideOver, TopupRequestSlideOver } from "../components/CashSlideOvers";

const isOpen = (p: ProjectDetail) => p.status === "ACTIVE" || p.status === "CLOSEOUT";

function useMyAccount() {
  const me = useMe();
  const accounts = useGetCashAccountsQuery();
  return { accounts, mine: accounts.data?.items.find((a) => a.holder.id === me?.user.id), userId: me?.user.id };
}

/** Kharcha category label in the current language ("—" when none). */
function useCategoryLabel() {
  const te = useEnumT();
  return (value: string | null | undefined) => (value ? te("cashKharchaCategory", value) : "—");
}

function SignedAmount({ paisa }: { paisa: string }) {
  const t = useT();
  const negative = paisa.startsWith("-");
  return (
    <span className={cn("inline-flex items-center gap-1 tabular", negative ? "text-danger" : "text-success")}>
      {negative ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownLeft className="size-3.5" aria-hidden />}
      <MoneyText paisa={negative ? paisa.slice(1) : paisa} />
      <span className="sr-only">{negative ? t("cashSite.cash.moneyOut") : t("cashSite.cash.moneyIn")}</span>
    </span>
  );
}

function useEntryColumns(withHolder: boolean): Column<CashEntry>[] {
  const t = useT();
  const te = useEnumT();
  const categoryLabel = useCategoryLabel();
  return [
    { id: "date", header: t("field.date"), sortValue: (e) => e.occurredAt, cell: (e) => formatDate(e.occurredAt) },
    ...(withHolder ? [{ id: "holder", header: t("field.by"), cell: (e: CashEntry) => e.holder?.name ?? "—" } satisfies Column<CashEntry>] : []),
    {
      id: "what",
      header: t("field.entry"),
      cell: (e) => (
        <div>
          <p className="font-medium">{e.description}</p>
          <p className="text-xs text-muted-foreground">{e.type === "EXPENSE" ? categoryLabel(e.category) : te("cashEntryType", e.type)}</p>
          {e.lateSync ? <LateSyncBadge className="mt-1" /> : null}
        </div>
      ),
    },
    { id: "amount", header: t("field.amount"), align: "right", sortValue: (e) => Number(e.amountPaisa), cell: (e) => <SignedAmount paisa={e.amountPaisa} /> },
    ...(!withHolder
      ? [{ id: "running", header: t("field.balance"), align: "right" as const, cell: (e: CashEntry) => <MoneyText paisa={e.runningBalancePaisa} /> } satisfies Column<CashEntry>]
      : []),
    {
      id: "status",
      header: t("field.status"),
      cell: (e) => (
        <span className="inline-flex flex-wrap items-center gap-1">
          <StatusBadge domain="cashEntry" value={e.status} />
          {e.recoverableFromHolder ? <StatusBadge tone="danger" icon={TriangleAlert} label={t("cashSite.cash.toPayBack")} /> : null}
        </span>
      ),
    },
  ];
}

/** Spend by category: one bar per category, value labelled (single series → no legend). */
function SpendChart({ rows }: { rows: Array<{ category: string | null; amountPaisa: string }> }) {
  const t = useT();
  const categoryLabel = useCategoryLabel();
  const max = rows.reduce((m, r) => Math.max(m, Number(r.amountPaisa)), 0);
  if (!rows.length) return <EmptyState title={t("cashSite.cash.noKharcha")} compact />;
  return (
    <ul className="space-y-2.5" aria-label={t("cashSite.cash.spendByCategory")}>
      {rows.map((r) => (
        <li key={r.category ?? "none"} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3 text-sm" title={`${categoryLabel(r.category)}: ${formatPKR(r.amountPaisa)}`}>
          <span className="truncate text-muted-foreground">{categoryLabel(r.category)}</span>
          <span className="h-3 rounded-full bg-muted">
            <span className="block h-3 rounded-full bg-chart-brand" style={{ width: `${max ? Math.max(2, (Number(r.amountPaisa) / max) * 100) : 0}%` }} />
          </span>
          <MoneyText paisa={r.amountPaisa} short className="text-end font-medium" />
        </li>
      ))}
    </ul>
  );
}

export function PendingKharcha({ projectId }: { projectId?: string }) {
  const t = useT();
  const categoryLabel = useCategoryLabel();
  const pending = useGetExpensesQuery({ status: "PENDING_APPROVAL", limit: 50, ...(projectId ? { projectId } : {}) });
  const [approve, { isLoading: approving }] = useApproveExpenseMutation();
  const [reject, { isLoading: rejecting }] = useRejectExpenseMutation();
  const run = useMutationToast();
  const limitHint = useApprovalLimitHint();
  if (!pending.data?.items.length) return null;
  return (
    <SectionCard flush title={t("cashSite.cash.pendingTitle", { n: pending.data.items.length })} description={t("cashSite.cash.pendingDesc")}>
      <DataTable
        rows={pending.data.items}
        getRowId={(e) => e.id}
        empty={{ title: t("cashSite.cash.nothingWaiting"), compact: true }}
        columns={[
          { id: "date", header: t("field.date"), cell: (e) => formatDate(e.occurredAt) },
          { id: "by", header: t("field.by"), cell: (e) => e.holder?.name ?? "—" },
          {
            id: "what",
            header: t("cashSite.cash.colFor"),
            cell: (e) => (
              <div>
                <p className="font-medium">{e.description}</p>
                <p className="text-xs text-muted-foreground">{categoryLabel(e.category)}</p>
              </div>
            ),
          },
          { id: "amount", header: t("field.amount"), align: "right", cell: (e) => <MoneyText paisa={e.amountPaisa} className="font-semibold" /> },
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
                approveBlockedReason={limitHint("cashbook.expense.approve", e.amountPaisa)}
                onApprove={() => run(() => approve({ id: e.id }).unwrap(), { success: t("cashSite.cash.kharchaApproved") })}
                onDecline={async (note) => {
                  const ok = await run(() => reject({ id: e.id, note }).unwrap(), { success: t("cashSite.cash.rejectedOwesBack") });
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
  const t = useT();
  // Approvers see every holder's cash and the kharcha waiting for approval.
  const office = useCan("cashbook.expense.approve");
  const canAdd = useCan("cashbook.expense.create");
  const canAskTopup = useCan("cashbook.topup.create");
  const { mine } = useMyAccount();
  const [category, setCategory] = useState<KharchaCategory | undefined>();
  const book = useGetProjectCashbookQuery({ projectId, limit: 100, ...(category ? { category } : {}) });
  const [open, setOpen] = useState<"kharcha" | "topup" | null>(null);
  const columns = useEntryColumns(true);
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("cashSite.cash.crumbKharcha")}
      actions={(p) =>
        isOpen(p) && mine && canAdd ? (
          <Button onClick={() => setOpen("kharcha")}>
            <Plus data-icon="inline-start" />
            {t("cashSite.cash.addKharcha")}
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
                canAskTopup ? (
                  <Button variant="outline" onClick={() => setOpen("topup")}>
                    <HandCoins data-icon="inline-start" />
                    {t("cashSite.cash.askTopup")}
                  </Button>
                ) : null
              }
            />
          ) : !office ? (
            <InlineAlert tone="info" title={t("cashSite.cash.noSiteCashYet")}>
              {t("cashSite.cash.noSiteCashBody")}
            </InlineAlert>
          ) : null}
          {office && book.data?.accounts.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {book.data.accounts
                .filter((a) => a.id !== mine?.id)
                .map((a) => (
                  <BalanceCard key={a.id} account={a} title={t("cashSite.cash.siteCash")} />
                ))}
            </div>
          ) : null}
          {office ? <PendingKharcha projectId={project.id} /> : null}
          <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
            <SectionCard flush title={t("cashSite.cash.cashBook")}>
              <div className="border-b p-3">
                <CategoryChips allowAll value={category} onChange={setCategory} ariaLabel={t("cashSite.cash.filterByCategory")} />
              </div>
              <DataTable
                rows={book.data?.entries}
                getRowId={(e) => e.id}
                loading={book.isLoading}
                error={book.error}
                onRetry={book.refetch}
                columns={columns}
                empty={{ title: t("cashSite.cash.noEntries"), icon: Wallet }}
              />
            </SectionCard>
            <SectionCard
              title={t("cashSite.cash.spendByCategory")}
              description={book.data ? t("cashSite.cash.thisWeek", { amount: formatPKR(book.data.summary.kharchaThisWeekPaisa) }) : undefined}
            >
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
  const t = useT();
  if (accounts.length < 2) return null;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-56" aria-label={t("cashSite.cash.cashHolder")}>
        <SelectValue placeholder={t("cashSite.cash.chooseHolder")} />
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
  const t = useT();
  const te = useEnumT();
  const owner = useCan("cashbook.float.manage");
  const { accounts, mine, userId } = useProjectAccounts(projectId);
  const [picked, setPicked] = useState<string | undefined>();
  const accountId = picked ?? accounts[0]?.id;
  const account = accounts.find((a) => a.id === accountId);
  const floats = useGetCashEntriesQuery({ accountId: accountId ?? "", type: "FLOAT_IN", limit: 100 }, { skip: !accountId });
  const [ack, { isLoading: acking }] = useAcknowledgeFloatMutation();
  const run = useMutationToast();
  const [sending, setSending] = useState(false);
  const columns: Column<CashEntry>[] = [
    { id: "date", header: t("field.sent"), cell: (e) => formatDateTime(e.occurredAt) },
    { id: "amount", header: t("field.amount"), align: "right", cell: (e) => <MoneyText paisa={e.amountPaisa} className="font-semibold" /> },
    {
      id: "method",
      header: t("field.by"),
      cell: (e) => [e.method ? te("cashFloatMethod", e.method, e.method.charAt(0) + e.method.slice(1).toLowerCase()) : null, e.reference].filter(Boolean).join(" · ") || "—",
    },
    { id: "note", header: t("field.note"), cell: (e) => <span className="text-sm text-muted-foreground">{e.description}</span> },
    { id: "status", header: t("field.status"), cell: (e) => <StatusBadge domain="cashEntry" value={e.status} label={e.status === "POSTED" ? t("field.received") : undefined} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (e) =>
        e.status === "PENDING_ACK" && account?.holder.id === userId ? (
          <Button size="sm" disabled={acking} onClick={() => run(() => ack(e.id).unwrap(), { success: t("cashSite.cash.amountReceived", { amount: formatPKR(e.amountPaisa) }) })}>
            <Inbox data-icon="inline-start" />
            {t("cashSite.cash.milGaye")}
          </Button>
        ) : null,
    },
  ];
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("cashSite.cash.crumbFloats")}
      actions={() =>
        owner ? (
          <Button onClick={() => setSending(true)}>
            <Send data-icon="inline-start" />
            {t("cashSite.cash.sendFloat")}
          </Button>
        ) : null
      }
    >
      {(project) => (
        <>
          {mine && toPaisaBigInt(mine.pendingAckPaisa)! > BigInt(0) ? (
            <InlineAlert tone="info" title={t("cashSite.cash.sentToYou", { amount: formatPKR(mine.pendingAckPaisa) })}>
              {t("cashSite.cash.sentToYouBody")}
            </InlineAlert>
          ) : null}
          <SectionCard
            flush
            title={account ? t("cashSite.cash.floatsOf", { name: account.holder.name }) : t("cashSite.cash.floats")}
            actions={<AccountPicker accounts={accounts} value={accountId} onChange={setPicked} />}
          >
            {accountId ? (
              <DataTable
                rows={floats.data?.items}
                getRowId={(e) => e.id}
                loading={floats.isLoading}
                error={floats.error}
                onRetry={floats.refetch}
                columns={columns}
                empty={{ title: t("cashSite.cash.noFloats"), icon: Send }}
              />
            ) : (
              <EmptyState title={t("cashSite.cash.nobodyHoldsProject")} description={owner ? t("cashSite.cash.sendFloatToStart") : undefined} icon={Wallet} />
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
  const t = useT();
  const owner = useCan("cashbook.topup.approve");
  const list = useGetTopupsQuery({ limit: 50, ...(status ? { status } : {}) });
  const [reject, { isLoading: rejecting }] = useRejectTopupMutation();
  const run = useMutationToast();
  const [approving, setApproving] = useState<TopupRequest | null>(null);
  const columns: Column<TopupRequest>[] = [
    { id: "date", header: t("cashSite.cash.colAsked"), cell: (r) => formatDateTime(r.createdAt) },
    { id: "holder", header: t("field.by"), cell: (r) => <span className="font-medium">{r.holder.name}</span> },
    { id: "amount", header: t("field.amount"), align: "right", cell: (r) => <MoneyText paisa={r.amountPaisa} className="font-semibold" /> },
    { id: "balance", header: t("cashSite.cash.colHasNow"), align: "right", cell: (r) => <MoneyText paisa={r.balancePaisa} /> },
    { id: "note", header: t("cashSite.cash.colFor"), cell: (r) => <span className="text-sm text-muted-foreground">{r.note ?? ""}</span> },
    { id: "status", header: t("field.status"), cell: (r) => <StatusBadge domain="topup" value={r.status} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      hidden: !owner,
      cell: (r) =>
        r.status === "PENDING" ? (
          <ApprovalActions
            size="sm"
            decline="reject"
            approveLabel={t("cashSite.cash.approveSend")}
            declining={rejecting}
            onApprove={() => setApproving(r)}
            onDecline={async (note) => {
              const ok = await run(() => reject({ id: r.id, note }).unwrap(), { success: t("cashSite.cash.topupRejected") });
              if (!ok) throw new Error("failed");
            }}
          />
        ) : r.decisionNote ? (
          <span className="text-xs text-muted-foreground">“{r.decisionNote}”</span>
        ) : null,
    },
  ];
  return (
    <>
      <DataTable
        rows={list.data?.items}
        getRowId={(r) => r.id}
        loading={list.isLoading}
        error={list.error}
        onRetry={list.refetch}
        columns={columns}
        empty={{ title: t("cashSite.cash.noTopups"), icon: HandCoins, compact: true }}
      />
      {approving ? <ApproveTopupSlideOver open onOpenChange={(o) => (!o ? setApproving(null) : undefined)} topup={approving} /> : null}
    </>
  );
}

export function TopupsView({ projectId }: { projectId: string }) {
  const t = useT();
  // Approvers don't ask for top-ups themselves.
  const asks = useCan("cashbook.topup.create");
  const approves = useCan("cashbook.topup.approve");
  const owner = !asks || approves;
  const [open, setOpen] = useState(false);
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("cashSite.cash.crumbTopups")}
      actions={() =>
        !owner ? (
          <Button onClick={() => setOpen(true)}>
            <HandCoins data-icon="inline-start" />
            {t("cashSite.cash.askTopup")}
          </Button>
        ) : null
      }
    >
      {() => (
        <>
          <SectionCard flush title={t("cashSite.cash.waiting")}>
            <TopupTable status="PENDING" />
          </SectionCard>
          <SectionCard flush title={t("cashSite.cash.allRequests")}>
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
  const t = useT();
  const office = useCan("cashbook.float.manage");
  const canCount = useCan("cashbook.count.create");
  const canHandover = useCan("cashbook.handover.create");
  const { accounts } = useProjectAccounts(projectId);
  const [picked, setPicked] = useState<string | undefined>();
  const account = accounts.find((a) => a.id === (picked ?? accounts[0]?.id));
  const counts = useGetCashCountsQuery({ accountId: account?.id, limit: 50 }, { skip: !account });
  const [open, setOpen] = useState<"count" | "handover" | null>(null);
  return (
    <ProjectPageShell projectId={projectId} crumb={t("cashSite.cash.crumbCounts")}>
      {(project) => {
        const people = [
          ...(project.team.pm ? [{ ...project.team.pm, description: t("field.projectManager") }] : []),
          ...project.team.munshis.map((m) => ({ ...m, description: t("field.munshi") })),
        ];
        return account ? (
          <>
            <div className="flex justify-end">
              <AccountPicker accounts={accounts} value={account.id} onChange={setPicked} />
            </div>
            <BalanceCard
              account={account}
              actions={
                <>
                  {canCount ? (
                    <Button onClick={() => setOpen("count")}>
                      <Calculator data-icon="inline-start" />
                      {t("cashSite.cash.countCash")}
                    </Button>
                  ) : null}
                  {canHandover ? (
                    <Button variant="outline" onClick={() => setOpen("handover")} disabled={toPaisaBigInt(account.balancePaisa)! <= BigInt(0)}>
                      <Repeat data-icon="inline-start" />
                      {t("cashSite.cash.handOver")}
                    </Button>
                  ) : null}
                </>
              }
            />
            <SectionCard flush title={t("cashSite.cash.counts")}>
              <DataTable
                rows={counts.data?.items}
                getRowId={(c) => c.id}
                loading={counts.isLoading}
                error={counts.error}
                onRetry={counts.refetch}
                columns={[
                  { id: "at", header: t("field.counted"), cell: (c) => formatDateTime(c.countedAt) },
                  { id: "book", header: t("cashSite.cash.colBook"), align: "right", cell: (c) => <MoneyText paisa={c.systemPaisa} /> },
                  { id: "counted", header: t("field.counted"), align: "right", cell: (c) => <MoneyText paisa={c.countedPaisa} /> },
                  {
                    id: "diff",
                    header: t("cashSite.cash.colDifference"),
                    align: "right",
                    cell: (c) => (c.differencePaisa === "0" ? <StatusBadge tone="success" label={t("cashSite.cash.matches")} /> : <SignedAmount paisa={c.differencePaisa} />),
                  },
                  { id: "note", header: t("field.reason"), cell: (c) => <span className="text-sm text-muted-foreground">{c.note ?? ""}</span> },
                ]}
                empty={{ title: t("cashSite.cash.neverCounted"), description: t("cashSite.cash.neverCountedDesc"), icon: Calculator }}
              />
            </SectionCard>
            {open === "count" ? <CashCountSlideOver open onOpenChange={(o) => setOpen(o ? "count" : null)} account={account} /> : null}
            {open === "handover" ? <HandoverSlideOver open onOpenChange={(o) => setOpen(o ? "handover" : null)} account={account} people={people} /> : null}
          </>
        ) : (
          <SectionCard>
            <EmptyState
              title={t("cashSite.cash.noSiteCashProject")}
              description={office ? t("cashSite.cash.sendFloatFirst") : t("cashSite.cash.officeSendsFirst")}
              icon={Wallet}
            />
          </SectionCard>
        );
      }}
    </ProjectPageShell>
  );
}

// ─── Company: cash floats overview (THEKEDAR) ───────────────────────────────

export function CashFloatsOverviewView() {
  const t = useT();
  const canSend = useCan("cashbook.float.manage");
  const accounts = useGetCashFloatsQuery();
  const [sending, setSending] = useState<string | null | undefined>(undefined);
  const totals = accounts.data?.totals;
  const columns: Column<CashFloatItem>[] = [
    {
      id: "holder",
      header: t("cashSite.cash.colHolder"),
      sortValue: (a) => a.holder.name,
      cell: (a) => (
        <div>
          <p className="font-medium">{a.holder.name}</p>
          <p className="text-xs text-muted-foreground">
            {a.holder.role === "PM" ? t("field.projectManager") : t("field.munshi")} · <bdi>{a.holder.phone}</bdi>
          </p>
        </div>
      ),
    },
    { id: "sites", header: t("cashSite.cash.colSites"), cell: (a) => (a.projects.length ? a.projects.map((p) => p.code).join(", ") : "—") },
    {
      id: "balance",
      header: t("cashSite.cash.colInHand"),
      align: "right",
      sortValue: (a) => Number(a.balancePaisa),
      cell: (a) => <MoneyText paisa={a.balancePaisa} className="font-semibold" />,
    },
    { id: "week", header: t("cashSite.cash.colSpentThisWeek"), align: "right", cell: (a) => (a.spentThisWeekPaisa === "0" ? "—" : <MoneyText paisa={a.spentThisWeekPaisa} />) },
    { id: "floated", header: t("cashSite.cash.colFloatedTotal"), align: "right", cell: (a) => <MoneyText paisa={a.totalFloatedPaisa} short /> },
    { id: "ack", header: t("cashSite.cash.colNotReceived"), align: "right", cell: (a) => (a.pendingAckPaisa === "0" ? "—" : <MoneyText paisa={a.pendingAckPaisa} />) },
    {
      id: "approval",
      header: t("cashSite.cash.colWaitingApproval"),
      align: "right",
      cell: (a) => (a.pendingApprovalPaisa === "0" ? "—" : <MoneyText paisa={a.pendingApprovalPaisa} className="text-warning" />),
    },
    { id: "recover", header: t("cashSite.cash.toPayBack"), align: "right", cell: (a) => (a.recoverablePaisa === "0" ? "—" : <MoneyText paisa={a.recoverablePaisa} className="text-danger" />) },
    {
      id: "count",
      header: t("cashSite.cash.colLastCount"),
      cell: (a) =>
        a.lastCount ? (
          <span>
            {formatDate(a.lastCount.countedAt)}
            {a.lastCount.differencePaisa !== "0" ? (
              <MoneyText paisa={a.lastCount.differencePaisa} className="block text-xs text-danger" />
            ) : (
              <span className="block text-xs text-success">{t("cashSite.cash.matched")}</span>
            )}
          </span>
        ) : (
          <StatusBadge tone="warning" label={t("cashSite.cash.never")} />
        ),
    },
    { id: "topup", header: t("cashSite.cash.colTopupAsked"), align: "right", cell: (a) => (a.pendingTopup ? <MoneyText paisa={a.pendingTopup.amountPaisa} className="text-warning" /> : "—") },
    { id: "last", header: t("cashSite.cash.colLastEntry"), cell: (a) => formatDate(a.lastEntryAt) },
    {
      ...ACTIONS_COLUMN,
      hidden: !canSend,
      cell: (a) => <RowActions name={a.holder.name} actions={[{ label: t("cashSite.cash.sendFloat"), icon: Send, onSelect: () => setSending(a.holder.id) }]} />,
    },
  ];
  const holdersDesc = totals
    ? `${t(totals.holders === 1 ? "cashSite.cash.oneHolder" : "cashSite.cash.nHolders", { n: totals.holders })} · ${t(
        totals.pendingTopups === 1 ? "cashSite.cash.oneTopupWaiting" : "cashSite.cash.nTopupsWaiting",
        { n: totals.pendingTopups },
      )}`
    : undefined;
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("cashSite.cash.overviewTitle")}
        description={t("cashSite.cash.overviewDesc")}
        breadcrumbs={[{ label: t("crumb.finance") }, { label: t("cashSite.cash.crumbFloats") }]}
        actions={
          canSend ? (
            <Button onClick={() => setSending(null)}>
              <Send data-icon="inline-start" />
              {t("cashSite.cash.sendFloat")}
            </Button>
          ) : null
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("cashSite.cash.kpiCashWithStaff")} icon={Wallet} value={formatPKRShort(totals?.balancePaisa ?? "0")} loading={accounts.isLoading} />
        <KpiCard
          label={t("cashSite.cash.kpiFloatsNotReceived")}
          icon={Clock}
          value={formatPKRShort(totals?.pendingAckPaisa ?? "0")}
          loading={accounts.isLoading}
          hint={totals ? t("cashSite.cash.kpiSpentThisWeek", { amount: formatPKRShort(totals.spentThisWeekPaisa) }) : undefined}
        />
        <KpiCard label={t("cashSite.cash.kpiKharchaWaiting")} icon={Hourglass} tone="warning" value={formatPKRShort(totals?.pendingApprovalPaisa ?? "0")} loading={accounts.isLoading} />
        <KpiCard label={t("cashSite.cash.toPayBack")} icon={TriangleAlert} tone="danger" value={formatPKRShort(totals?.recoverablePaisa ?? "0")} loading={accounts.isLoading} />
      </div>
      <SectionCard flush title={t("cashSite.cash.holders")} description={holdersDesc}>
        <DataTable
          rows={accounts.data?.items}
          getRowId={(a) => a.id}
          loading={accounts.isLoading}
          error={accounts.error}
          onRetry={accounts.refetch}
          columns={columns}
          empty={{ title: t("cashSite.cash.nobodyHolds"), icon: Wallet }}
        />
      </SectionCard>
      <SectionCard flush title={t("cashSite.cash.topupsWaiting")}>
        <TopupTable status="PENDING" />
      </SectionCard>
      <PendingKharcha />
      {sending !== undefined ? <SendFloatSlideOver open onOpenChange={(o) => (!o ? setSending(undefined) : undefined)} holderUserId={sending ?? undefined} /> : null}
    </div>
  );
}
