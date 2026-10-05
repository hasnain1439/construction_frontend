"use client";

import { Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray } from "react-hook-form";
import { NumberInput } from "@/components/forms/NumberField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** "Other units" rows (unit + factor) for a form with an `altUnits` array field. */
export function AltUnitsEditor() {
  const { fields, append, remove } = useFieldArray({ name: "altUnits" });
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Other units</p>
      <p className="text-xs text-muted-foreground">How many of the other unit make one base unit, e.g. 1 bag = 50 kg → kg · 50.</p>
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-[1fr_120px_36px] items-center gap-2">
          <Controller
            name={`altUnits.${index}.unit`}
            render={({ field: f, fieldState }) => (
              <Input {...f} aria-label={`Other unit ${index + 1}`} placeholder="kg" aria-invalid={Boolean(fieldState.error) || undefined} />
            )}
          />
          <Controller
            name={`altUnits.${index}.factor`}
            render={({ field: f, fieldState }) => (
              <NumberInput
                aria-label={`Other unit ${index + 1} factor`}
                value={f.value as number | null}
                onChange={f.onChange}
                onBlur={f.onBlur}
                decimals={4}
                placeholder="50"
                aria-invalid={Boolean(fieldState.error) || undefined}
              />
            )}
          />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)} aria-label={`Remove other unit ${index + 1}`}>
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" disabled={fields.length >= 5} onClick={() => append({ unit: "", factor: null })}>
        <Plus data-icon="inline-start" />
        Add other unit
      </Button>
    </div>
  );
}
