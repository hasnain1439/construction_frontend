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
import { useEnumT, useT } from "@/i18n/useT";
import { todayPK } from "@/lib/dates";
import { formatPKR, sumPaisa, toPaisaBigInt } from "@/lib/money";
import { projectHref } from "@/lib/navigation";
import { qtyTimesRate } from "@/lib/quantity";
import { markReadySchema, newInvoiceSchema, paymentSchema, progressSchema, type MarkReadyValues, type NewInvoiceValues, type PaymentValues, type ProgressValues } from "../schemas";

interface Open {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


// ─── Mark ready ─────────────────────────────────────────────────────────────

export function MarkReadySlideOver({ open, onOpenChange, stage, onWarning }: Open & { stage: ScheduleStage; onWarning: (w: UnpaidStageWarning | null) => void }) {
  const t = useT();
  const [mark, { isLoading }] = useMarkStageReadyMutation();
  const run = useMutationToast();
  const form = useForm<MarkReadyValues, unknown, z.output<typeof markReadySchema>>({ resolver: zodResolver(markReadySchema), values: { photo: null, photo2: null, note: "" } });
  const onSubmit = async (v: z.output<typeof markReadySchema>) => {
    const r = await run(() => mark({ id: stage.id, body: { proofAttachmentIds: [v.photo.id, ...(v.photo2 ? [v.photo2.id] : [])], ...(v.note ? { note: v.note } : {}) } }).unwrap(), {
      success: t("billing.forms.stageReady", { stage: stage.label }),
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
      title={t("billing.forms.markReadyTitle", { stage: stage.label })}
      description={t("billing.forms.markReadyDesc", { percent: stage.percent, amount: formatPKR(stage.amountPaisa) })}
      busy={isLoading}
      footer={<FormActions formId="mark-ready" submitLabel={t("billing.schedule.markReady")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="mark-ready">
        <AttachmentField name="photo" label={t("field.photo")} kind="SITE_PHOTO" required />
        <AttachmentField name="photo2" label={t("billing.forms.anotherPhoto")} kind="SITE_PHOTO" />
        <TextareaField name="note" label={t("field.note")} rows={2} placeholder={t("billing.forms.markReadyNotePh")} />
      </Form>
    </SlideOver>
  );
}

// ─── Running-bill progress ──────────────────────────────────────────────────

export function ProgressSlideOver({ open, onOpenChange, projectId }: Open & { projectId: string }) {
  const t = useT();
  const [add, { isLoading }] = useAddBillingProgressMutation();
  const run = useMutationToast();
  const form = useForm<ProgressValues, unknown, z.output<typeof progressSchema>>({ resolver: zodResolver(progressSchema), values: { date: todayPK(), quantity: null, description: "", photo: null } });
  const onSubmit = async (v: z.output<typeof progressSchema>) => {
    const ok = await run(() => add({ projectId, body: { date: v.date, quantity: v.quantity, description: v.description, ...(v.photo ? { attachmentIds: [v.photo.id] } : {}) } }).unwrap(), {
      success: t("billing.forms.progressAdded"),
      setError: form.setError,
      codeFields: { FUTURE_DATE: "date" },
    });
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t("billing.schedule.addProgress")}
      description={t("billing.forms.progressDesc")}
      busy={isLoading}
      footer={<FormActions formId="progress-form" submitLabel={t("billing.schedule.addProgress")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="progress-form">
        <FieldGrid>
          <QuantityField name="quantity" label={t("billing.forms.done")} unit={t("field.sqft")} required />
          <DateField name="date" label={t("field.date")} required max={todayPK()} />
        </FieldGrid>
        <TextField name="description" label={t("billing.forms.whatWasDone")} required placeholder={t("billing.forms.whatWasDonePh")} />
        <AttachmentField name="photo" label={t("billing.forms.photoOptional")} kind="SITE_PHOTO" />
      </Form>
    </SlideOver>
  );
}

// ─── New invoice ────────────────────────────────────────────────────────────

/** Invoice types in menu order (labels: `te("invoiceType", v)`). */
const TYPES = ["STAGE", "RUNNING_BILL", "RECOVERABLE", "RETENTION", "OTHER"] as const;

export function NewInvoiceSlideOver({ open, onOpenChange, projectId, billingModel, stageId }: Open & { projectId: string; billingModel: string | null; stageId?: string }) {
  const router = useRouter();
  const t = useT();
  const te = useEnumT();
  // "Other" invoices (free amounts) only for those who may issue invoices.
  const owner = useCan("billing.invoice.approve");
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
      success: t("billing.forms.draftCreated"),
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
      title={t("billing.invoices.newInvoice")}
      description={t("billing.forms.newInvoiceDesc")}
      busy={isLoading}
      footer={<FormActions formId="invoice-form" submitLabel={t("billing.forms.createDraft")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="invoice-form">
        <SelectField name="type" label={t("field.type")} required options={TYPES.filter((v) => v !== "OTHER" || owner).map((v) => ({ value: v, label: te("invoiceType", v) }))} />
        {type === "STAGE" ? (
          <>
            <SelectField
              name="billingStageId"
              label={t("field.stage")}
              required
              placeholder={billable.length ? t("billing.forms.chooseStage") : t("billing.forms.noStageReady")}
              options={billable.map((s) => ({ value: s.id, label: t(s.status === "UPCOMING" ? "billing.forms.stageOptionNotReady" : "billing.forms.stageOption", { stage: s.label, percent: s.percent, amount: formatPKR(s.amountPaisa) }) }))}
            />
            <ToggleField name="force" label={t("billing.forms.forceBill")} />
            {force ? <TextareaField name="forceNote" label={t("billing.forms.why")} rows={2} required /> : null}
            {recoverableOptions.length ? <ComboboxField name="cashEntryIds" label={t("billing.forms.alsoBillPurchases")} options={recoverableOptions} multiple /> : null}
          </>
        ) : null}
        {type === "RUNNING_BILL" ? (
          running ? (
            <FieldGrid>
              <DateField name="from" label={t("field.from")} required />
              <DateField name="to" label={t("field.to")} required />
            </FieldGrid>
          ) : (
            <InlineAlert tone="info">{t("billing.forms.billedByStages")}</InlineAlert>
          )
        ) : null}
        {type === "RECOVERABLE" ? (
          recoverableOptions.length ? (
            <ComboboxField name="cashEntryIds" label={t("billing.forms.purchasesToRecover")} required options={recoverableOptions} multiple />
          ) : (
            <InlineAlert tone="info">{t("billing.forms.noUnbilledPurchases")}</InlineAlert>
          )
        ) : null}
        {type === "RETENTION" ? <InlineAlert tone="info">{t("billing.forms.retentionInfo")}</InlineAlert> : null}
        {type === "OTHER" ? (
          <div className="space-y-3">
            {lines.fields.map((f, i) => (
              <div key={f.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <TextField name={`lines.${i}.description`} label={t("billing.forms.lineN", { n: i + 1 })} required placeholder={t("billing.forms.linePh")} />
                  <FieldGrid columns={3}>
                    <QuantityField name={`lines.${i}.quantity`} label={t("billing.invoices.colQty")} />
                    <MoneyField name={`lines.${i}.ratePaisa`} label={t("field.rate")} />
                    <MoneyField name={`lines.${i}.amountPaisa`} label={t("field.amount")} hint={t("billing.forms.orQtyRate")} />
                  </FieldGrid>
                </div>
                {lines.fields.length > 1 ? (
                  <Button type="button" size="icon" variant="ghost" aria-label={t("billing.forms.removeLine", { n: i + 1 })} onClick={() => lines.remove(i)}>
                    <Trash2 aria-hidden />
                  </Button>
                ) : null}
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => lines.append({ description: "", quantity: null, unit: "", ratePaisa: null, amountPaisa: null })}>
              <Plus data-icon="inline-start" />
              {t("billing.forms.addLine")}
            </Button>
          </div>
        ) : null}
        <TextareaField name="notes" label={t("billing.invoices.notesOnInvoice")} rows={2} />
        <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm" data-testid="invoice-preview">
          <span className="text-muted-foreground">{t("billing.forms.subtotalPreview")}</span>
          <MoneyText paisa={preview} className="font-semibold" />
        </div>
      </Form>
    </SlideOver>
  );
}

// ─── Record payment ─────────────────────────────────────────────────────────

export function RecordPaymentSlideOver({ open, onOpenChange, projectId }: Open & { projectId: string }) {
  const t = useT();
  const te = useEnumT();
  // Company settings (tax) are readable with company.settings.manage only.
  const owner = useCan("company.settings.manage");
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
        success: (p) => t(p.status === "PENDING" ? "billing.forms.paymentSavedPending" : "billing.forms.paymentSaved", { number: p.number }),
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
      title={t("action.recordPayment")}
      description={t("billing.forms.recordPaymentDesc")}
      busy={isLoading}
      footer={<FormActions formId="payment-form" submitLabel={t("billing.forms.savePayment")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="payment-form">
        <FieldGrid>
          <MoneyField name="amountPaisa" label={t("field.amount")} required />
          <DateField name="receivedOn" label={t("billing.forms.receivedOn")} required max={todayPK()} />
        </FieldGrid>
        <SelectField name="method" label={t("field.method")} required options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: te("clientPaymentMethod", m.value, m.label) }))} />
        <FieldGrid>
          <TextField name="bankName" label={t("field.bank")} placeholder={t("billing.forms.bankPh")} />
          <TextField name="reference" label={t("field.reference")} placeholder={t("billing.forms.referencePh")} />
        </FieldGrid>
        {method === "CHEQUE" ? (
          <FieldGrid>
            <TextField name="chequeNo" label={t("billing.forms.chequeNo")} required />
            <DateField name="chequeDate" label={t("billing.forms.chequeDate")} />
          </FieldGrid>
        ) : null}
        {taxOn ? <MoneyField name="whtDeductedPaisa" label={t("billing.forms.wht")} hint={t("billing.forms.whtHint")} /> : null}
        <AttachmentField name="slip" label={t("billing.forms.slipOptional")} kind="PAYMENT_SLIP" />
        <AllocationEditor
          invoices={open_}
          totalPaisa={total}
          value={touched ? alloc : {}}
          onChange={(v) => {
            setTouched(true);
            setAlloc(v);
          }}
        />
        {!touched ? <p className="text-xs text-muted-foreground">{t("billing.forms.autoSettleHint")}</p> : null}
        <TextareaField name="note" label={t("field.note")} rows={2} />
      </Form>
    </SlideOver>
  );
}
