"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import {
  useAdjustEquipmentMutation,
  useCreateEquipmentMutation,
  useStockInEquipmentMutation,
  useUpdateEquipmentMutation,
} from "@/api/services/equipment.api";
import type { Equipment, EquipmentDetail } from "@/api/types";
import { SlideOver } from "@/components/common/SlideOver";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form, FormSection } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { NumberField } from "@/components/forms/NumberField";
import { QuantityField } from "@/components/forms/QuantityInput";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { useSiteProjectOptions } from "@/features/procurement/options";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { todayPK } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import { placeName, useCategoryOptions, useKindOptions, useSeesRates } from "../options";
import {
  adjustSchema,
  equipmentSchema,
  stockInSchema,
  type AdjustValues,
  type EquipmentValues,
  type StockInValues,
} from "../schemas";

const blankToUndefined = (value: string) => (value ? value : undefined);

/** Add or edit an item of the register. Hire rate and replacement value only for `fields.rates`. */
export function EquipmentFormSlideOver({
  open,
  onOpenChange,
  equipment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment?: Equipment | null;
}) {
  const t = useT();
  const rates = useSeesRates();
  const [create, created] = useCreateEquipmentMutation();
  const [update, updated] = useUpdateEquipmentMutation();
  const run = useMutationToast();
  const categories = useCategoryOptions();
  const kinds = useKindOptions();
  const editing = Boolean(equipment);
  const form = useForm<EquipmentValues, unknown, z.output<typeof equipmentSchema>>({
    resolver: zodResolver(equipmentSchema),
    values: {
      name: equipment?.name ?? "",
      code: equipment?.code ?? "",
      kind: equipment?.kind ?? "BULK",
      category: equipment?.category ?? "SHUTTERING_PLATE",
      unit: equipment?.unit ?? "nos",
      serialNo: equipment?.serialNo ?? "",
      hireRatePaisaPerDay: equipment?.hireRatePaisaPerDay ?? null,
      replacementValuePaisa: equipment?.replacementValuePaisa ?? null,
      coverageSqftPerUnit: equipment?.coverageSqftPerUnit ?? null,
      notes: equipment?.notes ?? "",
      isActive: equipment?.isActive ?? true,
    },
  });
  const category = useWatch({ control: form.control, name: "category" });
  const busy = created.isLoading || updated.isLoading;

  const onSubmit = async (v: z.output<typeof equipmentSchema>) => {
    const money = rates
      ? {
          ...(v.hireRatePaisaPerDay ? { hireRatePaisaPerDay: v.hireRatePaisaPerDay } : {}),
          ...(v.replacementValuePaisa ? { replacementValuePaisa: v.replacementValuePaisa } : {}),
        }
      : {};
    const result = equipment
      ? await run(
          () =>
            update({
              id: equipment.id,
              body: {
                name: v.name,
                code: v.code || null,
                kind: v.kind,
                category: v.category,
                ...(v.unit ? { unit: v.unit } : {}),
                serialNo: v.serialNo || null,
                coverageSqftPerUnit: v.coverageSqftPerUnit,
                notes: v.notes || null,
                isActive: v.isActive,
                ...money,
              },
            }).unwrap(),
          {
            success: t("equipment.register.saved", { name: v.name }),
            setError: form.setError,
            codeFields: { EQUIPMENT_EXISTS: "name" },
          },
        )
      : await run(
          () =>
            create({
              name: v.name,
              kind: v.kind,
              category: v.category,
              code: blankToUndefined(v.code),
              unit: blankToUndefined(v.unit),
              serialNo: blankToUndefined(v.serialNo),
              notes: blankToUndefined(v.notes),
              ...(v.coverageSqftPerUnit !== null ? { coverageSqftPerUnit: v.coverageSqftPerUnit } : {}),
              ...money,
            }).unwrap(),
          {
            success: t("equipment.register.added", { name: v.name }),
            setError: form.setError,
            codeFields: { EQUIPMENT_EXISTS: "name" },
          },
        );
    if (result) onOpenChange(false);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={editing ? t("equipment.register.editTitle") : t("equipment.register.newTitle")}
      description={t("equipment.register.formDesc")}
      busy={busy}
      footer={
        <FormActions
          formId="equipment-form"
          submitLabel={editing ? t("common.saveChanges") : t("equipment.register.add")}
          loading={busy}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id="equipment-form">
        <FieldGrid>
          <TextField
            name="name"
            label={t("equipment.field.name")}
            required
            placeholder={t("equipment.register.namePlaceholder")}
          />
          <TextField
            name="code"
            label={t("equipment.field.code")}
            placeholder={t("equipment.register.codePlaceholder")}
          />
          <SelectField name="category" label={t("field.category")} required options={categories} />
          <SegmentedField
            name="kind"
            label={t("equipment.field.kind")}
            required
            options={kinds}
            hint={t("equipment.register.kindHint")}
          />
          <TextField
            name="unit"
            label={t("field.unit")}
            placeholder={t("equipment.register.unitPlaceholder")}
          />
          <TextField name="serialNo" label={t("equipment.field.serialNo")} />
          {category === "SHUTTERING_PLATE" ? (
            <NumberField
              name="coverageSqftPerUnit"
              label={t("equipment.field.coverage")}
              unit={t("field.sqft")}
              decimals={2}
              hint={t("equipment.register.coverageHint")}
            />
          ) : null}
        </FieldGrid>
        {rates ? (
          <FormSection
            title={t("equipment.register.ratesTitle")}
            description={t("equipment.register.ratesDesc")}
          >
            <FieldGrid>
              <MoneyField
                name="hireRatePaisaPerDay"
                label={t("equipment.field.hireRate")}
                suffix={t("field.perDay")}
                hint={t("equipment.register.hireRateHint")}
              />
              <MoneyField
                name="replacementValuePaisa"
                label={t("equipment.field.replacementValue")}
                hint={t("equipment.register.replacementHint")}
              />
            </FieldGrid>
          </FormSection>
        ) : null}
        <TextareaField name="notes" label={t("field.notes")} rows={2} />
        {editing ? (
          <ToggleField
            name="isActive"
            label={t("common.active")}
            description={t("equipment.register.activeHint")}
          />
        ) : null}
      </Form>
    </SlideOver>
  );
}

/** Opening stock or a purchase: units arrive at the yard (default) or a project site. */
export function StockInSlideOver({
  open,
  onOpenChange,
  equipment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
}) {
  const t = useT();
  const [stockIn, { isLoading }] = useStockInEquipmentMutation();
  const run = useMutationToast();
  const projects = useSiteProjectOptions();
  const form = useForm<StockInValues, unknown, z.output<typeof stockInSchema>>({
    resolver: zodResolver(stockInSchema),
    values: { type: "OPENING", where: "YARD", projectId: null, qty: null, date: todayPK(), note: "" },
  });
  const where = useWatch({ control: form.control, name: "where" });
  if (!equipment) return null;

  const onSubmit = async (v: z.output<typeof stockInSchema>) => {
    const result = await run(
      () =>
        stockIn({
          id: equipment.id,
          body: {
            type: v.type,
            qty: v.qty,
            date: v.date,
            ...(v.where === "SITE" && v.projectId ? { projectId: v.projectId } : {}),
            ...(v.note ? { note: v.note } : {}),
          },
        }).unwrap(),
      {
        success: t("equipment.stockIn.saved", {
          qty: formatQty(v.qty, equipment.unit),
          name: equipment.name,
        }),
        setError: form.setError,
      },
    );
    if (result) onOpenChange(false);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t("equipment.stockIn.title")}
      description={equipment.name}
      busy={isLoading}
      footer={
        <FormActions
          formId="stock-in-form"
          submitLabel={t("equipment.stockIn.save")}
          loading={isLoading}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id="stock-in-form">
        <SegmentedField
          name="type"
          label={t("field.type")}
          options={[
            { value: "OPENING", label: t("equipment.stockIn.opening") },
            { value: "PURCHASE", label: t("equipment.stockIn.purchase") },
          ]}
        />
        <SegmentedField
          name="where"
          label={t("equipment.stockIn.where")}
          options={[
            { value: "YARD", label: t("equipment.common.yard") },
            { value: "SITE", label: t("equipment.common.projectSite") },
          ]}
        />
        {where === "SITE" ? (
          <ComboboxField
            name="projectId"
            label={t("field.project")}
            required
            options={projects.options}
            loading={projects.loading}
          />
        ) : null}
        <FieldGrid>
          <QuantityField name="qty" label={t("field.quantity")} required unit={equipment.unit} />
          <DateField name="date" label={t("field.date")} required max={todayPK()} />
        </FieldGrid>
        <TextareaField name="note" label={t("field.note")} rows={2} />
      </Form>
    </SlideOver>
  );
}

/** Count correction at one location: − disposed / short, + found. Owned units only. */
export function AdjustSlideOver({
  open,
  onOpenChange,
  equipment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: EquipmentDetail | null;
}) {
  const t = useT();
  const [adjust, { isLoading }] = useAdjustEquipmentMutation();
  const run = useMutationToast();
  const form = useForm<AdjustValues, unknown, z.output<typeof adjustSchema>>({
    resolver: zodResolver(adjustSchema),
    values: {
      locationId: equipment?.locations[0]?.location.id ?? null,
      direction: "OUT",
      qty: null,
      reason: "",
      date: todayPK(),
    },
  });
  if (!equipment) return null;
  const locations = equipment.locations
    .filter((l) => l.location.type !== "TRANSIT")
    .map((l) => ({
      value: l.location.id,
      label: placeName(t, l.location),
      description: t("equipment.common.ownedQty", { qty: formatQty(l.ownedQty, equipment.unit) }),
    }));

  const onSubmit = async (v: z.output<typeof adjustSchema>) => {
    const signed = v.direction === "OUT" ? `-${v.qty}` : v.qty;
    const result = await run(
      () =>
        adjust({
          id: equipment.id,
          body: { locationId: v.locationId, qty: signed, reason: v.reason, date: v.date },
        }).unwrap(),
      {
        success: t("equipment.adjust.saved", { name: equipment.name }),
        setError: form.setError,
        codeFields: { INSUFFICIENT_EQUIPMENT: "qty" },
      },
    );
    if (result) onOpenChange(false);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t("equipment.adjust.title")}
      description={equipment.name}
      busy={isLoading}
      footer={
        <FormActions
          formId="adjust-form"
          submitLabel={t("equipment.adjust.save")}
          loading={isLoading}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id="adjust-form">
        <ComboboxField name="locationId" label={t("equipment.field.location")} required options={locations} />
        <SegmentedField
          name="direction"
          label={t("equipment.adjust.direction")}
          options={[
            { value: "OUT", label: t("equipment.adjust.out") },
            { value: "IN", label: t("equipment.adjust.in") },
          ]}
        />
        <FieldGrid>
          <QuantityField name="qty" label={t("field.quantity")} required unit={equipment.unit} />
          <DateField name="date" label={t("field.date")} required max={todayPK()} />
        </FieldGrid>
        <TextareaField name="reason" label={t("field.reason")} required rows={2} />
      </Form>
    </SlideOver>
  );
}
