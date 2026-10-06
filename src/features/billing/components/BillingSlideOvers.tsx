"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import {
  useAddBillingProgressMutation,
  useCreateInvoiceMutation,
  useGetBillingProgressQuery,
  useGetBillingStagesQuery,
  useGetInvoicesQuery,
  useGetOwnerStatementQuery,
  useMarkStageReadyMutation,
  useRecordPaymentMutation,
} from "@/api/services/billing.api";
import { useGetCompanySettingsQuery } from "@/api/services/company.api";
import type { ScheduleStage, UnpaidStageWarning } from "@/api/types";
import { AllocationEditor, type AllocatableInvoice } from "@/components/common/AllocationEditor";
import { PAYMENT_METHODS } from "@/components/common/BillingBadges";
import { InlineAlert } from "@/components/common/InlineAlert";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { SlideOver } from "@/components/common/SlideOver";
import { AttachmentField } from "@/components/forms/AttachmentField";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { QuantityField } from "@/components/forms/QuantityInput";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { todayPK } from "@/lib/dates";
import { formatPKR, sumPaisa, toPaisaBigInt } from "@/lib/money";
import { projectHref } from "@/lib/navigation";
import { qtyTimesRate } from "@/lib/quantity";
import { markReadySchema, newInvoiceSchema, paymentSchema, progressSchema, type MarkReadyValues, type NewInvoiceValues, type PaymentValues, type ProgressValues } from "../schemas";

interface Open {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OWNER = { roles: ["THEKEDAR"] } as const;

// ─── Mark ready ─────────────────────────────────────────────────────────────

export function MarkReadySlideOver({ open, onOpenChange, stage, onWarning }: Open & { stage: ScheduleStage; onWarning: (w: UnpaidStageWarning | null) => void }) {
  const [mark, { isLoading }] = useMarkStageReadyMutation();
  const run = useMutationToast();
  const form = useForm<MarkReadyValues, unknown, z.output<typeof markReadySchema>>({ resolver: zodResolver(markReadySchema), values: { photo: null, photo2: null, note: "" } });
  const onSubmit = async (v: z.output<typeof markReadySchema>) => {
    const r = await run(() => mark({ id: stage.id, body: { proofAttachmentIds: [v.photo.id, ...(v.photo2 ? [v.photo2.id] : [])], ...(v.note ? { note: v.note } : {}) } }).unwrap(), {
      success: `${stage.label} is ready to bill`,
      setError: form.setError,
    });
    if (r) {
      onWarning(r.warning);
      onOpenChange(false);
    }
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={`Mark ready — ${stage.label}`}
      description={`${stage.percent}% · ${formatPKR(stage.amountPaisa)}. Attach photos of the finished work; the owner sees them with the invoice.`}
      busy={isLoading}
      footer={<FormActions formId="mark-ready" submitLabel="Mark ready" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="mark-ready">
        <AttachmentField name="photo" label="Photo" kind="SITE_PHOTO" required />
        <AttachmentField name="photo2" label="Another photo (optional)" kind="SITE_PHOTO" />
        <TextareaField name="note" label="Note" rows={2} placeholder="Slab cast 25 Aug, curing done" />
      </Form>
    </SlideOver>
  );
}

// ─── Running-bill progress ──────────────────────────────────────────────────

export function ProgressSlideOver({ open, onOpenChange, projectId }: Open & { projectId: string }) {
  const [add, { isLoading }] = useAddBillingProgressMutation();
  const run = useMutationToast();
  const form = useForm<ProgressValues, unknown, z.output<typeof progressSchema>>({ resolver: zodResolver(progressSchema), values: { date: todayPK(), quantity: null, description: "", photo: null } });
  const onSubmit = async (v: z.output<typeof progressSchema>) => {
    const ok = await run(() => add({ projectId, body: { date: v.date, quantity: v.quantity, description: v.description, ...(v.photo ? { attachmentIds: [v.photo.id] } : {}) } }).unwrap(), {
      success: "Progress added",
      setError: form.setError,
      codeFields: { FUTURE_DATE: "date" },
    });
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title="Add progress"
      description="Sq ft done for the next running bill."
      busy={isLoading}
      footer={<FormActions formId="progress-form" submitLabel="Add progress" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="progress-form">
        <FieldGrid>
          <QuantityField name="quantity" label="Done" unit="sq ft" required />
          <DateField name="date" label="Date" required max={todayPK()} />
        </FieldGrid>
        <TextField name="description" label="What was done" required placeholder="Ground floor — brickwork & plaster" />
        <AttachmentField name="photo" label="Photo (optional)" kind="SITE_PHOTO" />
      </Form>
    </SlideOver>
  );
}

// ─── New invoice ────────────────────────────────────────────────────────────

const TYPES = [
  { value: "STAGE", label: "Stage" },
  { value: "RUNNING_BILL", label: "Running bill" },
  { value: "RECOVERABLE", label: "Recoverable" },
  { value: "RETENTION", label: "Retention" },
  { value: "OTHER", label: "Other" },
] as const;

export function NewInvoiceSlideOver({ open, onOpenChange, projectId, billingModel, stageId }: Open & { projectId: string; billingModel: string | null; stageId?: string }) {
  const router = useRouter();
  const owner = useCan(OWNER);
  const stages = useGetBillingStagesQuery(projectId);
  const statement = useGetOwnerStatementQuery({ projectId });
  const running = billingModel === "RUNNING_BILLS";
  const progress = useGetBillingProgressQuery({ projectId, billed: "false" }, { skip: !running });
  const [create, { isLoading }] = useCreateInvoiceMutation();
  const run = useMutationToast();
  const form = useForm<NewInvoiceValues, unknown, z.output<typeof newInvoiceSchema>>({
    resolver: zodResolver(newInvoiceSchema),
    values: {
      type: running ? "RUNNING_BILL" : "STAGE",
      billingStageId: stageId ?? null,
      force: false,
      forceNote: "",
      from: "",
      to: todayPK(),
      cashEntryIds: [],
      lines: [{ description: "", quantity: null, unit: "", ratePaisa: null, amountPaisa: null }],
      notes: "",
    },
  });
  const lines = useFieldArray({ control: form.control, name: "lines" });
  const [type, billingStageId, force, from, to, cashEntryIds, manual] = useWatch({ control: form.control, name: ["type", "billingStageId", "force", "from", "to", "cashEntryIds", "lines"] });
  const recoverables = useMemo(() => statement.data?.unbilledRecoverables ?? [], [statement.data]);
  const billable = (stages.data ?? []).filter((s) => !s.isRetention && (s.status === "READY" || (force && s.status === "UPCOMING")));

  const preview = useMemo(() => {
    if (type === "STAGE") {
      const s = stages.data?.find((x) => x.id === billingStageId);
      return sumPaisa([s?.amountPaisa ?? "0", ...recoverables.filter((r) => cashEntryIds.includes(r.id)).map((r) => r.amountPaisa)]);
    }
    if (type === "RECOVERABLE") return sumPaisa(recoverables.filter((r) => cashEntryIds.includes(r.id)).map((r) => r.amountPaisa));
    if (type === "RUNNING_BILL") return sumPaisa((progress.data?.items ?? []).filter((p) => (!from || p.date >= from) && (!to || p.date <= to)).map((p) => p.valuePaisa ?? "0"));
    if (type === "RETENTION") return stages.data?.find((s) => s.isRetention)?.amountPaisa ?? "0";
    return sumPaisa(manual.map((l) => l.amountPaisa ?? qtyTimesRate(l.quantity, l.ratePaisa) ?? "0"));
  }, [type, billingStageId, cashEntryIds, from, to, manual, stages.data, recoverables, progress.data]);

  const onSubmit = async (v: z.output<typeof newInvoiceSchema>) => {
    const body =
      v.type === "STAGE"
        ? { type: v.type, billingStageId: v.billingStageId!, ...(v.force ? { force: true, forceNote: v.forceNote } : {}), ...(v.cashEntryIds.length ? { extraCashEntryIds: v.cashEntryIds } : {}) }
        : v.type === "RUNNING_BILL"
          ? { type: v.type, from: v.from, to: v.to }
          : v.type === "RECOVERABLE"
            ? { type: v.type, cashEntryIds: v.cashEntryIds }
            : v.type === "RETENTION"
              ? { type: v.type }
              : {
                  type: v.type,
                  lines: v.lines.map((l) => ({
                    description: l.description,
                    ...(l.quantity ? { quantity: l.quantity } : {}),
                    ...(l.unit ? { unit: l.unit } : {}),
                    ...(l.ratePaisa ? { ratePaisa: l.ratePaisa } : {}),
                    ...(l.amountPaisa ? { amountPaisa: l.amountPaisa } : {}),
                  })),
                };
    const inv = await run(() => create({ projectId, body: { ...body, ...(v.notes ? { notes: v.notes } : {}) } as never }).unwrap(), {
      success: "Draft invoice created — check it and issue",
      setError: form.setError,
      codeFields: { STAGE_NOT_READY: "billingStageId", STAGE_ALREADY_INVOICED: "billingStageId", NOTHING_TO_BILL: "from", RETENTION_NOT_DUE: "type", SOURCE_ALREADY_BILLED: "cashEntryIds" },
    });
    if (inv) {
      onOpenChange(false);
      router.push(projectHref(projectId, `/billing/invoices/${inv.id}`));
    }
  };

  const recoverableOptions = recoverables.map((r) => ({ value: r.id, label: `${r.description} — ${formatPKR(r.amountPaisa)}`, description: r.date }));
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="New invoice"
      description="Saved as a draft; you issue it from the invoice page."
      busy={isLoading}
      footer={<FormActions formId="invoice-form" submitLabel="Create draft" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="invoice-form">
        <SelectField name="type" label="Type" required options={TYPES.filter((t) => t.value !== "OTHER" || owner).map((t) => ({ value: t.value, label: t.label }))} />
        {type === "STAGE" ? (
          <>
            <SelectField
              name="billingStageId"
              label="Stage"
              required
              placeholder={billable.length ? "Choose a stage" : "No stage is ready yet"}
              options={billable.map((s) => ({ value: s.id, label: `${s.label} — ${s.percent}% · ${formatPKR(s.amountPaisa)}${s.status === "UPCOMING" ? " (not ready)" : ""}` }))}
            />
            <ToggleField name="force" label="Bill a stage that is not marked ready" />
            {force ? <TextareaField name="forceNote" label="Why" rows={2} required /> : null}
            {recoverableOptions.length ? <ComboboxField name="cashEntryIds" label="Also bill owner purchases (optional)" options={recoverableOptions} multiple /> : null}
          </>
        ) : null}
        {type === "RUNNING_BILL" ? (
          running ? (
            <FieldGrid>
              <DateField name="from" label="From" required />
              <DateField name="to" label="To" required />
            </FieldGrid>
          ) : (
            <InlineAlert tone="info">This project is billed by stages.</InlineAlert>
          )
        ) : null}
        {type === "RECOVERABLE" ? (
          recoverableOptions.length ? (
            <ComboboxField name="cashEntryIds" label="Owner purchases to recover" required options={recoverableOptions} multiple />
          ) : (
            <InlineAlert tone="info">No unbilled owner purchases on this project.</InlineAlert>
          )
        ) : null}
        {type === "RETENTION" ? <InlineAlert tone="info">The retention is billed after handover (closeout / handed over).</InlineAlert> : null}
        {type === "OTHER" ? (
          <div className="space-y-3">
            {lines.fields.map((f, i) => (
              <div key={f.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <TextField name={`lines.${i}.description`} label={`Line ${i + 1}`} required placeholder="Boundary wall raised" />
                  <FieldGrid columns={3}>
                    <QuantityField name={`lines.${i}.quantity`} label="Qty" />
                    <MoneyField name={`lines.${i}.ratePaisa`} label="Rate" />
                    <MoneyField name={`lines.${i}.amountPaisa`} label="Amount" hint="Or qty × rate" />
                  </FieldGrid>
                </div>
                {lines.fields.length > 1 ? (
                  <Button type="button" size="icon" variant="ghost" aria-label={`Remove line ${i + 1}`} onClick={() => lines.remove(i)}>
                    <Trash2 aria-hidden />
                  </Button>
                ) : null}
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => lines.append({ description: "", quantity: null, unit: "", ratePaisa: null, amountPaisa: null })}>
              <Plus data-icon="inline-start" />
              Add line
            </Button>
          </div>
        ) : null}
        <TextareaField name="notes" label="Notes on the invoice" rows={2} />
        <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm" data-testid="invoice-preview">
          <span className="text-muted-foreground">Subtotal (tax added on the draft if switched on)</span>
          <MoneyText paisa={preview} className="font-semibold" />
        </div>
      </Form>
    </SlideOver>
  );
}

// ─── Record payment ─────────────────────────────────────────────────────────

export function RecordPaymentSlideOver({ open, onOpenChange, projectId }: Open & { projectId: string }) {
  const owner = useCan(OWNER);
  const settings = useGetCompanySettingsQuery(undefined, { skip: !owner });
  const invoices = useGetInvoicesQuery({ projectId, limit: 100 });
  const [record, { isLoading }] = useRecordPaymentMutation();
  const run = useMutationToast();
  const [alloc, setAlloc] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState(false);
  const form = useForm<PaymentValues, unknown, z.output<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    values: { receivedOn: todayPK(), amountPaisa: null, method: "BANK_TRANSFER", bankName: "", reference: "", chequeNo: "", chequeDate: "", whtDeductedPaisa: null, slip: null, note: "" },
  });
  const [method, amount, wht] = useWatch({ control: form.control, name: ["method", "amountPaisa", "whtDeductedPaisa"] });
  const taxOn = settings.data?.taxEnabled ?? false;
  const open_: AllocatableInvoice[] = (invoices.data?.items ?? [])
    .filter((i) => i.status === "ISSUED" || i.status === "PARTLY_PAID")
    .map((i) => ({
      id: i.id,
      number: i.number ?? "—",
      dueDate: i.dueDate,
      overdue: i.overdue,
      openPaisa: ((toPaisaBigInt(i.totalPaisa) ?? BigInt(0)) - (toPaisaBigInt(i.paidPaisa) ?? BigInt(0)) - (toPaisaBigInt(i.pendingPaisa) ?? BigInt(0))).toString(),
    }))
    .filter((i) => (toPaisaBigInt(i.openPaisa) ?? BigInt(0)) > BigInt(0));
  const total = sumPaisa([amount ?? "0", taxOn ? (wht ?? "0") : "0"]);

  const onSubmit = async (v: z.output<typeof paymentSchema>) => {
    const allocations = touched
      ? Object.entries(alloc)
          .filter(([, a]) => a && Number(a) > 0)
          .map(([invoiceId, a]) => ({ invoiceId, amountPaisa: a! }))
      : undefined;
    const ok = await run(
      () =>
        record({
          projectId,
          body: {
            receivedOn: v.receivedOn,
            amountPaisa: v.amountPaisa,
            method: v.method,
            ...(v.bankName ? { bankName: v.bankName } : {}),
            ...(v.reference ? { reference: v.reference } : {}),
            ...(v.method === "CHEQUE" ? { chequeNo: v.chequeNo, ...(v.chequeDate ? { chequeDate: v.chequeDate } : {}) } : {}),
            ...(taxOn && v.whtDeductedPaisa ? { whtDeductedPaisa: v.whtDeductedPaisa } : {}),
            ...(v.slip ? { attachmentId: v.slip.id } : {}),
            ...(v.note ? { note: v.note } : {}),
            ...(allocations ? { allocations } : {}),
          },
        }).unwrap(),
      {
        success: (p) => (p.status === "PENDING" ? `${p.number} saved — cheque pending` : `${p.number} saved`),
        setError: form.setError,
        codeFields: { FUTURE_DATE: "receivedOn", WHT_NOT_ENABLED: "whtDeductedPaisa" },
      },
    );
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Record payment"
      description="Money received from the owner. Cheques stay pending until you mark them cleared."
      busy={isLoading}
      footer={<FormActions formId="payment-form" submitLabel="Save payment" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="payment-form">
        <FieldGrid>
          <MoneyField name="amountPaisa" label="Amount" required />
          <DateField name="receivedOn" label="Received on" required max={todayPK()} />
        </FieldGrid>
        <SelectField name="method" label="Method" required options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }))} />
        <FieldGrid>
          <TextField name="bankName" label="Bank" placeholder="MCB" />
          <TextField name="reference" label="Reference" placeholder="FT26165" />
        </FieldGrid>
        {method === "CHEQUE" ? (
          <FieldGrid>
            <TextField name="chequeNo" label="Cheque no." required />
            <DateField name="chequeDate" label="Cheque date" />
          </FieldGrid>
        ) : null}
        {taxOn ? <MoneyField name="whtDeductedPaisa" label="Tax withheld (WHT)" hint="Counts towards the invoices" /> : null}
        <AttachmentField name="slip" label="Slip / cheque photo (optional)" kind="PAYMENT_SLIP" />
        <AllocationEditor
          invoices={open_}
          totalPaisa={total}
          value={touched ? alloc : {}}
          onChange={(v) => {
            setTouched(true);
            setAlloc(v);
          }}
        />
        {!touched ? <p className="text-xs text-muted-foreground">Leave the amounts empty to settle the oldest due invoices first.</p> : null}
        <TextareaField name="note" label="Note" rows={2} />
      </Form>
    </SlideOver>
  );
}
