"use client";

import { useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useGetMaterialsQuery } from "@/api/services/masterData.api";
import type { Material } from "@/api/types";
import { Combobox } from "./ComboboxField";
import { FormField, useFieldError, type BaseFieldProps } from "./FormField";

export interface MaterialPickerProps {
  value: string | null | undefined;
  onChange: (materialId: string | null, material?: Material) => void;
  /** Only these materials (e.g. what is in stock, owner-supplied ones). */
  onlyIds?: readonly string[];
  /** Hide these (already on other lines). */
  excludeIds?: readonly string[];
  /** Extra text under each option, e.g. "In stock: 220 bags". */
  describe?: (material: Material) => string | undefined;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
  ariaLabel?: string;
}

/** Searchable material list from GET /materials, showing the unit and group. */
export function MaterialPicker({ value, onChange, onlyIds, excludeIds, describe, placeholder = "Choose material", ...rest }: MaterialPickerProps) {
  const { data: materials, isLoading } = useGetMaterialsQuery();
  const options = useMemo(() => {
    const only = onlyIds ? new Set(onlyIds) : null;
    const exclude = new Set(excludeIds ?? []);
    return (materials ?? [])
      .filter((m) => (!only || only.has(m.id)) && (m.id === value || !exclude.has(m.id)))
      .map((m) => ({ value: m.id, label: m.name, description: describe?.(m) ?? `${m.unit} · ${m.group.name}` }));
  }, [materials, onlyIds, excludeIds, describe, value]);

  return (
    <Combobox
      {...rest}
      value={value}
      options={options}
      loading={isLoading}
      placeholder={placeholder}
      searchPlaceholder="Search materials…"
      emptyText="No material found"
      onChange={(next) => {
        const materialId = (next as string | null) ?? null;
        onChange(materialId, materials?.find((m) => m.id === materialId));
      }}
    />
  );
}

/** Units of every material, for showing "bags" / "cft" next to quantities. */
export function useMaterialUnits(): Map<string, Material> {
  const { data } = useGetMaterialsQuery();
  return useMemo(() => new Map((data ?? []).map((m) => [m.id, m])), [data]);
}

/** MaterialPicker bound to a form field holding the material id. */
export function MaterialPickerField({ name, label, required, hint, disabled, className, hideLabel, ...picker }: BaseFieldProps & Omit<MaterialPickerProps, "value" | "onChange">) {
  const { control } = useFormContext();
  const error = useFieldError(name);
  return (
    <FormField label={label} required={required} hint={hint} error={error} className={className} hideLabel={hideLabel}>
      {({ id, describedBy, invalid }) => (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <MaterialPicker {...picker} id={id} value={field.value as string | null} onChange={(v) => field.onChange(v)} disabled={disabled} invalid={invalid} describedBy={describedBy} />
          )}
        />
      )}
    </FormField>
  );
}
