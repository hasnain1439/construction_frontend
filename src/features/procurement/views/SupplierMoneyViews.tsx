"use client";

import { BookOpen, CircleCheck, CircleX, HandCoins, Plus, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGetSuppliersQuery } from "@/api/services/masterData.api";
import { useGetSupplierLedgerQuery, useGetSupplierPaymentsQuery, useSetChequeStatusMutation } from "@/api/services/procurement.api";
import type { LedgerEntry, Supplier, SupplierPayment, SupplierPaymentsQuery, SuppliersQuery } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { KpiCard } from "@/components/common/KpiCard";
import { LedgerTable } from "@/components/common/LedgerTable";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { formatDate } from "@/lib/dates";
import { formatPKRShort } from "@/lib/money";

import { PaymentSlideOver } from "../components/PaymentSlideOver";
import { label, PAYMENT_METHOD_OPTIONS, useSiteProjectOptions, useSupplierOptions } from "../options";

const LEDGER_LABEL: Record<LedgerEntry["type"], string> = {
  OPENING: "Opening balance",
  PURCHASE: "Purchase",
  RETURN: "Return",
  PAYMENT: "Payment",
  PAYMENT_REVERSAL: "Cheque bounced",
  ADJUSTMENT: "Adjustment",
};

/** "34 days" with a warning tone past 30 days. */
export function AgeingText({ days }: { days: number | null | undefined }) {
  if (days === null || days === undefined) return <span className="text-muted-foreground">—</span>;
  return <span className={days > 30 ? "font-medium text-danger" : days > 14 ? "text-warning" : undefined}>{days} days</span>;
}

/** A supplier's khata: running balance, filters, newest first. */
export function SupplierLedgerPanel({ supplierId }: { supplierId: string }) {
  const projects = useSiteProjectOptions();
  const list = useListState({ projectId: "", from: "", to: "" }, 50);
  const { data, isLoading, isFetching, error, refetch } = useGetSupplierLedgerQuery({ supplierId, ...list.query });
  const rows = data?.items.map((e) => ({
    id: e.id,
    date: e.occurredAt,
    title: LEDGER_LABEL[e.type],
    detail: [e.note, e.project?.name].filter(Boolean).join(" · ") || undefined,
    amount: e.amountPaisa,
    balance: e.runningBalancePaisa,
  }));
  return (
    <div className="space-y-4">
      {data ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Udhaar balance" icon={Wallet} value={formatPKRShort(data.ledger.udhaarBalancePaisa)} tone={BigInt(data.ledger.udhaarBalancePaisa) > BigInt(0) ? "warning" : "success"} />
          <KpiCard label="Oldest unpaid" icon={BookOpen} value={<AgeingText days={data.ledger.oldestUnpaidDays} />} hint="Payments settle the oldest bills first" />
          <KpiCard label="In this view" icon={HandCoins} value={formatPKRShort(data.ledger.totals.debitPaisa)} hint={<>Paid / returned <MoneyText paisa={data.ledger.totals.creditPaisa} short /></>} />
        </div>
      ) : null}
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <FilterSelect label="Project" value={list.filters.projectId} onChange={(v) => list.setFilter("projectId", v)} options={projects.options.map((o) => ({ value: o.value, label: o.label }))} />
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
          empty={{ title: "No entries yet", description: "Purchases, payments and returns appear here." }}
        />
      </SectionCard>
    </div>
  );
}

function usePaymentColumns(owner: boolean, onSettle: (p: SupplierPayment, status: "CLEARED" | "BOUNCED") => void, showSupplier = true): Column<SupplierPayment>[] {
  return [
    { id: "date", header: "Paid on", cell: (p) => formatDate(p.paidOn), sortValue: (p) => p.paidOn },
    { id: "supplier", header: "Supplier", hidden: !showSupplier, cell: (p) => p.supplier.name },
    { id: "amount", header: "Amount", align: "right", cell: (p) => <MoneyText paisa={p.amountPaisa} className="font-medium" /> },
    { id: "method", header: "Method", cell: (p) => label(PAYMENT_METHOD_OPTIONS, p.method) },
    { id: "ref", header: "Reference", cell: (p) => (p.chequeNo ? `Cheque ${p.chequeNo}${p.chequeDate ? ` · ${formatDate(p.chequeDate)}` : ""}` : (p.reference ?? p.purchase?.number ?? "—")) },
    { id: "status", header: "Status", cell: (p) => <StatusBadge domain="supplierPayment" value={p.status} /> },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      hidden: !owner,
      cell: (p) =>
        p.method === "CHEQUE" && p.status === "PENDING" ? (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="outline" onClick={() => onSettle(p, "CLEARED")}>
              <CircleCheck data-icon="inline-start" />
              Cleared
            </Button>
            <Button size="sm" variant="outline" onClick={() => onSettle(p, "BOUNCED")}>
              <CircleX data-icon="inline-start" />
              Bounced
            </Button>
          </div>
        ) : null,
    },
  ];
}

function ChequeDialog({ target, onClose }: { target: { payment: SupplierPayment; status: "CLEARED" | "BOUNCED" } | null; onClose: () => void }) {
  const [setStatus, { isLoading }] = useSetChequeStatusMutation();
  const run = useMutationToast();
  if (!target) return null;
  const bounced = target.status === "BOUNCED";
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={bounced ? `Cheque ${target.payment.chequeNo} bounced?` : `Cheque ${target.payment.chequeNo} cleared?`}
      description={bounced ? "The amount goes back onto the supplier's udhaar." : "The payment is final."}
      confirmLabel={bounced ? "Mark bounced" : "Mark cleared"}
      tone={bounced ? "danger" : "default"}
      loading={isLoading}
      onConfirm={async () => {
        const ok = await run(() => setStatus({ id: target.payment.id, body: { status: target.status } }).unwrap(), { success: bounced ? "Cheque marked bounced" : "Cheque cleared" });
        if (ok) onClose();
      }}
    />
  );
}

/** Payments of one supplier (supplier detail tab). */
export function SupplierPaymentsPanel({ supplierId }: { supplierId: string }) {
  const readOnly = useReadOnly();
  const owner = useCan({ roles: ["THEKEDAR"] }) && !readOnly;
  const list = useListState({});
  const { data, isLoading, isFetching, error, refetch } = useGetSupplierPaymentsQuery({ supplierId, ...list.query });
  const [open, setOpen] = useState(false);
  const [settle, setSettle] = useState<{ payment: SupplierPayment; status: "CLEARED" | "BOUNCED" } | null>(null);
  const columns = usePaymentColumns(owner, (payment, status) => setSettle({ payment, status }), false);
  return (
    <SectionCard
      flush
      title="Payments"
      description={data?.meta.totalPaidPaisa ? <>Total paid <MoneyText paisa={data.meta.totalPaidPaisa} /></> : undefined}
      actions={
        owner ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />
            Record payment
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
        empty={{ title: "No payments yet", compact: true }}
        pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
      />
      <PaymentSlideOver open={open} onOpenChange={setOpen} supplierId={supplierId} />
      <ChequeDialog target={settle} onClose={() => setSettle(null)} />
    </SectionCard>
  );
}

/** All supplier payments with filters + cheque actions. */
export function SupplierPaymentsView() {
  const readOnly = useReadOnly();
  const owner = useCan({ roles: ["THEKEDAR"] }) && !readOnly;
  const suppliers = useSupplierOptions();
  const list = useListState({ supplierId: "", method: "", status: "", from: "", to: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetSupplierPaymentsQuery(list.query as SupplierPaymentsQuery);
  const [open, setOpen] = useState(false);
  const [settle, setSettle] = useState<{ payment: SupplierPayment; status: "CLEARED" | "BOUNCED" } | null>(null);
  const columns = usePaymentColumns(owner, (payment, status) => setSettle({ payment, status }));
  return (
    <>
      <PageHeader
        title="Supplier Payments"
        description="Money paid to suppliers. Cheques stay pending until they clear."
        breadcrumbs={[{ label: "Suppliers & Stock" }, { label: "Supplier Payments" }]}
        actions={
          owner ? (
            <Button onClick={() => setOpen(true)}>
              <Plus data-icon="inline-start" />
              Record payment
            </Button>
          ) : null
        }
      />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <FilterSelect label="Supplier" value={list.filters.supplierId} onChange={(v) => list.setFilter("supplierId", v)} options={suppliers.options.map((o) => ({ value: o.value, label: o.label }))} />
        <FilterSelect label="Method" value={list.filters.method} onChange={(v) => list.setFilter("method", v)} options={PAYMENT_METHOD_OPTIONS} />
        <FilterSelect
          label="Status"
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v)}
          options={[
            { value: "CLEARED", label: "Cleared" },
            { value: "PENDING", label: "Cheque pending" },
            { value: "BOUNCED", label: "Bounced" },
          ]}
        />
        <DateRangePicker
          value={{ from: list.filters.from, to: list.filters.to }}
          onChange={(r) => {
            list.setFilter("from", r.from);
            list.setFilter("to", r.to);
          }}
        />
      </FilterBar>
      <SectionCard flush title={data?.meta.totalPaidPaisa ? <>Paid <MoneyText paisa={data.meta.totalPaidPaisa} /></> : undefined} description="Bounced cheques are not counted.">
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(p) => p.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{ title: "No payments", description: "Record what you pay suppliers to keep their udhaar right.", icon: HandCoins }}
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
  const router = useRouter();
  const list = useListState({ isActive: "" }, 50);
  const { data, isLoading, isFetching, error, refetch } = useGetSuppliersQuery(list.query as SuppliersQuery);
  const total = (data?.items ?? []).reduce((s, x) => s + BigInt(x.udhaarBalancePaisa ?? "0"), BigInt(0));
  const columns: Column<Supplier>[] = [
    { id: "name", header: "Supplier", sortValue: (s) => s.name, cell: (s) => <span className="font-medium">{s.name}</span> },
    { id: "category", header: "Category", cell: (s) => s.category ?? "—" },
    { id: "balance", header: "Udhaar", align: "right", sortValue: (s) => Number(s.udhaarBalancePaisa ?? 0), cell: (s) => <MoneyText paisa={s.udhaarBalancePaisa} className="font-semibold" /> },
    { id: "age", header: "Oldest unpaid", align: "right", sortValue: (s) => s.oldestUnpaidDays ?? -1, cell: (s) => <AgeingText days={s.oldestUnpaidDays} /> },
    { id: "status", header: "Status", cell: (s) => <StatusBadge domain="active" value={s.isActive} /> },
  ];
  return (
    <>
      <PageHeader title="Supplier Ledger (Khata)" description="What you owe each supplier. Open one for the full account." breadcrumbs={[{ label: "Suppliers & Stock" }, { label: "Supplier Ledger" }]} />
      <SectionCard flush title={data ? <>Total udhaar <MoneyText paisa={total.toString()} /></> : undefined}>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(s) => s.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          defaultSort={{ id: "balance", direction: "desc" }}
          onRowClick={(s) => router.push(`/suppliers-stock/suppliers/${s.id}?tab=ledger`)}
          empty={{ title: "No suppliers", icon: BookOpen }}
          pagination={data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined}
        />
      </SectionCard>
    </>
  );
}


