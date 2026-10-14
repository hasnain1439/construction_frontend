"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateStockCountMutation, useGetStockMovementsQuery, useSetLowStockLevelsMutation } from "@/api/services/inventory.api";
import type { CountReason, MaterialRef, StockMovement } from "@/api/types";
import { LedgerTable, type LedgerRow } from "@/components/common/LedgerTable";
import { LineItemsEditor, type LineRow } from "@/components/common/LineItemsEditor";
import { SlideOver } from "@/components/common/SlideOver";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useEnumT, useT } from "@/i18n/useT";
import { formatQty, qtyDiff } from "@/lib/quantity";
import { applyLineError } from "../lineErrors";
import { countSchema, type CountValues } from "../schemas";

/** Movement history of one material at one location, newest first, with the running balance. */
export function MovementHistorySlideOver({
  open,
  onOpenChange,
  locationId,
  material,
  currentQty,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  material: MaterialRef | null;
  /** Today's balance — the running balance is worked out backwards from it. */
  currentQty: number;
}) {
  const t = useT();
  const te = useEnumT();
  const query = useGetStockMovementsQuery({ locationId, materialId: material?.id, limit: 100 }, { skip: !open || !material });
  const rows = useMemo<LedgerRow[] | undefined>(() => {
    if (!query.data) return undefined;
    let balance = currentQty;
    return query.data.items.map((m: StockMovement) => {
      const row: LedgerRow = {
        id: m.id,
        date: m.occurredAt,
        title: m.ownerSupplied ? t("procurement.stock.ownerSupplied", { label: te("procMovement", m.type) }) : te("procMovement", m.type),
        detail: [m.note, m.createdBy?.name].filter(Boolean).join(" · ") || undefined,
        amount: m.quantity,
        balance: Math.round(balance * 1000) / 1000,
      };
      balance -= m.quantity;
      return row;
    });
  }, [query.data, currentQty, t, te]);
  return (
    <SlideOver open={open} onOpenChange={onOpenChange} size="lg" title={material ? t("procurement.stock.historyTitle", { name: material.name }) : t("procurement.stock.history")} description={t("procurement.stock.historyDesc")}>
      <LedgerTable kind="quantity" unit={material?.unit} rows={rows} loading={query.isLoading} error={query.error} onRetry={query.refetch} />
    </SlideOver>
  );
}

const levelsSchema = z.object({ items: z.array(z.object({ materialId: z.string().nullable(), minQty: z.string().nullable() })) });
type LevelsValues = z.input<typeof levelsSchema>;

/** Low-stock levels for a store (0 / empty removes a level). */
export function LowStockLevelsSlideOver({
  open,
  onOpenChange,
  locationId,
  current,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  current: Array<{ material: MaterialRef; minQty: number | null }>;
}) {
  const t = useT();
  const [save, { isLoading }] = useSetLowStockLevelsMutation();
  const run = useMutationToast();
  const form = useForm<LevelsValues>({
    resolver: zodResolver(levelsSchema),
    values: { items: current.length ? current.map((c) => ({ materialId: c.material.id, minQty: c.minQty === null ? null : String(c.minQty) })) : [{ materialId: null, minQty: null }] },
  });
  const onSubmit = async (v: LevelsValues) => {
    const body = v.items.filter((i) => i.materialId).map((i) => ({ materialId: i.materialId as string, minQty: i.minQty ?? "0" }));
    if (!body.length) return onOpenChange(false);
    const ok = await run(() => save({ locationId, body }).unwrap(), { success: t("procurement.stock.levelsSaved") });
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t("procurement.stock.levelsTitle")}
      description={t("procurement.stock.levelsDesc")}
      busy={isLoading}
      footer={<FormActions formId="low-stock-form" submitLabel={t("procurement.stock.saveLevels")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="low-stock-form">
        <LineItemsEditor name="items" columns={[{ key: "minQty", label: t("procurement.stock.minimum"), kind: "quantity", width: "w-40" }]} emptyRow={() => ({ materialId: null, minQty: null })} addLabel={t("procurement.stock.addMaterial")} />
      </Form>
    </SlideOver>
  );
}

const COUNT_REASONS: CountReason[] = ["HARDENED_IN_RAIN", "BREAKAGE", "THEFT_SUSPECTED", "MEASUREMENT", "OTHER"];

/** Reason select per counted line — only needed when the count differs (known after saving). */
function CountReasons({ system }: { system?: Map<string, number> }) {
  const t = useT();
  const te = useEnumT();
  const reasonOptions = COUNT_REASONS.map((value) => ({ value, label: te("procCountReason", value) }));
  const { control } = useFormContext<CountValues>();
  const { fields } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" }) ?? [];
  const lines = fields
    .map((f, i) => ({ f, i, row: items[i] }))
    .filter(({ row }) => {
      if (!row?.materialId || row.countedQty === null) return false;
      const sys = system?.get(row.materialId);
      return sys === undefined || qtyDiff(row.countedQty, String(sys)) !== 0;
    });
  if (!lines.length) return null;
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="text-sm font-medium">{t("procurement.stock.reasonForDiff")}</p>
      <p className="text-xs text-muted-foreground">{system ? t("procurement.stock.diffSystem") : t("procurement.stock.diffBlind")}</p>
      {lines.map(({ f, i, row }) => (
        <SelectField key={f.id} name={`items.${i}.reason`} label={(row as LineRow & { material?: MaterialRef }).material?.name ?? t("procurement.stock.lineN", { n: i + 1 })} options={reasonOptions} noneLabel={t("procurement.stock.noDifference")} />
      ))}
    </div>
  );
}

/**
 * Physical count of a location. With `blind`, the system quantity is never shown before
 * saving; the server compares and the response shows system vs counted.
 */
export function StockCountSlideOver({
  open,
  onOpenChange,
  locationId,
  locationName,
  materials,
  system,
  blind,
  onCounted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  locationName: string;
  /** Materials to count (pre-filled lines). */
  materials: MaterialRef[];
  /** System quantity per material — omit for a blind count. */
  system?: Map<string, number>;
  /** Blind count: the system quantity appears only after a count is entered for the line. */
  blind?: boolean;
  onCounted?: (number: string) => void;
}) {
  const t = useT();
  const [save, { isLoading }] = useCreateStockCountMutation();
  const run = useMutationToast();
  const form = useForm<CountValues, unknown, z.output<typeof countSchema>>({
    resolver: zodResolver(countSchema),
    values: {
      note: "",
      items: materials.length ? materials.map((m) => ({ materialId: m.id, material: m, countedQty: null, reason: null, note: "" })) : [{ materialId: null, countedQty: null, reason: null, note: "" }],
    },
  });
  const onSubmit = async (v: z.output<typeof countSchema>) => {
    const result = await run(
      () =>
        save({
          locationId,
          ...(v.note ? { note: v.note } : {}),
          items: v.items.map((i) => ({ materialId: i.materialId, countedQty: i.countedQty, ...(i.reason ? { reason: i.reason as CountReason } : {}), ...(i.note ? { note: i.note } : {}) })),
        }).unwrap(),
      {
        success: (c) =>
          c.summary.withDifference === 1
            ? t("procurement.stock.countSavedOne", { number: c.number })
            : t("procurement.stock.countSavedMany", { number: c.number, n: c.summary.withDifference }),
        setError: form.setError,
        onError: (_c, error) => applyLineError(error, v.items, form.setError, "items", { REASON_REQUIRED: "reason" }),
      },
    );
    if (result) {
      onCounted?.(result.number);
      onOpenChange(false);
    }
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={t("procurement.stock.countTitle", { location: locationName })}
      description={t("procurement.stock.countDesc")}
      busy={isLoading}
      footer={<FormActions formId="count-form" submitLabel={t("procurement.stock.saveCount")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="count-form">
        <LineItemsEditor
          name="items"
          columns={[
            { key: "countedQty", label: t("field.counted"), kind: "quantity", required: true, width: "w-40" },
            { key: "note", label: t("field.note"), kind: "text", width: "w-48" },
          ]}
          info={(row) => {
            if (!system || !row.materialId || !system.has(row.materialId)) return null;
            const counted = row.countedQty as string | null;
            if (blind && counted === null) return t("procurement.stock.seeSystem");
            const sys = system.get(row.materialId)!;
            const diff = counted === null ? null : qtyDiff(counted, String(sys));
            const unit = (row as LineRow).material?.unit;
            return diff
              ? t("procurement.stock.systemDiff", { qty: formatQty(sys, unit), diff: `${diff > 0 ? "+" : ""}${formatQty(diff, unit)}` })
              : t("procurement.stock.system", { qty: formatQty(sys, unit) });
          }}
          emptyRow={() => ({ materialId: null, countedQty: null, reason: null, note: "" })}
          addLabel={t("procurement.stock.countAnother")}
        />
        <CountReasons system={system} />
        <TextareaField name="note" label={t("field.note")} rows={2} />
      </Form>
    </SlideOver>
  );
}
