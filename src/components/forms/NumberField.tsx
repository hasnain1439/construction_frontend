"use client";

import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { FormField, useFieldError, type BaseFieldProps } from "./FormField";

const toText = (value: number | null | undefined) => (value === null || value === undefined || Number.isNaN(value) ? "" : String(value));

/** Controlled numeric input with a unit suffix ("ft", "sq ft", "%"). Emits number | null. */
export function NumberInput({
  value,
  onChange,
  onBlur,
  unit,
  decimals = 2,
  allowNegative,
  className,
  ...rest
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  unit?: string;
  decimals?: number;
  allowNegative?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
  "aria-label"?: string;
}) {
  // Draft text only while focused (so "12." can be typed); otherwise show the value.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? toText(value);

  const pattern = new RegExp(`^${allowNegative ? "-?" : ""}\\d*${decimals > 0 ? `(\\.\\d{0,${decimals}})?` : ""}$`);

  return (
    <div className={cn("relative", className)}>
      <Input
        {...rest}
        inputMode={decimals > 0 ? "decimal" : "numeric"}
        value={text}
        onChange={(e) => {
          const next = e.target.value.replace(/,/g, "");
          if (!pattern.test(next)) return;
          setDraft(next);
          onChange(next === "" || next === "-" || next === "." ? null : Number(next));
        }}
        onFocus={() => setDraft(toText(value))}
        onBlur={() => {
          setDraft(null);
          onBlur?.();
        }}
        className={cn("tabular", unit && "pr-14")}
      />
      {unit ? (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
      ) : null}
    </div>
  );
}

export function NumberField({
  name,
  label,
  required,
  hint,
  disabled,
  className,
  hideLabel,
  unit,
  decimals,
  placeholder,
  allowNegative,
}: BaseFieldProps & { unit?: string; decimals?: number; placeholder?: string; allowNegative?: boolean }) {
  const { control } = useFormContext();
  const error = useFieldError(name);
  return (
    <FormField label={label} required={required} hint={hint} error={error} className={className} hideLabel={hideLabel}>
      {({ id, describedBy, invalid }) => (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <NumberInput
              id={id}
              value={field.value as number | null | undefined}
              onChange={field.onChange}
              onBlur={field.onBlur}
              unit={unit}
              decimals={decimals}
              allowNegative={allowNegative}
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
