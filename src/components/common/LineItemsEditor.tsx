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

function PhotoCell({
  value,
  onChange,
  kind,
  label,
  disabled,
}: {
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  kind: AttachmentKind;
  label: string;
  disabled?: boolean;
}) {
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
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Remove ${label}`}
            onClick={() => onChange(null)}
          >
            <Trash2 />
          </Button>
        ) : null}
      </span>
    );
  }
  return (
    <span className="space-y-1">
      <label
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-muted",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        {isLoading ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Camera className="size-3.5" aria-hidden />
        )}
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
 *
 * Responsive by its own width (container query): in a narrow place — a phone, a 560px
 * slide-over — each line becomes a card with labelled fields; with room it is a table.
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

  const unitOf = (row: LineRow | undefined) =>
    row?.material?.unit ?? (row?.materialId ? units.get(row.materialId)?.unit : undefined);
  const amountOf = (row: LineRow | undefined) =>
    amount && row
      ? qtyTimesRate(row[amount.qtyKey] as string | null, row[amount.rateKey] as string | null)
      : null;
  const total = amount ? rows.reduce((sum, row) => sum + BigInt(amountOf(row) ?? "0"), BigInt(0)) : null;

  return (
    <div className="space-y-3">
      <div className="@container rounded-xl border">
        <table className="block w-full text-sm @2xl:table">
          <thead className="hidden bg-muted/40 text-left text-xs font-semibold text-muted-foreground uppercase @2xl:table-header-group">
            <tr>
              <th scope="col" className="px-3 py-2">
                Material
              </th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "px-3 py-2",
                    c.width,
                    c.kind !== "text" && c.kind !== "photo" && "text-right",
                  )}
                >
                  {c.label}
                  {c.required ? <span className="text-destructive"> *</span> : null}
                </th>
              ))}
              {amount ? (
                <th scope="col" className="w-36 px-3 py-2 text-right">
                  {amount.label ?? "Amount"}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="block @2xl:table-row-group">
            {fields.length === 0 ? (
              <tr className="block @2xl:table-row">
                <td
                  colSpan={columns.length + 3}
                  className="block px-3 py-6 text-center text-sm text-muted-foreground @2xl:table-cell"
                >
                  No materials yet.
                </td>
              </tr>
            ) : null}
            {fields.map((field, index) => {
              const row = rows[index];
              const unit = unitOf(row);
              const label =
                row?.material?.name ??
                (row?.materialId ? units.get(row.materialId)?.name : undefined) ??
                `Line ${index + 1}`;
              const externalError = row ? rowError?.(row, index) : undefined;
              const lineAmount = amountOf(row);
              return (
                <tr
                  key={field.id}
                  className="grid grid-cols-2 gap-x-3 gap-y-2 border-t p-3 align-top first:border-t-0 @2xl:table-row @2xl:p-0 @2xl:first:border-t"
                  data-testid="line-row"
                >
                  <td className="col-span-2 @2xl:table-cell @2xl:min-w-52 @2xl:px-3 @2xl:py-2">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
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
                        {row && info ? (
                          <div className="mt-1 text-xs text-muted-foreground">{info(row, index)}</div>
                        ) : null}
                        {externalError ? (
                          <p role="alert" className="mt-1 text-xs font-medium text-destructive">
                            {externalError}
                          </p>
                        ) : null}
                      </div>
                      {!fixed ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                          disabled={disabled || fields.length <= 1}
                          onClick={() => remove(index)}
                          aria-label={`Remove ${label}`}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                  {columns.map((c) => {
                    const cellName = `${name}.${index}.${c.key}`;
                    const aria = `${label} ${c.label}`;
                    return (
                      <td
                        key={c.key}
                        className={cn(
                          "block min-w-0 @2xl:table-cell @2xl:px-3 @2xl:py-2",
                          c.kind === "text" && "col-span-2",
                          c.width,
                          "@max-2xl:w-auto",
                        )}
                      >
                        <span className="mb-1 block text-xs font-semibold text-muted-foreground uppercase @2xl:hidden">
                          {c.label}
                          {c.required ? <span className="text-destructive"> *</span> : null}
                        </span>
                        <Controller
                          control={control}
                          name={cellName}
                          render={({ field: f }) =>
                            c.kind === "quantity" ? (
                              <QuantityInput
                                value={f.value as string | null}
                                onChange={f.onChange}
                                onBlur={f.onBlur}
                                unit={unit}
                                aria-label={aria}
                                placeholder={c.placeholder ?? "0"}
                                disabled={disabled}
                              />
                            ) : c.kind === "money" ? (
                              <MoneyInput
                                value={f.value as string | null}
                                onChange={f.onChange}
                                onBlur={f.onBlur}
                                aria-label={aria}
                                placeholder={c.placeholder}
                                disabled={disabled}
                              />
                            ) : c.kind === "photo" ? (
                              <PhotoCell
                                value={(f.value as UploadedFile | null) ?? null}
                                onChange={f.onChange}
                                kind={c.photoKind ?? "SITE_PHOTO"}
                                label={aria}
                                disabled={disabled}
                              />
                            ) : (
                              <Input
                                value={(f.value as string | undefined) ?? ""}
                                onChange={(e) => f.onChange(e.target.value)}
                                onBlur={f.onBlur}
                                aria-label={aria}
                                placeholder={c.placeholder}
                                disabled={disabled}
                              />
                            )
                          }
                        />
                        <CellError name={cellName} />
                      </td>
                    );
                  })}
                  {amount ? (
                    <td className="tabular col-span-2 flex items-baseline justify-between @2xl:table-cell @2xl:px-3 @2xl:py-2 @2xl:pt-4 @2xl:text-right">
                      <span className="text-xs font-semibold text-muted-foreground uppercase @2xl:hidden">
                        {amount?.label ?? "Amount"}
                      </span>
                      <span data-testid="line-amount">{lineAmount ? formatPKR(lineAmount) : "—"}</span>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="block border-t bg-muted/20 text-sm @2xl:table-footer-group">
            <tr className="flex justify-between @2xl:table-row">
              <td className="block px-3 py-2 font-medium @2xl:table-cell" colSpan={columns.length + 1}>
                {fields.length} {fields.length === 1 ? "material" : "materials"}
              </td>
              {amount ? (
                <td
                  className="tabular block px-3 py-2 text-right font-semibold @2xl:table-cell"
                  data-testid="lines-total"
                >
                  {formatPKR((total ?? BigInt(0)).toString())}
                </td>
              ) : null}
            </tr>
          </tfoot>
        </table>
      </div>
      {!fixed ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || fields.length >= maxRows}
          onClick={() => append(emptyRow())}
        >
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
