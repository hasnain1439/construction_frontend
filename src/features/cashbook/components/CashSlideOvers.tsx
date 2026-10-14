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
import { useEnumT, useT } from "@/i18n/useT";
import { todayPK } from "@/lib/dates";
import { formatPKR, toPaisaBigInt } from "@/lib/money";

interface Open {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CategoryField() {
  const error = useFieldError("category");
  const t = useT();
  return (
    <FormField label={t("field.category")} required error={error}>
      {() => <Controller name="category" render={({ field }) => <CategoryChips value={(field.value as KharchaCategory | null) ?? undefined} onChange={(v) => field.onChange(v ?? null)} />} />}
    </FormField>
  );
}

/** Float methods (cash, bank, wallets) as select options in the current language. */
function useFloatMethodOptions() {
  const te = useEnumT();
  return FLOAT_METHOD_OPTIONS.map((o) => ({ value: o.value, label: te("cashFloatMethod", o.value, o.label) }));
}

/** Kharcha from the holder's own site cash; above the company limit it waits for approval. */
export function KharchaSlideOver({ open, onOpenChange, projectId, balancePaisa }: Open & { projectId: string; balancePaisa?: string }) {
  const t = useT();
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
        success: (r) => (r.status === "PENDING_APPROVAL" ? t("cashSite.cash.kharchaSavedPending") : t("cashSite.cash.kharchaSaved")),
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
      title={t("cashSite.cash.addKharcha")}
      description={t("cashSite.cash.kharchaDesc")}
      busy={isLoading}
      footer={<FormActions formId="kharcha-form" submitLabel={t("cashSite.cash.saveKharcha")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="kharcha-form">
        <CategoryField />
        <FieldGrid>
          <MoneyField name="amountPaisa" label={t("field.amount")} required />
          <DateField name="date" label={t("field.date")} required max={todayPK()} />
        </FieldGrid>
        {balancePaisa !== undefined ? (
          <p className={over ? "text-sm text-danger" : "text-sm text-muted-foreground"}>
            {t(over ? "cashSite.cash.cashInHandShort" : "cashSite.cash.cashInHand", { amount: formatPKR(balancePaisa) })}
          </p>
        ) : null}
        <TextField name="description" label={t("cashSite.cash.whatFor")} required placeholder={t("cashSite.cash.whatForPlaceholder")} />
        <AttachmentField name="receipt" label={goods ? t("cashSite.cash.billPhoto") : t("cashSite.cash.receiptPhoto")} kind="RECEIPT" required={goods} />
        {category === "URGENT_MATERIAL" ? (
          <>
            <ToggleField name="withItems" label={t("cashSite.cash.addToStock")} description={t("cashSite.cash.addToStockDesc")} />
            {goods ? (
              <>
                <ComboboxField
                  name="supplierId"
                  label={t("cashSite.cash.boughtFrom")}
                  required
                  options={(suppliers.data?.items ?? []).map((s) => ({ value: s.id, label: s.name, description: s.category ?? undefined }))}
                  loading={suppliers.isLoading}
                />
                <LineItemsEditor name="items" columns={[{ key: "qty", label: t("field.quantity"), kind: "quantity", required: true, width: "w-40" }]} emptyRow={() => ({ materialId: null, qty: null })} />
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
  const t = useT();
  const methods = useFloatMethodOptions();
  const users = useGetUsersQuery({ status: "ACTIVE", limit: 100 });
  const projects = useGetProjectsQuery({ limit: 100 });
  const [send, { isLoading }] = useSendFloatMutation();
  const run = useMutationToast();
  const form = useForm<FloatValues, unknown, z.output<typeof floatSchema>>({
    resolver: zodResolver(floatSchema),
    values: { holderUserId: holderUserId ?? null, amountPaisa: null, method: "EASYPAISA", reference: "", projectId: projectId ?? null, note: "" },
  });
  const holders = (users.data?.items ?? [])
    .filter((u) => u.role !== "THEKEDAR")
    .map((u) => ({ value: u.id, label: u.name, description: u.role === "PM" ? t("field.projectManager") : t("field.munshi") }));
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
      { success: t("cashSite.cash.floatSent"), setError: form.setError, codeFields: { INVALID_HOLDER: "holderUserId" } },
    );
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t("cashSite.cash.sendFloatTitle")}
      description={t("cashSite.cash.sendFloatDesc")}
      busy={isLoading}
      footer={<FormActions formId="float-form" submitLabel={t("cashSite.cash.sendFloat")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="float-form">
        <ComboboxField name="holderUserId" label={t("field.to")} required options={holders} loading={users.isLoading} />
        <FieldGrid>
          <MoneyField name="amountPaisa" label={t("field.amount")} required />
          <SelectField name="method" label={t("cashSite.cash.sentBy")} required options={methods} />
        </FieldGrid>
        {/* i18n-ignore: sample reference number, the same in every language */}
        <TextField name="reference" label={t("field.reference")} placeholder="EP88213" />
        <ComboboxField
          name="projectId"
          label={t("cashSite.cash.forProject")}
          options={(projects.data?.items ?? []).filter((p) => p.status === "ACTIVE" || p.status === "CLOSEOUT").map((p) => ({ value: p.id, label: p.name, description: p.code }))}
          loading={projects.isLoading}
        />
        <TextareaField name="note" label={t("field.note")} rows={2} />
      </Form>
    </SlideOver>
  );
}

export function TopupRequestSlideOver({ open, onOpenChange }: Open) {
  const t = useT();
  const [request, { isLoading }] = useRequestTopupMutation();
  const run = useMutationToast();
  const [clientId] = useState(newClientId);
  const form = useForm<TopupValues, unknown, z.output<typeof topupSchema>>({ resolver: zodResolver(topupSchema), values: { amountPaisa: null, note: "" } });
  const onSubmit = async (v: z.output<typeof topupSchema>) => {
    const ok = await run(() => request({ amountPaisa: v.amountPaisa, ...(v.note ? { note: v.note } : {}), clientId }).unwrap(), {
      success: t("cashSite.cash.topupRequested"),
      setError: form.setError,
    });
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t("cashSite.cash.topupTitle")}
      description={t("cashSite.cash.topupDesc")}
      busy={isLoading}
      footer={<FormActions formId="topup-form" submitLabel={t("cashSite.cash.sendRequest")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="topup-form">
        <MoneyField name="amountPaisa" label={t("cashSite.cash.amountNeeded")} required />
        <TextareaField name="note" label={t("cashSite.cash.whatFor")} rows={2} placeholder={t("cashSite.cash.topupPlaceholder")} />
      </Form>
    </SlideOver>
  );
}

export function ApproveTopupSlideOver({ open, onOpenChange, topup }: Open & { topup: TopupRequest }) {
  const t = useT();
  const methods = useFloatMethodOptions();
  const [approve, { isLoading }] = useApproveTopupMutation();
  const run = useMutationToast();
  const form = useForm<ApproveTopupValues, unknown, z.output<typeof approveTopupSchema>>({
    resolver: zodResolver(approveTopupSchema),
    values: { amountPaisa: topup.amountPaisa, method: "EASYPAISA", reference: "" },
  });
  const onSubmit = async (v: z.output<typeof approveTopupSchema>) => {
    const ok = await run(() => approve({ id: topup.id, body: { amountPaisa: v.amountPaisa, method: v.method, ...(v.reference ? { reference: v.reference } : {}) } }).unwrap(), {
      success: t("cashSite.cash.approvedSent"),
      setError: form.setError,
    });
    if (ok) onOpenChange(false);
  };
  const asked = t("cashSite.cash.askedAmount", { amount: formatPKR(topup.amountPaisa) }) + (topup.note ? ` — “${topup.note}”` : "");
  const hasNow = topup.balancePaisa ? t("cashSite.cash.hasAmountNow", { amount: formatPKR(topup.balancePaisa) }) : null;
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t("cashSite.cash.approveTitle", { name: topup.holder.name })}
      description={hasNow ? `${asked} · ${hasNow}` : asked}
      busy={isLoading}
      footer={<FormActions formId="topup-approve" submitLabel={t("cashSite.cash.approveSend")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="topup-approve">
        <FieldGrid>
          <MoneyField name="amountPaisa" label={t("cashSite.cash.amountToSend")} required />
          <SelectField name="method" label={t("cashSite.cash.sentBy")} required options={methods} />
        </FieldGrid>
        <TextField name="reference" label={t("field.reference")} />
      </Form>
    </SlideOver>
  );
}

/** Cash counted in hand; a difference from the book needs a reason. */
export function CashCountSlideOver({ open, onOpenChange, account }: Open & { account: CashAccount }) {
  const t = useT();
  const [count, { isLoading }] = useCreateCashCountMutation();
  const run = useMutationToast();
  const [clientId] = useState(newClientId);
  const form = useForm<CountValues, unknown, z.output<typeof countSchema>>({ resolver: zodResolver(countSchema), values: { countedPaisa: null, note: "" } });
  const counted = useWatch({ control: form.control, name: "countedPaisa" });
  const diff = counted !== null && counted !== undefined ? (toPaisaBigInt(counted) ?? BigInt(0)) - (toPaisaBigInt(account.balancePaisa) ?? BigInt(0)) : null;
  const onSubmit = async (v: z.output<typeof countSchema>) => {
    const ok = await run(() => count({ accountId: account.id, countedPaisa: v.countedPaisa, ...(v.note ? { note: v.note } : {}), clientId }).unwrap(), {
      success: t("cashSite.cash.countSaved"),
      setError: form.setError,
      codeFields: { NOTE_REQUIRED: "note" },
    });
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t("cashSite.cash.countTitle")}
      description={t("cashSite.cash.countDesc", { name: account.holder.name, amount: formatPKR(account.balancePaisa) })}
      busy={isLoading}
      footer={<FormActions formId="count-form" submitLabel={t("cashSite.cash.saveCount")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="count-form">
        <MoneyField name="countedPaisa" label={t("cashSite.cash.cashCounted")} required />
        {diff !== null && diff !== BigInt(0) ? (
          <InlineAlert
            tone="warning"
            title={t(diff < BigInt(0) ? "cashSite.cash.amountShort" : "cashSite.cash.amountOver", { amount: formatPKR((diff < BigInt(0) ? -diff : diff).toString()) })}
          >
            {t("cashSite.cash.countAlertBody")}
          </InlineAlert>
        ) : null}
        <TextareaField name="note" label={t("field.reason")} rows={2} placeholder={t("cashSite.cash.countPlaceholder")} required={diff !== null && diff !== BigInt(0)} />
      </Form>
    </SlideOver>
  );
}

/** Hand cash to another team member (e.g. a munshi leaving the site). */
export function HandoverSlideOver({ open, onOpenChange, account, people }: Open & { account: CashAccount; people: Array<{ id: string; name: string; description?: string }> }) {
  const t = useT();
  const [handover, { isLoading }] = useHandoverCashMutation();
  const run = useMutationToast();
  const form = useForm<HandoverValues, unknown, z.output<typeof handoverSchema>>({
    resolver: zodResolver(handoverSchema),
    values: { toUserId: null, amountPaisa: account.balancePaisa, note: "" },
  });
  const onSubmit = async (v: z.output<typeof handoverSchema>) => {
    const ok = await run(() => handover({ fromAccountId: account.id, toUserId: v.toUserId, amountPaisa: v.amountPaisa, ...(v.note ? { note: v.note } : {}) }).unwrap(), {
      success: t("cashSite.cash.handedOver"),
      setError: form.setError,
      codeFields: { INSUFFICIENT_CASH: "amountPaisa", INVALID_RECEIVER: "toUserId" },
    });
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t("cashSite.cash.handoverTitle")}
      description={t("cashSite.cash.handoverDesc", { name: account.holder.name, amount: formatPKR(account.balancePaisa) })}
      busy={isLoading}
      footer={<FormActions formId="handover-form" submitLabel={t("cashSite.cash.handOver")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="handover-form">
        <ComboboxField
          name="toUserId"
          label={t("field.to")}
          required
          options={people.filter((p) => p.id !== account.holder.id).map((p) => ({ value: p.id, label: p.name, description: p.description }))}
        />
        <MoneyField name="amountPaisa" label={t("field.amount")} required />
        <TextareaField name="note" label={t("field.note")} rows={2} placeholder={t("cashSite.cash.handoverPlaceholder")} />
      </Form>
    </SlideOver>
  );
}
