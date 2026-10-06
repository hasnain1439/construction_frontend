"use client";

import { Ban, CalendarClock, CheckCircle2, FilePlus2, FileText, Flag, HandCoins, Landmark, Pencil, Plus, Send, Trash2, TriangleAlert, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useCancelInvoiceMutation,
  useDeleteBillingProgressMutation,
  useDeleteInvoiceMutation,
  useGetBillingProgressQuery,
  useGetBillingStagesQuery,
  useGetClientPaymentsQuery,
  useGetInvoicePdfMutation,
  useGetInvoiceQuery,
  useGetInvoicesQuery,
  useGetOwnerStatementPdfMutation,
  useGetOwnerStatementQuery,
  useGetReceiptPdfMutation,
  useGetReceivablesQuery,
  useIssueInvoiceMutation,
  useSetClientChequeStatusMutation,
  useUpdateInvoiceMutation,
  useUpdateStageMutation,
} from "@/api/services/billing.api";
import type { ClientPayment, Invoice, InvoiceStatus, InvoiceType, ScheduleStage, UnpaidStageWarning } from "@/api/types";
import { ChequeStatusBadge, InvoiceStatusBadge, PaymentMethodIcon } from "@/components/common/BillingBadges";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DocumentHeader } from "@/components/common/DocumentHeader";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { PdfActions } from "@/components/common/PdfActions";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { StageTimeline } from "@/components/common/StageTimeline";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatDate, todayPK } from "@/lib/dates";
import { formatPKR, formatPKRShort } from "@/lib/money";
import { projectHref } from "@/lib/navigation";
import { MarkReadySlideOver, NewInvoiceSlideOver, ProgressSlideOver, RecordPaymentSlideOver } from "../components/BillingSlideOvers";

const OWNER = { roles: ["THEKEDAR"] } as const;
const TYPE_LABEL: Record<InvoiceType, string> = { STAGE: "Stage", RUNNING_BILL: "Running bill", RECOVERABLE: "Recoverable", RETENTION: "Retention", OTHER: "Other" };

function UnpaidBanner({ warning, projectId }: { warning: UnpaidStageWarning; projectId: string }) {
  return (
    <InlineAlert tone="warning" title="An earlier stage is still unpaid">
      {warning.details.stages.map((s) => (
        <span key={s.invoiceId} className="block">
          {s.label}: <Link className="underline" href={projectHref(projectId, `/billing/invoices/${s.invoiceId}`)}>{s.invoiceNumber}</Link> — {formatPKR(s.balancePaisa)} due {s.overdueDays} days ago.
        </span>
      ))}
    </InlineAlert>
  );
}

// ─── Payment schedule ───────────────────────────────────────────────────────

function ExpectedDateDialog({ stage, onClose }: { stage: ScheduleStage; onClose: () => void }) {
  const [date, setDate] = useState(stage.expectedDate ?? "");
  const [update, { isLoading }] = useUpdateStageMutation();
  const run = useMutationToast();
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      tone="default"
      title={`Expected date — ${stage.label}`}
      confirmLabel="Save"
      loading={isLoading}
      onConfirm={async () => {
        const ok = await run(() => update({ id: stage.id, body: { expectedDate: date || null } }).unwrap(), { success: "Expected date saved" });
        if (ok) onClose();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="expected-date">Expected around</Label>
        <Input id="expected-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
    </ConfirmDialog>
  );
}

export function ScheduleView({ projectId }: { projectId: string }) {
  const owner = useCan(OWNER);
  const stages = useGetBillingStagesQuery(projectId);
  const [warning, setWarning] = useState<UnpaidStageWarning | null>(null);
  const [ready, setReady] = useState<ScheduleStage | null>(null);
  const [invoiceFor, setInvoiceFor] = useState<string | null | undefined>(undefined);
  const [dateFor, setDateFor] = useState<ScheduleStage | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const columns: Column<ScheduleStage>[] = [
    { id: "label", header: "Stage", cell: (s) => <span className="font-medium">{s.label}</span> },
    { id: "percent", header: "%", align: "right", cell: (s) => `${s.percent}%` },
    { id: "amount", header: "Amount", align: "right", cell: (s) => <MoneyText paisa={s.amountPaisa} /> },
    { id: "expected", header: "Expected", cell: (s) => (s.expectedDate ? formatDate(s.expectedDate) : "—") },
    { id: "status", header: "Status", cell: (s) => <StatusBadge domain="billingStage" value={s.status} /> },
    {
      id: "invoice",
      header: "Invoice",
      cell: (s) =>
        s.invoice ? (
          <Link className="text-primary underline-offset-4 hover:underline" href={projectHref(projectId, `/billing/invoices/${s.invoice.id}`)}>
            {s.invoice.number ?? "Draft"}
          </Link>
        ) : (
          "—"
        ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (s) => (
        <div className="flex flex-wrap justify-end gap-1">
          {s.status === "UPCOMING" && !s.isRetention ? (
            <Button size="sm" variant="outline" onClick={() => setReady(s)}>
              <Flag data-icon="inline-start" />
              Mark ready
            </Button>
          ) : null}
          {s.status === "READY" && !s.invoice ? (
            <Button size="sm" onClick={() => setInvoiceFor(s.id)}>
              <FilePlus2 data-icon="inline-start" />
              Create invoice
            </Button>
          ) : null}
          {owner && !s.invoice ? (
            <Button size="icon" variant="ghost" aria-label={`Expected date for ${s.label}`} onClick={() => setDateFor(s)}>
              <CalendarClock aria-hidden />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];
  return (
    <ProjectPageShell projectId={projectId} crumb="Payment Schedule">
      {(project) => {
        const running = project.contract?.billingModel === "RUNNING_BILLS";
        const schedule = (
          <>
            {warning ? <UnpaidBanner warning={warning} projectId={project.id} /> : null}
            <SectionCard title="Schedule">
              {stages.isLoading ? (
                <CardsSkeleton count={1} height="h-24" />
              ) : (
                <StageTimeline
                  stages={(stages.data ?? []).map((s) => ({
                    ...s,
                    invoiceNumber: s.invoice?.number ?? null,
                    invoiceHref: s.invoice ? projectHref(project.id, `/billing/invoices/${s.invoice.id}`) : null,
                    dueDate: s.invoice?.dueDate ?? null,
                  }))}
                />
              )}
            </SectionCard>
            <SectionCard flush title="Stages">
              <DataTable rows={stages.data} getRowId={(s) => s.id} loading={stages.isLoading} error={stages.error} onRetry={stages.refetch} columns={columns} empty={{ title: "No billing stages", compact: true }} />
            </SectionCard>
          </>
        );
        return (
          <>
            {running ? (
              <Tabs defaultValue="progress">
                <TabsList>
                  <TabsTrigger value="progress">Progress</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                </TabsList>
                <TabsContent value="progress" className="space-y-4">
                  <ProgressTab projectId={project.id} onAdd={() => setProgressOpen(true)} onBill={() => setInvoiceFor(null)} />
                </TabsContent>
                <TabsContent value="schedule" className="space-y-4">
                  {schedule}
                </TabsContent>
              </Tabs>
            ) : (
              schedule
            )}
            {ready ? <MarkReadySlideOver open onOpenChange={(o) => (!o ? setReady(null) : undefined)} stage={ready} onWarning={setWarning} /> : null}
            {invoiceFor !== undefined ? (
              <NewInvoiceSlideOver open onOpenChange={(o) => (!o ? setInvoiceFor(undefined) : undefined)} projectId={project.id} billingModel={project.contract?.billingModel ?? null} stageId={invoiceFor ?? undefined} />
            ) : null}
            {dateFor ? <ExpectedDateDialog stage={dateFor} onClose={() => setDateFor(null)} /> : null}
            {progressOpen ? <ProgressSlideOver open onOpenChange={setProgressOpen} projectId={project.id} /> : null}
          </>
        );
      }}
    </ProjectPageShell>
  );
}

function ProgressTab({ projectId, onAdd, onBill }: { projectId: string; onAdd: () => void; onBill: () => void }) {
  const progress = useGetBillingProgressQuery({ projectId });
  const [remove] = useDeleteBillingProgressMutation();
  const run = useMutationToast();
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Rate per sq ft" icon={Landmark} value={<MoneyText paisa={progress.data?.ratePerSqftPaisa ?? null} />} loading={progress.isLoading} />
        <KpiCard label="Not billed yet" icon={HandCoins} value={`${progress.data?.unbilledQuantity ?? 0} sq ft`} hint={progress.data ? formatPKR(progress.data.unbilledValuePaisa) : undefined} loading={progress.isLoading} />
        <div className="flex flex-col justify-center gap-2 rounded-xl border bg-card p-5">
          <Button onClick={onAdd}>
            <Plus data-icon="inline-start" />
            Add progress
          </Button>
          <Button variant="outline" onClick={onBill}>
            <FilePlus2 data-icon="inline-start" />
            Bill a period
          </Button>
        </div>
      </div>
      <SectionCard flush title="Progress">
        <DataTable
          rows={progress.data?.items}
          getRowId={(p) => p.id}
          loading={progress.isLoading}
          error={progress.error}
          onRetry={progress.refetch}
          empty={{ title: "No progress yet", compact: true }}
          columns={[
            { id: "date", header: "Date", cell: (p) => formatDate(p.date) },
            { id: "desc", header: "Work", cell: (p) => p.description },
            { id: "qty", header: "Sq ft", align: "right", cell: (p) => p.quantity },
            { id: "value", header: "Value", align: "right", cell: (p) => <MoneyText paisa={p.valuePaisa} /> },
            { id: "status", header: "Status", cell: (p) => (p.billed ? <StatusBadge tone="success" label="Billed" /> : p.draftInvoiceId ? <StatusBadge tone="info" label="On a draft" /> : <StatusBadge tone="warning" label="Not billed" />) },
            {
              id: "actions",
              header: "",
              align: "right",
              cell: (p) =>
                !p.billed && !p.draftInvoiceId ? (
                  <Button size="icon" variant="ghost" aria-label="Delete progress" onClick={() => run(() => remove(p.id).unwrap(), { success: "Deleted" })}>
                    <Trash2 aria-hidden />
                  </Button>
                ) : null,
            },
          ]}
        />
      </SectionCard>
    </>
  );
}

// ─── Invoices ───────────────────────────────────────────────────────────────

export function InvoicesView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<InvoiceStatus | "ALL">("ALL");
  const [type, setType] = useState<InvoiceType | "ALL">("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const list = useGetInvoicesQuery({ projectId, limit: 100, ...(status !== "ALL" ? { status } : {}), ...(type !== "ALL" ? { type } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) });
  const [open, setOpen] = useState(false);
  const columns: Column<Invoice>[] = [
    { id: "number", header: "Invoice", cell: (i) => <span className="font-medium tabular">{i.number ?? "Draft"}</span> },
    { id: "type", header: "Type", cell: (i) => (i.billingStage ? i.billingStage.label : TYPE_LABEL[i.type]) },
    { id: "issued", header: "Issued", sortValue: (i) => i.issueDate ?? "", cell: (i) => formatDate(i.issueDate) },
    { id: "due", header: "Due", cell: (i) => formatDate(i.dueDate) },
    { id: "total", header: "Total", align: "right", cell: (i) => <MoneyText paisa={i.totalPaisa} /> },
    { id: "balance", header: "Balance", align: "right", cell: (i) => (i.status === "CANCELLED" || i.status === "DRAFT" ? "—" : <MoneyText paisa={i.balancePaisa} className={i.overdue ? "font-semibold text-danger" : "font-semibold"} />) },
    { id: "status", header: "Status", cell: (i) => <InvoiceStatusBadge status={i.status} overdueDays={i.overdueDays} /> },
  ];
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb="Invoices & Running Bills"
      actions={(p) =>
        p.status !== "DRAFT" ? (
          <Button onClick={() => setOpen(true)}>
            <FilePlus2 data-icon="inline-start" />
            New invoice
          </Button>
        ) : null
      }
    >
      {(project) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label="Invoiced" icon={FileText} value={formatPKRShort(list.data?.meta.invoicedPaisa ?? "0")} loading={list.isLoading} />
            <KpiCard label="Received" icon={CheckCircle2} tone="success" value={formatPKRShort(list.data?.meta.paidPaisa ?? "0")} loading={list.isLoading} />
            <KpiCard label="Balance" icon={HandCoins} tone="warning" value={formatPKRShort(list.data?.meta.balancePaisa ?? "0")} loading={list.isLoading} />
          </div>
          <SectionCard
            flush
            title="Invoices"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger className="w-36" aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["ALL", "DRAFT", "ISSUED", "PARTLY_PAID", "PAID", "CANCELLED"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "ALL" ? "All statuses" : s.replace("_", " ").toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger className="w-36" aria-label="Type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All types</SelectItem>
                    {Object.entries(TYPE_LABEL).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="date" aria-label="From" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
                <Input type="date" aria-label="To" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            }
          >
            <DataTable
              rows={list.data?.items}
              getRowId={(i) => i.id}
              loading={list.isLoading}
              error={list.error}
              onRetry={list.refetch}
              columns={columns}
              onRowClick={(i) => router.push(projectHref(project.id, `/billing/invoices/${i.id}`))}
              empty={{ title: "No invoices yet", icon: FileText }}
            />
          </SectionCard>
          {open ? <NewInvoiceSlideOver open onOpenChange={setOpen} projectId={project.id} billingModel={project.contract?.billingModel ?? null} /> : null}
        </>
      )}
    </ProjectPageShell>
  );
}

function ReasonDialog({ title, label, confirmLabel, loading, onConfirm, onClose }: { title: string; label: string; confirmLabel: string; loading: boolean; onConfirm: (reason: string) => Promise<unknown>; onClose: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <ConfirmDialog open onOpenChange={(o) => (!o ? onClose() : undefined)} title={title} confirmLabel={confirmLabel} loading={loading} confirmDisabled={reason.trim().length < 3} onConfirm={async () => { await onConfirm(reason.trim()); }}>
      <div className="space-y-1.5">
        <Label htmlFor="reason">{label}</Label>
        <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </ConfirmDialog>
  );
}

export function InvoiceDetailView({ projectId, invoiceId }: { projectId: string; invoiceId: string }) {
  const router = useRouter();
  const owner = useCan(OWNER);
  const q = useGetInvoiceQuery(invoiceId);
  const [issue, { isLoading: issuing }] = useIssueInvoiceMutation();
  const [cancel, { isLoading: cancelling }] = useCancelInvoiceMutation();
  const [remove, { isLoading: deleting }] = useDeleteInvoiceMutation();
  const [update, { isLoading: saving }] = useUpdateInvoiceMutation();
  const [pdf] = useGetInvoicePdfMutation();
  const run = useMutationToast();
  const [dialog, setDialog] = useState<"issue" | "cancel" | "delete" | "notes" | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const inv = q.data;
  return (
    <ProjectPageShell projectId={projectId} crumb="Invoice" title={inv ? (inv.number ?? "Draft invoice") : undefined}>
      {(project) =>
        !inv ? (
          <CardsSkeleton count={2} height="h-40" />
        ) : (
          <>
            <DocumentHeader
              number={inv.number ?? "Draft"}
              title="Invoice"
              status={<InvoiceStatusBadge status={inv.status} overdueDays={inv.overdueDays} />}
              meta={[
                { label: "Type", value: inv.billingStage ? `Stage · ${inv.billingStage.label}` : TYPE_LABEL[inv.type] },
                { label: "Owner", value: inv.client?.name ?? "—" },
                { label: "Issued", value: formatDate(inv.issueDate) },
                { label: "Due", value: formatDate(inv.dueDate) },
              ]}
              actions={
                <div className="flex flex-wrap gap-2">
                  {inv.status === "DRAFT" ? (
                    <>
                      <Button variant="outline" onClick={() => { setNotes(inv.notes ?? ""); setDialog("notes"); }}>
                        <Pencil data-icon="inline-start" />
                        Edit
                      </Button>
                      <Button variant="outline" onClick={() => setDialog("delete")}>
                        <Trash2 data-icon="inline-start" />
                        Delete draft
                      </Button>
                      {owner ? (
                        <Button onClick={() => setDialog("issue")}>
                          <Send data-icon="inline-start" />
                          Issue
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  {inv.status !== "DRAFT" && inv.status !== "CANCELLED" ? (
                    <>
                      <PdfActions load={() => pdf(inv.id).unwrap()} title={inv.number ?? "Invoice"} phone={inv.client?.phone} />
                      {owner && inv.status === "ISSUED" && inv.allocations.every((a) => !a.counts) ? (
                        <Button variant="destructive-soft" size="sm" onClick={() => setDialog("cancel")}>
                          <Ban data-icon="inline-start" />
                          Cancel
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              }
            />
            {inv.status === "CANCELLED" ? (
              <InlineAlert tone="danger" title="Cancelled">
                {inv.cancelReason}
              </InlineAlert>
            ) : null}
            {inv.forceNote ? <InlineAlert tone="info" title="Billed before the stage was marked ready">{inv.forceNote}</InlineAlert> : null}
            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <SectionCard flush title="Lines">
                <DataTable
                  rows={inv.lines}
                  getRowId={(l) => l.id}
                  empty={{ title: "No lines", compact: true }}
                  columns={[
                    { id: "desc", header: "Description", cell: (l) => l.description },
                    { id: "qty", header: "Qty", align: "right", cell: (l) => (l.quantity !== null ? `${l.quantity} ${l.unit ?? ""}` : "") },
                    { id: "rate", header: "Rate", align: "right", cell: (l) => (l.ratePaisa ? <MoneyText paisa={l.ratePaisa} /> : "") },
                    { id: "amount", header: "Amount", align: "right", cell: (l) => <MoneyText paisa={l.amountPaisa} className={l.amountPaisa.startsWith("-") ? "text-danger" : undefined} /> },
                  ]}
                />
              </SectionCard>
              <SectionCard title="Totals">
                <dl className="grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="text-right"><MoneyText paisa={inv.subtotalPaisa} /></dd>
                  {inv.taxPaisa !== "0" ? (
                    <>
                      <dt className="text-muted-foreground">{inv.taxLabel} {inv.taxRatePercent}%</dt>
                      <dd className="text-right"><MoneyText paisa={inv.taxPaisa} /></dd>
                    </>
                  ) : null}
                  <dt className="font-semibold">Total</dt>
                  <dd className="text-right font-semibold"><MoneyText paisa={inv.totalPaisa} /></dd>
                  <dt className="text-muted-foreground">Received</dt>
                  <dd className="text-right"><MoneyText paisa={inv.paidPaisa} /></dd>
                  {inv.pendingPaisa !== "0" ? (
                    <>
                      <dt className="text-muted-foreground">Cheques pending</dt>
                      <dd className="text-right"><MoneyText paisa={inv.pendingPaisa} /></dd>
                    </>
                  ) : null}
                  <dt className="font-semibold">Balance</dt>
                  <dd className="text-right font-semibold" data-testid="invoice-balance"><MoneyText paisa={inv.balancePaisa} /></dd>
                </dl>
                {inv.notes ? <p className="mt-3 rounded-lg bg-muted p-2 text-sm">{inv.notes}</p> : null}
              </SectionCard>
            </div>
            <SectionCard flush title="Payments">
              <DataTable
                rows={inv.allocations}
                getRowId={(a) => a.id}
                empty={{ title: "No payments yet", compact: true }}
                columns={[
                  { id: "rv", header: "Receipt", cell: (a) => a.payment.number },
                  { id: "date", header: "Received", cell: (a) => formatDate(a.payment.receivedOn) },
                  { id: "method", header: "Method", cell: (a) => <PaymentMethodIcon method={a.payment.method} bankName={a.payment.chequeNo ? `#${a.payment.chequeNo}` : null} /> },
                  { id: "amount", header: "Amount", align: "right", cell: (a) => <MoneyText paisa={a.amountPaisa} className={a.counts ? undefined : "line-through text-muted-foreground"} /> },
                  { id: "status", header: "Status", cell: (a) => <ChequeStatusBadge status={a.payment.status} method={a.payment.method} /> },
                ]}
              />
            </SectionCard>
            {dialog === "issue" ? (
              <ConfirmDialog
                open
                onOpenChange={(o) => (!o ? setDialog(null) : undefined)}
                tone="default"
                title="Issue this invoice?"
                description={`It gets a number, is locked and the owner can be sent the PDF. Total ${formatPKR(inv.totalPaisa)}.`}
                confirmLabel="Issue invoice"
                loading={issuing}
                onConfirm={async () => {
                  const r = await run(() => issue({ id: inv.id }).unwrap(), { success: (x) => `${x.number} issued` });
                  if (r) setDialog(null);
                }}
              />
            ) : null}
            {dialog === "delete" ? (
              <ConfirmDialog
                open
                onOpenChange={(o) => (!o ? setDialog(null) : undefined)}
                title="Delete this draft?"
                confirmLabel="Delete draft"
                loading={deleting}
                onConfirm={async () => {
                  const r = await run(() => remove(inv.id).unwrap(), { success: "Draft deleted" });
                  if (r) router.push(projectHref(project.id, "/billing/invoices"));
                }}
              />
            ) : null}
            {dialog === "cancel" ? (
              <ReasonDialog
                title={`Cancel ${inv.number}?`}
                label="Reason (shown on the invoice)"
                confirmLabel="Cancel invoice"
                loading={cancelling}
                onClose={() => setDialog(null)}
                onConfirm={async (reason) => {
                  const r = await run(() => cancel({ id: inv.id, reason }).unwrap(), { success: "Invoice cancelled" });
                  if (r) setDialog(null);
                }}
              />
            ) : null}
            {dialog === "notes" ? (
              <ConfirmDialog
                open
                tone="default"
                onOpenChange={(o) => (!o ? setDialog(null) : undefined)}
                title="Edit draft"
                confirmLabel="Save"
                loading={saving}
                onConfirm={async () => {
                  const r = await run(() => update({ id: inv.id, body: { notes: notes || null } }).unwrap(), { success: "Draft saved" });
                  if (r) setDialog(null);
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="inv-notes">Notes on the invoice</Label>
                  <Textarea id="inv-notes" rows={3} value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </ConfirmDialog>
            ) : null}
          </>
        )
      }
    </ProjectPageShell>
  );
}

// ─── Payments received ──────────────────────────────────────────────────────

export function PaymentsView({ projectId }: { projectId: string }) {
  const owner = useCan(OWNER);
  const list = useGetClientPaymentsQuery({ projectId, limit: 100 });
  const [setStatus, { isLoading }] = useSetClientChequeStatusMutation();
  const [receipt] = useGetReceiptPdfMutation();
  const run = useMutationToast();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ payment: ClientPayment; to: "CLEARED" | "BOUNCED" } | null>(null);
  const columns: Column<ClientPayment>[] = [
    { id: "number", header: "Receipt", cell: (p) => <span className="font-medium tabular">{p.number}</span> },
    { id: "date", header: "Received", sortValue: (p) => p.receivedOn, cell: (p) => formatDate(p.receivedOn) },
    { id: "method", header: "Method", cell: (p) => <PaymentMethodIcon method={p.method} bankName={[p.bankName, p.chequeNo ? `#${p.chequeNo}` : null].filter(Boolean).join(" ") || null} /> },
    { id: "amount", header: "Amount", align: "right", cell: (p) => <MoneyText paisa={p.amountPaisa} className="font-semibold" /> },
    { id: "invoices", header: "Against", cell: (p) => p.allocations.map((a) => a.invoice.number).join(", ") || (p.creditPaisa !== "0" ? "Credit" : "—") },
    { id: "status", header: "Status", cell: (p) => <ChequeStatusBadge status={p.status} method={p.method} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (p) => (
        <div className="flex flex-wrap justify-end gap-1">
          {owner && p.status === "PENDING" ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setConfirm({ payment: p, to: "CLEARED" })}>
                <CheckCircle2 data-icon="inline-start" />
                Mark cleared
              </Button>
              <Button size="sm" variant="destructive-soft" onClick={() => setConfirm({ payment: p, to: "BOUNCED" })}>
                <XCircle data-icon="inline-start" />
                Bounced
              </Button>
            </>
          ) : null}
          <PdfActions load={() => receipt(p.id).unwrap()} title={p.number} />
        </div>
      ),
    },
  ];
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb="Payments Received"
      actions={() => (
        <Button onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" />
          Record payment
        </Button>
      )}
    >
      {(project) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label="Received" icon={CheckCircle2} tone="success" value={formatPKRShort(list.data?.meta.clearedPaisa ?? "0")} loading={list.isLoading} />
            <KpiCard label="Cheques pending" icon={CalendarClock} tone="warning" value={formatPKRShort(list.data?.meta.pendingPaisa ?? "0")} loading={list.isLoading} />
            <KpiCard label="Bounced" icon={TriangleAlert} tone="danger" value={formatPKRShort(list.data?.meta.bouncedPaisa ?? "0")} loading={list.isLoading} />
          </div>
          <SectionCard flush title="Payments">
            <DataTable rows={list.data?.items} getRowId={(p) => p.id} loading={list.isLoading} error={list.error} onRetry={list.refetch} columns={columns} empty={{ title: "No payments yet", icon: HandCoins }} />
          </SectionCard>
          {open ? <RecordPaymentSlideOver open onOpenChange={setOpen} projectId={project.id} /> : null}
          {confirm?.to === "CLEARED" ? (
            <ConfirmDialog
              open
              tone="default"
              onOpenChange={(o) => (!o ? setConfirm(null) : undefined)}
              title={`Cheque ${confirm.payment.chequeNo ?? ""} cleared?`}
              description={`${formatPKR(confirm.payment.amountPaisa)} moves from pending to received.`}
              confirmLabel="Mark cleared"
              loading={isLoading}
              onConfirm={async () => {
                const r = await run(() => setStatus({ id: confirm.payment.id, body: { status: "CLEARED", date: todayPK() } }).unwrap(), { success: "Cheque cleared" });
                if (r) setConfirm(null);
              }}
            />
          ) : null}
          {confirm?.to === "BOUNCED" ? (
            <ReasonDialog
              title={`Cheque ${confirm.payment.chequeNo ?? ""} bounced?`}
              label="Reason (e.g. insufficient funds)"
              confirmLabel="Mark bounced"
              loading={isLoading}
              onClose={() => setConfirm(null)}
              onConfirm={async (reason) => {
                const r = await run(() => setStatus({ id: confirm.payment.id, body: { status: "BOUNCED", reason } }).unwrap(), { success: "Marked bounced — the balance is due again" });
                if (r) setConfirm(null);
              }}
            />
          ) : null}
        </>
      )}
    </ProjectPageShell>
  );
}

// ─── Owner statement ────────────────────────────────────────────────────────

export function StatementPanel({ projectId, phone }: { projectId: string; phone?: string | null }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const range = { ...(from ? { from } : {}), ...(to ? { to } : {}) };
  const st = useGetOwnerStatementQuery({ projectId, ...range });
  const [pdf] = useGetOwnerStatementPdfMutation();
  return (
    <SectionCard
      flush
      title="Owner statement"
      description={st.data ? `${formatDate(st.data.from)} – ${formatDate(st.data.to)}` : undefined}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" aria-label="Statement from" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" aria-label="Statement to" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
          <PdfActions load={() => pdf({ projectId, ...range }).unwrap()} title="Owner statement" phone={phone ?? st.data?.client?.phone} />
        </div>
      }
    >
      <DataTable
        rows={st.data ? [{ id: "opening", date: st.data.from, kind: "OPENING", reference: "", description: "Opening balance", debitPaisa: "0", creditPaisa: "0", balancePaisa: st.data.openingPaisa, status: null }, ...st.data.rows] : undefined}
        getRowId={(r) => r.id}
        loading={st.isLoading}
        error={st.error}
        onRetry={st.refetch}
        empty={{ title: "Nothing in this period", compact: true }}
        columns={[
          { id: "date", header: "Date", cell: (r) => formatDate(r.date) },
          { id: "entry", header: "Entry", cell: (r) => (r.kind === "OPENING" ? <span className="font-medium">Opening balance</span> : <span>{r.kind === "INVOICE" ? "Invoice" : "Payment"} {r.status ? <StatusBadge domain="cheque" value={r.status} /> : null}</span>) },
          { id: "ref", header: "Ref", cell: (r) => r.reference },
          { id: "desc", header: "Detail", cell: (r) => <span className="text-sm text-muted-foreground">{r.kind === "OPENING" ? "" : r.description}</span> },
          { id: "debit", header: "Billed", align: "right", cell: (r) => (r.debitPaisa !== "0" ? <MoneyText paisa={r.debitPaisa} /> : "") },
          { id: "credit", header: "Received", align: "right", cell: (r) => (r.creditPaisa !== "0" ? <MoneyText paisa={r.creditPaisa} /> : "") },
          { id: "balance", header: "Balance", align: "right", cell: (r) => <MoneyText paisa={r.balancePaisa} className="font-medium" /> },
        ]}
      />
      {st.data ? (
        <div className="grid gap-2 border-t p-4 text-sm sm:grid-cols-3">
          <p>
            Balance due <MoneyText paisa={st.data.closingPaisa} className="font-semibold" />
          </p>
          <p>Credit held <MoneyText paisa={st.data.creditPaisa} /></p>
          <p>
            Owner purchases not billed: <MoneyText paisa={st.data.unbilledRecoverables.reduce((s, r) => s + Number(r.amountPaisa), 0).toString()} />
          </p>
        </div>
      ) : null}
    </SectionCard>
  );
}

export function StatementView({ projectId }: { projectId: string }) {
  return <ProjectPageShell projectId={projectId} crumb="Owner Statement">{(project) => <StatementPanel projectId={project.id} phone={project.client?.phone} />}</ProjectPageShell>;
}

// ─── Finance → Receivables ──────────────────────────────────────────────────

export function ReceivablesView() {
  const router = useRouter();
  const [overdueOnly, setOverdueOnly] = useState(false);
  const q = useGetReceivablesQuery(overdueOnly ? { overdueOnly: "true" } : undefined);
  const t = q.data?.totals;
  return (
    <div className="space-y-6">
      <PageHeader title="Receivables" description="What owners owe across projects." breadcrumbs={[{ label: "Finance" }, { label: "Receivables" }]} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Invoiced" icon={FileText} value={formatPKRShort(t?.invoicedPaisa ?? "0")} loading={q.isLoading} />
        <KpiCard label="Received" icon={CheckCircle2} tone="success" value={formatPKRShort(t?.receivedPaisa ?? "0")} loading={q.isLoading} />
        <KpiCard label="Outstanding" icon={HandCoins} value={formatPKRShort(t?.outstandingPaisa ?? "0")} hint={t && t.pendingChequesPaisa !== "0" ? `${formatPKRShort(t.pendingChequesPaisa)} in pending cheques` : undefined} loading={q.isLoading} />
        <KpiCard label="Overdue" icon={TriangleAlert} tone="danger" value={formatPKRShort(t?.overduePaisa ?? "0")} hint={t ? `${t.overdueProjects} project${t.overdueProjects === 1 ? "" : "s"}` : undefined} loading={q.isLoading} />
      </div>
      <SectionCard
        flush
        title="By project"
        actions={
          <label className="inline-flex items-center gap-2 text-sm">
            <Switch checked={overdueOnly} onCheckedChange={setOverdueOnly} aria-label="Overdue only" />
            Overdue only
          </label>
        }
      >
        <DataTable
          rows={q.data?.items}
          getRowId={(r) => r.project.id}
          loading={q.isLoading}
          error={q.error}
          onRetry={q.refetch}
          onRowClick={(r) => router.push(projectHref(r.project.id, "/billing/invoices"))}
          empty={{ title: overdueOnly ? "Nothing overdue" : "No receivables yet", icon: HandCoins }}
          columns={[
            {
              id: "project",
              header: "Project",
              sortValue: (r) => r.project.name,
              cell: (r) => (
                <div>
                  <p className="font-medium">{r.project.name}</p>
                  <p className="text-xs text-muted-foreground">{[r.project.code, r.client?.name].filter(Boolean).join(" · ")}</p>
                </div>
              ),
            },
            { id: "contract", header: "Contract", align: "right", cell: (r) => <MoneyText paisa={r.revisedContractPaisa} short /> },
            { id: "invoiced", header: "Invoiced", align: "right", cell: (r) => <MoneyText paisa={r.invoicedPaisa} short /> },
            { id: "received", header: "Received", align: "right", cell: (r) => <MoneyText paisa={r.receivedPaisa} short /> },
            { id: "pending", header: "Pending cheques", align: "right", cell: (r) => (r.pendingChequesPaisa === "0" ? "—" : <MoneyText paisa={r.pendingChequesPaisa} short />) },
            { id: "outstanding", header: "Outstanding", align: "right", sortValue: (r) => Number(r.outstandingPaisa), cell: (r) => <MoneyText paisa={r.outstandingPaisa} className="font-semibold" /> },
            {
              id: "overdue",
              header: "Overdue",
              align: "right",
              sortValue: (r) => Number(r.overduePaisa),
              cell: (r) => (r.overduePaisa === "0" ? "—" : <span className="text-danger"><MoneyText paisa={r.overduePaisa} /> · {r.oldestOverdueDays} d</span>),
            },
            { id: "next", header: "Next to bill", cell: (r) => (r.nextBillableStage ? <span className="text-sm">{r.nextBillableStage.label}{r.nextBillableStage.status === "READY" ? <StatusBadge domain="billingStage" value="READY" className="ml-2" /> : null}</span> : "—") },
          ]}
        />
      </SectionCard>
    </div>
  );
}
