"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import {
  useApproveTopupMutation,
  useCreateCashCountMutation,
  useCreateExpenseMutation,
  useHandoverCashMutation,
  useRequestTopupMutation,
  useSendFloatMutation,
} from "@/api/services/cashbook.api";
import { useGetSuppliersQuery } from "@/api/services/masterData.api";
import { useGetProjectsQuery } from "@/api/services/projects.api";
import { useGetUsersQuery } from "@/api/services/team.api";
import type { CashAccount, TopupRequest } from "@/api/types";
import { CategoryChips, type KharchaCategory } from "@/components/common/CategoryChips";
import { InlineAlert } from "@/components/common/InlineAlert";
import { LineItemsEditor } from "@/components/common/LineItemsEditor";
import { MoneyText } from "@/components/common/MoneyText";
import { SlideOver } from "@/components/common/SlideOver";
import { AttachmentField } from "@/components/forms/AttachmentField";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { FormField, useFieldError } from "@/components/forms/FormField";
import { MoneyField } from "@/components/forms/MoneyInput";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { newClientId } from "@/features/labor/components/LaborSlideOvers";
import { FLOAT_METHOD_OPTIONS } from "@/features/labor/options";
import {
  approveTopupSchema,
  countSchema,
  floatSchema,
  handoverSchema,
  kharchaSchema,
  topupSchema,
  type ApproveTopupValues,
  type CountValues,
  type FloatValues,
  type HandoverValues,
  type KharchaValues,
  type TopupValues,
} from "@/features/labor/schemas";
import { applyLineError } from "@/features/procurement/lineErrors";
import { useMutationToast } from "@/hooks/useMutationToast";
import { todayPK } from "@/lib/dates";
import { formatPKR, toPaisaBigInt } from "@/lib/money";

interface Open {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CategoryField() {
  const error = useFieldError("category");
  return (
    <FormField label="Category" required error={error}>
      {() => <Controller name="category" render={({ field }) => <CategoryChips value={(field.value as KharchaCategory | null) ?? undefined} onChange={(v) => field.onChange(v ?? null)} />} />}
    </FormField>
  );
}

/** Kharcha from the holder's own site cash; above the company limit it waits for approval. */
export function KharchaSlideOver({ open, onOpenChange, projectId, balancePaisa }: Open & { projectId: string; balancePaisa?: string }) {
  const [create, { isLoading }] = useCreateExpenseMutation();
  const suppliers = useGetSuppliersQuery({ isActive: "true", limit: 100 });
  const run = useMutationToast();
  const [clientId] = useState(newClientId);
  const form = useForm<KharchaValues, unknown, z.output<typeof kharchaSchema>>({
    resolver: zodResolver(kharchaSchema),
    values: { category: null, amountPaisa: null, description: "", date: todayPK(), receipt: null, withItems: false, supplierId: null, items: [{ materialId: null, qty: null }] },
  });
  const category = useWatch({ control: form.control, name: "category" });
  const withItems = useWatch({ control: form.control, name: "withItems" });
  const amount = useWatch({ control: form.control, name: "amountPaisa" });
  const over = balancePaisa !== undefined && amount ? (toPaisaBigInt(amount) ?? BigInt(0)) > (toPaisaBigInt(balancePaisa) ?? BigInt(0)) : false;
  const goods = category === "URGENT_MATERIAL" && withItems;

  const onSubmit = async (v: z.output<typeof kharchaSchema>) => {
    const ok = await run(
      () =>
        create({
          projectId,
          category: v.category!,
          amountPaisa: v.amountPaisa,
          description: v.description,
          date: v.date,
          ...(v.receipt ? { attachmentId: v.receipt.id } : {}),
          ...(goods ? { supplierId: v.supplierId!, items: v.items.map((i) => ({ materialId: i.materialId!, qty: i.qty! })) } : {}),
          clientId,
          deviceCreatedAt: new Date().toISOString(),
        }).unwrap(),
      {
        success: (r) => (r.status === "PENDING_APPROVAL" ? "Saved — above the limit, waiting for approval" : "Kharcha saved"),
        setError: form.setError,
        codeFields: { INSUFFICIENT_CASH: "amountPaisa", NO_CASH_ACCOUNT: "amountPaisa", FUTURE_DATE: "date", CHALLAN_REQUIRED: "receipt", INVALID_ATTACHMENT: "receipt" },
        onError: (_c, error) => applyLineError(error, v.items, form.setError, "items", {}),
      },
    );
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Add kharcha"
      description="Money spent from your site cash."
      busy={isLoading}
      footer={<FormActions formId="kharcha-form" submitLabel="Save kharcha" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="kharcha-form">
        <CategoryField />
        <FieldGrid>
          <MoneyField name="amountPaisa" label="Amount" required />
          <DateField name="date" label="Date" required max={todayPK()} />
        </FieldGrid>
        {balancePaisa !== undefined ? (
          <p className={over ? "text-sm text-danger" : "text-sm text-muted-foreground"}>
            Cash in hand: <MoneyText paisa={balancePaisa} />
            {over ? " — not enough, ask for a top-up" : null}
          </p>
        ) : null}
        <TextField name="description" label="What for" required placeholder="Diesel for the mixer" />
        <AttachmentField name="receipt" label={goods ? "Bill / challan photo" : "Receipt photo (optional)"} kind="RECEIPT" required={goods} />
        {category === "URGENT_MATERIAL" ? (
          <>
            <ToggleField name="withItems" label="Add the goods to site stock" description="Pick the seller and materials; the office adds rates later." />
            {goods ? (
              <>
                <ComboboxField name="supplierId" label="Bought from" required options={(suppliers.data?.items ?? []).map((s) => ({ value: s.id, label: s.name, description: s.category ?? undefined }))} loading={suppliers.isLoading} />
                <LineItemsEditor name="items" columns={[{ key: "qty", label: "Quantity", kind: "quantity", required: true, width: "w-40" }]} emptyRow={() => ({ materialId: null, qty: null })} />
              </>
            ) : null}
          </>
        ) : null}
      </Form>
    </SlideOver>
  );
}

/** THEKEDAR sends cash to a munshi / PM; it counts once they acknowledge it. */
export function SendFloatSlideOver({ open, onOpenChange, projectId, holderUserId }: Open & { projectId?: string; holderUserId?: string }) {
  const users = useGetUsersQuery({ status: "ACTIVE", limit: 100 });
  const projects = useGetProjectsQuery({ limit: 100 });
  const [send, { isLoading }] = useSendFloatMutation();
  const run = useMutationToast();
  const form = useForm<FloatValues, unknown, z.output<typeof floatSchema>>({
    resolver: zodResolver(floatSchema),
    values: { holderUserId: holderUserId ?? null, amountPaisa: null, method: "EASYPAISA", reference: "", projectId: projectId ?? null, note: "" },
  });
  const holders = (users.data?.items ?? []).filter((u) => u.role !== "THEKEDAR").map((u) => ({ value: u.id, label: u.name, description: u.role === "PM" ? "Project manager" : "Munshi" }));
  const onSubmit = async (v: z.output<typeof floatSchema>) => {
    const ok = await run(
      () =>
        send({
          holderUserId: v.holderUserId,
          amountPaisa: v.amountPaisa,
          method: v.method,
          ...(v.reference ? { reference: v.reference } : {}),
          ...(v.projectId ? { projectId: v.projectId } : {}),
          ...(v.note ? { note: v.note } : {}),
        }).unwrap(),
      { success: "Float sent — waiting for the holder to confirm", setError: form.setError, codeFields: { INVALID_HOLDER: "holderUserId" } },
    );
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title="Send cash float"
      description="The holder gets an SMS and confirms in the app when the money reaches them."
      busy={isLoading}
      footer={<FormActions formId="float-form" submitLabel="Send float" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="float-form">
        <ComboboxField name="holderUserId" label="To" required options={holders} loading={users.isLoading} />
        <FieldGrid>
          <MoneyField name="amountPaisa" label="Amount" required />
          <SelectField name="method" label="Sent by" required options={FLOAT_METHOD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        </FieldGrid>
        <TextField name="reference" label="Reference" placeholder="EP88213" />
        <ComboboxField
          name="projectId"
          label="For project (optional)"
          options={(projects.data?.items ?? []).filter((p) => p.status === "ACTIVE" || p.status === "CLOSEOUT").map((p) => ({ value: p.id, label: p.name, description: p.code }))}
          loading={projects.isLoading}
        />
        <TextareaField name="note" label="Note" rows={2} />
      </Form>
    </SlideOver>
  );
}

export function TopupRequestSlideOver({ open, onOpenChange }: Open) {
  const [request, { isLoading }] = useRequestTopupMutation();
  const run = useMutationToast();
  const [clientId] = useState(newClientId);
  const form = useForm<TopupValues, unknown, z.output<typeof topupSchema>>({ resolver: zodResolver(topupSchema), values: { amountPaisa: null, note: "" } });
  const onSubmit = async (v: z.output<typeof topupSchema>) => {
    const ok = await run(() => request({ amountPaisa: v.amountPaisa, ...(v.note ? { note: v.note } : {}), clientId }).unwrap(), { success: "Top-up requested", setError: form.setError });
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title="Ask for a top-up"
      description="The owner sends a float when it is approved."
      busy={isLoading}
      footer={<FormActions formId="topup-form" submitLabel="Send request" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="topup-form">
        <MoneyField name="amountPaisa" label="Amount needed" required />
        <TextareaField name="note" label="What for" rows={2} placeholder="Wages on Saturday" />
      </Form>
    </SlideOver>
  );
}

export function ApproveTopupSlideOver({ open, onOpenChange, topup }: Open & { topup: TopupRequest }) {
  const [approve, { isLoading }] = useApproveTopupMutation();
  const run = useMutationToast();
  const form = useForm<ApproveTopupValues, unknown, z.output<typeof approveTopupSchema>>({
    resolver: zodResolver(approveTopupSchema),
    values: { amountPaisa: topup.amountPaisa, method: "EASYPAISA", reference: "" },
  });
  const onSubmit = async (v: z.output<typeof approveTopupSchema>) => {
    const ok = await run(() => approve({ id: topup.id, body: { amountPaisa: v.amountPaisa, method: v.method, ...(v.reference ? { reference: v.reference } : {}) } }).unwrap(), {
      success: "Approved — float sent",
      setError: form.setError,
    });
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={`Top-up for ${topup.holder.name}`}
      description={`Asked ${formatPKR(topup.amountPaisa)}${topup.note ? ` — “${topup.note}”` : ""}${topup.balancePaisa ? ` · has ${formatPKR(topup.balancePaisa)} now` : ""}`}
      busy={isLoading}
      footer={<FormActions formId="topup-approve" submitLabel="Approve & send" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="topup-approve">
        <FieldGrid>
          <MoneyField name="amountPaisa" label="Amount to send" required />
          <SelectField name="method" label="Sent by" required options={FLOAT_METHOD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        </FieldGrid>
        <TextField name="reference" label="Reference" />
      </Form>
    </SlideOver>
  );
}

/** Cash counted in hand; a difference from the book needs a reason. */
export function CashCountSlideOver({ open, onOpenChange, account }: Open & { account: CashAccount }) {
  const [count, { isLoading }] = useCreateCashCountMutation();
  const run = useMutationToast();
  const [clientId] = useState(newClientId);
  const form = useForm<CountValues, unknown, z.output<typeof countSchema>>({ resolver: zodResolver(countSchema), values: { countedPaisa: null, note: "" } });
  const counted = useWatch({ control: form.control, name: "countedPaisa" });
  const diff = counted !== null && counted !== undefined ? (toPaisaBigInt(counted) ?? BigInt(0)) - (toPaisaBigInt(account.balancePaisa) ?? BigInt(0)) : null;
  const onSubmit = async (v: z.output<typeof countSchema>) => {
    const ok = await run(() => count({ accountId: account.id, countedPaisa: v.countedPaisa, ...(v.note ? { note: v.note } : {}), clientId }).unwrap(), {
      success: "Count saved",
      setError: form.setError,
      codeFields: { NOTE_REQUIRED: "note" },
    });
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title="Count the cash"
      description={`${account.holder.name} · book says ${formatPKR(account.balancePaisa)}`}
      busy={isLoading}
      footer={<FormActions formId="count-form" submitLabel="Save count" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="count-form">
        <MoneyField name="countedPaisa" label="Cash counted" required />
        {diff !== null && diff !== BigInt(0) ? (
          <InlineAlert tone="warning" title={`${formatPKR((diff < BigInt(0) ? -diff : diff).toString())} ${diff < BigInt(0) ? "short" : "over"}`}>
            Write why — it becomes a count adjustment in the cash book.
          </InlineAlert>
        ) : null}
        <TextareaField name="note" label="Reason" rows={2} placeholder="Change to tea boy" required={diff !== null && diff !== BigInt(0)} />
      </Form>
    </SlideOver>
  );
}

/** Hand cash to another team member (e.g. a munshi leaving the site). */
export function HandoverSlideOver({ open, onOpenChange, account, people }: Open & { account: CashAccount; people: Array<{ id: string; name: string; description?: string }> }) {
  const [handover, { isLoading }] = useHandoverCashMutation();
  const run = useMutationToast();
  const form = useForm<HandoverValues, unknown, z.output<typeof handoverSchema>>({
    resolver: zodResolver(handoverSchema),
    values: { toUserId: null, amountPaisa: account.balancePaisa, note: "" },
  });
  const onSubmit = async (v: z.output<typeof handoverSchema>) => {
    const ok = await run(() => handover({ fromAccountId: account.id, toUserId: v.toUserId, amountPaisa: v.amountPaisa, ...(v.note ? { note: v.note } : {}) }).unwrap(), {
      success: "Cash handed over",
      setError: form.setError,
      codeFields: { INSUFFICIENT_CASH: "amountPaisa", INVALID_RECEIVER: "toUserId" },
    });
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title="Hand over cash"
      description={`From ${account.holder.name} (${formatPKR(account.balancePaisa)} in hand)`}
      busy={isLoading}
      footer={<FormActions formId="handover-form" submitLabel="Hand over" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="handover-form">
        <ComboboxField name="toUserId" label="To" required options={people.filter((p) => p.id !== account.holder.id).map((p) => ({ value: p.id, label: p.name, description: p.description }))} />
        <MoneyField name="amountPaisa" label="Amount" required />
        <TextareaField name="note" label="Note" rows={2} placeholder="Leaving the site" />
      </Form>
    </SlideOver>
  );
}
