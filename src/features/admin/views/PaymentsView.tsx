"use client";

import { CircleCheck, CircleX, CreditCard, ExternalLink, FileText, TriangleAlert, ZoomIn } from "lucide-react";
import { useState } from "react";
import {
  useApprovePaymentMutation,
  useGetAdminPaymentQuery,
  useGetAdminPaymentsQuery,
  useRejectPaymentMutation,
} from "@/api/services/admin/payments.api";
import type { AdminPaymentDetail, AdminPaymentRow, AdminPaymentsQuery } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { InfoList } from "@/components/common/InfoList";
import { InlineAlert } from "@/components/common/InlineAlert";
import { MoneyText } from "@/components/common/MoneyText";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime, formatRelative } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHOD_OPTIONS } from "@/lib/options";

function SlipPreview({ slip }: { slip: AdminPaymentDetail["slip"] }) {
  const [zoom, setZoom] = useState(false);
  if (!slip) return <InlineAlert tone="warning">No slip attached.</InlineAlert>;
  if (!slip.url) return <InlineAlert tone="warning">The slip link couldn&apos;t be created. Try again shortly.</InlineAlert>;
  if (!slip.mimeType.startsWith("image/")) {
    return (
      <a href={slip.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border p-4 hover:bg-muted">
        <FileText className="size-6 text-muted-foreground" aria-hidden />
        <span className="flex-1 text-sm font-medium">{slip.fileName}</span>
        <ExternalLink className="size-4" aria-hidden />
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setZoom((z) => !z)}
      className={cn("group relative block w-full overflow-hidden rounded-xl border bg-muted", zoom ? "cursor-zoom-out" : "cursor-zoom-in")}
      aria-label={zoom ? "Shrink slip" : "Zoom slip"}
    >
      {/* Signed, short-lived URL from the API. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={slip.url} alt={`Payment slip ${slip.fileName}`} className={cn("w-full object-contain transition-all", zoom ? "max-h-none" : "max-h-80")} />
      {!zoom ? (
        <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
          <ZoomIn className="size-3.5" aria-hidden />
          Zoom
        </span>
      ) : null}
    </button>
  );
}

function ReviewBody({ payment, onDone }: { payment: AdminPaymentDetail; onDone: () => void }) {
  const [approve, { isLoading: approving }] = useApprovePaymentMutation();
  const [reject, { isLoading: rejecting }] = useRejectPaymentMutation();
  const run = useMutationToast();
  const [confirm, setConfirm] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const pending = payment.status === "PENDING_REVIEW";
  const mismatch = payment.amountPaisa !== payment.expectedAmountPaisa;

  return (
    <div className="space-y-5">
      {payment.duplicateOf.length ? (
        <InlineAlert tone="danger" title="Possible duplicate">
          This transaction ID or amount/date was also used by:{" "}
          {payment.duplicateOf.map((d) => `${d.tenantName} (${formatDate(d.paidOn)}, ${d.status.toLowerCase().replace("_", " ")})`).join("; ")}.
        </InlineAlert>
      ) : null}
      <SlipPreview slip={payment.slip} />
      <InfoList
        items={[
          { label: "Company", value: payment.tenant.name },
          { label: "Plan", value: payment.plan.name },
          { label: "Expected", value: formatPKR(payment.expectedAmountPaisa) },
          {
            label: "Paid",
            value: (
              <span className={mismatch ? "text-danger" : undefined}>
                {formatPKR(payment.amountPaisa)}
                {mismatch ? " (doesn't match)" : ""}
              </span>
            ),
          },
          { label: "Method", value: PAYMENT_METHOD_LABEL[payment.method] ?? payment.method },
          { label: "Transaction ID", value: <span className="font-mono">{payment.transactionId}</span> },
          { label: "Paid on", value: formatDate(payment.paidOn) },
          { label: "Submitted", value: formatDateTime(payment.submittedAt) },
          { label: "Subscription", value: payment.subscription ? `${payment.subscription.status}${payment.subscription.currentPeriodEnd ? ` · ends ${formatDate(payment.subscription.currentPeriodEnd)}` : ""}` : "—" },
          { label: "Status", value: <StatusBadge domain="payment" value={payment.status} /> },
          { label: "Receipt", value: payment.receiptNo, hidden: !payment.receiptNo },
          { label: "Reject reason", value: payment.rejectReason, hidden: !payment.rejectReason },
        ]}
      />
      {pending ? (
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button variant="destructive-soft" onClick={() => setConfirm("reject")}>
            <CircleX data-icon="inline-start" />
            Reject
          </Button>
          <Button variant="success" onClick={() => setConfirm("approve")}>
            <CircleCheck data-icon="inline-start" />
            Approve
          </Button>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirm === "approve"}
        onOpenChange={(o) => !o && setConfirm(null)}
        tone="default"
        title={`Approve ${formatPKR(payment.amountPaisa)} from ${payment.tenant.name}?`}
        description="Activates 30 days of service, issues a receipt and sends an SMS."
        confirmLabel="Approve payment"
        loading={approving}
        onConfirm={async () => {
          const ok = await run(() => approve({ id: payment.id, body: note ? { note } : {} }).unwrap(), {
            success: (r) => `Approved · receipt ${r.receiptNo} · active until ${formatDate(r.periodEnd)}`,
          });
          if (ok) {
            setConfirm(null);
            onDone();
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="approve-note">Note (optional)</Label>
          <Textarea id="approve-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "reject"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Reject this payment?"
        description="The reason is sent to the company by SMS and shown in their payment history."
        confirmLabel="Reject payment"
        loading={rejecting}
        confirmDisabled={reason.trim().length < 5}
        onConfirm={async () => {
          const ok = await run(() => reject({ id: payment.id, body: { reason: reason.trim() } }).unwrap(), { success: "Payment rejected" });
          if (ok) {
            setConfirm(null);
            onDone();
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="reject-reason">
            Reason<span className="text-destructive">*</span>
          </Label>
          <Textarea id="reject-reason" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Transaction ID not found in our Easypaisa account" />
          <p className="text-xs text-muted-foreground">5–300 characters.</p>
        </div>
      </ConfirmDialog>
    </div>
  );
}

function PaymentReviewSlideOver({ paymentId, onClose }: { paymentId: string | null; onClose: () => void }) {
  const { data, isLoading, error, refetch } = useGetAdminPaymentQuery(paymentId ?? "", { skip: !paymentId });
  return (
    <SlideOver open={Boolean(paymentId)} onOpenChange={(o) => !o && onClose()} size="lg" title="Review payment" description={data ? `${data.tenant.name} · ${data.plan.name}` : undefined}>
      {isLoading || (!data && !error) ? (
        <CardsSkeleton count={2} height="h-40" />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} compact />
      ) : data ? (
        <ReviewBody payment={data} onDone={onClose} />
      ) : null}
    </SlideOver>
  );
}

export function PaymentsView() {
  const list = useListState({ status: "PENDING_REVIEW", method: "" });
  const { data, isLoading, isFetching, error, refetch } = useGetAdminPaymentsQuery(list.query as AdminPaymentsQuery);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const columns: Column<AdminPaymentRow>[] = [
    {
      id: "company",
      header: "Company",
      cell: (p) => (
        <span className="flex items-center gap-2 font-medium">
          {p.duplicateWarning ? <TriangleAlert className="size-4 text-danger" aria-label="Possible duplicate" /> : null}
          {p.tenant.name}
        </span>
      ),
      sortValue: (p) => p.tenant.name,
    },
    { id: "plan", header: "Plan", cell: (p) => p.plan.name },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (p) => (
        <span className={p.amountPaisa !== p.expectedAmountPaisa ? "text-danger" : undefined}>
          <MoneyText paisa={p.amountPaisa} />
        </span>
      ),
    },
    { id: "method", header: "Method", cell: (p) => PAYMENT_METHOD_LABEL[p.method] ?? p.method },
    { id: "txn", header: "Transaction ID", cell: (p) => <span className="font-mono text-xs">{p.transactionId}</span> },
    { id: "submitted", header: "Submitted", cell: (p) => <span title={formatDateTime(p.submittedAt)}>{formatRelative(p.submittedAt)}</span>, sortValue: (p) => p.submittedAt },
    { id: "status", header: "Status", cell: (p) => <StatusBadge domain="payment" value={p.status} /> },
  ];

  return (
    <>
      <PageHeader title="Payments" description="Slips uploaded by companies, oldest first." breadcrumbs={[{ label: "Payments" }]} />
      <FilterBar onClear={list.clear} canClear={list.isFiltered}>
        <SegmentedControl
          ariaLabel="Payment status"
          value={list.filters.status}
          onChange={(v) => list.setFilter("status", v)}
          options={[
            { value: "PENDING_REVIEW", label: "Pending review" },
            { value: "APPROVED", label: "Approved" },
            { value: "REJECTED", label: "Rejected" },
            { value: "REFUNDED", label: "Refunded" },
          ]}
        />
        <FilterSelect label="Method" value={list.filters.method} onChange={(v) => list.setFilter("method", v)} options={[...PAYMENT_METHOD_OPTIONS]} />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(p) => p.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          onRowClick={(p) => setReviewing(p.id)}
          empty={{ title: "Nothing waiting", description: "New payment slips appear here for review.", icon: CreditCard }}
          pagination={
            data ? { page: list.page, pageSize: list.pageSize, total: data.meta.total, onPageChange: list.setPage, onPageSizeChange: list.setPageSize } : undefined
          }
        />
      </SectionCard>
      <PaymentReviewSlideOver paymentId={reviewing} onClose={() => setReviewing(null)} />
    </>
  );
}
