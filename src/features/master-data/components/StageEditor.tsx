"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { PercentTotalChip, percentTotal } from "@/components/common/PercentTotalChip";
import { NumberInput } from "@/components/forms/NumberField";
import { useFieldError } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { formatPKR, percentOfPaisa } from "@/lib/money";

export interface StageRow {
  label: string;
  percent: number | null;
  isRetention: boolean;
}

/**
 * Editable list of payment stages (label · % · retention) with a live 100 % chip.
 * Used by payment templates and the project contract tab. With `totalPaisa`, each row
 * also shows its amount (rounded to the rupee like the backend).
 */
export function StageEditor({
  name,
  totalPaisa,
  disabled,
  maxRows = 15,
}: {
  name: string;
  /** Contract total in paisa → shows Rs per stage; omit to hide amounts. */
  totalPaisa?: string | null;
  disabled?: boolean;
  maxRows?: number;
}) {
  const { control, register, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const rows = (useWatch({ control, name }) as StageRow[] | undefined) ?? [];
  const total = percentTotal(rows.map((r) => r.percent));
  const listError = useFieldError(name);
  const retentionIndex = rows.findIndex((r) => r.isRetention);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-[24px_1fr_110px_auto_36px] items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase sm:grid-cols-[24px_1fr_110px_130px_auto_36px]">
          <span />
          <span>Stage</span>
          <span>%</span>
          {totalPaisa !== undefined ? <span className="hidden text-right sm:block">Amount</span> : <span className="hidden sm:block" />}
          <span>Retention</span>
          <span />
        </div>
        <ul>
          {fields.map((field, index) => {
            const row = rows[index];
            return (
              <li
                key={field.id}
                className="grid grid-cols-[24px_1fr_110px_auto_36px] items-center gap-2 border-b px-3 py-2 last:border-b-0 sm:grid-cols-[24px_1fr_110px_130px_auto_36px]"
              >
                <GripVertical className="size-4 text-muted-foreground" aria-hidden />
                <Input
                  aria-label={`Stage ${index + 1} name`}
                  placeholder="e.g. Plinth / DPC"
                  disabled={disabled}
                  {...register(`${name}.${index}.label`)}
                />
                <Controller
                  control={control}
                  name={`${name}.${index}.percent`}
                  render={({ field: f }) => (
                    <NumberInput
                      aria-label={`Stage ${index + 1} percent`}
                      value={f.value as number | null}
                      onChange={f.onChange}
                      onBlur={f.onBlur}
                      unit="%"
                      decimals={2}
                      disabled={disabled}
                    />
                  )}
                />
                {totalPaisa !== undefined ? (
                  <span className="hidden text-right text-sm text-muted-foreground tabular sm:block">
                    {totalPaisa && row?.percent ? formatPKR(percentOfPaisa(totalPaisa, row.percent)) : "—"}
                  </span>
                ) : (
                  <span className="hidden sm:block" />
                )}
                <label className="flex items-center justify-center gap-1.5 text-xs">
                  <Checkbox
                    checked={Boolean(row?.isRetention)}
                    disabled={disabled || (retentionIndex !== -1 && retentionIndex !== index)}
                    onCheckedChange={(checked) => setValue(`${name}.${index}.isRetention`, checked === true, { shouldDirty: true })}
                    aria-label={`Stage ${index + 1} is retention`}
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled || fields.length <= 1}
                  onClick={() => remove(index)}
                  aria-label={`Remove stage ${index + 1}`}
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || fields.length >= maxRows}
          onClick={() => append({ label: "", percent: null, isRetention: false })}
        >
          <Plus data-icon="inline-start" />
          Add stage
        </Button>
        <PercentTotalChip total={total} />
      </div>
      {listError ? (
        <p role="alert" className={cn("text-xs font-medium text-destructive")}>
          {listError}
        </p>
      ) : null}
    </div>
  );
}
