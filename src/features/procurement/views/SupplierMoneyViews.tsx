"use client";

import { BookOpen, CircleCheck, CircleX, HandCoins, Plus, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGetSuppliersQuery } from "@/api/services/masterData.api";
import { useGetSupplierLedgerQuery, useGetSupplierPaymentsQuery, useSetChequeStatusMutation } from "@/api/services/procurement.api";
import type { Supplier, SupplierPayment, SupplierPaymentsQuery, SuppliersQuery } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { KpiCard } from "@/components/common/KpiCard";
import { LedgerTable } from "@/components/common/LedgerTable";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useStatusT, useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { formatPKRShort } from "@/lib/money";

import { PaymentSlideOver } from "../components/PaymentSlideOver";
import { usePaymentMethodOptions, useSiteProjectOptions, useSupplierOptions } from "../options";

const PAYMENT_STATUSES = ["CLEARED", "PENDING", "BOUNCED"] as const;

/** "34 days" with a warning tone past 30 days. */
export function AgeingText({ days }: { days: number | null | undefined }) {
  const t = useT();
  if (days === null || days === undefined) return <span className="text-muted-foreground">—</span>;
  return <span className={days > 30 ? "font-medium text-danger" : days > 14 ? "text-warning" : undefined}>{t("procurement.money.days", { n: days })}</span>;
}

/** A supplier's khata: running balance, filters, newest first. */
export function SupplierLedgerPanel({ supplierId }: { supplierId: string }) {
  const t = useT();
  const te = useEnumT();
  const projects = useSiteProjectOptions();
  const list = useListState({ projectId: "", from: "", to: "" }, 50);
  const { data, isLoading, isFetching, error, refetch } = useGetSupplierLedgerQuery({ supplierId, ...list.query });
  const rows = data?.items.map((e) => ({
    id: e.id,
    date: e.occurredAt,
    title: te("procLedgerType", e.type),
    detail: [e.note, e.project?.name].filter(Boolean).join(" · ") || undefined,
    amount: e.amountPaisa,
    balance: e.runningBalancePaisa,
  }));
  return (
    <div className="space-y-4">
      {data ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label={t("procurement.money.udhaarBalance")} icon={Wallet} value={formatPKRShort(data.ledger.udhaarBalancePaisa)} tone={BigInt(data.ledger.udhaarBalancePaisa) > BigInt(0) ? "warning" : "success"} />
          <KpiCard label={t("procurement.money.oldestUnpaid")} icon={BookOpen} value={<AgeingText days={data.ledger.oldestUnpaidDays} />} hint={t("procurement.money.oldestHint")} />
          <KpiCard label={t("procurement.money.inThisView")} icon={HandCoins} value={formatPKRShort(data.ledger.totals.debitPaisa)} hint={<>{t("procurement.money.paidReturned")} <MoneyText paisa={data.ledger.totals.creditPaisa} short /></>} />
        </div>
      ) : null}
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <FilterSelect label={t("field.project")} value={list.filters.projectId} onChange={(v) => list.setFilter("projectId", v)} options={projects.options.map((o) => ({ value: o.value, label: o.label }))} />
        <DateRangePicker
          value={{ from: list.filters.from, to: list.filters.to }}
          onChange={(r) => {
            list.setFilter("from", r.from);
            list.setFilter("to", r.to);
          }}
        />
      </FilterBar>
      <SectionCard flush>
        <LedgerTable
          kind="money"
          rows={rows}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
          empty={{ title: t("procurement.money.noEntries"), description: t("procurement.money.noEntriesDesc") }}
        />
      </SectionCard>
    </div>
  );
}

function usePaymentColumns(owner: boolean, onSettle: (p: SupplierPayment, status: "CLEARED" | "BOUNCED") => void, showSupplier = true): Column<SupplierPayment>[] {
  const t = useT();
  const ts = useStatusT();
  const methods = usePaymentMethodOptions();
  return [
    { id: "date", header: t("procurement.payment.paidOn"), cell: (p) => formatDate(p.paidOn), sortValue: (p) => p.paidOn },
    { id: "supplier", header: t("field.supplier"), hidden: !showSupplier, cell: (p) => p.supplier.name },
    { id: "amount", header: t("field.amount"), align: "right", cell: (p) => <MoneyText paisa={p.amountPaisa} className="font-medium" /> },
    { id: "method", header: t("field.method"), cell: (p) => methods.find((m) => m.value === p.method)?.label ?? p.method },
    { id: "ref", header: t("field.reference"), cell: (p) => (p.chequeNo ? (p.chequeDate ? t("procurement.money.chequeRefDate", { no: p.chequeNo, date: formatDate(p.chequeDate) }) : t("procurement.money.chequeRef", { no: p.chequeNo })) : (p.reference ?? p.purchase?.number ?? "—")) },
    { id: "status", header: t("field.status"), cell: (p) => <StatusBadge domain="supplierPayment" value={p.status} /> },
    {
      ...ACTIONS_COLUMN,
      hidden: !owner,
      cell: (p) =>
        p.method === "CHEQUE" && p.status === "PENDING" ? (
          <RowActions
            name={p.chequeNo ? t("procurement.money.chequeName", { no: p.chequeNo }) : undefined}
            actions={[
              { label: ts("supplierPayment", "CLEARED"), icon: CircleCheck, onSelect: () => onSettle(p, "CLEARED") },
              { label: ts("supplierPayment", "BOUNCED"), icon: CircleX, destructive: true, onSelect: () => onSettle(p, "BOUNCED") },
            ]}
          />
        ) : null,
    },
  ];
}

function ChequeDialog({ target, onClose }: { target: { payment: SupplierPayment; status: "CLEARED" | "BOUNCED" } | null; onClose: () => void }) {
  const t = useT();
  const [setStatus, { isLoading }] = useSetChequeStatusMutation();
  const run = useMutationToast();
  if (!target) return null;
  const bounced = target.status === "BOUNCED";
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={t(bounced ? "procurement.money.bouncedTitle" : "procurement.money.clearedTitle", { no: target.payment.chequeNo ?? "" })}
      description={t(bounced ? "procurement.money.bouncedDesc" : "procurement.money.clearedDesc")}
      confirmLabel={t(bounced ? "procurement.money.markBounced" : "procurement.money.markCleared")}
      tone={bounced ? "danger" : "default"}
      loading={isLoading}
      onConfirm={async () => {
        const ok = await run(() => setStatus({ id: target.payment.id, body: { status: target.status } }).unwrap(), { success: t(bounced ? "procurement.money.markedBounced" : "procurement.money.chequeCleared") });
        if (ok) onClose();
      }}
    />
  );
}

/** Payments of one supplier (supplier detail tab). */
export function SupplierPaymentsPanel({ supplierId }: { supplierId: string }) {
  const t = useT();
  const readOnly = useReadOnly();
  const owner = useCan("procurement.payment.manage") && !readOnly;
  const canPay = useCan("procurement.payment.create") && !readOnly;
  const list = useListState({});
  const { data, isLoading, isFetching, error, refetch } = useGetSupplierPaymentsQuery({ supplierId, ...list.query });
  const [open, setOpen] = useState(false);
  const [settle, setSettle] = useState<{ payment: SupplierPayment; status: "CLEARED" | "BOUNCED" } | null>(null);
  const columns = usePaymentColumns(owner, (payment, status) => setSettle({ payment, status }), false);
  return (
    <SectionCard
      flush
      title={t("field.payments")}
      description={data?.meta.totalPaidPaisa ? <>{t("procurement.money.totalPaid")} <MoneyText paisa={data.meta.totalPaidPaisa} /></> : undefined}
      actions={
        canPay ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />
            {t("action.recordPayment")}
          </Button>
        ) : null
      }
    >
      <DataTable
        rows={data?.items}
        columns={columns}
        getRowId={(p) => p.id}
        loading={isLoading || isFetching}
        error={error}
        onRetry={refetch}
        empty={{ title: t("procurement.money.noPaymentsYet"), compact: true }}
        pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
      />
      <PaymentSlideOver open={open} onOpenChange={setOpen} supplierId={supplierId} />
      <ChequeDialog target={settle} onClose={() => setSettle(null)} />
    </SectionCard>
  );
}

/** All supplier payments with filters + cheque actions. */
export function SupplierPaymentsView() {
  const t = useT();
  const ts = useStatusT();
  const methods = usePaymentMethodOptions();
  const readOnly = useReadOnly();
  const owner = useCan("procurement.payment.manage") && !readOnly;
  const canPay = useCan("procurement.payment.create") && !readOnly;
  const suppliers = useSupplierOptions();
  const list = useListState({ supplierId: "", method: "", status: "", from: "", to: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetSupplierPaymentsQuery(list.query as SupplierPaymentsQuery);
  const [open, setOpen] = useState(false);
  const [settle, setSettle] = useState<{ payment: SupplierPayment; status: "CLEARED" | "BOUNCED" } | null>(null);
  const columns = usePaymentColumns(owner, (payment, status) => setSettle({ payment, status }));
  return (
    <>
      <PageHeader
        title={t("procurement.money.paymentsTitle")}
        description={t("procurement.money.paymentsDesc")}
        breadcrumbs={[{ label: t("crumb.suppliersStock") }, { label: t("procurement.crumb.supplierPayments") }]}
        actions={
          canPay ? (
            <Button onClick={() => setOpen(true)}>
              <Plus data-icon="inline-start" />
              {t("action.recordPayment")}
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <FilterSelect label={t("field.supplier")} value={list.filters.supplierId} onChange={(v) => list.setFilter("supplierId", v)} options={suppliers.options.map((o) => ({ value: o.value, label: o.label }))} />
        <FilterSelect label={t("field.method")} value={list.filters.method} onChange={(v) => list.setFilter("method", v)} options={methods} />
        <FilterSelect
          label={t("field.status")}
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v)}
          options={PAYMENT_STATUSES.map((value) => ({ value, label: ts("supplierPayment", value) }))}
        />
        <DateRangePicker
          value={{ from: list.filters.from, to: list.filters.to }}
          onChange={(r) => {
            list.setFilter("from", r.from);
            list.setFilter("to", r.to);
          }}
        />
      </FilterBar>
      <SectionCard flush title={data?.meta.totalPaidPaisa ? <>{t("field.paid")} <MoneyText paisa={data.meta.totalPaidPaisa} /></> : undefined} description={t("procurement.money.bouncedNotCounted")}>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(p) => p.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{ title: t("procurement.money.noPayments"), description: t("procurement.money.noPaymentsDesc"), icon: HandCoins }}
          pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
        />
      </SectionCard>
      <PaymentSlideOver open={open} onOpenChange={setOpen} />
      <ChequeDialog target={settle} onClose={() => setSettle(null)} />
    </>
  );
}

/** Supplier Ledger (Khata): every supplier with what you owe and since when. */
export function SupplierKhataView() {
  const t = useT();
  const router = useRouter();
  const list = useListState({ isActive: "" }, 50);
  const { data, isLoading, isFetching, error, refetch } = useGetSuppliersQuery(list.query as SuppliersQuery);
  const total = (data?.items ?? []).reduce((s, x) => s + BigInt(x.udhaarBalancePaisa ?? "0"), BigInt(0));
  const columns: Column<Supplier>[] = [
    { id: "name", header: t("field.supplier"), sortValue: (s) => s.name, cell: (s) => <span className="font-medium">{s.name}</span> },
    { id: "category", header: t("field.category"), cell: (s) => s.category ?? "—" },
    { id: "balance", header: t("procurement.money.colUdhaar"), align: "right", sortValue: (s) => Number(s.udhaarBalancePaisa ?? 0), cell: (s) => <MoneyText paisa={s.udhaarBalancePaisa} className="font-semibold" /> },
    { id: "age", header: t("procurement.money.oldestUnpaid"), align: "right", sortValue: (s) => s.oldestUnpaidDays ?? -1, cell: (s) => <AgeingText days={s.oldestUnpaidDays} /> },
    { id: "status", header: t("field.status"), cell: (s) => <StatusBadge domain="active" value={s.isActive} /> },
  ];
  return (
    <>
      <PageHeader title={t("procurement.money.khataTitle")} description={t("procurement.money.khataDesc")} breadcrumbs={[{ label: t("crumb.suppliersStock") }, { label: t("procurement.crumb.supplierLedger") }]} />
      <SectionCard flush title={data ? <>{t("procurement.money.totalUdhaar")} <MoneyText paisa={total.toString()} /></> : undefined}>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(s) => s.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          defaultSort={{ id: "balance", direction: "desc" }}
          onRowClick={(s) => router.push(`/suppliers-stock/suppliers/${s.id}?tab=ledger`)}
          empty={{ title: t("procurement.money.noSuppliers"), icon: BookOpen }}
          pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
        />
      </SectionCard>
    </>
  );
}


