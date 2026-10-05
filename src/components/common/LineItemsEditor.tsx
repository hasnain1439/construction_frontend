"use client";

import { Camera, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useUploadAttachmentMutation } from "@/api/services/attachments.api";
import type { AttachmentKind, Material } from "@/api/types";
import { useFieldError } from "@/components/forms/FormField";
import { MaterialPicker, useMaterialUnits } from "@/components/forms/MaterialPicker";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { QuantityInput } from "@/components/forms/QuantityInput";
import type { UploadedFile } from "@/components/common/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/useT";
import { getErrorMessage } from "@/lib/apiErrors";
import { cn } from "@/lib/cn";
import { formatPKR } from "@/lib/money";
import { qtyTimesRate } from "@/lib/quantity";

export interface LineColumn {
  /** Field key inside each row, e.g. "challanQty", "ratePaisa", "note", "photo". */
  key: string;
  label: string;
  kind: "quantity" | "money" | "text" | "photo";
  required?: boolean;
  placeholder?: string;
  /** Attachment kind for photo columns (default SITE_PHOTO). */
  photoKind?: AttachmentKind;
  /** Tailwind width class for the column, e.g. "w-36". */
  width?: string;
}

export interface LineRow {
  materialId: string | null;
  /** Fixed rows (receive / count) carry their material so no picker is needed. */
  material?: { id: string; name: string; unit: string };
  [key: string]: unknown;
}

export interface LineItemsEditorProps {
  /** Field-array name in the form. */
  name: string;
  columns: LineColumn[];
  /** "pick" → each row chooses a material; "fixed" → rows are given (receive, count). */
  materialMode?: "pick" | "fixed";
  /** Materials the picker may offer (e.g. in stock, owner-supplied). */
  materialIds?: readonly string[];
  describeMaterial?: (material: Material) => string | undefined;
  /** Called when a row's material changes (prefill a rate, etc.). */
  onMaterialChange?: (index: number, material: Material | undefined) => void;
  /** Read-only info under the material, e.g. "Available: 220 bags". */
  info?: (row: LineRow, index: number) => ReactNode;
  /** Computed amount column (qty × rate) and its total in the footer. */
  amount?: { qtyKey: string; rateKey: string; label?: string };
  /** Message shown under a row (e.g. not enough stock), from outside the form. */
  rowError?: (row: LineRow, index: number) => string | undefined;
  emptyRow?: () => LineRow;
  addLabel?: string;
  maxRows?: number;
  disabled?: boolean;
}

function PhotoCell({ value, onChange, kind, label, disabled }: { value: UploadedFile | null; onChange: (file: UploadedFile | null) => void; kind: AttachmentKind; label: string; disabled?: boolean }) {
  const [upload, { isLoading }] = useUploadAttachmentMutation();
  const [error, setError] = useState<string | null>(null);
  const language = useLanguage();
  if (value) {
    return (
      <span className="flex items-center gap-1 text-xs">
        <Check className="size-3.5 text-success" aria-hidden />
        <span className="max-w-24 truncate" title={value.fileName}>
          {value.fileName}
        </span>
        {!disabled ? (
          <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove ${label}`} onClick={() => onChange(null)}>
            <Trash2 />
          </Button>
        ) : null}
      </span>
    );
  }
  return (
    <span className="space-y-1">
      <label className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-muted", disabled && "pointer-events-none opacity-50")}>
        {isLoading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Camera className="size-3.5" aria-hidden />}
        {isLoading ? "Uploading…" : "Photo"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={label}
          disabled={disabled}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setError(null);
            try {
              const a = await upload({ file, kind }).unwrap();
              onChange({ id: a.id, url: a.url, fileName: a.fileName, mimeType: a.mimeType });
            } catch (err) {
              setError(getErrorMessage(err, language));
            }
          }}
        />
      </label>
      {error ? <span className="block text-xs text-destructive">{error}</span> : null}
    </span>
  );
}

function CellError({ name }: { name: string }) {
  const error = useFieldError(name);
  return error ? (
    <p role="alert" className="mt-1 text-xs font-medium text-destructive">
      {error}
    </p>
  ) : null;
}

/**
 * The one editor for document lines — purchase, PO, dispatch, receive, usage, count,
 * owner delivery, return. Material + configurable quantity / money / text / photo columns,
 * add / remove rows, a computed amount and a totals footer.
 */
export function LineItemsEditor({
  name,
  columns,
  materialMode = "pick",
  materialIds,
  describeMaterial,
  onMaterialChange,
  info,
  amount,
  rowError,
  emptyRow = () => ({ materialId: null }),
  addLabel = "Add material",
  maxRows = 50,
  disabled,
}: LineItemsEditorProps) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const rows = (useWatch({ control, name }) as LineRow[] | undefined) ?? [];
  const units = useMaterialUnits();
  const listError = useFieldError(name);
  const fixed = materialMode === "fixed";
  const chosen = rows.map((r) => r.materialId).filter((id): id is string => Boolean(id));

  const unitOf = (row: LineRow | undefined) => row?.material?.unit ?? (row?.materialId ? units.get(row.materialId)?.unit : undefined);
  const amountOf = (row: LineRow | undefined) => (amount && row ? qtyTimesRate(row[amount.qtyKey] as string | null, row[amount.rateKey] as string | null) : null);
  const total = amount ? rows.reduce((sum, row) => sum + BigInt(amountOf(row) ?? "0"), BigInt(0)) : null;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-3 py-2">
                Material
              </th>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn("px-3 py-2", c.width, c.kind !== "text" && c.kind !== "photo" && "text-right")}>
                  {c.label}
                  {c.required ? <span className="text-destructive"> *</span> : null}
                </th>
              ))}
              {amount ? (
                <th scope="col" className="w-36 px-3 py-2 text-right">
                  {amount.label ?? "Amount"}
                </th>
              ) : null}
              {!fixed ? <th scope="col" className="w-10 px-2 py-2" aria-label="Remove" /> : null}
            </tr>
          </thead>
          <tbody>
            {fields.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 3} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No materials yet.
                </td>
              </tr>
            ) : null}
            {fields.map((field, index) => {
              const row = rows[index];
              const unit = unitOf(row);
              const label = row?.material?.name ?? (row?.materialId ? units.get(row.materialId)?.name : undefined) ?? `Line ${index + 1}`;
              const externalError = row ? rowError?.(row, index) : undefined;
              const lineAmount = amountOf(row);
              return (
                <tr key={field.id} className="border-t align-top" data-testid="line-row">
                  <td className="min-w-52 px-3 py-2">
                    {fixed ? (
                      <p className="pt-2 font-medium">{label}</p>
                    ) : (
                      <Controller
                        control={control}
                        name={`${name}.${index}.materialId`}
                        render={({ field: f }) => (
                          <MaterialPicker
                            value={f.value as string | null}
                            onChange={(id, material) => {
                              f.onChange(id);
                              onMaterialChange?.(index, material);
                            }}
                            onlyIds={materialIds}
                            excludeIds={chosen}
                            describe={describeMaterial}
                            disabled={disabled}
                            invalid={Boolean(externalError)}
                            ariaLabel={`${label} material`}
                          />
                        )}
                      />
                    )}
                    {!fixed ? <CellError name={`${name}.${index}.materialId`} /> : null}
                    {row && info ? <div className="mt-1 text-xs text-muted-foreground">{info(row, index)}</div> : null}
                    {externalError ? (
                      <p role="alert" className="mt-1 text-xs font-medium text-destructive">
                        {externalError}
                      </p>
                    ) : null}
                  </td>
                  {columns.map((c) => {
                    const cellName = `${name}.${index}.${c.key}`;
                    const aria = `${label} ${c.label}`;
                    return (
                      <td key={c.key} className={cn("px-3 py-2", c.width)}>
                        <Controller
                          control={control}
                          name={cellName}
                          render={({ field: f }) =>
                            c.kind === "quantity" ? (
                              <QuantityInput value={f.value as string | null} onChange={f.onChange} onBlur={f.onBlur} unit={unit} aria-label={aria} placeholder={c.placeholder ?? "0"} disabled={disabled} />
                            ) : c.kind === "money" ? (
                              <MoneyInput value={f.value as string | null} onChange={f.onChange} onBlur={f.onBlur} aria-label={aria} placeholder={c.placeholder} disabled={disabled} />
                            ) : c.kind === "photo" ? (
                              <PhotoCell value={(f.value as UploadedFile | null) ?? null} onChange={f.onChange} kind={c.photoKind ?? "SITE_PHOTO"} label={aria} disabled={disabled} />
                            ) : (
                              <Input value={(f.value as string | undefined) ?? ""} onChange={(e) => f.onChange(e.target.value)} onBlur={f.onBlur} aria-label={aria} placeholder={c.placeholder} disabled={disabled} />
                            )
                          }
                        />
                        <CellError name={cellName} />
                      </td>
                    );
                  })}
                  {amount ? (
                    <td className="px-3 py-2 pt-4 text-right tabular" data-testid="line-amount">
                      {lineAmount ? formatPKR(lineAmount) : "—"}
                    </td>
                  ) : null}
                  {!fixed ? (
                    <td className="px-2 py-2">
                      <Button type="button" variant="ghost" size="icon-sm" disabled={disabled || fields.length <= 1} onClick={() => remove(index)} aria-label={`Remove ${label}`}>
                        <Trash2 />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t bg-muted/20 text-sm">
            <tr>
              <td className="px-3 py-2 font-medium" colSpan={columns.length + 1}>
                {fields.length} {fields.length === 1 ? "material" : "materials"}
              </td>
              {amount ? (
                <td className="px-3 py-2 text-right font-semibold tabular" data-testid="lines-total">
                  {formatPKR((total ?? BigInt(0)).toString())}
                </td>
              ) : null}
              {!fixed ? <td /> : null}
            </tr>
          </tfoot>
        </table>
      </div>
      {!fixed ? (
        <Button type="button" variant="outline" size="sm" disabled={disabled || fields.length >= maxRows} onClick={() => append(emptyRow())}>
          <Plus data-icon="inline-start" />
          {addLabel}
        </Button>
      ) : null}
      {listError ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {listError}
        </p>
      ) : null}
    </div>
  );
}
