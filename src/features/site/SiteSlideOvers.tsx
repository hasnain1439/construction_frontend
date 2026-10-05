"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useCreateOwnerDeliveryMutation } from "@/api/services/dispatch.api";
import { useRecordUsageMutation } from "@/api/services/inventory.api";
import { useGetMaterialsQuery } from "@/api/services/masterData.api";
import type { SiteStockRow, SupplyRule } from "@/api/types";
import { LineItemsEditor } from "@/components/common/LineItemsEditor";
import { SlideOver } from "@/components/common/SlideOver";
import { AttachmentField } from "@/components/forms/AttachmentField";
import { DateField } from "@/components/forms/DateField";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { TextareaField } from "@/components/forms/TextareaField";
import { applyLineError } from "@/features/procurement/lineErrors";
import { ownerDeliverySchema, usageSchema, type OwnerDeliveryValues, type UsageValues } from "@/features/procurement/schemas";
import { useMutationToast } from "@/hooks/useMutationToast";
import { todayPK } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";

/** Which material groups each project supply category covers (mirrors the backend). */
export const SUPPLY_GROUPS: Record<string, string[]> = {
  CEMENT: ["CEMENT"],
  BRICKS: ["BRICKS"],
  STEEL: ["STEEL"],
  SAND_BAJRI: ["AGGREGATES"],
  WATERPROOFING: ["WATERPROOFING"],
  PIPES: ["PLUMBING"],
  ELECTRICAL: ["ELECTRICAL"],
  TILES_FLOORING: ["FLOORING"],
  SANITARY: ["SANITARY"],
  WOODWORK: ["WOODWORK"],
  PAINT: ["PAINT"],
};

/** Material used on site today: each quantity must be in the site stock. */
export function RecordUsageSlideOver({ open, onOpenChange, projectId, stock }: { open: boolean; onOpenChange: (open: boolean) => void; projectId: string; stock: SiteStockRow[] }) {
  const [record, { isLoading }] = useRecordUsageMutation();
  const run = useMutationToast();
  const byId = new Map(stock.map((s) => [s.material.id, s]));
  const form = useForm<UsageValues, unknown, z.output<typeof usageSchema>>({
    resolver: zodResolver(usageSchema),
    values: { usageDate: todayPK(), note: "", items: [{ materialId: null, qty: null }] },
  });
  const onSubmit = async (v: z.output<typeof usageSchema>) => {
    const result = await run(
      () => record({ projectId, body: { usageDate: v.usageDate, ...(v.note ? { note: v.note } : {}), items: v.items.map((i) => ({ materialId: i.materialId, qty: i.qty })) } }).unwrap(),
      {
        success: "Usage saved",
        setError: form.setError,
        codeFields: { DATE_IN_FUTURE: "usageDate" },
        onError: (_c, error) => applyLineError(error, v.items, form.setError, "items", { INSUFFICIENT_STOCK: "qty" }),
      },
    );
    if (result) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Record material usage"
      description="Maal lag gaya — what was used on site."
      busy={isLoading}
      footer={<FormActions formId="usage-form" submitLabel="Save usage" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="usage-form">
        <DateField name="usageDate" label="Date" required max={todayPK()} />
        <LineItemsEditor
          name="items"
          materialIds={stock.filter((s) => s.inStock > 0).map((s) => s.material.id)}
          describeMaterial={(m) => {
            const s = byId.get(m.id);
            return s ? `In stock: ${formatQty(s.inStock, s.material.unit)}` : undefined;
          }}
          columns={[{ key: "qty", label: "Used", kind: "quantity", required: true, width: "w-40" }]}
          info={(row) => {
            const s = row.materialId ? byId.get(row.materialId) : undefined;
            return s ? `In stock: ${formatQty(s.inStock, s.material.unit)}` : null;
          }}
          rowError={(row) => {
            const s = row.materialId ? byId.get(row.materialId) : undefined;
            return s && Number(row.qty ?? 0) > s.inStock ? `Only ${formatQty(s.inStock, s.material.unit)} in stock` : undefined;
          }}
          emptyRow={() => ({ materialId: null, qty: null })}
        />
        <TextareaField name="note" label="Note" rows={2} placeholder="Roof slab, first floor" />
      </Form>
    </SlideOver>
  );
}

/** Material the owner brought himself — only categories the owner supplies on this project. */
export function OwnerDeliverySlideOver({ open, onOpenChange, projectId, supplyRules }: { open: boolean; onOpenChange: (open: boolean) => void; projectId: string; supplyRules?: SupplyRule[] }) {
  const [create, { isLoading }] = useCreateOwnerDeliveryMutation();
  const materials = useGetMaterialsQuery();
  const run = useMutationToast();
  const ownerGroups = new Set((supplyRules ?? []).filter((r) => r.suppliedBy === "OWNER").flatMap((r) => SUPPLY_GROUPS[r.categoryKey] ?? []));
  const allowed = supplyRules ? (materials.data ?? []).filter((m) => ownerGroups.has(m.group.code)).map((m) => m.id) : undefined;
  const form = useForm<OwnerDeliveryValues, unknown, z.output<typeof ownerDeliverySchema>>({
    resolver: zodResolver(ownerDeliverySchema),
    values: { deliveryDate: todayPK(), note: "", photo: null, items: [{ materialId: null, qty: null }] },
  });
  const onSubmit = async (v: z.output<typeof ownerDeliverySchema>) => {
    const result = await run(
      () =>
        create({
          projectId,
          body: { deliveryDate: v.deliveryDate, ...(v.note ? { note: v.note } : {}), photoAttachmentIds: v.photo ? [v.photo.id] : [], items: v.items.map((i) => ({ materialId: i.materialId, qty: i.qty })) },
        }).unwrap(),
      {
        success: "Owner delivery recorded",
        setError: form.setError,
        onError: (_c, error) => applyLineError(error, v.items, form.setError, "items", { NOT_OWNER_SUPPLIED: "materialId" }),
      },
    );
    if (result) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Record owner delivery"
      description="Material the owner sent himself. It is tracked in the site stock at no cost to you."
      busy={isLoading}
      footer={<FormActions formId="owner-delivery-form" submitLabel="Save delivery" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="owner-delivery-form">
        <DateField name="deliveryDate" label="Date" required max={todayPK()} />
        {allowed && allowed.length === 0 ? <p className="text-sm text-muted-foreground">The owner doesn&apos;t supply any material category on this project (see Supply Split).</p> : null}
        <LineItemsEditor name="items" materialIds={allowed} columns={[{ key: "qty", label: "Quantity", kind: "quantity", required: true, width: "w-40" }]} emptyRow={() => ({ materialId: null, qty: null })} />
        <AttachmentField name="photo" label="Photo (optional)" kind="SITE_PHOTO" />
        <TextareaField name="note" label="Note" rows={2} />
      </Form>
    </SlideOver>
  );
}
