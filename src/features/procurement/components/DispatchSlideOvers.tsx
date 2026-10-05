"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRight, CircleCheck, HandCoins, PackagePlus, Undo2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useCreateDispatchMutation, useResolveShortageMutation } from "@/api/services/dispatch.api";
import type { Resolution, Shortage } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { LineItemsEditor } from "@/components/common/LineItemsEditor";
import { MoneyText } from "@/components/common/MoneyText";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { AttachmentField } from "@/components/forms/AttachmentField";
import { ComboboxField, type ComboboxOption } from "@/components/forms/ComboboxField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { PhoneField } from "@/components/forms/PhoneInput";
import { RadioCards, type RadioCardOption } from "@/components/forms/RadioCards";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { useMutationToast } from "@/hooks/useMutationToast";
import { normalisePhone } from "@/lib/phone";
import { formatQty } from "@/lib/quantity";
import { applyLineError } from "../lineErrors";
import { useSiteProjectOptions } from "../options";
import { dispatchSchema, resolveSchema, type DispatchValues, type ResolveValues } from "../schemas";

export interface AvailableStock {
  materialId: string;
  qty: number;
  unit: string;
}

/**
 * Gate pass: stock leaves `from` at its average cost and travels (in transit) to a site.
 * Shows what is available per material; INSUFFICIENT_STOCK lands on the row.
 */
export function NewDispatchSlideOver({
  open,
  onOpenChange,
  fromOptions,
  defaultFromId,
  available,
  excludeProjectId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where it can leave from (Central Store, or this site for a transfer). */
  fromOptions: ComboboxOption[];
  defaultFromId: string | null;
  /** Stock per material at the source. */
  available: AvailableStock[];
  /** A site can't send to itself. */
  excludeProjectId?: string;
  onCreated?: (number: string) => void;
}) {
  const [create, { isLoading }] = useCreateDispatchMutation();
  const run = useMutationToast();
  const projects = useSiteProjectOptions();
  const form = useForm<DispatchValues, unknown, z.output<typeof dispatchSchema>>({
    resolver: zodResolver(dispatchSchema),
    values: { fromLocationId: defaultFromId, toProjectId: null, vehicleNo: "", driverName: "", driverPhone: "", note: "", loadPhoto: null, items: [{ materialId: null, qty: null }] },
  });
  const stock = new Map(available.map((a) => [a.materialId, a]));
  const inStock = available.filter((a) => a.qty > 0).map((a) => a.materialId);

  const onSubmit = async (v: z.output<typeof dispatchSchema>) => {
    const phone = v.driverPhone ? normalisePhone(v.driverPhone) : null;
    if (v.driverPhone && !phone) {
      form.setError("driverPhone", { message: "Enter a mobile number like 0300-1234567" });
      return;
    }
    const result = await run(
      () =>
        create({
          fromLocationId: v.fromLocationId,
          toProjectId: v.toProjectId,
          ...(v.vehicleNo ? { vehicleNo: v.vehicleNo } : {}),
          ...(v.driverName ? { driverName: v.driverName } : {}),
          ...(phone ? { driverPhone: phone } : {}),
          ...(v.note ? { note: v.note } : {}),
          ...(v.loadPhoto ? { loadPhotoAttachmentId: v.loadPhoto.id } : {}),
          items: v.items.map((i) => ({ materialId: i.materialId, qty: i.qty })),
        }).unwrap(),
      {
        success: (d) => `${d.number} sent — the site team got an SMS`,
        setError: form.setError,
        codeFields: { SAME_LOCATION: "toProjectId" },
        onError: (_c, error) => applyLineError(error, v.items, form.setError, "items", { INSUFFICIENT_STOCK: "qty" }),
      },
    );
    if (result) {
      onCreated?.(result.number);
      onOpenChange(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Dispatch to site"
      description="Creates a gate pass. The stock is on the way until the site counts it."
      busy={isLoading}
      footer={<FormActions formId="dispatch-form" submitLabel="Send" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="dispatch-form">
        <FieldGrid>
          <ComboboxField name="fromLocationId" label="From" required options={fromOptions} />
          <ComboboxField name="toProjectId" label="To site" required options={projects.options.filter((o) => o.value !== excludeProjectId)} loading={projects.loading} />
        </FieldGrid>
        <LineItemsEditor
          name="items"
          materialIds={inStock}
          describeMaterial={(m) => {
            const s = stock.get(m.id);
            return s ? `Available: ${formatQty(s.qty, s.unit)}` : undefined;
          }}
          columns={[{ key: "qty", label: "Send", kind: "quantity", required: true, width: "w-40" }]}
          info={(row) => {
            const s = row.materialId ? stock.get(row.materialId) : undefined;
            return s ? `Available: ${formatQty(s.qty, s.unit)}` : null;
          }}
          rowError={(row) => {
            const s = row.materialId ? stock.get(row.materialId) : undefined;
            const q = Number(row.qty ?? 0);
            return s && q > s.qty ? `Only ${formatQty(s.qty, s.unit)} available` : undefined;
          }}
          emptyRow={() => ({ materialId: null, qty: null })}
        />
        <FieldGrid columns={3}>
          <TextField name="vehicleNo" label="Vehicle no." placeholder="LES-4521" />
          <TextField name="driverName" label="Driver" placeholder="Nadeem" />
          <PhoneField name="driverPhone" label="Driver phone" />
        </FieldGrid>
        <AttachmentField name="loadPhoto" label="Load photo (optional)" kind="SITE_PHOTO" />
        <TextareaField name="note" label="Note" rows={2} />
      </Form>
    </SlideOver>
  );
}

const RESOLUTION_CARDS: Record<Resolution, RadioCardOption<Resolution>> = {
  SEND_REMAINING: { value: "SEND_REMAINING", title: "Send the remaining", description: "A new gate pass with this quantity goes from the same store / site.", icon: PackagePlus },
  RETURN_TO_STORE: { value: "RETURN_TO_STORE", title: "Back to store", description: "The goods are counted back in where they came from.", icon: Undo2 },
  ACCEPT_LOSS: { value: "ACCEPT_LOSS", title: "Accept the loss", description: "Close it as is — the value stays a loss on this project.", icon: CircleCheck },
  RECOVER_FROM_DRIVER: { value: "RECOVER_FROM_DRIVER", title: "Recover from driver", description: "The driver pays for it. Enter the amount recovered.", icon: HandCoins },
  SUPPLIER_CREDIT: { value: "SUPPLIER_CREDIT", title: "Supplier credit", description: "The supplier's account is credited with the value.", icon: ArrowLeftRight },
};

/** Owner's decision on a shortage. Only the decisions that apply are offered. */
export function ResolveShortageSlideOver({ shortage, open, onOpenChange }: { shortage: Shortage | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [resolve, { isLoading }] = useResolveShortageMutation();
  const run = useMutationToast();
  const form = useForm<ResolveValues, unknown, z.output<typeof resolveSchema>>({
    resolver: zodResolver(resolveSchema),
    values: { resolution: null, note: "", recoveredAmountPaisa: shortage?.valuePaisa ?? null },
  });
  const resolution = useWatch({ control: form.control, name: "resolution" });
  if (!shortage) return null;
  const options = shortage.allowedResolutions.map((r) => RESOLUTION_CARDS[r]);

  const onSubmit = async (v: z.output<typeof resolveSchema>) => {
    const result = await run(
      () =>
        resolve({
          id: shortage.id,
          body: {
            resolution: v.resolution as Resolution,
            note: v.note,
            ...(v.resolution === "RECOVER_FROM_DRIVER" && v.recoveredAmountPaisa ? { recoveredAmountPaisa: v.recoveredAmountPaisa } : {}),
          },
        }).unwrap(),
      { success: (s) => (s.newDispatch ? `Resolved — ${s.newDispatch.number} is on the way` : "Shortage resolved"), setError: form.setError },
    );
    if (result) onOpenChange(false);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Resolve shortage"
      description={
        <>
          {formatQty(shortage.qty, shortage.material.unit)} {shortage.material.name} · {shortage.dispatch?.number ?? shortage.purchase?.number}
        </>
      }
      busy={isLoading}
      footer={<FormActions formId="resolve-form" submitLabel="Save decision" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="resolve-form">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge domain="shortageKind" value={shortage.kind} />
          <span>Value</span>
          <MoneyText paisa={shortage.valuePaisa} className="font-semibold" />
        </div>
        {shortage.note ? <InlineAlert tone="info" title="Site note">{shortage.note}</InlineAlert> : null}
        <RadioCards<Resolution> name="resolution" label="Decision" options={options} />
        {resolution === "RECOVER_FROM_DRIVER" ? <MoneyField name="recoveredAmountPaisa" label="Amount recovered" required /> : null}
        {resolution === "SEND_REMAINING" && shortage.dispatch ? (
          <p className="text-sm text-muted-foreground">
            Uses the same vehicle {shortage.dispatch.vehicleNo ? `(${shortage.dispatch.vehicleNo})` : ""} and driver as {shortage.dispatch.number}.
          </p>
        ) : null}
        <TextareaField name="note" label="Note" required rows={3} hint="Why — shown on the shortage and in the audit log." />
      </Form>
    </SlideOver>
  );
}
