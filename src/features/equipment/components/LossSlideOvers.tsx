"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, HardHat, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useChargeEquipmentLossMutation, useReportEquipmentLossMutation } from "@/api/services/equipment.api";
import { useGetSubcontractsQuery } from "@/api/services/labor.api";
import type { EquipmentLoss, EquipmentLossChargedTo } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { MoneyText } from "@/components/common/MoneyText";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { AttachmentField } from "@/components/forms/AttachmentField";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { QuantityField } from "@/components/forms/QuantityInput";
import { RadioCards, type RadioCardOption } from "@/components/forms/RadioCards";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { TextareaField } from "@/components/forms/TextareaField";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useEnumT, useT } from "@/i18n/useT";
import { todayPK } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import {
  bucketsOf,
  placeName,
  splitBucket,
  useBucketOptions,
  useEquipmentPlaces,
  useSeesRates,
} from "../options";
import { chargeSchema, lossSchema, type ChargeValues, type LossValues } from "../schemas";

/** Missing or damaged equipment at a site or the yard, with a photo. Missing units leave the location. */
export function ReportLossSlideOver({
  open,
  onOpenChange,
  defaultLocationId,
  lockLocation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLocationId?: string | null;
  lockLocation?: boolean;
}) {
  const t = useT();
  const [report, { isLoading }] = useReportEquipmentLossMutation();
  const run = useMutationToast();
  const places = useEquipmentPlaces();
  const form = useForm<LossValues, unknown, z.output<typeof lossSchema>>({
    resolver: zodResolver(lossSchema),
    values: {
      locationId: defaultLocationId ?? null,
      key: null,
      kind: "MISSING",
      qty: null,
      date: todayPK(),
      photo: null,
      note: "",
    },
  });
  const locationId = useWatch({ control: form.control, name: "locationId" });
  const key = useWatch({ control: form.control, name: "key" });
  const buckets = useMemo(
    () => bucketsOf(places.map.find((l) => l.location.id === locationId)),
    [places.map, locationId],
  );
  const bucketOptions = useBucketOptions(buckets);
  const bucket = buckets.find((b) => b.key === key);
  const locations = places.map
    .filter((l) => l.location.type !== "TRANSIT")
    .map((l) => ({ value: l.location.id, label: placeName(t, l.location), description: l.project?.code }));

  const onSubmit = async (v: z.output<typeof lossSchema>) => {
    const { equipmentId, rentalId } = splitBucket(v.key);
    const result = await run(
      () =>
        report({
          locationId: v.locationId,
          equipmentId,
          ...(rentalId ? { rentalId } : {}),
          kind: v.kind,
          qty: v.qty,
          date: v.date,
          note: v.note,
          ...(v.photo ? { photoAttachmentId: v.photo.id } : {}),
        }).unwrap(),
      {
        success: (l) => t("equipment.loss.reportedToast", { number: l.number }),
        setError: form.setError,
        codeFields: { INSUFFICIENT_EQUIPMENT: "qty", INVALID_ATTACHMENT: "photo", INVALID_RENTAL: "key" },
      },
    );
    if (result) onOpenChange(false);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t("equipment.loss.reportTitle")}
      description={t("equipment.loss.reportDesc")}
      busy={isLoading}
      footer={
        <FormActions
          formId="loss-form"
          submitLabel={t("equipment.loss.report")}
          loading={isLoading}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id="loss-form">
        <ComboboxField
          name="locationId"
          label={t("equipment.field.location")}
          required
          options={locations}
          loading={places.loading}
          disabled={lockLocation}
        />
        <ComboboxField name="key" label={t("equipment.field.equipment")} required options={bucketOptions} />
        <SegmentedField
          name="kind"
          label={t("field.type")}
          options={[
            { value: "MISSING", label: t("status.equipmentLossKind.MISSING") },
            { value: "DAMAGED", label: t("status.equipmentLossKind.DAMAGED") },
          ]}
        />
        <FieldGrid>
          <QuantityField
            name="qty"
            label={t("field.quantity")}
            required
            unit={bucket?.equipment.unit}
            hint={
              bucket
                ? t("equipment.common.availableQty", { qty: formatQty(bucket.qty, bucket.equipment.unit) })
                : undefined
            }
          />
          <DateField name="date" label={t("field.date")} required max={todayPK()} />
        </FieldGrid>
        <AttachmentField name="photo" label={t("field.photo")} kind="SITE_PHOTO" />
        <TextareaField name="note" label={t("equipment.loss.whatHappened")} required rows={3} />
      </Form>
    </SlideOver>
  );
}

const CHARGE_ICONS: Record<EquipmentLossChargedTo, RadioCardOption<EquipmentLossChargedTo>["icon"]> = {
  PROJECT: Building2,
  SUBCONTRACTOR: HardHat,
  WRITE_OFF: Trash2,
};

/** Who bears a loss: the project (P&L Losses), a sub-contractor (deduction) or the company (write-off). */
export function ChargeLossSlideOver({
  loss,
  open,
  onOpenChange,
}: {
  loss: EquipmentLoss | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const te = useEnumT();
  const rates = useSeesRates();
  const [charge, { isLoading }] = useChargeEquipmentLossMutation();
  const run = useMutationToast();
  const projectId = loss?.project?.id;
  const subcontracts = useGetSubcontractsQuery({ projectId: projectId ?? "" }, { skip: !projectId || !open });
  const form = useForm<ChargeValues, unknown, z.output<typeof chargeSchema>>({
    resolver: zodResolver(chargeSchema),
    values: { chargedTo: null, valuePaisa: null, subcontractAssignmentId: null, note: "" },
  });
  const chargedTo = useWatch({ control: form.control, name: "chargedTo" });
  if (!loss) return null;
  const options: RadioCardOption<EquipmentLossChargedTo>[] = (
    ["PROJECT", "SUBCONTRACTOR", "WRITE_OFF"] as const
  ).map((value) => ({
    value,
    title: te("equipmentChargedTo", value),
    description: te("equipmentChargedToDesc", value),
    icon: CHARGE_ICONS[value],
    disabled: value !== "WRITE_OFF" && !loss.project,
  }));
  const subOptions = (subcontracts.data ?? []).map((s) => ({
    value: s.id,
    label: s.subcontractor.name,
    description: s.scope,
  }));

  const onSubmit = async (v: z.output<typeof chargeSchema>) => {
    const result = await run(
      () =>
        charge({
          id: loss.id,
          body: {
            chargedTo: v.chargedTo!,
            note: v.note,
            ...(rates && v.valuePaisa ? { valuePaisa: v.valuePaisa } : {}),
            ...(v.chargedTo === "SUBCONTRACTOR" && v.subcontractAssignmentId
              ? { subcontractAssignmentId: v.subcontractAssignmentId }
              : {}),
          },
        }).unwrap(),
      {
        success: t("equipment.loss.chargedToast", { number: loss.number }),
        setError: form.setError,
        codeFields: {
          ASSIGNMENT_REQUIRED: "subcontractAssignmentId",
          INVALID_ASSIGNMENT: "subcontractAssignmentId",
          NOTHING_TO_CHARGE: "valuePaisa",
          NO_PROJECT: "chargedTo",
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
      title={t("equipment.loss.chargeTitle", { number: loss.number })}
      description={
        <>
          {formatQty(loss.qty, loss.equipment.unit)} {loss.equipment.name} · {placeName(t, loss.location)}
        </>
      }
      busy={isLoading}
      footer={
        <FormActions
          formId="charge-form"
          submitLabel={t("equipment.loss.charge")}
          loading={isLoading}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id="charge-form">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge domain="equipmentLossKind" value={loss.kind} />
          {rates ? (
            <>
              <span>{t("field.value")}</span>
              <MoneyText paisa={loss.valuePaisa} className="font-semibold" />
            </>
          ) : null}
        </div>
        {loss.note ? (
          <InlineAlert tone="info" title={t("equipment.loss.siteNote")}>
            {loss.note}
          </InlineAlert>
        ) : null}
        <RadioCards<EquipmentLossChargedTo>
          name="chargedTo"
          label={t("equipment.loss.chargeTo")}
          required
          options={options}
        />
        {chargedTo === "SUBCONTRACTOR" ? (
          <ComboboxField
            name="subcontractAssignmentId"
            label={t("field.subcontractor")}
            required
            options={subOptions}
            loading={subcontracts.isLoading}
          />
        ) : null}
        {rates ? (
          <MoneyField
            name="valuePaisa"
            label={t("equipment.field.chargeValue")}
            hint={t("equipment.loss.valueHint")}
          />
        ) : null}
        <TextareaField name="note" label={t("field.note")} required rows={2} />
      </Form>
    </SlideOver>
  );
}
