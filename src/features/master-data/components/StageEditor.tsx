"use client";

import { GripVertical, Lock, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { PercentTotalChip, percentTotal } from "@/components/common/PercentTotalChip";
import { NumberInput } from "@/components/forms/NumberField";
import { useFieldError } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/useT";
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
  retentionLocked = false,
}: {
  name: string;
  /** Contract total in paisa → shows Rs per stage; omit to hide amounts. */
  totalPaisa?: string | null;
  disabled?: boolean;
  maxRows?: number;
  /** Project billing (QA B-08): the retention row follows the retention field — its % and the flag are read-only. */
  retentionLocked?: boolean;
}) {
  const t = useT();
  const { control, register, setValue, trigger } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const rows = (useWatch({ control, name }) as StageRow[] | undefined) ?? [];
  const total = percentTotal(rows.map((r) => r.percent));
  const listError = useFieldError(name);
  const retentionIndex = rows.findIndex((r) => r.isRetention);
  // QA B-29: a list error ("240% must be 100%", or one from the server) is checked again as soon as the
  // rows change, so it clears once the stages are fixed.
  const signature = rows.map((r) => `${r.percent ?? ""}:${r.isRetention ? 1 : 0}`).join("|");
  const checked = useRef(signature);
  useEffect(() => {
    if (checked.current === signature) return;
    checked.current = signature;
    if (listError) void trigger(name);
  }, [signature, listError, trigger, name]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border">
        <div className="hidden grid-cols-[24px_1fr_110px_130px_auto_36px] items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase sm:grid">
          <span />
          <span>{t("field.stage")}</span>
          <span>%</span>
          {totalPaisa !== undefined ? <span className="hidden text-end sm:block">{t("field.amount")}</span> : <span className="hidden sm:block" />}
          <span>{t("field.retention")}</span>
          <span />
        </div>
        <ul>
          {fields.map((field, index) => {
            const row = rows[index];
            const lockedRow = retentionLocked && Boolean(row?.isRetention);
            return (
              <li
                key={field.id}
                // Phone (QA R-05/R-06): the name takes the whole first line; % · retention · delete sit under it.
                className="grid grid-cols-[24px_minmax(0,1fr)_auto_40px] items-center gap-2 border-b px-3 py-2 last:border-b-0 sm:grid-cols-[24px_1fr_110px_130px_auto_36px]"
              >
                <GripVertical className="size-4 text-muted-foreground" aria-hidden />
                <Input
                  aria-label={t("masterData.stages.nameAria", { n: index + 1 })}
                  placeholder={t("masterData.stages.namePlaceholder")}
                  className="max-sm:col-span-3"
                  disabled={disabled}
                  {...register(`${name}.${index}.label`)}
                />
                <Controller
                  control={control}
                  name={`${name}.${index}.percent`}
                  render={({ field: f }) => (
                    <NumberInput
                      aria-label={t("masterData.stages.percentAria", { n: index + 1 })}
                      value={f.value as number | null}
                      onChange={f.onChange}
                      onBlur={f.onBlur}
                      unit="%"
                      decimals={2}
                      className="max-sm:col-start-2 max-sm:max-w-32"
                      disabled={disabled || lockedRow}
                    />
                  )}
                />
                {totalPaisa !== undefined ? (
                  <span className="hidden text-end text-sm text-muted-foreground tabular sm:block">
                    {totalPaisa && row?.percent ? formatPKR(percentOfPaisa(totalPaisa, row.percent)) : "—"}
                  </span>
                ) : (
                  <span className="hidden sm:block" />
                )}
                <label className="flex items-center justify-center gap-1.5 text-xs" title={lockedRow ? t("masterData.stages.retentionFollows") : undefined}>
                  <span className="text-muted-foreground sm:hidden" aria-hidden>
                    {t("field.retention")}
                  </span>
                  {lockedRow ? <Lock className="size-3.5 text-muted-foreground" aria-hidden /> : null}
                  <Checkbox
                    checked={Boolean(row?.isRetention)}
                    disabled={disabled || retentionLocked || (retentionIndex !== -1 && retentionIndex !== index)}
                    onCheckedChange={(checked) => setValue(`${name}.${index}.isRetention`, checked === true, { shouldDirty: true })}
                    aria-label={t("masterData.stages.retentionAria", { n: index + 1 })}
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled || fields.length <= 1 || lockedRow}
                  onClick={() => remove(index)}
                  aria-label={t("masterData.stages.removeAria", { n: index + 1 })}
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
          {t("masterData.stages.add")}
        </Button>
        <PercentTotalChip total={total} />
      </div>
      {retentionLocked && retentionIndex !== -1 ? <p className="text-xs text-muted-foreground">{t("masterData.stages.retentionFollows")}</p> : null}
      {listError ? (
        <p role="alert" className={cn("text-xs font-medium text-destructive")}>
          {listError}
        </p>
      ) : null}
    </div>
  );
}
