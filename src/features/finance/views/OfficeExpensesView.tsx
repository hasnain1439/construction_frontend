"use client";

import { Building2, Paperclip, Pencil, Plus, Tags, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { useDeleteOfficeExpenseMutation, useGetOfficeExpensesQuery } from "@/api/services/officeExpenses.api";
import type { OfficeExpense, OfficeExpensesMeta, OfficeExpensesQuery } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { OfficeExpenseCategoriesSlideOver } from "@/features/finance/components/OfficeExpenseCategoriesSlideOver";
import {
  OfficeExpenseSlideOver,
  useOfficeExpenseOptions,
} from "@/features/finance/components/OfficeExpenseSlideOver";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useT } from "@/i18n/useT";
import { formatDate, formatDateTime, todayPK } from "@/lib/dates";
import { formatPKR } from "@/lib/money";

/** Search box width, so the filter row stays tidy instead of stretching. */
const SEARCH = "w-full flex-none sm:w-60";

/** This month so far: the default date range. */
function thisMonth() {
  const today = todayPK();
  return { from: `${today.slice(0, 8)}01`, to: today, categoryId: "", paidVia: "" };
}

/** Total for the filter and where it went, largest category first. */
function Summary({
  meta,
  count,
  loading,
}: {
  meta: OfficeExpensesMeta | undefined;
  count: number;
  loading: boolean;
}) {
  const t = useT();
  const rows = meta?.byCategory ?? [];
  const max = rows.reduce((m, r) => Math.max(m, Number(r.totalPaisa)), 0);
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <KpiCard
        label={t("cashSite.office.total")}
        icon={Wallet}
        highlight
        loading={loading}
        value={formatPKR(meta?.totalPaisa ?? "0")}
        hint={t(count === 1 ? "cashSite.office.oneExpense" : "cashSite.office.nExpenses", { n: count })}
      />
      <SectionCard title={t("cashSite.office.byCategory")} className="lg:col-span-2">
        {rows.length ? (
          <ul className="space-y-2.5" aria-label={t("cashSite.office.byCategory")}>
            {rows.map((r) => (
              <li
                key={r.categoryId}
                className="grid grid-cols-[9rem_1fr_auto] items-center gap-3 text-sm"
                title={`${r.name}: ${formatPKR(r.totalPaisa)}`}
              >
                <span className="truncate text-muted-foreground">{r.name}</span>
                <span className="h-3 rounded-full bg-muted">
                  <span
                    className="block h-3 rounded-full bg-chart-brand"
                    style={{ width: `${max ? Math.max(2, (Number(r.totalPaisa) / max) * 100) : 0}%` }}
                  />
                </span>
                <MoneyText paisa={r.totalPaisa} short className="text-end font-medium" />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t("cashSite.office.nothingInRange")} compact />
        )}
      </SectionCard>
    </div>
  );
}

/** Finance → Office Expenses: rent, bills, salaries — company running costs not tied to a project. */
export function OfficeExpensesView() {
  const t = useT();
  const te = useEnumT();
  const readOnly = useReadOnly();
  const canManage = useCan("finance.officeexpense.manage") && !readOnly;
  const { categories, methods } = useOfficeExpenseOptions();
  const [initial] = useState(thisMonth);
  const list = useListState(initial);
  const { data, isLoading, isFetching, error, refetch } = useGetOfficeExpensesQuery(
    list.query as OfficeExpensesQuery,
  );
  const [editing, setEditing] = useState<OfficeExpense | null>(null);
  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState(false);
  const [deleting, setDeleting] = useState<OfficeExpense | null>(null);
  const [remove, { isLoading: removing }] = useDeleteOfficeExpenseMutation();
  const run = useMutationToast();

  const columns: Column<OfficeExpense>[] = [
    {
      id: "date",
      header: t("field.date"),
      cell: (e) => <span className="whitespace-nowrap">{formatDate(e.date)}</span>,
    },
    {
      id: "category",
      header: t("field.category"),
      cell: (e) => (
        <div className="min-w-0">
          <p>{e.category.name}</p>
          {e.fromStaff ? (
            <p className="text-xs text-muted-foreground">
              {t(e.fromStaff === "ADVANCE" ? "cashSite.staff.fromAdvance" : "cashSite.staff.fromSalary")}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "description",
      header: t("field.description"),
      cell: (e) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm">
            <span className="line-clamp-2">{e.description}</span>
            {e.attachmentId ? (
              <Paperclip
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-label={t("cashSite.office.hasReceipt")}
              />
            ) : null}
          </p>
          {e.paidTo ? (
            <p className="text-xs text-muted-foreground">
              {t("cashSite.office.paidToLine", { name: e.paidTo })}
            </p>
          ) : null}
        </div>
      ),
    },
    { id: "paidVia", header: t("cashSite.office.paidVia"), cell: (e) => te("cashFloatMethod", e.paidVia) },
    {
      id: "amount",
      header: t("field.amount"),
      align: "right",
      cell: (e) => <MoneyText paisa={e.amountPaisa} className="font-medium" />,
    },
    {
      id: "addedBy",
      header: t("cashSite.office.addedBy"),
      cell: (e) => (
        <div className="min-w-0">
          <p className="text-sm">{e.createdBy?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</p>
          {e.updatedBy ? (
            <p className="text-xs text-muted-foreground">
              {t("cashSite.office.editedBy", { name: e.updatedBy.name })}
            </p>
          ) : null}
        </div>
      ),
    },
    ...(canManage
      ? [
          {
            ...ACTIONS_COLUMN,
            cell: (e: OfficeExpense) =>
              e.fromStaff ? (
                <span className="text-xs text-muted-foreground">{t("cashSite.staff.fromStaffHint")}</span>
              ) : (
              <RowActions
                name={e.description}
                actions={[
                  { label: t("common.edit"), icon: Pencil, onSelect: () => setEditing(e) },
                  {
                    label: t("common.delete"),
                    icon: Trash2,
                    destructive: true,
                    onSelect: () => setDeleting(e),
                  },
                ]}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title={t("cashSite.office.title")}
        description={t("cashSite.office.description")}
        breadcrumbs={[{ label: t("crumb.finance") }, { label: t("cashSite.office.title") }]}
        actions={
          canManage ? (
            <>
              <Button variant="outline" onClick={() => setManaging(true)}>
                <Tags data-icon="inline-start" />
                {t("cashSite.office.manageCategories")}
              </Button>
              <Button onClick={() => setAdding(true)}>
                <Plus data-icon="inline-start" />
                {t("cashSite.office.add")}
              </Button>
            </>
          ) : null
        }
      />
      <div className="space-y-4">
        <FilterBar onClear={list.clear} canClear={list.isFiltered}>
          <DateRangePicker
            value={{ from: list.filters.from, to: list.filters.to }}
            onChange={(r) => {
              list.setFilter("from", r.from);
              list.setFilter("to", r.to);
            }}
          />
          <FilterSelect
            label={t("field.category")}
            value={list.filters.categoryId}
            onChange={(v) => list.setFilter("categoryId", v)}
            options={categories}
            allLabel={t("cashSite.office.allCategories")}
          />
          <FilterSelect
            label={t("cashSite.office.paidVia")}
            value={list.filters.paidVia}
            onChange={(v) => list.setFilter("paidVia", v)}
            options={methods}
            allLabel={t("cashSite.office.allMethods")}
          />
          <SearchInput
            value={list.search}
            onChange={list.setSearch}
            placeholder={t("cashSite.office.search")}
            className={SEARCH}
          />
        </FilterBar>
        <Summary meta={data?.meta} count={data?.meta.total ?? 0} loading={isLoading} />
        <SectionCard flush>
          <DataTable
            rows={data?.items}
            columns={columns}
            getRowId={(e) => e.id}
            loading={isLoading || isFetching}
            error={error}
            onRetry={refetch}
            empty={{
              title: t("cashSite.office.emptyTitle"),
              description: t("cashSite.office.emptyDesc"),
              icon: Building2,
            }}
            pagination={
              data
                ? {
                    page: list.page,
                    pageSize: list.pageSize,
                    total: data.meta.total,
                    onPageChange: list.setPage,
                    onPageSizeChange: list.setPageSize,
                  }
                : undefined
            }
          />
        </SectionCard>
      </div>
      {managing ? <OfficeExpenseCategoriesSlideOver onClose={() => setManaging(false)} /> : null}
      {adding ? <OfficeExpenseSlideOver expense={null} onClose={() => setAdding(false)} /> : null}
      {editing ? (
        <OfficeExpenseSlideOver key={editing.id} expense={editing} onClose={() => setEditing(null)} />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          tone="danger"
          title={t("cashSite.office.deleteTitle")}
          description={t("cashSite.office.deleteDesc", {
            amount: formatPKR(deleting.amountPaisa),
            category: deleting.category.name,
            date: formatDate(deleting.date),
          })}
          confirmLabel={t("common.delete")}
          loading={removing}
          onConfirm={async () => {
            const ok = await run(() => remove(deleting.id).unwrap(), {
              success: t("cashSite.office.deleted"),
            });
            if (ok) setDeleting(null);
          }}
        />
      ) : null}
    </>
  );
}
