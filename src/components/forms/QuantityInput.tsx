"use client";

import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { formatQty, isQtyDraft, normalizeQty } from "@/lib/quantity";
import { FormField, useFieldError, type BaseFieldProps } from "./FormField";

export interface QuantityInputProps {
  /** Quantity as a decimal string ("12.5"), or null when empty. */
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  onBlur?: () => void;
  /** Unit after the number: "bags", "cft", "ton". */
  unit?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
  "aria-label"?: string;
}

/**
 * Decimal quantity with a unit suffix. Allows at most 3 decimals (the API's Decimal(14,3)),
 * keeps the value as a string so nothing is lost to floating point, and shows lakh-style
 * grouping ("5,000") when not focused.
 */
export function QuantityInput({ value, onChange, onBlur, unit, className, ...rest }: QuantityInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const focused = draft !== null;
  const shown = focused ? draft : value ? formatQty(value) : "";

  return (
    <div className={cn("relative", className)}>
      <Input
        {...rest}
        inputMode="decimal"
        value={shown}
        onFocus={() => setDraft(value ?? "")}
        onBlur={() => {
          setDraft(null);
          onBlur?.();
        }}
        onChange={(e) => {
          const next = e.target.value.replace(/[,\s]/g, "");
          if (!isQtyDraft(next)) return;
          setDraft(next);
          onChange(normalizeQty(next));
        }}
        className={cn("tabular", unit && "pr-14")}
      />
      {unit ? (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
      ) : null}
    </div>
  );
}

/** QuantityInput bound to a React Hook Form field holding a decimal string. */
export function QuantityField({ name, label, required, hint, disabled, className, hideLabel, unit, placeholder }: BaseFieldProps & { unit?: string; placeholder?: string }) {
  const { control } = useFormContext();
  const error = useFieldError(name);
  return (
    <FormField label={label} required={required} hint={hint} error={error} className={className} hideLabel={hideLabel}>
      {({ id, describedBy, invalid }) => (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <QuantityInput
              id={id}
              value={field.value as string | null | undefined}
              onChange={field.onChange}
              onBlur={field.onBlur}
              unit={unit}
              placeholder={placeholder}
              disabled={disabled}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              aria-required={required || undefined}
            />
          )}
        />
      )}
    </FormField>
  );
}
