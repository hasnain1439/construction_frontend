"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { ComboboxField, type ComboboxOption } from "@/components/forms/ComboboxField";
import { useFieldError } from "@/components/forms/FormField";
import { MoneyField } from "@/components/forms/MoneyInput";
import { QuantityField } from "@/components/forms/QuantityInput";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";
import { formatQty } from "@/lib/quantity";

/**
 * Rows of "what + how many" (+ rate per day for rentals) for a form with an `items` array.
 * `pick` is the row field holding the choice (`key` for a pile at a location, `equipmentId` for rentals).
 */
export function ItemLines({
  pick,
  options,
  loading,
  unitOf,
  availableOf,
  withRate,
}: {
  pick: "key" | "equipmentId";
  options: ComboboxOption[];
  loading?: boolean;
  /** Unit of the chosen value ("nos", "sheet"). */
  unitOf: (value: string | null) => string | undefined;
  /** How many can leave (piles); undefined = no limit shown. */
  availableOf?: (value: string | null) => number | undefined;
  withRate?: boolean;
}) {
  const t = useT();
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ name: "items" });
  const rows = (useWatch({ control, name: "items" }) ?? []) as Array<Record<string, string | null>>;
  const listError = useFieldError("items");
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-semibold">{t("equipment.common.items")}</legend>
      {fields.map((field, index) => {
        const value = rows[index]?.[pick] ?? null;
        const unit = unitOf(value);
        const available = availableOf?.(value);
        const qty = Number(rows[index]?.qty ?? 0);
        const first = index === 0;
        return (
          <div
            key={field.id}
            className="grid items-start gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:border-0 sm:p-0"
            data-testid={`item-line-${index}`}
          >
            <ComboboxField
              name={`items.${index}.${pick}`}
              label={t("equipment.field.equipment")}
              hideLabel={!first}
              required
              options={options}
              loading={loading}
            />
            <div className="space-y-1">
              <QuantityField
                name={`items.${index}.qty`}
                label={t("field.quantity")}
                hideLabel={!first}
                required
                unit={unit}
              />
              {available !== undefined ? (
                <p
                  className={
                    qty > available ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"
                  }
                >
                  {qty > available
                    ? t("equipment.common.onlyAvailable", { qty: formatQty(available, unit) })
                    : t("equipment.common.availableQty", { qty: formatQty(available, unit) })}
                </p>
              ) : null}
            </div>
            <div className={first ? "flex items-end gap-2 sm:pt-6" : "flex items-end gap-2"}>
              {withRate ? (
                <MoneyField
                  name={`items.${index}.ratePaisaPerDay`}
                  label={t("equipment.field.ratePerDay")}
                  hideLabel={!first}
                  required
                  className="w-40"
                />
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                aria-label={t("equipment.common.removeLine", { n: index + 1 })}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        );
      })}
      {listError ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {listError}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          append(withRate ? { [pick]: null, qty: null, ratePaisaPerDay: null } : { [pick]: null, qty: null })
        }
      >
        <Plus data-icon="inline-start" />
        {t("equipment.common.addLine")}
      </Button>
    </fieldset>
  );
}
