"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateStockCountMutation, useGetStockMovementsQuery, useSetLowStockLevelsMutation } from "@/api/services/inventory.api";
import type { CountReason, MaterialRef, MovementType, StockMovement } from "@/api/types";
import { LedgerTable, type LedgerRow } from "@/components/common/LedgerTable";
import { LineItemsEditor, type LineRow } from "@/components/common/LineItemsEditor";
import { SlideOver } from "@/components/common/SlideOver";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatQty, qtyDiff } from "@/lib/quantity";
import { applyLineError } from "../lineErrors";
import { countSchema, type CountValues } from "../schemas";

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  PURCHASE_IN: "Purchased",
  PURCHASE_RETURN_OUT: "Returned to supplier",
  DISPATCH_OUT: "Dispatched",
  TRANSIT_IN: "Into transit",
  TRANSIT_OUT: "Out of transit",
  RECEIPT_IN: "Received",
  OWNER_DELIVERY_IN: "Owner delivered",
  USAGE_OUT: "Used",
  COUNT_ADJUSTMENT: "Count adjustment",
  CORRECTION: "Correction",
};

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
  const query = useGetStockMovementsQuery({ locationId, materialId: material?.id, limit: 100 }, { skip: !open || !material });
  const rows = useMemo<LedgerRow[] | undefined>(() => {
    if (!query.data) return undefined;
    let balance = currentQty;
    return query.data.items.map((m: StockMovement) => {
      const row: LedgerRow = {
        id: m.id,
        date: m.occurredAt,
        title: MOVEMENT_LABEL[m.type] + (m.ownerSupplied ? " (owner)" : ""),
        detail: [m.note, m.createdBy?.name].filter(Boolean).join(" · ") || undefined,
        amount: m.quantity,
        balance: Math.round(balance * 1000) / 1000,
      };
      balance -= m.quantity;
      return row;
    });
  }, [query.data, currentQty]);
  return (
    <SlideOver open={open} onOpenChange={onOpenChange} size="lg" title={material ? `${material.name} — history` : "History"} description="Every stock change, newest first (last 100).">
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
  const [save, { isLoading }] = useSetLowStockLevelsMutation();
  const run = useMutationToast();
  const form = useForm<LevelsValues>({
    resolver: zodResolver(levelsSchema),
    values: { items: current.length ? current.map((c) => ({ materialId: c.material.id, minQty: c.minQty === null ? null : String(c.minQty) })) : [{ materialId: null, minQty: null }] },
  });
  const onSubmit = async (v: LevelsValues) => {
    const body = v.items.filter((i) => i.materialId).map((i) => ({ materialId: i.materialId as string, minQty: i.minQty ?? "0" }));
    if (!body.length) return onOpenChange(false);
    const ok = await run(() => save({ locationId, body }).unwrap(), { success: "Low-stock levels saved" });
    if (ok) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Low-stock levels"
      description="When the store has less than this, the material shows as low stock on the dashboard. Leave empty or 0 to remove a level."
      busy={isLoading}
      footer={<FormActions formId="low-stock-form" submitLabel="Save levels" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="low-stock-form">
        <LineItemsEditor name="items" columns={[{ key: "minQty", label: "Minimum", kind: "quantity", width: "w-40" }]} emptyRow={() => ({ materialId: null, minQty: null })} addLabel="Add a material" />
      </Form>
    </SlideOver>
  );
}

export const COUNT_REASONS: Array<{ value: CountReason; label: string }> = [
  { value: "HARDENED_IN_RAIN", label: "Hardened in rain" },
  { value: "BREAKAGE", label: "Breakage" },
  { value: "THEFT_SUSPECTED", label: "Theft suspected" },
  { value: "MEASUREMENT", label: "Measurement" },
  { value: "OTHER", label: "Other" },
];

/** Reason select per counted line — only needed when the count differs (known after saving). */
function CountReasons({ system }: { system?: Map<string, number> }) {
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
      <p className="text-sm font-medium">Reason for a difference</p>
      <p className="text-xs text-muted-foreground">{system ? "These counts differ from the system." : "Needed when your count differs from the system (blind count: the system quantity is shown after saving)."}</p>
      {lines.map(({ f, i, row }) => (
        <SelectField key={f.id} name={`items.${i}.reason`} label={(row as LineRow & { material?: MaterialRef }).material?.name ?? `Line ${i + 1}`} options={COUNT_REASONS} noneLabel="No difference" />
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
        success: (c) => `${c.number} saved — ${c.summary.withDifference} difference${c.summary.withDifference === 1 ? "" : "s"}`,
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
      title={`Stock count — ${locationName}`}
      description="Count what is physically there. Differences are adjusted with your reason."
      busy={isLoading}
      footer={<FormActions formId="count-form" submitLabel="Save count" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="count-form">
        <LineItemsEditor
          name="items"
          columns={[
            { key: "countedQty", label: "Counted", kind: "quantity", required: true, width: "w-40" },
            { key: "note", label: "Note", kind: "text", width: "w-48" },
          ]}
          info={(row) => {
            if (!system || !row.materialId || !system.has(row.materialId)) return null;
            const counted = row.countedQty as string | null;
            if (blind && counted === null) return "Enter your count to see the system quantity";
            const sys = system.get(row.materialId)!;
            const diff = counted === null ? null : qtyDiff(counted, String(sys));
            const unit = (row as LineRow).material?.unit;
            return `System: ${formatQty(sys, unit)}${diff ? ` · difference ${diff > 0 ? "+" : ""}${formatQty(diff, unit)}` : ""}`;
          }}
          emptyRow={() => ({ materialId: null, countedQty: null, reason: null, note: "" })}
          addLabel="Count another material"
        />
        <CountReasons system={system} />
        <TextareaField name="note" label="Note" rows={2} />
      </Form>
    </SlideOver>
  );
}
