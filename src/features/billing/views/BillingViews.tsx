"use client";

import { Ban, CalendarClock, CheckCircle2, Download, Eye, FileBadge, FilePlus2, FileText, Flag, HandCoins, Landmark, MessageCircle, Pencil, Plus, Send, Trash2, TriangleAlert, XCircle } from "lucide-react";
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
  useIssueInvoiceMutation,
  useSetClientChequeStatusMutation,
  useUpdateInvoiceMutation,
  useUpdateStageMutation,
} from "@/api/services/billing.api";
import { useGetFinanceReceivablesQuery } from "@/api/services/finance.api";
import type { ClientPayment, Invoice, InvoiceStatus, InvoiceType, ScheduleStage, SharedPdf, UnpaidStageWarning } from "@/api/types";
import { AgeingBar } from "@/components/common/AgeingBar";
import { ChequeStatusBadge, InvoiceStatusBadge, PaymentMethodIcon } from "@/components/common/BillingBadges";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DocumentHeader } from "@/components/common/DocumentHeader";
import { ExportMenu } from "@/components/common/ExportMenu";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { PdfActions, usePdfActions } from "@/components/common/PdfActions";
import { useApprovalLimitHint, useCan, usePermissions } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
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
import { useEnumT, useStatusT, useT } from "@/i18n/useT";
import { formatDate, todayPK } from "@/lib/dates";
import { formatPKR, formatPKRShort } from "@/lib/money";
import { projectHref } from "@/lib/navigation";
import { MarkReadySlideOver, NewInvoiceSlideOver, ProgressSlideOver, RecordPaymentSlideOver } from "../components/BillingSlideOvers";
import { ProjectTaxCard } from "@/features/tax/components/ProjectTax";
import { WhtCertificateSlideOver } from "@/features/tax/components/WhtCertificate";

/** Invoice types in filter order (labels: `te("invoiceType", v)`). */
const INVOICE_TYPES: InvoiceType[] = ["STAGE", "RUNNING_BILL", "RECOVERABLE", "RETENTION", "OTHER"];
const INVOICE_STATUSES: InvoiceStatus[] = ["DRAFT", "ISSUED", "PARTLY_PAID", "PAID", "CANCELLED"];

function UnpaidBanner({ warning, projectId }: { warning: UnpaidStageWarning; projectId: string }) {
  const t = useT();
  return (
    <InlineAlert tone="warning" title={t("billing.schedule.unpaidTitle")}>
      {warning.details.stages.map((s) => {
        // The invoice number is a link inside the sentence: split the text around {invoice}.
        const [before, after = ""] = t("billing.schedule.unpaidLine", { stage: s.label, amount: formatPKR(s.balancePaisa), n: s.overdueDays }).split("{invoice}");
        return (
          <span key={s.invoiceId} className="block">
            {before}
            <Link className="underline" href={projectHref(projectId, `/billing/invoices/${s.invoiceId}`)}>
              <bdi>{s.invoiceNumber}</bdi>
            </Link>
            {after}
          </span>
        );
      })}
    </InlineAlert>
  );
}

// ─── Payment schedule ───────────────────────────────────────────────────────

function ExpectedDateDialog({ stage, onClose }: { stage: ScheduleStage; onClose: () => void }) {
  const t = useT();
  const [date, setDate] = useState(stage.expectedDate ?? "");
  const [update, { isLoading }] = useUpdateStageMutation();
  const run = useMutationToast();
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      tone="default"
      title={t("billing.schedule.expectedDateTitle", { stage: stage.label })}
      confirmLabel={t("common.save")}
      loading={isLoading}
      onConfirm={async () => {
        const ok = await run(() => update({ id: stage.id, body: { expectedDate: date || null } }).unwrap(), { success: t("billing.schedule.expectedDateSaved") });
        if (ok) onClose();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="expected-date">{t("billing.schedule.expectedAround")}</Label>
        <Input id="expected-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
    </ConfirmDialog>
  );
}

export function ScheduleView({ projectId }: { projectId: string }) {
  const t = useT();
  const ts = useStatusT();
  const canSetDate = useCan("billing.stage.manage");
  const canPrepare = useCan("billing.invoice.create");
  const stages = useGetBillingStagesQuery(projectId);
  const [warning, setWarning] = useState<UnpaidStageWarning | null>(null);
  const [ready, setReady] = useState<ScheduleStage | null>(null);
  const [invoiceFor, setInvoiceFor] = useState<string | null | undefined>(undefined);
  const [dateFor, setDateFor] = useState<ScheduleStage | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const columns: Column<ScheduleStage>[] = [
    { id: "label", header: t("field.stage"), cell: (s) => <span className="font-medium">{s.label}</span> },
    { id: "percent", header: "%", align: "right", cell: (s) => `${s.percent}%` },
    { id: "amount", header: t("field.amount"), align: "right", cell: (s) => <MoneyText paisa={s.amountPaisa} /> },
    { id: "expected", header: t("field.expected"), cell: (s) => (s.expectedDate ? formatDate(s.expectedDate) : "—") },
    { id: "status", header: t("field.status"), cell: (s) => <StatusBadge domain="billingStage" value={s.status} /> },
    {
      id: "invoice",
      header: t("field.invoice"),
      cell: (s) =>
        s.invoice ? (
          <Link className="text-primary underline-offset-4 hover:underline" href={projectHref(projectId, `/billing/invoices/${s.invoice.id}`)}>
            {s.invoice.number ?? ts("invoice", "DRAFT")}
          </Link>
        ) : (
          "—"
        ),
    },
    {
      ...ACTIONS_COLUMN,
      cell: (s) => (
        <RowActions
          name={s.label}
          actions={[
            { label: t("billing.schedule.markReady"), icon: Flag, hidden: !(canPrepare && s.status === "UPCOMING" && !s.isRetention), onSelect: () => setReady(s) },
            { label: t("billing.schedule.createInvoice"), icon: FilePlus2, hidden: !(canPrepare && s.status === "READY" && !s.invoice), onSelect: () => setInvoiceFor(s.id) },
            { label: t("billing.schedule.expectedDate"), icon: CalendarClock, hidden: !(canSetDate && !s.invoice), onSelect: () => setDateFor(s) },
          ]}
        />
      ),
    },
  ];
  return (
    <ProjectPageShell projectId={projectId} crumb={t("billing.schedule.crumb")}>
      {(project) => {
        const running = project.contract?.billingModel === "RUNNING_BILLS";
        const schedule = (
          <>
            {warning ? <UnpaidBanner warning={warning} projectId={project.id} /> : null}
            <SectionCard title={t("billing.schedule.title")}>
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
            <SectionCard flush title={t("billing.schedule.stages")}>
              <DataTable rows={stages.data} getRowId={(s) => s.id} loading={stages.isLoading} error={stages.error} onRetry={stages.refetch} columns={columns} empty={{ title: t("billing.schedule.noStages"), compact: true }} />
            </SectionCard>
          </>
        );
        return (
          <>
            {running ? (
              <Tabs defaultValue="progress">
                <TabsList>
                  <TabsTrigger value="progress">{t("field.progress")}</TabsTrigger>
                  <TabsTrigger value="schedule">{t("billing.schedule.title")}</TabsTrigger>
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
  const t = useT();
  const progress = useGetBillingProgressQuery({ projectId });
  const [remove] = useDeleteBillingProgressMutation();
  const run = useMutationToast();
  const canPrepare = useCan("billing.invoice.create");
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label={t("billing.schedule.ratePerSqft")} icon={Landmark} value={<MoneyText paisa={progress.data?.ratePerSqftPaisa ?? null} />} loading={progress.isLoading} />
        <KpiCard label={t("billing.schedule.notBilledYet")} icon={HandCoins} value={t("billing.schedule.sqftValue", { n: progress.data?.unbilledQuantity ?? 0 })} hint={progress.data ? formatPKR(progress.data.unbilledValuePaisa) : undefined} loading={progress.isLoading} />
        <div className={canPrepare ? "flex flex-col justify-center gap-2 rounded-xl border bg-card p-5" : "hidden"}>
          <Button onClick={onAdd}>
            <Plus data-icon="inline-start" />
            {t("billing.schedule.addProgress")}
          </Button>
          <Button variant="outline" onClick={onBill}>
            <FilePlus2 data-icon="inline-start" />
            {t("billing.schedule.billPeriod")}
          </Button>
        </div>
      </div>
      <SectionCard flush title={t("field.progress")}>
        <DataTable
          rows={progress.data?.items}
          getRowId={(p) => p.id}
          loading={progress.isLoading}
          error={progress.error}
          onRetry={progress.refetch}
          empty={{ title: t("billing.schedule.noProgress"), compact: true }}
          columns={[
            { id: "date", header: t("field.date"), cell: (p) => formatDate(p.date) },
            { id: "desc", header: t("billing.schedule.colWork"), cell: (p) => p.description },
            { id: "qty", header: t("billing.schedule.colSqft"), align: "right", cell: (p) => p.quantity },
            { id: "value", header: t("field.value"), align: "right", cell: (p) => <MoneyText paisa={p.valuePaisa} /> },
            { id: "status", header: t("field.status"), cell: (p) => (p.billed ? <StatusBadge tone="success" label={t("billing.schedule.progressBilled")} /> : p.draftInvoiceId ? <StatusBadge tone="info" label={t("billing.schedule.progressOnDraft")} /> : <StatusBadge tone="warning" label={t("billing.schedule.progressNotBilled")} />) },
            {
              ...ACTIONS_COLUMN,
              cell: (p) => (
                <RowActions
                  actions={[
                    {
                      label: t("billing.schedule.deleteProgress"),
                      icon: Trash2,
                      destructive: true,
                      hidden: !canPrepare || p.billed || Boolean(p.draftInvoiceId),
                      onSelect: () => void run(() => remove(p.id).unwrap(), { success: t("action.deleted") }),
                    },
                  ]}
                />
              ),
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
  const t = useT();
  const te = useEnumT();
  const ts = useStatusT();
  const canPrepare = useCan("billing.invoice.create");
  const [status, setStatus] = useState<InvoiceStatus | "ALL">("ALL");
  const [type, setType] = useState<InvoiceType | "ALL">("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const list = useGetInvoicesQuery({ projectId, limit: 100, ...(status !== "ALL" ? { status } : {}), ...(type !== "ALL" ? { type } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) });
  const [open, setOpen] = useState(false);
  const columns: Column<Invoice>[] = [
    { id: "number", header: t("field.invoice"), cell: (i) => <span className="font-medium tabular">{i.number ?? ts("invoice", "DRAFT")}</span> },
    { id: "type", header: t("field.type"), cell: (i) => (i.billingStage ? i.billingStage.label : te("invoiceType", i.type)) },
    { id: "issued", header: t("billing.invoices.colIssued"), sortValue: (i) => i.issueDate ?? "", cell: (i) => formatDate(i.issueDate) },
    { id: "due", header: t("billing.invoices.colDue"), cell: (i) => formatDate(i.dueDate) },
    { id: "total", header: t("field.total"), align: "right", cell: (i) => <MoneyText paisa={i.totalPaisa} /> },
    { id: "balance", header: t("field.balance"), align: "right", cell: (i) => (i.status === "CANCELLED" || i.status === "DRAFT" ? "—" : <MoneyText paisa={i.balancePaisa} className={i.overdue ? "font-semibold text-danger" : "font-semibold"} />) },
    { id: "status", header: t("field.status"), cell: (i) => <InvoiceStatusBadge status={i.status} overdueDays={i.overdueDays} /> },
  ];
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("billing.invoices.crumb")}
      actions={(p) =>
        p.status !== "DRAFT" && canPrepare ? (
          <Button onClick={() => setOpen(true)}>
            <FilePlus2 data-icon="inline-start" />
            {t("billing.invoices.newInvoice")}
          </Button>
        ) : null
      }
    >
      {(project) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label={t("field.invoiced")} icon={FileText} value={formatPKRShort(list.data?.meta.invoicedPaisa ?? "0")} loading={list.isLoading} />
            <KpiCard label={t("field.received")} icon={CheckCircle2} tone="success" value={formatPKRShort(list.data?.meta.paidPaisa ?? "0")} loading={list.isLoading} />
            <KpiCard label={t("field.balance")} icon={HandCoins} tone="warning" value={formatPKRShort(list.data?.meta.balancePaisa ?? "0")} loading={list.isLoading} />
          </div>
          <ProjectTaxCard projectId={project.id} />
          <SectionCard
            flush
            title={t("billing.invoices.title")}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger className="w-36" aria-label={t("field.status")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("billing.invoices.allStatuses")}</SelectItem>
                    {INVOICE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {ts("invoice", s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger className="w-36" aria-label={t("field.type")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("billing.invoices.allTypes")}</SelectItem>
                    {INVOICE_TYPES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {te("invoiceType", v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="date" aria-label={t("field.from")} className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
                <Input type="date" aria-label={t("field.to")} className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
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
              empty={{ title: t("billing.invoices.noInvoices"), icon: FileText }}
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
  const { can } = usePermissions();
  const limitHint = useApprovalLimitHint();
  const t = useT();
  const te = useEnumT();
  const ts = useStatusT();
  const canPrepare = can("billing.invoice.create");
  const canIssue = can("billing.invoice.approve");
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
    <ProjectPageShell projectId={projectId} crumb={t("billing.invoices.crumbOne")} title={inv ? (inv.number ?? t("billing.invoices.draftInvoice")) : undefined}>
      {(project) =>
        !inv ? (
          <CardsSkeleton count={2} height="h-40" />
        ) : (
          <>
            <DocumentHeader
              number={inv.number ?? ts("invoice", "DRAFT")}
              title={t("billing.invoices.invoice")}
              status={<InvoiceStatusBadge status={inv.status} overdueDays={inv.overdueDays} />}
              meta={[
                { label: t("field.type"), value: inv.billingStage ? t("billing.invoices.stageType", { stage: inv.billingStage.label }) : te("invoiceType", inv.type) },
                { label: t("billing.invoices.owner"), value: inv.client?.name ?? "—" },
                { label: t("billing.invoices.colIssued"), value: formatDate(inv.issueDate) },
                { label: t("billing.invoices.colDue"), value: formatDate(inv.dueDate) },
              ]}
              actions={
                <div className="flex flex-wrap gap-2">
                  {inv.status === "DRAFT" && canPrepare ? (
                    <>
                      <Button variant="outline" onClick={() => { setNotes(inv.notes ?? ""); setDialog("notes"); }}>
                        <Pencil data-icon="inline-start" />
                        {t("common.edit")}
                      </Button>
                      <Button variant="outline" onClick={() => setDialog("delete")}>
                        <Trash2 data-icon="inline-start" />
                        {t("action.deleteDraft")}
                      </Button>
                      {canIssue ? (
                        <Button
                          onClick={() => setDialog("issue")}
                          disabled={Boolean(limitHint("billing.invoice.approve", inv.totalPaisa))}
                          title={limitHint("billing.invoice.approve", inv.totalPaisa)}
                        >
                          <Send data-icon="inline-start" />
                          {t("billing.invoices.issue")}
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  {inv.status !== "DRAFT" && inv.status !== "CANCELLED" ? (
                    <>
                      <PdfActions load={() => pdf(inv.id).unwrap()} title={inv.number ?? t("billing.invoices.invoice")} phone={inv.client?.phone} />
                      {canIssue && inv.status === "ISSUED" && inv.allocations.every((a) => !a.counts) ? (
                        <Button variant="destructive-soft" size="sm" onClick={() => setDialog("cancel")}>
                          <Ban data-icon="inline-start" />
                          {t("billing.invoices.cancel")}
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              }
            />
            {inv.status === "CANCELLED" ? (
              <InlineAlert tone="danger" title={ts("invoice", "CANCELLED")}>
                {inv.cancelReason}
              </InlineAlert>
            ) : null}
            {inv.forceNote ? <InlineAlert tone="info" title={t("billing.invoices.billedBeforeReady")}>{inv.forceNote}</InlineAlert> : null}
            <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <SectionCard flush title={t("billing.invoices.lines")}>
                <DataTable
                  rows={inv.lines}
                  getRowId={(l) => l.id}
                  empty={{ title: t("billing.invoices.noLines"), compact: true }}
                  columns={[
                    { id: "desc", header: t("field.description"), cell: (l) => l.description },
                    { id: "qty", header: t("billing.invoices.colQty"), align: "right", cell: (l) => (l.quantity !== null ? `${l.quantity} ${l.unit ?? ""}` : "") },
                    { id: "rate", header: t("field.rate"), align: "right", cell: (l) => (l.ratePaisa ? <MoneyText paisa={l.ratePaisa} /> : "") },
                    { id: "amount", header: t("field.amount"), align: "right", cell: (l) => <MoneyText paisa={l.amountPaisa} className={l.amountPaisa.startsWith("-") ? "text-danger" : undefined} /> },
                  ]}
                />
              </SectionCard>
              <SectionCard title={t("billing.invoices.totals")}>
                <dl className="grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">{t("billing.invoices.subtotal")}</dt>
                  <dd className="text-end"><MoneyText paisa={inv.subtotalPaisa} /></dd>
                  {inv.taxPaisa !== "0" && inv.taxableBasePaisa !== inv.subtotalPaisa ? (
                    <>
                      <dt className="text-muted-foreground">{t("tax.invoice.taxableValue")}</dt>
                      <dd className="text-end" data-testid="invoice-taxable"><MoneyText paisa={inv.taxableBasePaisa} /></dd>
                    </>
                  ) : null}
                  {inv.taxPaisa !== "0" ? (
                    <>
                      <dt className="text-muted-foreground" data-testid="invoice-tax-label">{inv.taxLabel} {inv.taxRatePercent}%</dt>
                      <dd className="text-end"><MoneyText paisa={inv.taxPaisa} /></dd>
                    </>
                  ) : null}
                  <dt className="font-semibold">{t("field.total")}</dt>
                  <dd className="text-end font-semibold"><MoneyText paisa={inv.totalPaisa} /></dd>
                  <dt className="text-muted-foreground">{t("field.received")}</dt>
                  <dd className="text-end"><MoneyText paisa={inv.paidPaisa} /></dd>
                  {inv.pendingPaisa !== "0" ? (
                    <>
                      <dt className="text-muted-foreground">{t("billing.invoices.chequesPending")}</dt>
                      <dd className="text-end"><MoneyText paisa={inv.pendingPaisa} /></dd>
                    </>
                  ) : null}
                  <dt className="font-semibold">{t("field.balance")}</dt>
                  <dd className="text-end font-semibold" data-testid="invoice-balance"><MoneyText paisa={inv.balancePaisa} /></dd>
                </dl>
                {inv.taxPaisa !== "0" ? (
                  <div className="mt-3 space-y-0.5 text-xs text-muted-foreground" data-testid="invoice-tax-info">
                    <p>{inv.status === "DRAFT" ? t("tax.invoice.draftNote") : t("tax.invoice.frozenNote", { date: formatDate(inv.issueDate) })}</p>
                    {inv.sellerNtn ? <p>{t("tax.invoice.sellerNtn", { ntn: inv.sellerNtn })}</p> : null}
                    {inv.sellerStrn ? <p>{t("tax.invoice.sellerStrn", { strn: inv.sellerStrn })}</p> : null}
                    {inv.buyerNtn ? <p>{t("tax.invoice.buyerNtn", { ntn: inv.buyerNtn })}</p> : null}
                  </div>
                ) : null}
                {inv.notes ? <p className="mt-3 rounded-lg bg-muted p-2 text-sm">{inv.notes}</p> : null}
              </SectionCard>
            </div>
            <SectionCard flush title={t("field.payments")}>
              <DataTable
                rows={inv.allocations}
                getRowId={(a) => a.id}
                empty={{ title: t("billing.invoices.noPayments"), compact: true }}
                columns={[
                  { id: "rv", header: t("billing.invoices.colReceipt"), cell: (a) => a.payment.number },
                  { id: "date", header: t("field.received"), cell: (a) => formatDate(a.payment.receivedOn) },
                  { id: "method", header: t("field.method"), cell: (a) => <PaymentMethodIcon method={a.payment.method} bankName={a.payment.chequeNo ? `#${a.payment.chequeNo}` : null} /> },
                  { id: "amount", header: t("field.amount"), align: "right", cell: (a) => <MoneyText paisa={a.amountPaisa} className={a.counts ? undefined : "line-through text-muted-foreground"} /> },
                  { id: "status", header: t("field.status"), cell: (a) => <ChequeStatusBadge status={a.payment.status} method={a.payment.method} /> },
                ]}
              />
            </SectionCard>
            {dialog === "issue" ? (
              <ConfirmDialog
                open
                onOpenChange={(o) => (!o ? setDialog(null) : undefined)}
                tone="default"
                title={t("billing.invoices.issueTitle")}
                description={t("billing.invoices.issueBody", { amount: formatPKR(inv.totalPaisa) })}
                confirmLabel={t("billing.invoices.issueConfirm")}
                loading={issuing}
                onConfirm={async () => {
                  const r = await run(() => issue({ id: inv.id }).unwrap(), { success: (x) => t("billing.invoices.issued", { number: x.number ?? "" }) });
                  if (r) setDialog(null);
                }}
              />
            ) : null}
            {dialog === "delete" ? (
              <ConfirmDialog
                open
                onOpenChange={(o) => (!o ? setDialog(null) : undefined)}
                title={t("billing.invoices.deleteTitle")}
                confirmLabel={t("action.deleteDraft")}
                loading={deleting}
                onConfirm={async () => {
                  const r = await run(() => remove(inv.id).unwrap(), { success: t("billing.invoices.draftDeleted") });
                  if (r) router.push(projectHref(project.id, "/billing/invoices"));
                }}
              />
            ) : null}
            {dialog === "cancel" ? (
              <ReasonDialog
                title={t("billing.invoices.cancelTitle", { number: inv.number ?? "" })}
                label={t("billing.invoices.cancelReason")}
                confirmLabel={t("billing.invoices.cancelConfirm")}
                loading={cancelling}
                onClose={() => setDialog(null)}
                onConfirm={async (reason) => {
                  const r = await run(() => cancel({ id: inv.id, reason }).unwrap(), { success: t("billing.invoices.cancelled") });
                  if (r) setDialog(null);
                }}
              />
            ) : null}
            {dialog === "notes" ? (
              <ConfirmDialog
                open
                tone="default"
                onOpenChange={(o) => (!o ? setDialog(null) : undefined)}
                title={t("billing.invoices.editDraft")}
                confirmLabel={t("common.save")}
                loading={saving}
                onConfirm={async () => {
                  const r = await run(() => update({ id: inv.id, body: { notes: notes || null } }).unwrap(), { success: t("billing.invoices.draftSaved") });
                  if (r) setDialog(null);
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="inv-notes">{t("billing.invoices.notesOnInvoice")}</Label>
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

/** Row menu of a received payment: cheque clearing (owner, pending) + receipt Preview / Download / WhatsApp. */
function PaymentRowActions({
  payment,
  canSettle,
  onSettle,
  load,
  onCertificate,
}: {
  payment: ClientPayment;
  canSettle: boolean;
  onSettle: (to: "CLEARED" | "BOUNCED") => void;
  load: () => Promise<SharedPdf>;
  /** Step 18: add / change the client's WHT certificate (payments with WHT). */
  onCertificate?: () => void;
}) {
  const t = useT();
  const pdf = usePdfActions({ load, title: payment.number });
  return (
    <>
      <RowActions
        name={payment.number}
        actions={[
          { label: t("billing.payments.markCleared"), icon: CheckCircle2, hidden: !canSettle, onSelect: () => onSettle("CLEARED") },
          { label: t("billing.payments.bounced"), icon: XCircle, destructive: true, hidden: !canSettle, onSelect: () => onSettle("BOUNCED") },
          { label: t("tax.payment.addCertificate"), icon: FileBadge, hidden: !onCertificate, onSelect: () => onCertificate?.() },
          { label: t("billing.payments.preview"), icon: Eye, separatorBefore: true, disabled: pdf.busy !== null, onSelect: () => void pdf.act("preview") },
          { label: t("action.download"), icon: Download, disabled: pdf.busy !== null, onSelect: () => void pdf.act("download") },
          { label: t("billing.payments.whatsapp"), icon: MessageCircle, disabled: pdf.busy !== null, onSelect: () => void pdf.act("share") },
        ]}
      />
      {pdf.preview}
    </>
  );
}

export function PaymentsView({ projectId }: { projectId: string }) {
  const { can } = usePermissions();
  const t = useT();
  const owner = can("billing.payment.manage");
  const canRecord = can("billing.payment.create");
  const list = useGetClientPaymentsQuery({ projectId, limit: 100 });
  const [setStatus, { isLoading }] = useSetClientChequeStatusMutation();
  const [receipt] = useGetReceiptPdfMutation();
  const run = useMutationToast();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ payment: ClientPayment; to: "CLEARED" | "BOUNCED" } | null>(null);
  const [certificate, setCertificate] = useState<ClientPayment | null>(null);
  const anyWht = (list.data?.items ?? []).some((p) => p.whtDeductedPaisa !== "0");
  const columns: Column<ClientPayment>[] = [
    { id: "number", header: t("billing.invoices.colReceipt"), cell: (p) => <span className="font-medium tabular">{p.number}</span> },
    { id: "date", header: t("field.received"), sortValue: (p) => p.receivedOn, cell: (p) => formatDate(p.receivedOn) },
    { id: "method", header: t("field.method"), cell: (p) => <PaymentMethodIcon method={p.method} bankName={[p.bankName, p.chequeNo ? `#${p.chequeNo}` : null].filter(Boolean).join(" ") || null} /> },
    { id: "amount", header: t("field.amount"), align: "right", cell: (p) => <MoneyText paisa={p.amountPaisa} className="font-semibold" /> },
    ...(anyWht
      ? [
          {
            id: "wht",
            header: t("tax.payment.colWht"),
            align: "right" as const,
            cell: (p: ClientPayment) =>
              p.whtDeductedPaisa === "0" ? (
                "—"
              ) : (
                <div className="flex flex-col items-end">
                  <MoneyText paisa={p.whtDeductedPaisa} />
                  <span className={p.whtCertificate?.number ? "text-xs text-muted-foreground" : "text-xs text-warning"}>
                    {p.whtCertificate?.number ? t("tax.payment.received", { number: p.whtCertificate.number }) : t("tax.payment.missing")}
                  </span>
                </div>
              ),
          },
        ]
      : []),
    { id: "invoices", header: t("billing.payments.colAgainst"), cell: (p) => p.allocations.map((a) => a.invoice.number).join(", ") || (p.creditPaisa !== "0" ? t("billing.payments.credit") : "—") },
    { id: "status", header: t("field.status"), cell: (p) => <ChequeStatusBadge status={p.status} method={p.method} /> },
    {
      ...ACTIONS_COLUMN,
      cell: (p) => (
        <PaymentRowActions
          payment={p}
          canSettle={owner && p.status === "PENDING"}
          onSettle={(to) => setConfirm({ payment: p, to })}
          load={() => receipt(p.id).unwrap()}
          onCertificate={canRecord && p.whtDeductedPaisa !== "0" && p.status !== "BOUNCED" ? () => setCertificate(p) : undefined}
        />
      ),
    },
  ];
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("billing.payments.crumb")}
      actions={() =>
        canRecord ? (
          <Button onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />
            {t("action.recordPayment")}
          </Button>
        ) : null
      }
    >
      {(project) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label={t("field.received")} icon={CheckCircle2} tone="success" value={formatPKRShort(list.data?.meta.clearedPaisa ?? "0")} loading={list.isLoading} />
            <KpiCard label={t("billing.invoices.chequesPending")} icon={CalendarClock} tone="warning" value={formatPKRShort(list.data?.meta.pendingPaisa ?? "0")} loading={list.isLoading} />
            <KpiCard label={t("billing.payments.bounced")} icon={TriangleAlert} tone="danger" value={formatPKRShort(list.data?.meta.bouncedPaisa ?? "0")} loading={list.isLoading} />
          </div>
          <SectionCard flush title={t("field.payments")}>
            <DataTable rows={list.data?.items} getRowId={(p) => p.id} loading={list.isLoading} error={list.error} onRetry={list.refetch} columns={columns} empty={{ title: t("billing.invoices.noPayments"), icon: HandCoins }} />
          </SectionCard>
          {open ? <RecordPaymentSlideOver open onOpenChange={setOpen} projectId={project.id} /> : null}
          {certificate ? <WhtCertificateSlideOver payment={certificate} onClose={() => setCertificate(null)} /> : null}
          {confirm?.to === "CLEARED" ? (
            <ConfirmDialog
              open
              tone="default"
              onOpenChange={(o) => (!o ? setConfirm(null) : undefined)}
              title={t("billing.payments.chequeClearedTitle", { no: confirm.payment.chequeNo ?? "" })}
              description={t("billing.payments.chequeClearedBody", { amount: formatPKR(confirm.payment.amountPaisa) })}
              confirmLabel={t("billing.payments.markCleared")}
              loading={isLoading}
              onConfirm={async () => {
                const r = await run(() => setStatus({ id: confirm.payment.id, body: { status: "CLEARED", date: todayPK() } }).unwrap(), { success: t("billing.payments.chequeCleared") });
                if (r) setConfirm(null);
              }}
            />
          ) : null}
          {confirm?.to === "BOUNCED" ? (
            <ReasonDialog
              title={t("billing.payments.chequeBouncedTitle", { no: confirm.payment.chequeNo ?? "" })}
              label={t("billing.payments.bounceReason")}
              confirmLabel={t("billing.payments.markBounced")}
              loading={isLoading}
              onClose={() => setConfirm(null)}
              onConfirm={async (reason) => {
                const r = await run(() => setStatus({ id: confirm.payment.id, body: { status: "BOUNCED", reason } }).unwrap(), { success: t("billing.payments.markedBounced") });
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
  const t = useT();
  return (
    <SectionCard
      flush
      title={t("billing.statement.title")}
      description={st.data ? `${formatDate(st.data.from)} – ${formatDate(st.data.to)}` : undefined}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" aria-label={t("billing.statement.from")} className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" aria-label={t("billing.statement.to")} className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
          <PdfActions load={() => pdf({ projectId, ...range }).unwrap()} title={t("billing.statement.title")} phone={phone ?? st.data?.client?.phone} />
        </div>
      }
    >
      <DataTable
        rows={st.data ? [{ id: "opening", date: st.data.from, kind: "OPENING", reference: "", description: t("billing.statement.openingBalance"), debitPaisa: "0", creditPaisa: "0", balancePaisa: st.data.openingPaisa, status: null }, ...st.data.rows] : undefined}
        getRowId={(r) => r.id}
        loading={st.isLoading}
        error={st.error}
        onRetry={st.refetch}
        empty={{ title: t("billing.statement.nothingInPeriod"), compact: true }}
        columns={[
          { id: "date", header: t("field.date"), cell: (r) => formatDate(r.date) },
          { id: "entry", header: t("field.entry"), cell: (r) => (r.kind === "OPENING" ? <span className="font-medium">{t("billing.statement.openingBalance")}</span> : <span>{r.kind === "INVOICE" ? t("field.invoice") : t("billing.statement.payment")} {r.status ? <StatusBadge domain="cheque" value={r.status} /> : null}</span>) },
          { id: "ref", header: t("billing.statement.colRef"), cell: (r) => r.reference },
          { id: "desc", header: t("billing.statement.colDetail"), cell: (r) => <span className="text-sm text-muted-foreground">{r.kind === "OPENING" ? "" : r.description}</span> },
          { id: "debit", header: t("field.billed"), align: "right", cell: (r) => (r.debitPaisa !== "0" ? <MoneyText paisa={r.debitPaisa} /> : "") },
          { id: "credit", header: t("field.received"), align: "right", cell: (r) => (r.creditPaisa !== "0" ? <MoneyText paisa={r.creditPaisa} /> : "") },
          { id: "balance", header: t("field.balance"), align: "right", cell: (r) => <MoneyText paisa={r.balancePaisa} className="font-medium" /> },
        ]}
      />
      {st.data ? (
        <div className="grid gap-2 border-t p-4 text-sm sm:grid-cols-3">
          <p>
            {t("field.balanceDue")} <MoneyText paisa={st.data.closingPaisa} className="font-semibold" />
          </p>
          <p>
            {t("billing.statement.creditHeld")} <MoneyText paisa={st.data.creditPaisa} /></p>
          <p>
            {t("billing.statement.unbilledPurchases")} <MoneyText paisa={st.data.unbilledRecoverables.reduce((s, r) => s + Number(r.amountPaisa), 0).toString()} />
          </p>
        </div>
      ) : null}
    </SectionCard>
  );
}

export function StatementView({ projectId }: { projectId: string }) {
  const t = useT();
  return <ProjectPageShell projectId={projectId} crumb={t("billing.statement.crumb")}>{(project) => <StatementPanel projectId={project.id} phone={project.client?.phone} />}</ProjectPageShell>;
}

// ─── Finance → Receivables ──────────────────────────────────────────────────

export function ReceivablesView() {
  const router = useRouter();
  const tr = useT();
  const [overdueOnly, setOverdueOnly] = useState(false);
  const q = useGetFinanceReceivablesQuery(overdueOnly ? { overdueOnly: "true" } : undefined);
  const t = q.data?.totals;
  return (
    <div className="space-y-6">
      <PageHeader title={tr("billing.receivables.title")} description={tr("billing.receivables.description")} breadcrumbs={[{ label: tr("crumb.finance") }, { label: tr("billing.receivables.title") }]} actions={<ExportMenu name="receivables-ageing" filters={{}} />} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={tr("field.invoiced")} icon={FileText} value={formatPKRShort(t?.invoicedPaisa ?? "0")} loading={q.isLoading} />
        <KpiCard label={tr("field.received")} icon={CheckCircle2} tone="success" value={formatPKRShort(t?.receivedPaisa ?? "0")} loading={q.isLoading} />
        <KpiCard label={tr("field.outstanding")} icon={HandCoins} value={formatPKRShort(t?.outstandingPaisa ?? "0")} hint={t && t.pendingChequesPaisa !== "0" ? tr("billing.receivables.inPendingCheques", { amount: formatPKRShort(t.pendingChequesPaisa) }) : undefined} loading={q.isLoading} />
        <KpiCard label={tr("billing.receivables.overdue")} icon={TriangleAlert} tone="danger" value={formatPKRShort(t?.overduePaisa ?? "0")} hint={t ? (t.overdueProjects === 1 ? tr("billing.receivables.oneProject") : tr("billing.receivables.nProjects", { n: t.overdueProjects })) : undefined} loading={q.isLoading} />
      </div>
      {t?.ageing ? (
        <SectionCard title={tr("billing.receivables.ageing")} description={tr("billing.receivables.ageingDesc")}>
          <AgeingBar ageing={t.ageing} />
        </SectionCard>
      ) : null}
      <SectionCard
        flush
        title={tr("billing.receivables.byProject")}
        actions={
          <label className="inline-flex items-center gap-2 text-sm">
            <Switch checked={overdueOnly} onCheckedChange={setOverdueOnly} aria-label={tr("billing.receivables.overdueOnly")} />
            {tr("billing.receivables.overdueOnly")}
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
          empty={{ title: overdueOnly ? tr("billing.receivables.nothingOverdue") : tr("billing.receivables.noReceivables"), icon: HandCoins }}
          columns={[
            {
              id: "project",
              header: tr("field.project"),
              sortValue: (r) => r.project.name,
              cell: (r) => (
                <div>
                  <p className="font-medium">{r.project.name}</p>
                  <p className="text-xs text-muted-foreground">{[r.project.code, r.client?.name].filter(Boolean).join(" · ")}</p>
                </div>
              ),
            },
            { id: "contract", header: tr("field.contract"), align: "right", cell: (r) => <MoneyText paisa={r.revisedContractPaisa} short /> },
            { id: "invoiced", header: tr("field.invoiced"), align: "right", cell: (r) => <MoneyText paisa={r.invoicedPaisa} short /> },
            { id: "received", header: tr("field.received"), align: "right", cell: (r) => <MoneyText paisa={r.receivedPaisa} short /> },
            { id: "pending", header: tr("billing.receivables.pendingCheques"), align: "right", cell: (r) => (r.pendingChequesPaisa === "0" ? "—" : <MoneyText paisa={r.pendingChequesPaisa} short />) },
            { id: "outstanding", header: tr("field.outstanding"), align: "right", sortValue: (r) => Number(r.outstandingPaisa), cell: (r) => <MoneyText paisa={r.outstandingPaisa} className="font-semibold" /> },
            {
              id: "overdue",
              header: tr("billing.receivables.overdue"),
              align: "right",
              sortValue: (r) => Number(r.overduePaisa),
              cell: (r) => (r.overduePaisa === "0" ? "—" : <span className="text-danger"><MoneyText paisa={r.overduePaisa} /> · <bdi>{tr("billing.receivables.daysShort", { n: r.oldestOverdueDays })}</bdi></span>),
            },
            { id: "ageing", header: tr("billing.receivables.ageing"), cell: (r) => (r.outstandingPaisa === "0" ? "—" : <AgeingBar ageing={r.ageing} compact className="min-w-28" />) },
            { id: "next", header: tr("billing.receivables.nextToBill"), cell: (r) => (r.nextBillableStage ? <span className="text-sm">{r.nextBillableStage.label}{r.nextBillableStage.status === "READY" ? <StatusBadge domain="billingStage" value="READY" className="ms-2" /> : null}</span> : "—") },
          ]}
        />
      </SectionCard>
    </div>
  );
}
