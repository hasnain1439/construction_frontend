"use client";

import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray } from "react-hook-form";
import { NumberInput } from "@/components/forms/NumberField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/useT";

/** "Other units" rows (unit + factor) for a form with an `altUnits` array field. */
export function AltUnitsEditor() {
  const t = useT();
  const { fields, append, remove } = useFieldArray({ name: "altUnits" });
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("masterData.altUnits.title")}</p>
      <p className="text-xs text-muted-foreground">{t("masterData.altUnits.hint")}</p>
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-[1fr_120px_36px] items-center gap-2">
          <Controller
            name={`altUnits.${index}.unit`}
            render={({ field: f, fieldState }) => (
              <Input {...f} aria-label={t("masterData.altUnits.unitAria", { n: index + 1 })} placeholder="kg" aria-invalid={Boolean(fieldState.error) || undefined} />
            )}
          />
          <Controller
            name={`altUnits.${index}.factor`}
            render={({ field: f, fieldState }) => (
              <NumberInput
                aria-label={t("masterData.altUnits.factorAria", { n: index + 1 })}
                value={f.value as number | null}
                onChange={f.onChange}
                onBlur={f.onBlur}
                decimals={4}
                placeholder="50"
                aria-invalid={Boolean(fieldState.error) || undefined}
              />
            )}
          />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)} aria-label={t("masterData.altUnits.removeAria", { n: index + 1 })}>
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" disabled={fields.length >= 5} onClick={() => append({ unit: "", factor: null })}>
        <Plus data-icon="inline-start" />
        {t("masterData.altUnits.add")}
      </Button>
    </div>
  );
}
