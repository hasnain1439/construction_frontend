"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useGetSupplierQuery } from "@/api/services/masterData.api";
import { useCorrectPurchaseMutation, useCreatePurchaseReturnMutation, useSetPurchaseRatesMutation } from "@/api/services/procurement.api";
import type { PaidFrom, PaymentMode, Purchase } from "@/api/types";
import { LineItemsEditor } from "@/components/common/LineItemsEditor";
import { SlideOver } from "@/components/common/SlideOver";
import { AttachmentField } from "@/components/forms/AttachmentField";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatQty } from "@/lib/quantity";
import { applyLineError } from "../lineErrors";
import { correctionSchema, ratesSchema, returnSchema, type CorrectionValues, type RatesValues, type ReturnValues } from "../schemas";
import { PaymentFields } from "./PaymentFields";

interface Props {
  purchase: Purchase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Return goods to the supplier: credited at the purchase rate. */
export function ReturnSlideOver({ purchase, open, onOpenChange }: Props) {
  const [save, { isLoading }] = useCreatePurchaseReturnMutation();
  const run = useMutationToast();
  const form = useForm<ReturnValues, unknown, z.output<typeof returnSchema>>({
    resolver: zodResolver(returnSchema),
    values: {
      reason: "",
      note: "",
      attachment: null,
      items: purchase.items.map((i) => ({ materialId: i.material.id, material: i.material, qty: null })),
    },
  });
  const onSubmit = async (v: z.output<typeof returnSchema>) => {
    const items = v.items.filter((i) => i.qty && Number(i.qty) > 0).map((i) => ({ materialId: i.materialId, qty: i.qty as string }));
    const result = await run(
      () => save({ id: purchase.id, body: { reason: v.reason, items, ...(v.note ? { note: v.note } : {}), ...(v.attachment ? { attachmentId: v.attachment.id } : {}) } }).unwrap(),
      {
        success: (r) => `${r.number} saved — supplier credited`,
        setError: form.setError,
        onError: (_c, error) => applyLineError(error, v.items, form.setError, "items", { RETURN_EXCEEDS_STOCK: "qty", RETURN_EXCEEDS_PURCHASE: "qty", NOT_IN_PURCHASE: "qty" }),
      },
    );
    if (result) onOpenChange(false);
  };
  const id = `return-${purchase.id}`;
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={`Return goods — ${purchase.number}`}
      description={`${purchase.supplier.name} is credited at the purchase rate; the stock leaves ${purchase.location.name}.`}
      busy={isLoading}
      footer={<FormActions formId={id} submitLabel="Save return" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={id}>
        <LineItemsEditor
          name="items"
          materialMode="fixed"
          columns={[{ key: "qty", label: "Return qty", kind: "quantity", width: "w-40" }]}
          info={(row) => {
            const item = purchase.items.find((i) => i.material.id === row.materialId);
            return item?.goodQty !== null && item?.goodQty !== undefined ? `Bought (good): ${formatQty(item.correctedQty ?? item.goodQty, item.material.unit)}` : null;
          }}
        />
        <TextField name="reason" label="Reason" required placeholder="Hardened bags, wrong size…" />
        <TextareaField name="note" label="Note" rows={2} />
        <AttachmentField name="attachment" label="Return slip / photo (optional)" kind="DOCUMENT" />
      </Form>
    </SlideOver>
  );
}

/** Office prices a munshi's site purchase (rates + payment). */
export function RatesSlideOver({ purchase, open, onOpenChange }: Props) {
  const [save, { isLoading }] = useSetPurchaseRatesMutation();
  const supplier = useGetSupplierQuery(purchase.supplier.id, { skip: !open });
  const agreed = new Map((supplier.data?.rates ?? []).map((r) => [r.material.id, r.ratePaisa]));
  const run = useMutationToast();
  const form = useForm<RatesValues, unknown, z.output<typeof ratesSchema>>({
    resolver: zodResolver(ratesSchema),
    values: {
      items: purchase.items.map((i) => ({ materialId: i.material.id, material: i.material, ratePaisa: agreed.get(i.material.id) ?? null })),
      paymentMode: "UDHAAR",
      paidNowPaisa: null,
      paidFrom: null,
    },
  });
  const onSubmit = async (v: z.output<typeof ratesSchema>) => {
    const result = await run(
      () =>
        save({
          id: purchase.id,
          body: {
            items: v.items.map((i) => ({ materialId: i.materialId, ratePaisa: i.ratePaisa })),
            paymentMode: v.paymentMode as PaymentMode,
            ...(v.paymentMode === "PARTIAL" && v.paidNowPaisa ? { paidNowPaisa: v.paidNowPaisa } : {}),
            ...(v.paymentMode !== "UDHAAR" && v.paidFrom ? { paidFrom: v.paidFrom as PaidFrom } : {}),
          },
        }).unwrap(),
      { success: `${purchase.number} priced`, setError: form.setError, codeFields: { INVALID_PAID_AMOUNT: "paidNowPaisa" } },
    );
    if (result) onOpenChange(false);
  };
  const id = `rates-${purchase.id}`;
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={`Add rates — ${purchase.number}`}
      description="The munshi recorded what arrived. Add the rates to post the bill to the supplier and value the stock."
      busy={isLoading}
      footer={<FormActions formId={id} submitLabel="Save rates" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={id}>
        <LineItemsEditor
          name="items"
          materialMode="fixed"
          columns={[{ key: "ratePaisa", label: "Rate", kind: "money", required: true, width: "w-44" }]}
          info={(row) => {
            const item = purchase.items.find((i) => i.material.id === row.materialId);
            return item ? `Challan ${formatQty(item.challanQty ?? null, item.material.unit)} · good ${formatQty(item.goodQty, item.material.unit)}` : null;
          }}
        />
        <PaymentFields />
      </Form>
    </SlideOver>
  );
}

/** Owner fixes a saved purchase; the original stays visible. */
export function CorrectionSlideOver({ purchase, open, onOpenChange }: Props) {
  const [save, { isLoading }] = useCorrectPurchaseMutation();
  const run = useMutationToast();
  const lines = purchase.items.map((i) => ({
    purchaseItemId: i.id,
    materialId: i.material.id,
    material: i.material,
    currentQty: i.correctedQty ?? i.goodQty ?? 0,
    currentRatePaisa: i.correctedRatePaisa ?? i.ratePaisa ?? "0",
  }));
  const form = useForm<CorrectionValues, unknown, z.output<typeof correctionSchema>>({
    resolver: zodResolver(correctionSchema),
    values: { reason: "", items: lines.map((l) => ({ ...l, qty: String(l.currentQty), ratePaisa: l.currentRatePaisa })) },
  });
  const onSubmit = async (v: z.output<typeof correctionSchema>) => {
    const items = v.items
      .filter((i) => (i.qty !== null && Number(i.qty) !== i.currentQty) || (i.ratePaisa !== null && i.ratePaisa !== i.currentRatePaisa))
      .map((i) => ({
        purchaseItemId: i.purchaseItemId,
        ...(i.qty !== null && Number(i.qty) !== i.currentQty ? { qty: i.qty } : {}),
        ...(i.ratePaisa !== null && i.ratePaisa !== i.currentRatePaisa ? { ratePaisa: i.ratePaisa } : {}),
      }));
    const result = await run(() => save({ id: purchase.id, body: { reason: v.reason, items } }).unwrap(), {
      success: `${purchase.number} corrected`,
      setError: form.setError,
      onError: (_c, error) => applyLineError(error, v.items, form.setError, "items", { INSUFFICIENT_STOCK: "qty" }),
    });
    if (result) onOpenChange(false);
  };
  const id = `correct-${purchase.id}`;
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={`Correct ${purchase.number}`}
      description="Saved purchases are locked. A correction is recorded with your reason; the original stays visible and stock and the supplier ledger are adjusted."
      busy={isLoading}
      footer={<FormActions formId={id} submitLabel="Save correction" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id={id}>
        <LineItemsEditor
          name="items"
          materialMode="fixed"
          columns={[
            { key: "qty", label: "Correct qty", kind: "quantity", width: "w-36" },
            { key: "ratePaisa", label: "Correct rate", kind: "money", width: "w-40" },
          ]}
          amount={{ qtyKey: "qty", rateKey: "ratePaisa", label: "New amount" }}
        />
        <TextareaField name="reason" label="Reason" required rows={2} hint="Shown on the purchase and in the audit log." />
      </Form>
    </SlideOver>
  );
}
