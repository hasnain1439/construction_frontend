"use client";

import { useMemo, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useGetMaterialsQuery } from "@/api/services/masterData.api";
import type { Material } from "@/api/types";
import { useT } from "@/i18n/useT";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "./ComboboxField";
import { FormField, useFieldError, type BaseFieldProps } from "./FormField";

export interface MaterialPickerProps {
  value: string | null | undefined;
  onChange: (materialId: string | null, material?: Material) => void;
  /** Only these materials (e.g. what is in stock, owner-supplied ones). */
  onlyIds?: readonly string[];
  /** Hide these (already on other lines). */
  excludeIds?: readonly string[];
  /** Listed first, marked (e.g. what the chosen supplier sells); the rest still follow. */
  preferIds?: readonly string[];
  /** Extra text under each option, e.g. "In stock: 220 bags". */
  describe?: (material: Material) => string | undefined;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
  ariaLabel?: string;
}

const ALL = "__all__";

/**
 * Searchable material list from GET /materials, showing the quality, unit and group. When products
 * have quality categories (A+, A, B …) a category dropdown in front narrows the list.
 */
export function MaterialPicker({ value, onChange, onlyIds, excludeIds, preferIds, describe, placeholder, ...rest }: MaterialPickerProps) {
  const t = useT();
  const { data: materials, isLoading } = useGetMaterialsQuery();
  const selected = materials?.find((m) => m.id === value);
  // null = follow the chosen product's category (or all).
  const [pickedQuality, setPickedQuality] = useState<string | null>(null);
  const quality = pickedQuality ?? selected?.quality?.id ?? "";
  const qualities = useMemo(() => {
    const only = onlyIds ? new Set(onlyIds) : null;
    const seen = new Map<string, string>();
    for (const m of materials ?? []) if (m.quality && (!only || only.has(m.id))) seen.set(m.quality.id, m.quality.name);
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [materials, onlyIds]);
  const options = useMemo(() => {
    const only = onlyIds ? new Set(onlyIds) : null;
    const exclude = new Set(excludeIds ?? []);
    const prefer = new Set(preferIds ?? []);
    const rows = (materials ?? []).filter((m) => (!only || only.has(m.id)) && (m.id === value || !exclude.has(m.id)) && (!quality || m.id === value || m.quality?.id === quality));
    // Stable: preferred ones first, each part in the list's own order.
    const ordered = prefer.size ? [...rows.filter((m) => prefer.has(m.id)), ...rows.filter((m) => !prefer.has(m.id))] : rows;
    return ordered.map((m) => {
      const base = (m.quality ? `${m.quality.name} · ` : "") + (describe?.(m) ?? `${m.unit} · ${m.group.name}`);
      return { value: m.id, label: m.name, description: prefer.has(m.id) ? `★ ${t("app.components.forms.supplierSells")} · ${base}` : base };
    });
  }, [materials, onlyIds, excludeIds, preferIds, describe, value, quality, t]);

  const picker = (
    <Combobox
      {...rest}
      value={value}
      options={options}
      loading={isLoading}
      placeholder={placeholder ?? t("app.components.forms.chooseMaterial")}
      searchPlaceholder={t("app.components.forms.searchMaterials")}
      emptyText={t("app.components.forms.noMaterial")}
      onChange={(next) => {
        const materialId = (next as string | null) ?? null;
        onChange(materialId, materials?.find((m) => m.id === materialId));
      }}
    />
  );
  if (!qualities.length) return picker;
  return (
    <div className="flex min-w-0 gap-2">
      <Select
        value={quality || ALL}
        disabled={rest.disabled}
        onValueChange={(v) => {
          const next = v === ALL ? "" : v;
          setPickedQuality(next);
          // A product of another category is no longer the choice.
          if (next && selected && selected.quality?.id !== next) onChange(null);
        }}
      >
        <SelectTrigger className="w-28 shrink-0" aria-label={t("app.components.forms.category")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("app.components.forms.anyCategory")}</SelectItem>
          {qualities.map((q) => (
            <SelectItem key={q.id} value={q.id}>
              {q.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="min-w-0 flex-1">{picker}</div>
    </div>
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
