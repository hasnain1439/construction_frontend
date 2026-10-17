"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import {
  useCloseRentalMutation,
  useCreateRentalMutation,
  useExtendRentalMutation,
  useReturnRentalMutation,
} from "@/api/services/equipment.api";
import type { Rental } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { MoneyText } from "@/components/common/MoneyText";
import { SlideOver } from "@/components/common/SlideOver";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { QuantityField } from "@/components/forms/QuantityInput";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { useSiteProjectOptions, useSupplierOptions } from "@/features/procurement/options";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { todayPK } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import { useEquipmentOptions, useEquipmentPlaces, useSeesRates } from "../options";
import {
  closeSchema,
  extendSchema,
  rentalSchema,
  returnSchema,
  type CloseValues,
  type ExtendValues,
  type RentalValues,
  type ReturnValues,
} from "../schemas";
import { ItemLines } from "./ItemLines";

/** Hire from a yard supplier: items × rate per day, delivered to a project site (rent charged to it) or the yard. */
export function NewRentalSlideOver({
  open,
  onOpenChange,
  defaultProjectId,
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
  /** Shuttering planner suggestion: yard, item, quantity and expected return. */
  prefill?: { supplierId?: string | null; equipmentId?: string | null; qty?: number; expectedEndDate?: string; note?: string };
}) {
  const t = useT();
  const [create, { isLoading }] = useCreateRentalMutation();
  const run = useMutationToast();
  const suppliers = useSupplierOptions();
  const projects = useSiteProjectOptions();
  const equipment = useEquipmentOptions();
  const places = useEquipmentPlaces();
  const form = useForm<RentalValues, unknown, z.output<typeof rentalSchema>>({
    resolver: zodResolver(rentalSchema),
    values: {
      supplierId: prefill?.supplierId ?? null,
      deliverTo: "SITE",
      projectId: defaultProjectId ?? null,
      startDate: todayPK(),
      expectedEndDate: prefill?.expectedEndDate ?? "",
      depositPaisa: null,
      reference: "",
      note: prefill?.note ?? "",
      items: [{ equipmentId: prefill?.equipmentId ?? null, qty: prefill?.qty ? String(prefill.qty) : null, ratePaisaPerDay: null }],
    },
  });
  const deliverTo = useWatch({ control: form.control, name: "deliverTo" });

  const onSubmit = async (v: z.output<typeof rentalSchema>) => {
    const where =
      v.deliverTo === "SITE" && v.projectId
        ? { projectId: v.projectId }
        : places.yard
          ? { locationId: places.yard.id }
          : {};
    const result = await run(
      () =>
        create({
          supplierId: v.supplierId,
          ...where,
          startDate: v.startDate,
          ...(v.expectedEndDate ? { expectedEndDate: v.expectedEndDate } : {}),
          ...(v.depositPaisa ? { depositPaisa: v.depositPaisa } : {}),
          ...(v.reference ? { reference: v.reference } : {}),
          ...(v.note ? { note: v.note } : {}),
          items: v.items.map((i) => ({
            equipmentId: i.equipmentId,
            qty: i.qty,
            ratePaisaPerDay: i.ratePaisaPerDay,
          })),
        }).unwrap(),
      {
        success: (r) => t("equipment.rental.createdToast", { number: r.number }),
        setError: form.setError,
        codeFields: {
          INVALID_SUPPLIER: "supplierId",
          INVALID_DATES: "expectedEndDate",
          PROJECT_LOCKED: "projectId",
        },
      },
    );
    if (result) onOpenChange(false);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t("equipment.rental.newTitle")}
      description={t("equipment.rental.newDesc")}
      busy={isLoading}
      footer={
        <FormActions
          formId="rental-form"
          submitLabel={t("equipment.rental.create")}
          loading={isLoading}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id="rental-form">
        <ComboboxField
          name="supplierId"
          label={t("equipment.field.yardSupplier")}
          required
          options={suppliers.options}
          loading={suppliers.loading}
        />
        <SegmentedField
          name="deliverTo"
          label={t("equipment.rental.deliverTo")}
          options={[
            { value: "SITE", label: t("equipment.common.projectSite") },
            { value: "YARD", label: t("equipment.common.yard") },
          ]}
        />
        {deliverTo === "SITE" ? (
          <ComboboxField
            name="projectId"
            label={t("field.project")}
            required
            options={projects.options}
            loading={projects.loading}
          />
        ) : null}
        <ItemLines
          pick="equipmentId"
          options={equipment.options}
          loading={equipment.loading}
          unitOf={(id) => (id ? equipment.byId.get(id)?.unit : undefined)}
          withRate
        />
        <FieldGrid columns={3}>
          <DateField name="startDate" label={t("equipment.field.startDate")} required max={todayPK()} />
          <DateField name="expectedEndDate" label={t("equipment.field.expectedEndDate")} />
          <MoneyField
            name="depositPaisa"
            label={t("equipment.field.deposit")}
            hint={t("equipment.rental.depositHint")}
          />
        </FieldGrid>
        <TextField
          name="reference"
          label={t("field.reference")}
          placeholder={t("equipment.rental.referencePlaceholder")}
        />
        <TextareaField name="note" label={t("field.note")} rows={2} />
      </Form>
    </SlideOver>
  );
}

export function ExtendRentalSlideOver({
  rental,
  open,
  onOpenChange,
}: {
  rental: Rental | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const [extend, { isLoading }] = useExtendRentalMutation();
  const run = useMutationToast();
  const form = useForm<ExtendValues, unknown, z.output<typeof extendSchema>>({
    resolver: zodResolver(extendSchema),
    values: { expectedEndDate: rental?.expectedEndDate ?? "", note: "" },
  });
  if (!rental) return null;
  const onSubmit = async (v: z.output<typeof extendSchema>) => {
    const result = await run(
      () =>
        extend({
          id: rental.id,
          body: { expectedEndDate: v.expectedEndDate, ...(v.note ? { note: v.note } : {}) },
        }).unwrap(),
      {
        success: t("equipment.rental.extendedToast", { number: rental.number }),
        setError: form.setError,
        codeFields: { INVALID_DATES: "expectedEndDate" },
      },
    );
    if (result) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t("equipment.rental.extendTitle", { number: rental.number })}
      busy={isLoading}
      footer={
        <FormActions
          formId="extend-form"
          submitLabel={t("equipment.rental.extend")}
          loading={isLoading}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id="extend-form">
        <DateField
          name="expectedEndDate"
          label={t("equipment.field.expectedEndDate")}
          required
          min={rental.startDate}
        />
        <TextareaField name="note" label={t("field.note")} rows={2} />
      </Form>
    </SlideOver>
  );
}

/** Give units back to the yard: counts per item, damage charges (supplier payable). Missing units must be reported first. */
export function ReturnRentalSlideOver({
  rental,
  open,
  onOpenChange,
}: {
  rental: Rental | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const rates = useSeesRates();
  const [doReturn, { isLoading }] = useReturnRentalMutation();
  const run = useMutationToast();
  const open_ = (rental?.items ?? []).filter((i) => i.outstandingQty > 0);
  const form = useForm<ReturnValues, unknown, z.output<typeof returnSchema>>({
    resolver: zodResolver(returnSchema),
    values: {
      returnDate: todayPK(),
      damageChargesPaisa: null,
      missingChargesPaisa: null,
      note: "",
      items: open_.map((i) => ({
        rentalItemId: i.id,
        outstandingQty: i.outstandingQty,
        qty: String(i.outstandingQty),
        damagedQty: null,
        missingQty: null,
      })),
    },
  });
  const watchedItems = useWatch({ control: form.control, name: "items" });
  const anyMissingNow = (watchedItems ?? []).some((i) => Number(i?.missingQty ?? 0) > 0);
  if (!rental) return null;
  const onSubmit = async (v: z.output<typeof returnSchema>) => {
    const anyMissing = v.items.some((i) => Number(i.missingQty ?? 0) > 0);
    const items = v.items
      .filter((i) => Number(i.qty ?? 0) > 0 || Number(i.missingQty ?? 0) > 0)
      .map((i) => ({
        rentalItemId: i.rentalItemId,
        qty: i.qty ?? "0",
        ...(Number(i.damagedQty ?? 0) > 0 ? { damagedQty: i.damagedQty! } : {}),
        ...(Number(i.missingQty ?? 0) > 0 ? { missingQty: i.missingQty! } : {}),
      }));
    const result = await run(
      () =>
        doReturn({
          id: rental.id,
          body: {
            returnDate: v.returnDate,
            items,
            ...(rates && v.damageChargesPaisa ? { damageChargesPaisa: v.damageChargesPaisa } : {}),
            ...(rates && anyMissing && v.missingChargesPaisa ? { missingChargesPaisa: v.missingChargesPaisa } : {}),
            ...(v.note ? { note: v.note } : {}),
          },
        }).unwrap(),
      {
        success: (r) =>
          r.status === "RETURNED"
            ? t("equipment.rental.fullyReturnedToast", { number: r.number })
            : t("equipment.rental.returnedToast", { number: r.number }),
        setError: form.setError,
        codeFields: { DATE_IN_FUTURE: "returnDate", INVALID_DATES: "returnDate" },
      },
    );
    if (result) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t("equipment.rental.returnTitle", { number: rental.number })}
      description={rental.supplier.name}
      busy={isLoading}
      footer={
        <FormActions
          formId="return-form"
          submitLabel={t("equipment.rental.return")}
          loading={isLoading}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id="return-form">
        <InlineAlert tone="info">{t("equipment.rental.missingHint")}</InlineAlert>
        {open_.map((item, index) => (
          <fieldset key={item.id} className="space-y-3 rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">{item.equipment.name}</legend>
            <p className="text-xs text-muted-foreground">
              {t("equipment.rental.outstanding", {
                qty: formatQty(item.outstandingQty, item.equipment.unit),
              })}
            </p>
            <FieldGrid columns={3}>
              <QuantityField
                name={`items.${index}.qty`}
                label={t("equipment.rental.returning")}
                unit={item.equipment.unit}
              />
              <QuantityField
                name={`items.${index}.damagedQty`}
                label={t("field.damaged")}
                unit={item.equipment.unit}
              />
              <QuantityField
                name={`items.${index}.missingQty`}
                label={t("equipment.rental.missing")}
                unit={item.equipment.unit}
              />
            </FieldGrid>
          </fieldset>
        ))}
        <FieldGrid>
          <DateField
            name="returnDate"
            label={t("equipment.field.returnDate")}
            required
            min={rental.startDate}
            max={todayPK()}
          />
          {rates ? (
            <MoneyField
              name="damageChargesPaisa"
              label={t("equipment.field.damageCharges")}
              hint={t("equipment.rental.damageHint")}
            />
          ) : null}
          {rates && anyMissingNow ? (
            <MoneyField
              name="missingChargesPaisa"
              label={t("equipment.qaFixes.missingCharges")}
              hint={t("equipment.qaFixes.missingChargesHint")}
            />
          ) : null}
        </FieldGrid>
        <TextareaField name="note" label={t("field.note")} rows={2} />
      </Form>
    </SlideOver>
  );
}

/** Settle the deposit: cash back from the yard; the rest is adjusted against the charges. */
export function CloseRentalSlideOver({
  rental,
  open,
  onOpenChange,
}: {
  rental: Rental | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const rates = useSeesRates();
  const [close, { isLoading }] = useCloseRentalMutation();
  const run = useMutationToast();
  const form = useForm<CloseValues, unknown, z.output<typeof closeSchema>>({
    resolver: zodResolver(closeSchema),
    values: { depositRefundPaisa: null, note: "" },
  });
  if (!rental) return null;
  const onSubmit = async (v: z.output<typeof closeSchema>) => {
    const result = await run(
      () =>
        close({
          id: rental.id,
          body: {
            ...(rates && v.depositRefundPaisa ? { depositRefundPaisa: v.depositRefundPaisa } : {}),
            ...(v.note ? { note: v.note } : {}),
          },
        }).unwrap(),
      {
        success: t("equipment.rental.closedToast", { number: rental.number }),
        setError: form.setError,
        codeFields: { REFUND_EXCEEDS_DEPOSIT: "depositRefundPaisa" },
      },
    );
    if (result) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t("equipment.rental.closeTitle", { number: rental.number })}
      description={t("equipment.rental.closeDesc")}
      busy={isLoading}
      footer={
        <FormActions
          formId="close-form"
          submitLabel={t("equipment.rental.close")}
          loading={isLoading}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id="close-form">
        {rates ? (
          <>
            <p className="text-sm">
              {t("equipment.field.deposit")}:{" "}
              <MoneyText paisa={rental.depositPaisa} className="font-semibold" />
            </p>
            <MoneyField
              name="depositRefundPaisa"
              label={t("equipment.field.depositRefund")}
              hint={t("equipment.rental.refundHint")}
            />
          </>
        ) : null}
        <TextareaField name="note" label={t("field.note")} rows={2} />
      </Form>
    </SlideOver>
  );
}
