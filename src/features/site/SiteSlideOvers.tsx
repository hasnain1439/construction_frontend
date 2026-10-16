"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useCreateOwnerDeliveryMutation } from "@/api/services/dispatch.api";
import { useRecordUsageMutation } from "@/api/services/inventory.api";
import { useGetScheduleQuery } from "@/api/services/schedule.api";
import { useGetMaterialsQuery } from "@/api/services/masterData.api";
import type { SiteStockRow, SupplyRule } from "@/api/types";
import { LineItemsEditor } from "@/components/common/LineItemsEditor";
import { useCan } from "@/components/common/PermissionGate";
import { SlideOver } from "@/components/common/SlideOver";
import { AttachmentField } from "@/components/forms/AttachmentField";
import { DateField } from "@/components/forms/DateField";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { applyLineError } from "@/features/procurement/lineErrors";
import { ownerDeliverySchema, usageSchema, type OwnerDeliveryValues, type UsageValues } from "@/features/procurement/schemas";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
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
  const t = useT();
  const [record, { isLoading }] = useRecordUsageMutation();
  const run = useMutationToast();
  const byId = new Map(stock.map((s) => [s.material.id, s]));
  // Step 13: optional milestone link (counts against its material quota); only with schedule access and a plan.
  const canSchedule = useCan("schedule.plan.view");
  const schedule = useGetScheduleQuery(projectId, { skip: !open || !canSchedule });
  const milestoneOptions = (schedule.data?.milestones ?? []).filter((m) => m.status !== "DONE").map((m) => ({ value: m.id, label: m.name }));
  const form = useForm<UsageValues, unknown, z.output<typeof usageSchema>>({
    resolver: zodResolver(usageSchema),
    values: { usageDate: todayPK(), note: "", milestoneId: null, items: [{ materialId: null, qty: null }] },
  });
  const onSubmit = async (v: z.output<typeof usageSchema>) => {
    const result = await run(
      () => record({ projectId, body: { usageDate: v.usageDate, ...(v.note ? { note: v.note } : {}), ...(v.milestoneId ? { milestoneId: v.milestoneId } : {}), items: v.items.map((i) => ({ materialId: i.materialId, qty: i.qty })) } }).unwrap(),
      {
        success: t("cashSite.site.usageSaved"),
        setError: form.setError,
        codeFields: { DATE_IN_FUTURE: "usageDate", INVALID_MILESTONE: "milestoneId" },
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
      title={t("cashSite.site.recordUsageTitle")}
      description={t("cashSite.site.recordUsageDesc")}
      busy={isLoading}
      footer={<FormActions formId="usage-form" submitLabel={t("cashSite.site.saveUsage")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="usage-form">
        <DateField name="usageDate" label={t("field.date")} required max={todayPK()} />
        {milestoneOptions.length > 0 ? (
          <SelectField name="milestoneId" label={t("cashSite.site.usageMilestone")} hint={t("cashSite.site.usageMilestoneHint")} options={milestoneOptions} placeholder={t("cashSite.site.usageNoMilestone")} noneLabel={t("cashSite.site.usageNoMilestone")} />
        ) : null}
        <LineItemsEditor
          name="items"
          materialIds={stock.filter((s) => s.inStock > 0).map((s) => s.material.id)}
          describeMaterial={(m) => {
            const s = byId.get(m.id);
            return s ? t("cashSite.site.inStockQty", { qty: formatQty(s.inStock, s.material.unit) }) : undefined;
          }}
          columns={[{ key: "qty", label: t("cashSite.site.colUsed"), kind: "quantity", required: true, width: "w-40" }]}
          info={(row) => {
            const s = row.materialId ? byId.get(row.materialId) : undefined;
            return s ? t("cashSite.site.inStockQty", { qty: formatQty(s.inStock, s.material.unit) }) : null;
          }}
          rowError={(row) => {
            const s = row.materialId ? byId.get(row.materialId) : undefined;
            return s && Number(row.qty ?? 0) > s.inStock ? t("cashSite.site.onlyInStock", { qty: formatQty(s.inStock, s.material.unit) }) : undefined;
          }}
          emptyRow={() => ({ materialId: null, qty: null })}
        />
        <TextareaField name="note" label={t("field.note")} rows={2} placeholder={t("cashSite.site.usagePlaceholder")} />
      </Form>
    </SlideOver>
  );
}

/** Material the owner brought himself — only categories the owner supplies on this project. */
export function OwnerDeliverySlideOver({ open, onOpenChange, projectId, supplyRules }: { open: boolean; onOpenChange: (open: boolean) => void; projectId: string; supplyRules?: SupplyRule[] }) {
  const t = useT();
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
        success: t("cashSite.site.ownerDeliveryRecorded"),
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
      title={t("cashSite.site.recordOwnerDelivery")}
      description={t("cashSite.site.ownerDeliveryFormDesc")}
      busy={isLoading}
      footer={<FormActions formId="owner-delivery-form" submitLabel={t("cashSite.site.saveDelivery")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="owner-delivery-form">
        <DateField name="deliveryDate" label={t("field.date")} required max={todayPK()} />
        {allowed && allowed.length === 0 ? <p className="text-sm text-muted-foreground">{t("cashSite.site.ownerSuppliesNothing")}</p> : null}
        <LineItemsEditor name="items" materialIds={allowed} columns={[{ key: "qty", label: t("field.quantity"), kind: "quantity", required: true, width: "w-40" }]} emptyRow={() => ({ materialId: null, qty: null })} />
        <AttachmentField name="photo" label={t("cashSite.site.photoOptional")} kind="SITE_PHOTO" />
        <TextareaField name="note" label={t("field.note")} rows={2} />
      </Form>
    </SlideOver>
  );
}
