"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import {
  useAssignSubcontractMutation,
  useAssignWorkerMutation,
  useCreateAdvanceMutation,
  useDeductSubcontractorMutation,
  useGetProjectWorkersQuery,
  useGetSubcontractsQuery,
  usePaySubcontractorMutation,
  usePostProgressMutation,
  useRecordMeasurementMutation,
} from "@/api/services/labor.api";
import { useGetSubcontractorsQuery, useGetWorkersQuery } from "@/api/services/masterData.api";
import type { SubcontractAccountRow } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { MoneyText } from "@/components/common/MoneyText";
import { SlideOver } from "@/components/common/SlideOver";
import { AttachmentField } from "@/components/forms/AttachmentField";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { FormField, useFieldError } from "@/components/forms/FormField";
import { MoneyField } from "@/components/forms/MoneyInput";
import { NumberField } from "@/components/forms/NumberField";
import { PayeeSelect } from "@/components/forms/PayeeSelect";
import { QuantityField } from "@/components/forms/QuantityInput";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { useMutationToast } from "@/hooks/useMutationToast";
import { todayPK } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { useMe } from "@/store/hooks";
import { PAID_FROM_OPTIONS, RATE_TYPE_OPTIONS, workerTypeLabel } from "../options";
import {
  advanceSchema,
  assignSubcontractSchema,
  assignWorkerSchema,
  deductionSchema,
  measurementSchema,
  progressSchema,
  subPaymentSchema,
  type AdvanceValues,
  type AssignSubcontractValues,
  type AssignWorkerValues,
  type DeductionValues,
  type MeasurementValues,
  type ProgressValues,
  type SubPaymentValues,
} from "../schemas";

interface Open {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Offline-safe creates send a UUID v7-like id made on the device (time-ordered). */
export function newClientId(): string {
  const hex = Date.now().toString(16).padStart(12, "0");
  const rand = crypto.getRandomValues(new Uint8Array(10));
  const r = Array.from(rand, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-7${r.slice(0, 3)}-${((parseInt(r.slice(3, 4), 16) & 0x3) | 0x8).toString(16)}${r.slice(4, 7)}-${r.slice(7, 19)}`;
}

export const useIsMunshi = () => useMe()?.user.role === "MUNSHI";

// ─── Team on site ───────────────────────────────────────────────────────────

export function AssignWorkerSlideOver({ open, onOpenChange, projectId }: Open & { projectId: string }) {
  const munshi = useIsMunshi();
  const workers = useGetWorkersQuery({ isActive: "true", limit: 100 });
  const onSite = useGetProjectWorkersQuery({ projectId, active: true });
  const [assign, { isLoading }] = useAssignWorkerMutation();
  const run = useMutationToast();
  const taken = new Set((onSite.data ?? []).map((w) => w.worker.id));
  const options = (workers.data?.items ?? [])
    .filter((w) => !taken.has(w.id))
    .map((w) => ({ value: w.id, label: w.name, description: `${workerTypeLabel(w.type)} · ${formatPKR(w.dailyRatePaisa)}/day` }));
  const form = useForm<AssignWorkerValues, unknown, z.output<typeof assignWorkerSchema>>({
    resolver: zodResolver(assignWorkerSchema),
    values: { workerId: null, dailyRatePaisa: null, startDate: todayPK() },
  });
  const workerId = useWatch({ control: form.control, name: "workerId" });
  const chosen = workers.data?.items.find((w) => w.id === workerId);
  const onSubmit = async (v: z.output<typeof assignWorkerSchema>) => {
    const ok = await run(
      () =>
        assign({
          projectId,
          body: { workerId: v.workerId, startDate: v.startDate, ...(!munshi && v.dailyRatePaisa ? { dailyRatePaisa: v.dailyRatePaisa } : {}) },
        }).unwrap(),
      { success: "Worker added to the site", setError: form.setError, codeFields: { WORKER_ALREADY_ASSIGNED: "workerId", INVALID_WORKER: "workerId" } },
    );
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title="Assign a worker"
      description="Daily-wage worker on this site. Add new people in Workforce → Workers Directory."
      busy={isLoading}
      footer={<FormActions formId="assign-worker" submitLabel="Add to site" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="assign-worker">
        <ComboboxField name="workerId" label="Worker" required options={options} loading={workers.isLoading} placeholder="Search by name" emptyText="Everyone active is already on this site" />
        {munshi ? (
          chosen ? (
            <p className="text-sm text-muted-foreground">
              Rate: <MoneyText paisa={chosen.dailyRatePaisa} /> / day (the office can change it)
            </p>
          ) : null
        ) : (
          <MoneyField name="dailyRatePaisa" label="Rate on this project (per day)" hint={chosen ? `Normal rate ${formatPKR(chosen.dailyRatePaisa)} — leave empty to use it` : "Leave empty for the worker's normal rate"} suffix="/ day" />
        )}
        <DateField name="startDate" label="Working here from" required max={todayPK()} />
      </Form>
    </SlideOver>
  );
}

export function AssignSubcontractSlideOver({ open, onOpenChange, projectId }: Open & { projectId: string }) {
  const subs = useGetSubcontractorsQuery({ isActive: "true", limit: 100 });
  const [assign, { isLoading }] = useAssignSubcontractMutation();
  const run = useMutationToast();
  const form = useForm<AssignSubcontractValues, unknown, z.output<typeof assignSubcontractSchema>>({
    resolver: zodResolver(assignSubcontractSchema),
    values: { subcontractorId: null, scope: "", rateType: "PER_SQFT", ratePaisa: null, contractValuePaisa: null, retentionPercent: 5, startDate: todayPK() },
  });
  const rateType = useWatch({ control: form.control, name: "rateType" });
  const lump = rateType === "LUMPSUM";
  const unit = RATE_TYPE_OPTIONS.find((o) => o.value === rateType)?.unit;
  const onSubmit = async (v: z.output<typeof assignSubcontractSchema>) => {
    const ok = await run(
      () =>
        assign({
          projectId,
          body: {
            subcontractorId: v.subcontractorId,
            scope: v.scope,
            rateType: v.rateType,
            startDate: v.startDate,
            ...(v.retentionPercent !== null ? { retentionPercent: v.retentionPercent } : {}),
            ...(lump ? (v.contractValuePaisa ? { contractValuePaisa: v.contractValuePaisa } : {}) : v.ratePaisa ? { ratePaisa: v.ratePaisa } : {}),
          },
        }).unwrap(),
      { success: "Sub-contract added", setError: form.setError, codeFields: { RATE_REQUIRED: lump ? "contractValuePaisa" : "ratePaisa", INVALID_SUBCONTRACTOR: "subcontractorId" } },
    );
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title="Add a sub-contract"
      description="Piece-rate (per sq ft, ton …) or a lump-sum theka. Empty rate = the company labour rate for the trade."
      busy={isLoading}
      footer={<FormActions formId="assign-sub" submitLabel="Add sub-contract" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="assign-sub">
        <ComboboxField
          name="subcontractorId"
          label="Sub-contractor"
          required
          options={(subs.data?.items ?? []).map((s) => ({ value: s.id, label: s.name, description: workerTypeLabel(s.trade) }))}
          loading={subs.isLoading}
        />
        <TextField name="scope" label="Work" required placeholder="Slab shuttering — ground + first floor" />
        <SelectField name="rateType" label="Paid" required options={RATE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        <FieldGrid>
          {lump ? <MoneyField name="contractValuePaisa" label="Lump-sum value" hint="Empty = company rate" /> : <MoneyField name="ratePaisa" label="Rate" suffix={unit ? `/ ${unit}` : undefined} hint="Empty = company rate" />}
          <NumberField name="retentionPercent" label="Retention" unit="%" decimals={2} />
        </FieldGrid>
        <DateField name="startDate" label="Start" required />
      </Form>
    </SlideOver>
  );
}

// ─── Peshgi ─────────────────────────────────────────────────────────────────

function PayeeField({ projectId, allowSubcontractor }: { projectId: string; allowSubcontractor: boolean }) {
  const error = useFieldError("payeeId");
  return (
    <FormField label="Paid to" required error={error}>
      {() => (
        <Controller
          name="payeeType"
          render={({ field: type }) => (
            <Controller
              name="payeeId"
              render={({ field: id }) => (
                <PayeeSelect
                  projectId={projectId}
                  allowSubcontractor={allowSubcontractor}
                  invalid={!!error}
                  value={{ payeeType: type.value, id: id.value }}
                  onChange={(v) => {
                    type.onChange(v.payeeType);
                    id.onChange(v.id);
                  }}
                />
              )}
            />
          )}
        />
      )}
    </FormField>
  );
}

export function AdvanceSlideOver({ open, onOpenChange, projectId, defaultWorkerId }: Open & { projectId: string; defaultWorkerId?: string }) {
  const munshi = useIsMunshi();
  const [create, { isLoading }] = useCreateAdvanceMutation();
  const run = useMutationToast();
  const [clientId] = useState(newClientId);
  const form = useForm<AdvanceValues, unknown, z.output<typeof advanceSchema>>({
    resolver: zodResolver(advanceSchema),
    values: { payeeType: "WORKER", payeeId: defaultWorkerId ?? null, amountPaisa: null, date: todayPK(), paidFrom: munshi ? "SITE_CASH" : "OFFICE_CASH", reference: "", note: "" },
  });
  const onSubmit = async (v: z.output<typeof advanceSchema>) => {
    const ok = await run(
      () =>
        create({
          projectId,
          body: {
            payeeType: v.payeeType,
            ...(v.payeeType === "WORKER" ? { workerId: v.payeeId } : { assignmentId: v.payeeId }),
            amountPaisa: v.amountPaisa,
            date: v.date,
            paidFrom: v.paidFrom,
            ...(v.reference ? { reference: v.reference } : {}),
            ...(v.note ? { note: v.note } : {}),
            clientId,
            deviceCreatedAt: new Date().toISOString(),
          },
        }).unwrap(),
      { success: "Peshgi saved", setError: form.setError, codeFields: { INSUFFICIENT_CASH: "amountPaisa", WORKER_NOT_ASSIGNED: "payeeId", FUTURE_DATE: "date", NO_CASH_ACCOUNT: "paidFrom" } },
    );
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title="Give peshgi"
      description="Advance against wages. A worker's peshgi is cut from the weekly settlement, oldest first."
      busy={isLoading}
      footer={<FormActions formId="advance-form" submitLabel="Save peshgi" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="advance-form">
        <PayeeField projectId={projectId} allowSubcontractor={!munshi} />
        <FieldGrid>
          <MoneyField name="amountPaisa" label="Amount" required />
          <DateField name="date" label="Date" required max={todayPK()} />
        </FieldGrid>
        {munshi ? (
          <InlineAlert tone="info">Paid from your site cash.</InlineAlert>
        ) : (
          <SelectField name="paidFrom" label="Paid from" required options={PAID_FROM_OPTIONS} />
        )}
        {!munshi ? <TextField name="reference" label="Reference" placeholder="Transaction / cheque no." /> : null}
        <TextareaField name="note" label="Note" rows={2} placeholder="Child sick, rent …" />
      </Form>
    </SlideOver>
  );
}

// ─── Measurements ───────────────────────────────────────────────────────────

export function MeasurementSlideOver({ open, onOpenChange, projectId, defaultAssignmentId }: Open & { projectId: string; defaultAssignmentId?: string }) {
  const subs = useGetSubcontractsQuery({ projectId, active: true });
  const [record, { isLoading }] = useRecordMeasurementMutation();
  const run = useMutationToast();
  const [clientId] = useState(newClientId);
  const options = (subs.data ?? []).filter((s) => s.rateType !== "LUMPSUM").map((s) => ({ value: s.id, label: s.subcontractor.name, description: `${s.scope} · per ${s.unit}` }));
  const form = useForm<MeasurementValues, unknown, z.output<typeof measurementSchema>>({
    resolver: zodResolver(measurementSchema),
    values: { assignmentId: defaultAssignmentId ?? null, date: todayPK(), description: "", quantity: null, photo: null },
  });
  const assignmentId = useWatch({ control: form.control, name: "assignmentId" });
  const unit = subs.data?.find((s) => s.id === assignmentId)?.unit;
  const onSubmit = async (v: z.output<typeof measurementSchema>) => {
    const ok = await run(
      () =>
        record({
          projectId,
          body: { assignmentId: v.assignmentId, date: v.date, description: v.description, quantity: v.quantity, ...(v.photo ? { attachmentIds: [v.photo.id] } : {}), clientId, deviceCreatedAt: new Date().toISOString() },
        }).unwrap(),
      { success: "Measurement saved — the office verifies it", setError: form.setError, codeFields: { LUMPSUM_USES_PROGRESS: "assignmentId", FUTURE_DATE: "date" } },
    );
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title="Record a measurement"
      description="Work done by a piece-rate sub-contractor. Its value is added once the office verifies it."
      busy={isLoading}
      footer={<FormActions formId="measure-form" submitLabel="Save measurement" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="measure-form">
        <ComboboxField name="assignmentId" label="Sub-contract" required options={options} loading={subs.isLoading} emptyText="No piece-rate sub-contracts on this site" />
        <TextField name="description" label="What was measured" required placeholder="First-floor slab" />
        <FieldGrid>
          <QuantityField name="quantity" label="Quantity" required unit={unit} />
          <DateField name="date" label="Date" required max={todayPK()} />
        </FieldGrid>
        <AttachmentField name="photo" label="Photo (optional)" kind="SITE_PHOTO" />
      </Form>
    </SlideOver>
  );
}

// ─── Sub-contractor account actions ─────────────────────────────────────────

export function SubPaymentSlideOver({ open, onOpenChange, row }: Open & { row: SubcontractAccountRow | null }) {
  const [pay, { isLoading }] = usePaySubcontractorMutation();
  const run = useMutationToast();
  const form = useForm<SubPaymentValues, unknown, z.output<typeof subPaymentSchema>>({
    resolver: zodResolver(subPaymentSchema),
    values: { type: "RUNNING", amountPaisa: null, paidFrom: "BANK", reference: "", date: todayPK(), note: "", allowAdvance: false },
  });
  const retention = useWatch({ control: form.control, name: "type" }) === "RETENTION_RELEASE";
  if (!row) return null;
  const onSubmit = async (v: z.output<typeof subPaymentSchema>) => {
    const ok = await run(
      () =>
        pay({
          id: row.id,
          body: { type: v.type, amountPaisa: v.amountPaisa, paidFrom: v.paidFrom, date: v.date, ...(v.reference ? { reference: v.reference } : {}), ...(v.note ? { note: v.note } : {}), ...(v.allowAdvance ? { allowAdvance: true } : {}) },
        }).unwrap(),
      { success: "Payment recorded", setError: form.setError, codeFields: { EXCEEDS_BALANCE: "amountPaisa", EXCEEDS_RETENTION: "amountPaisa", INSUFFICIENT_CASH: "amountPaisa", NO_CASH_ACCOUNT: "paidFrom" } },
    );
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={`Pay ${row.subcontractor.name}`}
      description={row.scope}
      busy={isLoading}
      footer={<FormActions formId="sub-pay" submitLabel="Record payment" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="sub-pay">
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-3 text-sm">
          <span className="text-muted-foreground">Balance due</span>
          <MoneyText paisa={row.account.balanceDuePaisa} className="text-right font-semibold" />
          <span className="text-muted-foreground">Retention held</span>
          <MoneyText paisa={row.account.retentionHeldPaisa} className="text-right" />
        </div>
        <SegmentedField
          name="type"
          label="Payment"
          options={[
            { value: "RUNNING", label: "Running" },
            { value: "FINAL", label: "Final" },
            { value: "RETENTION_RELEASE", label: "Retention" },
          ]}
        />
        <FieldGrid>
          <MoneyField name="amountPaisa" label="Amount" required />
          <DateField name="date" label="Date" required max={todayPK()} />
        </FieldGrid>
        <SelectField name="paidFrom" label="Paid from" required options={PAID_FROM_OPTIONS} />
        <TextField name="reference" label="Reference" placeholder="Cheque / transaction no." />
        {!retention ? <ToggleField name="allowAdvance" label="Pay more than the balance (as advance)" /> : null}
        <TextareaField name="note" label="Note" rows={2} />
      </Form>
    </SlideOver>
  );
}

export function DeductionSlideOver({ open, onOpenChange, row }: Open & { row: SubcontractAccountRow | null }) {
  const [deduct, { isLoading }] = useDeductSubcontractorMutation();
  const run = useMutationToast();
  const form = useForm<DeductionValues, unknown, z.output<typeof deductionSchema>>({
    resolver: zodResolver(deductionSchema),
    values: { amountPaisa: null, reason: "", date: todayPK() },
  });
  if (!row) return null;
  const onSubmit = async (v: z.output<typeof deductionSchema>) => {
    const ok = await run(() => deduct({ id: row.id, body: { amountPaisa: v.amountPaisa, reason: v.reason, date: v.date } }).unwrap(), { success: "Deduction recorded", setError: form.setError });
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={`Deduct from ${row.subcontractor.name}`}
      description="Wasted material, redone work, damage …"
      busy={isLoading}
      footer={<FormActions formId="sub-deduct" submitLabel="Deduct" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="sub-deduct">
        <FieldGrid>
          <MoneyField name="amountPaisa" label="Amount" required />
          <DateField name="date" label="Date" required max={todayPK()} />
        </FieldGrid>
        <TextareaField name="reason" label="Reason" required rows={3} />
      </Form>
    </SlideOver>
  );
}

export function ProgressSlideOver({ open, onOpenChange, row }: Open & { row: SubcontractAccountRow | null }) {
  const [post, { isLoading }] = usePostProgressMutation();
  const run = useMutationToast();
  const form = useForm<ProgressValues, unknown, z.output<typeof progressSchema>>({
    resolver: zodResolver(progressSchema),
    values: { percent: null, date: todayPK(), note: "" },
  });
  if (!row) return null;
  const onSubmit = async (v: z.output<typeof progressSchema>) => {
    const ok = await run(() => post({ id: row.id, body: { percent: v.percent, date: v.date, ...(v.note ? { note: v.note } : {}) } }).unwrap(), {
      success: "Progress posted",
      setError: form.setError,
      codeFields: { PROGRESS_NOT_AHEAD: "percent" },
    });
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={`Progress — ${row.subcontractor.name}`}
      description={`Now ${row.progressPercent}% of ${row.contractValuePaisa ? formatPKR(row.contractValuePaisa) : "the lump sum"}. Enter the new total %.`}
      busy={isLoading}
      footer={<FormActions formId="sub-progress" submitLabel="Post progress" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="sub-progress">
        <FieldGrid>
          <NumberField name="percent" label="Done so far" unit="%" decimals={2} required />
          <DateField name="date" label="Date" required max={todayPK()} />
        </FieldGrid>
        <TextareaField name="note" label="Note" rows={2} placeholder="Ground floor rough-in complete" />
      </Form>
    </SlideOver>
  );
}
