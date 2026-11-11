"use client";

import { Banknote, HandCoins, Pencil, Plus, Trash2, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useDeleteSalaryMutation,
  useDeleteStaffAdvanceMutation,
  useGetSalarySheetQuery,
  useGetStaffMemberQuery,
  useGetStaffQuery,
} from "@/api/services/staff.api";
import type { SalaryPayment, SalarySheetRow, StaffAdvance, StaffMember, StaffQuery } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { InfoList } from "@/components/common/InfoList";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalarySlideOver, StaffAdvanceSlideOver, StaffSlideOver } from "@/features/finance/components/StaffSlideOvers";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useT } from "@/i18n/useT";
import { formatDate, formatMonth, todayPK } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

const SEARCH = "w-full flex-none sm:w-60";
const STAFF_HREF = (id: string) => `/finance/staff/${id}`;

type Paying = { staff: Pick<StaffMember, "id" | "name" | "monthlySalaryPaisa" | "advanceDuePaisa">; month?: string };

function useCanManageStaff() {
  const readOnly = useReadOnly();
  return useCan("finance.staff.manage") && !readOnly;
}

/** Finance → Staff & Salaries: the office staff list and each month's salary sheet. */
export function StaffView() {
  const t = useT();
  const canManage = useCanManageStaff();
  const [tab, setTab] = useState("staff");
  const [adding, setAdding] = useState(false);
  return (
    <>
      <PageHeader
        title={t("cashSite.staff.title")}
        description={t("cashSite.staff.description")}
        breadcrumbs={[{ label: t("crumb.finance") }, { label: t("cashSite.staff.title") }]}
        actions={
          canManage ? (
            <Button onClick={() => setAdding(true)}>
              <Plus data-icon="inline-start" />
              {t("cashSite.staff.add")}
            </Button>
          ) : null
        }
      />
      <Tabs value={tab} onValueChange={setTab} className="gap-5">
        <TabsList>
          <TabsTrigger value="staff">{t("cashSite.staff.tabStaff")}</TabsTrigger>
          <TabsTrigger value="sheet">{t("cashSite.staff.tabSheet")}</TabsTrigger>
        </TabsList>
        <TabsContent value="staff">
          <StaffList canManage={canManage} />
        </TabsContent>
        <TabsContent value="sheet">
          <SalarySheetPanel canManage={canManage} />
        </TabsContent>
      </Tabs>
      {adding ? <StaffSlideOver staff={null} onClose={() => setAdding(false)} /> : null}
    </>
  );
}

function StaffList({ canManage }: { canManage: boolean }) {
  const t = useT();
  const router = useRouter();
  const [initial] = useState({ isActive: "true" });
  const list = useListState(initial);
  const { data, isLoading, isFetching, error, refetch } = useGetStaffQuery(list.query as StaffQuery);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [advancing, setAdvancing] = useState<StaffMember | null>(null);
  const [paying, setPaying] = useState<Paying | null>(null);

  const columns: Column<StaffMember>[] = [
    {
      id: "name",
      header: t("field.name"),
      cell: (s) => (
        <div className="min-w-0">
          <p className="font-medium">{s.name}</p>
          {s.designation ? <p className="text-xs text-muted-foreground">{s.designation}</p> : null}
        </div>
      ),
    },
    { id: "phone", header: t("field.phone"), cell: (s) => (s.phone ? <bdi dir="ltr">{formatPhone(s.phone)}</bdi> : "—") },
    { id: "salary", header: t("cashSite.staff.monthlySalary"), align: "right", cell: (s) => <MoneyText paisa={s.monthlySalaryPaisa} className="font-medium" /> },
    {
      id: "advance",
      header: t("cashSite.staff.advanceDue"),
      align: "right",
      cell: (s) => (s.advanceDuePaisa !== "0" ? <MoneyText paisa={s.advanceDuePaisa} className="text-warning" /> : "—"),
    },
    { id: "lastPaid", header: t("cashSite.staff.lastPaid"), cell: (s) => (s.lastPaidMonth ? formatMonth(s.lastPaidMonth) : t("cashSite.staff.notYet")) },
    { id: "status", header: t("field.status"), cell: (s) => <StatusBadge domain="active" value={s.isActive} /> },
    ...(canManage
      ? [
          {
            ...ACTIONS_COLUMN,
            cell: (s: StaffMember) => (
              <RowActions
                name={s.name}
                actions={[
                  { label: t("cashSite.staff.paySalary"), icon: Banknote, onSelect: () => setPaying({ staff: s }) },
                  ...(s.isActive ? [{ label: t("cashSite.staff.giveAdvance"), icon: HandCoins, onSelect: () => setAdvancing(s) }] : []),
                  { label: t("common.edit"), icon: Pencil, onSelect: () => setEditing(s) },
                ]}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard label={t("cashSite.staff.activeCount")} icon={Users} loading={isLoading} value={String(data?.meta.activeCount ?? 0)} />
        <KpiCard label={t("cashSite.staff.monthlyTotal")} icon={Wallet} highlight loading={isLoading} value={formatPKR(data?.meta.monthlyTotalPaisa ?? "0")} />
      </div>
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <FilterSelect
          label={t("field.status")}
          value={list.filters.isActive}
          onChange={(v) => list.setFilter("isActive", v)}
          options={[
            { value: "true", label: t("cashSite.staff.working") },
            { value: "false", label: t("cashSite.staff.left") },
          ]}
          allLabel={t("cashSite.staff.allStatus")}
        />
        <SearchInput value={list.search} onChange={list.setSearch} placeholder={t("cashSite.staff.search")} className={SEARCH} />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(s) => s.id}
          onRowClick={(s) => router.push(STAFF_HREF(s.id))}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{ title: t("cashSite.staff.emptyTitle"), description: t("cashSite.staff.emptyDesc"), icon: Users }}
          pagination={
            data
              ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize }
              : undefined
          }
        />
      </SectionCard>
      {editing ? <StaffSlideOver key={editing.id} staff={editing} onClose={() => setEditing(null)} /> : null}
      {advancing ? <StaffAdvanceSlideOver staff={advancing} onClose={() => setAdvancing(null)} /> : null}
      {paying ? <SalarySlideOver staff={paying.staff} month={paying.month} onClose={() => setPaying(null)} /> : null}
    </div>
  );
}

/** One month for everyone: who is paid, who is not, with a Pay button on each unpaid row. */
function SalarySheetPanel({ canManage }: { canManage: boolean }) {
  const t = useT();
  const router = useRouter();
  const [month, setMonth] = useState(() => todayPK().slice(0, 7));
  const query = useGetSalarySheetQuery(month, { skip: !/^\d{4}-\d{2}$/.test(month) });
  const [paying, setPaying] = useState<Paying | null>(null);
  const totals = query.data?.totals;

  const columns: Column<SalarySheetRow>[] = [
    {
      id: "name",
      header: t("field.name"),
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-medium">{r.staff.name}</p>
          {r.staff.designation ? <p className="text-xs text-muted-foreground">{r.staff.designation}</p> : null}
        </div>
      ),
    },
    { id: "salary", header: t("cashSite.staff.basic"), align: "right", cell: (r) => <MoneyText paisa={r.payment?.basicPaisa ?? r.monthlySalaryPaisa} /> },
    { id: "cut", header: t("cashSite.staff.advanceCut"), align: "right", cell: (r) => (r.payment && r.payment.advanceCutPaisa !== "0" ? <MoneyText paisa={r.payment.advanceCutPaisa} /> : "—") },
    { id: "net", header: t("cashSite.staff.net"), align: "right", cell: (r) => (r.payment ? <MoneyText paisa={r.payment.netPaisa} className="font-medium" /> : "—") },
    {
      id: "status",
      header: t("field.status"),
      cell: (r) =>
        r.payment ? (
          <span className="text-sm text-success">
            {t("cashSite.staff.paid")} · {formatDate(r.payment.paidOn)}
          </span>
        ) : canManage ? (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setPaying({ staff: { id: r.staff.id, name: r.staff.name, monthlySalaryPaisa: r.monthlySalaryPaisa, advanceDuePaisa: r.advanceDuePaisa }, month });
            }}
          >
            <Banknote data-icon="inline-start" />
            {t("cashSite.staff.paySalary")}
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">{t("cashSite.staff.notPaid")}</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="salary-month">{t("cashSite.staff.month")}</Label>
          <Input id="salary-month" type="month" className="w-48" value={month} max={todayPK().slice(0, 7)} onChange={(e) => setMonth(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label={t("cashSite.staff.salaryTotal")}
          icon={Wallet}
          loading={query.isLoading}
          value={formatPKR(totals?.salaryPaisa ?? "0")}
          hint={t("cashSite.staff.paidCount", { paid: totals?.paid ?? 0, n: totals?.staff ?? 0 })}
        />
        <KpiCard label={t("cashSite.staff.paidTotal")} icon={Banknote} loading={query.isLoading} value={formatPKR(totals?.paidNetPaisa ?? "0")} />
        <KpiCard label={t("cashSite.staff.unpaidTotal")} icon={HandCoins} highlight loading={query.isLoading} value={formatPKR(totals?.unpaidPaisa ?? "0")} />
      </div>
      <SectionCard flush>
        <DataTable
          rows={query.data?.rows}
          columns={columns}
          getRowId={(r) => r.staff.id}
          onRowClick={(r) => router.push(STAFF_HREF(r.staff.id))}
          loading={query.isLoading || query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          empty={{ title: t("cashSite.staff.sheetEmpty"), icon: Users }}
        />
      </SectionCard>
      {paying ? <SalarySlideOver staff={paying.staff} month={paying.month} onClose={() => setPaying(null)} /> : null}
    </div>
  );
}

/** One staff member: details, advances and salaries. */
export function StaffDetailView({ staffId }: { staffId: string }) {
  const t = useT();
  const te = useEnumT();
  const canManage = useCanManageStaff();
  const query = useGetStaffMemberQuery(staffId);
  const [editing, setEditing] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [deletingAdvance, setDeletingAdvance] = useState<StaffAdvance | null>(null);
  const [deletingSalary, setDeletingSalary] = useState<SalaryPayment | null>(null);
  const [removeAdvance, { isLoading: removingAdvance }] = useDeleteStaffAdvanceMutation();
  const [removeSalary, { isLoading: removingSalary }] = useDeleteSalaryMutation();
  const run = useMutationToast();

  const advanceColumns: Column<StaffAdvance>[] = [
    { id: "date", header: t("field.date"), cell: (a) => formatDate(a.date) },
    { id: "amount", header: t("field.amount"), align: "right", cell: (a) => <MoneyText paisa={a.amountPaisa} className="font-medium" /> },
    { id: "via", header: t("cashSite.office.paidVia"), cell: (a) => te("cashFloatMethod", a.paidVia) },
    { id: "note", header: t("field.notes"), cell: (a) => a.note ?? "—" },
    ...(canManage
      ? [{ ...ACTIONS_COLUMN, cell: (a: StaffAdvance) => <RowActions name={formatDate(a.date)} actions={[{ label: t("common.delete"), icon: Trash2, destructive: true, onSelect: () => setDeletingAdvance(a) }]} /> }]
      : []),
  ];
  const salaryColumns: Column<SalaryPayment>[] = [
    { id: "month", header: t("cashSite.staff.month"), cell: (p) => formatMonth(p.month) },
    { id: "basic", header: t("cashSite.staff.basic"), align: "right", cell: (p) => <MoneyText paisa={p.basicPaisa} /> },
    { id: "bonus", header: t("cashSite.staff.bonus"), align: "right", cell: (p) => (p.bonusPaisa !== "0" ? <MoneyText paisa={p.bonusPaisa} /> : "—") },
    { id: "deduction", header: t("cashSite.staff.deduction"), align: "right", cell: (p) => (p.deductionPaisa !== "0" ? <MoneyText paisa={p.deductionPaisa} /> : "—") },
    { id: "cut", header: t("cashSite.staff.advanceCut"), align: "right", cell: (p) => (p.advanceCutPaisa !== "0" ? <MoneyText paisa={p.advanceCutPaisa} /> : "—") },
    { id: "net", header: t("cashSite.staff.net"), align: "right", cell: (p) => <MoneyText paisa={p.netPaisa} className="font-medium" /> },
    { id: "paidOn", header: t("cashSite.staff.paidOn"), cell: (p) => `${formatDate(p.paidOn)} · ${te("cashFloatMethod", p.paidVia)}` },
    ...(canManage
      ? [{ ...ACTIONS_COLUMN, cell: (p: SalaryPayment) => <RowActions name={formatMonth(p.month)} actions={[{ label: t("common.delete"), icon: Trash2, destructive: true, onSelect: () => setDeletingSalary(p) }]} /> }]
      : []),
  ];

  return (
    <QueryState query={query}>
      {(s) => (
        <>
          <PageHeader
            title={s.name}
            description={s.designation ?? undefined}
            meta={<StatusBadge domain="active" value={s.isActive} />}
            breadcrumbs={[{ label: t("crumb.finance") }, { label: t("cashSite.staff.title"), href: "/finance/staff" }, { label: s.name }]}
            actions={
              canManage ? (
                <>
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    <Pencil data-icon="inline-start" />
                    {t("common.edit")}
                  </Button>
                  {s.isActive ? (
                    <Button variant="outline" onClick={() => setAdvancing(true)}>
                      <HandCoins data-icon="inline-start" />
                      {t("cashSite.staff.giveAdvance")}
                    </Button>
                  ) : null}
                  <Button onClick={() => setPaying(true)}>
                    <Banknote data-icon="inline-start" />
                    {t("cashSite.staff.paySalary")}
                  </Button>
                </>
              ) : null
            }
          />
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <KpiCard label={t("cashSite.staff.monthlySalary")} icon={Wallet} highlight value={formatPKR(s.monthlySalaryPaisa)} />
              <KpiCard label={t("cashSite.staff.advanceDue")} icon={HandCoins} tone={s.advanceDuePaisa !== "0" ? "warning" : "primary"} value={formatPKR(s.advanceDuePaisa)} />
            </div>
            <SectionCard title={t("cashSite.staff.details")}>
              <InfoList
                columns={2}
                items={[
                  { label: t("field.phone"), value: s.phone ? <bdi dir="ltr">{formatPhone(s.phone)}</bdi> : null },
                  { label: t("cashSite.staff.joinedOn"), value: s.joinedOn ? formatDate(s.joinedOn) : null },
                  { label: t("masterData.payee.bankName"), value: s.bankName, hidden: !s.bankName },
                  { label: t("masterData.payee.accountTitle"), value: s.accountTitle, hidden: !s.accountTitle },
                  { label: t("masterData.payee.accountNumber"), value: s.accountNumber ? <bdi dir="ltr">{s.accountNumber}</bdi> : null, hidden: !s.accountNumber },
                  { label: t("cashSite.accounts.iban"), value: s.iban ? <bdi dir="ltr">{s.iban}</bdi> : null, hidden: !s.iban },
                  { label: t("field.notes"), value: s.notes, hidden: !s.notes },
                ]}
              />
            </SectionCard>
            <SectionCard flush title={t("cashSite.staff.salaries")}>
              <DataTable rows={s.salaries} columns={salaryColumns} getRowId={(p) => p.id} empty={{ title: t("cashSite.staff.noSalaries"), icon: Banknote }} />
            </SectionCard>
            <SectionCard flush title={t("cashSite.staff.advances")}>
              <DataTable rows={s.advances} columns={advanceColumns} getRowId={(a) => a.id} empty={{ title: t("cashSite.staff.noAdvances"), icon: HandCoins }} />
            </SectionCard>
          </div>
          {editing ? <StaffSlideOver staff={s} onClose={() => setEditing(false)} /> : null}
          {advancing ? <StaffAdvanceSlideOver staff={s} onClose={() => setAdvancing(false)} /> : null}
          {paying ? <SalarySlideOver staff={s} onClose={() => setPaying(false)} /> : null}
          {deletingAdvance ? (
            <ConfirmDialog
              open
              onOpenChange={(o) => !o && setDeletingAdvance(null)}
              tone="danger"
              title={t("cashSite.staff.deleteAdvanceTitle")}
              description={t("cashSite.staff.deleteAdvanceDesc", { amount: formatPKR(deletingAdvance.amountPaisa), date: formatDate(deletingAdvance.date) })}
              confirmLabel={t("common.delete")}
              loading={removingAdvance}
              onConfirm={async () => {
                const ok = await run(() => removeAdvance({ id: deletingAdvance.id, staffId: s.id }).unwrap(), { success: t("cashSite.staff.advanceDeleted") });
                if (ok) setDeletingAdvance(null);
              }}
            />
          ) : null}
          {deletingSalary ? (
            <ConfirmDialog
              open
              onOpenChange={(o) => !o && setDeletingSalary(null)}
              tone="danger"
              title={t("cashSite.staff.deleteSalaryTitle")}
              description={t("cashSite.staff.deleteSalaryDesc", { month: formatMonth(deletingSalary.month), amount: formatPKR(deletingSalary.netPaisa) })}
              confirmLabel={t("common.delete")}
              loading={removingSalary}
              onConfirm={async () => {
                const ok = await run(() => removeSalary({ id: deletingSalary.id, staffId: s.id }).unwrap(), { success: t("cashSite.staff.salaryDeleted") });
                if (ok) setDeletingSalary(null);
              }}
            />
          ) : null}
        </>
      )}
    </QueryState>
  );
}
