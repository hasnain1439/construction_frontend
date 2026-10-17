"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EyeOff } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch, type UseFormSetError } from "react-hook-form";
import type { z } from "zod";
import {
  useCreateEquipmentTransferMutation,
  useReceiveEquipmentTransferMutation,
} from "@/api/services/equipment.api";
import type { EquipmentTransfer } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { AttachmentField } from "@/components/forms/AttachmentField";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { QuantityField } from "@/components/forms/QuantityInput";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { useSiteProjectOptions } from "@/features/procurement/options";
import { useMutationToast } from "@/hooks/useMutationToast";
import { msg } from "@/i18n/message";
import { useT } from "@/i18n/useT";
import { errorCode, isApiError } from "@/lib/apiErrors";
import { formatDateTime, todayPK } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import {
  bucketKey,
  bucketsOf,
  placeName,
  splitBucket,
  useBucketOptions,
  useEquipmentPlaces,
  type Bucket,
} from "../options";
import { receiveSchema, transferSchema, type ReceiveValues, type TransferValues } from "../schemas";
import { ItemLines } from "./ItemLines";

const YARD = "yard:";
const PROJECT = "project:";

/**
 * Dispatch (yard → site), transfer (site → site) or return (site → yard). Only what is at the source
 * can be picked; owned units and each rental's units are separate piles.
 */
export function NewTransferSlideOver({
  open,
  onOpenChange,
  defaultFromId,
  lockFrom,
  onCreated,
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFromId?: string | null;
  /** Site page: the source is this site. */
  lockFrom?: boolean;
  onCreated?: (transfer: EquipmentTransfer) => void;
  /** Shuttering planner suggestion: destination project + item and quantity (owned units first, then rented piles). */
  prefill?: { toProjectId?: string | null; equipmentId?: string | null; qty?: number };
}) {
  const t = useT();
  const [create, { isLoading }] = useCreateEquipmentTransferMutation();
  const run = useMutationToast();
  const places = useEquipmentPlaces();
  const projects = useSiteProjectOptions();
  const prefillSource = places.map.find((l) => l.location.id === defaultFromId);
  const prefillItems = useMemo(() => prefillLines(bucketsOf(prefillSource), prefill), [prefillSource, prefill]);
  const form = useForm<TransferValues, unknown, z.output<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    values: {
      fromLocationId: defaultFromId ?? null,
      to: prefill?.toProjectId ? `${PROJECT}${prefill.toProjectId}` : null,
      date: todayPK(),
      vehicleNo: "",
      driverName: "",
      note: "",
      items: prefillItems,
    },
  });
  const fromId = useWatch({ control: form.control, name: "fromLocationId" });
  const source = places.map.find((l) => l.location.id === fromId);
  const buckets = useMemo(() => bucketsOf(source), [source]);
  const bucketOptions = useBucketOptions(buckets);
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  const fromOptions = places.map
    .filter((l) => l.location.type !== "TRANSIT")
    .map((l) => ({ value: l.location.id, label: placeName(t, l.location), description: l.project?.code }));
  const sourceProjectId = source?.location.projectId ?? null;
  const toOptions = [
    ...(places.yard && source?.location.type !== "STORE"
      ? [
          {
            value: `${YARD}${places.yard.id}`,
            label: t("equipment.common.yard"),
            description: t("equipment.transfer.returnHint"),
          },
        ]
      : []),
    ...projects.options
      .filter((o) => o.value !== sourceProjectId)
      .map((o) => ({ ...o, value: `${PROJECT}${o.value}` })),
  ];

  const onSubmit = async (v: z.output<typeof transferSchema>) => {
    const to = v.to.startsWith(YARD)
      ? { toLocationId: v.to.slice(YARD.length) }
      : { toProjectId: v.to.slice(PROJECT.length) };
    const items = v.items.map((i) => {
      const { equipmentId, rentalId } = splitBucket(i.key);
      return { equipmentId, ...(rentalId ? { rentalId } : {}), qty: i.qty };
    });
    const result = await run(
      () =>
        create({
          fromLocationId: v.fromLocationId,
          ...to,
          date: v.date,
          ...(v.vehicleNo ? { vehicleNo: v.vehicleNo } : {}),
          ...(v.driverName ? { driverName: v.driverName } : {}),
          ...(v.note ? { note: v.note } : {}),
          items,
        }).unwrap(),
      {
        success: (r) => t("equipment.transfer.sentToast", { number: r.number }),
        setError: form.setError,
        codeFields: {
          SAME_LOCATION: "to",
          INVALID_LOCATION: "to",
          PROJECT_LOCKED: "to",
          PROJECT_IS_DRAFT: "to",
        },
        onError: (code, error) => applyShortLines(code, error, v.items, form.setError),
      },
    );
    if (result) {
      onCreated?.(result);
      onOpenChange(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t("equipment.transfer.newTitle")}
      description={t("equipment.transfer.newDesc")}
      busy={isLoading}
      footer={
        <FormActions
          formId="equipment-transfer-form"
          submitLabel={t("action.send")}
          loading={isLoading}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id="equipment-transfer-form">
        <FieldGrid>
          <ComboboxField
            name="fromLocationId"
            label={t("field.from")}
            required
            options={fromOptions}
            loading={places.loading}
            disabled={lockFrom}
          />
          <ComboboxField
            name="to"
            label={t("field.to")}
            required
            options={toOptions}
            loading={projects.loading}
          />
        </FieldGrid>
        {fromId && !buckets.length && !places.loading ? (
          <InlineAlert tone="warning">{t("equipment.transfer.nothingHere")}</InlineAlert>
        ) : null}
        <ItemLines
          pick="key"
          options={bucketOptions}
          unitOf={(key) => (key ? byKey.get(key)?.equipment.unit : undefined)}
          availableOf={(key) => (key ? byKey.get(key)?.qty : undefined)}
        />
        <FieldGrid columns={3}>
          <DateField name="date" label={t("field.date")} required max={todayPK()} />
          <TextField
            name="vehicleNo"
            label={t("procurement.common.vehicleNo")}
            placeholder={t("procurement.common.vehiclePlaceholder")}
          />
          <TextField
            name="driverName"
            label={t("procurement.common.driver")}
            placeholder={t("procurement.common.driverPlaceholder")}
          />
        </FieldGrid>
        <TextareaField name="note" label={t("field.note")} rows={2} />
      </Form>
    </SlideOver>
  );
}

/** 400 INSUFFICIENT_EQUIPMENT names the short piles (`details.items`): put the message on those rows. */
function applyShortLines(
  code: string | null,
  error: unknown,
  rows: Array<{ key: string }>,
  setError: UseFormSetError<TransferValues>,
): boolean {
  if (code !== "INSUFFICIENT_EQUIPMENT" || !isApiError(error)) return false;
  const details = (error.details ?? {}) as {
    items?: Array<{
      equipmentId: string;
      rentalId?: string | null;
      available: number | string;
      unit?: string;
    }>;
  };
  let applied = false;
  for (const item of details.items ?? []) {
    const index = rows.findIndex((r) => r.key === bucketKey(item.equipmentId, item.rentalId));
    if (index === -1) continue;
    setError(
      `items.${index}.qty`,
      {
        type: "server",
        message: msg("equipment.common.onlyAvailable", { qty: formatQty(item.available, item.unit) }),
      },
      { shouldFocus: !applied },
    );
    applied = true;
  }
  return applied;
}

// ─── Receive with counts ────────────────────────────────────────────────────

/** Item lines for a suggested quantity of one item: owned units first, then each rental's pile. */
export function prefillLines(
  buckets: Bucket[],
  prefill: { equipmentId?: string | null; qty?: number } | undefined,
): Array<{ key: string | null; qty: string | null }> {
  if (!prefill?.equipmentId || !prefill.qty) return [{ key: null, qty: null }];
  let left = prefill.qty;
  const lines: Array<{ key: string | null; qty: string | null }> = [];
  const piles = buckets
    .filter((b) => b.equipment.id === prefill.equipmentId)
    .sort((a, b) => Number(a.rental !== null) - Number(b.rental !== null));
  for (const b of piles) {
    if (left <= 0) break;
    const qty = Math.min(left, b.qty);
    lines.push({ key: b.key, qty: String(qty) });
    left -= qty;
  }
  return lines.length ? lines : [{ key: null, qty: String(prefill.qty) }];
}

export interface LossPreviewRow {
  name: string;
  unit: string;
  kind: "MISSING" | "DAMAGED";
  qty: number;
}

/** What saving this count will record as losses: sent − received → missing, damaged → damaged. */
export function previewLosses(
  transfer: EquipmentTransfer,
  counts: Array<{ itemId: string; receivedQty: string | null; damagedQty: string | null }>,
): LossPreviewRow[] {
  const rows: LossPreviewRow[] = [];
  for (const item of transfer.items) {
    const c = counts.find((x) => x.itemId === item.id);
    if (!c || c.receivedQty === null || c.receivedQty === "") continue;
    const received = Number(c.receivedQty);
    if (item.sentQty !== undefined && received < item.sentQty)
      rows.push({
        name: item.equipment.name,
        unit: item.equipment.unit,
        kind: "MISSING",
        qty: +(item.sentQty - received).toFixed(3),
      });
    const damaged = Number(c.damagedQty ?? 0);
    if (damaged > 0)
      rows.push({ name: item.equipment.name, unit: item.equipment.unit, kind: "DAMAGED", qty: damaged });
  }
  return rows;
}

export function LossPreview({ rows, blind }: { rows: LossPreviewRow[]; blind: boolean }) {
  const t = useT();
  if (!rows.length && !blind) return null;
  return (
    <InlineAlert
      tone={rows.length ? "warning" : "info"}
      title={rows.length ? t("equipment.receive.lossPreviewTitle") : undefined}
    >
      {rows.length ? (
        <ul className="mt-1 space-y-1" data-testid="loss-preview">
          {rows.map((r, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <StatusBadge domain="equipmentLossKind" value={r.kind} />
              <span>
                {formatQty(r.qty, r.unit)} {r.name}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {blind ? (
        <p className="mt-1 text-xs text-muted-foreground">{t("equipment.receive.blindGapNote")}</p>
      ) : null}
    </InlineAlert>
  );
}

/** The receiver counts every item; a gap becomes a loss record (shown before saving). */
export function ReceiveTransferSlideOver({
  transfer,
  open,
  onOpenChange,
}: {
  transfer: EquipmentTransfer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const [receive, { isLoading }] = useReceiveEquipmentTransferMutation();
  const run = useMutationToast();
  const form = useForm<ReceiveValues, unknown, z.output<typeof receiveSchema>>({
    resolver: zodResolver(receiveSchema),
    values: {
      date: todayPK(),
      note: "",
      items: (transfer?.items ?? []).map((i) => ({
        itemId: i.id,
        sentQty: i.sentQty ?? null,
        receivedQty: null,
        damagedQty: null,
        note: "",
        photo: null,
      })),
    },
  });
  const counts = (useWatch({ control: form.control, name: "items" }) ?? []) as Array<{
    itemId: string;
    receivedQty: string | null;
    damagedQty: string | null;
  }>;
  if (!transfer) return null;
  const blind = transfer.items.some((i) => i.sentQty === undefined);
  const preview = previewLosses(transfer, counts);

  const onSubmit = async (v: z.output<typeof receiveSchema>) => {
    const result = await run(
      () =>
        receive({
          id: transfer.id,
          body: {
            date: v.date,
            ...(v.note ? { note: v.note } : {}),
            items: v.items.map((i) => ({
              itemId: i.itemId,
              receivedQty: i.receivedQty,
              ...(i.damagedQty && Number(i.damagedQty) > 0 ? { damagedQty: i.damagedQty } : {}),
              ...(i.note ? { note: i.note } : {}),
              ...(i.photo ? { photoAttachmentId: i.photo.id } : {}),
            })),
          },
        }).unwrap(),
      {
        success: (r) =>
          r.losses.length
            ? r.losses.length === 1
              ? t("equipment.qaFixes.savedWithOneLoss", { number: r.number })
              : t("equipment.receive.savedWithLosses", { number: r.number, n: r.losses.length })
            : t("equipment.receive.saved", { number: r.number }),
        onError: (code, error) => {
          const itemId = isApiError(error)
            ? (error.details as { itemId?: string } | undefined)?.itemId
            : undefined;
          const index = itemId ? v.items.findIndex((i) => i.itemId === itemId) : -1;
          const field =
            code === "NOTE_REQUIRED"
              ? "note"
              : code === "DAMAGED_EXCEEDS_COUNTED"
                ? "damagedQty"
                : code === "RECEIVED_EXCEEDS_SENT"
                  ? "receivedQty"
                  : null;
          if (index === -1 || !field || !isApiError(error)) return false;
          form.setError(
            `items.${index}.${field}`,
            {
              type: "server",
              message:
                errorCode(error) === "NOTE_REQUIRED" ? msg("equipment.v.sayWhatHappened") : error.message,
            },
            { shouldFocus: true },
          );
          return true;
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
      title={t("equipment.receive.title", { number: transfer.number })}
      description={t("equipment.receive.desc", {
        from: placeName(t, transfer.from),
        date: formatDateTime(transfer.sentAt),
      })}
      busy={isLoading}
      footer={
        <FormActions
          formId="equipment-receive-form"
          submitLabel={t("equipment.receive.save")}
          loading={isLoading}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id="equipment-receive-form">
        {blind ? (
          <InlineAlert tone="info" title={t("equipment.receive.blindTitle")}>
            <EyeOff className="me-1 inline size-4" aria-hidden />
            {t("equipment.receive.blindBody")}
          </InlineAlert>
        ) : null}
        <div className="space-y-4">
          {transfer.items.map((item, index) => (
            <fieldset
              key={item.id}
              className="space-y-3 rounded-xl border p-4"
              data-testid={`receive-item-${index}`}
            >
              <legend className="px-1 text-sm font-semibold">
                {item.equipment.name}
                {item.rental ? (
                  <span className="ms-2 text-xs font-normal text-muted-foreground">{item.rental.number}</span>
                ) : null}
              </legend>
              {item.sentQty !== undefined ? (
                <p className="text-xs text-muted-foreground">
                  {t("equipment.receive.sentQty", { qty: formatQty(item.sentQty, item.equipment.unit) })}
                </p>
              ) : null}
              <FieldGrid>
                <QuantityField
                  name={`items.${index}.receivedQty`}
                  label={t("equipment.receive.counted")}
                  required
                  unit={item.equipment.unit}
                  hint={t("equipment.receive.countedHint")}
                />
                <QuantityField
                  name={`items.${index}.damagedQty`}
                  label={t("field.damaged")}
                  unit={item.equipment.unit}
                />
              </FieldGrid>
              <FieldGrid>
                <TextField
                  name={`items.${index}.note`}
                  label={t("field.note")}
                  placeholder={t("equipment.receive.notePlaceholder")}
                />
                <AttachmentField name={`items.${index}.photo`} label={t("field.photo")} kind="SITE_PHOTO" />
              </FieldGrid>
            </fieldset>
          ))}
        </div>
        <LossPreview rows={preview} blind={blind} />
        <FieldGrid>
          <DateField name="date" label={t("field.date")} required max={todayPK()} />
        </FieldGrid>
        <TextareaField name="note" label={t("field.note")} rows={2} />
      </Form>
    </SlideOver>
  );
}
