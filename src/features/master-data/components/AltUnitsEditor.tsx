"use client";

import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray } from "react-hook-form";
import { useGetUnitsQuery } from "@/api/services/masterData.api";
import { NumberInput } from "@/components/forms/NumberField";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/i18n/useT";

/** "Other units" rows (unit + factor) for a form with an `altUnits` array field. */
export function AltUnitsEditor() {
  const t = useT();
  const { fields, append, remove } = useFieldArray({ name: "altUnits" });
  const units = useGetUnitsQuery();
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("masterData.altUnits.title")}</p>
      <p className="text-xs text-muted-foreground">{t("masterData.altUnits.hint")}</p>
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-[1fr_120px_36px] items-center gap-2">
          <Controller
            name={`altUnits.${index}.unit`}
            render={({ field: f, fieldState }) => {
              const names = (units.data ?? []).map((u) => u.name);
              if (f.value && !names.includes(f.value as string)) names.unshift(f.value as string);
              return (
                <Select value={(f.value as string) || undefined} onValueChange={f.onChange}>
                  <SelectTrigger className="w-full" aria-label={t("masterData.altUnits.unitAria", { n: index + 1 })} aria-invalid={Boolean(fieldState.error) || undefined}>
                    <SelectValue placeholder="kg" />
                  </SelectTrigger>
                  <SelectContent>
                    {names.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }}
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
