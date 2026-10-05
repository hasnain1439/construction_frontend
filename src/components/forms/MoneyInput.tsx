"use client";

import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { groupSouthAsian, paisaToRupees, rupeesToPaisa } from "@/lib/money";
import { FormField, useFieldError, type BaseFieldProps } from "./FormField";

/** "1850000.5" → "18,50,000.5" for display while the input isn't focused. */
function grouped(rupees: string): string {
  if (!rupees) return "";
  const [whole, fraction] = rupees.replace("-", "").split(".");
  return `${rupees.startsWith("-") ? "-" : ""}${groupSouthAsian(whole || "0")}${fraction !== undefined ? `.${fraction}` : ""}`;
}

export interface MoneyInputProps {
  /** Paisa as a string (what the API wants), or null when empty. */
  value: string | null | undefined;
  onChange: (paisa: string | null) => void;
  onBlur?: () => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
  "aria-label"?: string;
  /** Unit after the amount, e.g. "/ sq ft". */
  suffix?: string;
}

/**
 * The person types rupees ("1,85,00,000" or "1450.50"); the component emits paisa
 * strings ("18500000000"). Grouped with lakh/crore commas when not focused.
 */
export function MoneyInput({ value, onChange, onBlur, className, suffix, ...rest }: MoneyInputProps) {
  // While focused the person edits a free-form draft; otherwise the value is shown grouped.
  const [draft, setDraft] = useState<string | null>(null);
  const focused = draft !== null;
  const text = draft ?? paisaToRupees(value ?? null);

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">Rs</span>
      <Input
        {...rest}
        inputMode="decimal"
        value={focused ? text : grouped(text)}
        onFocus={() => setDraft(paisaToRupees(value ?? null))}
        onBlur={() => {
          setDraft(null);
          onBlur?.();
        }}
        onChange={(e) => {
          const next = e.target.value.replace(/[,\s]/g, "");
          if (!/^\d*(\.\d{0,2})?$/.test(next)) return;
          setDraft(next);
          onChange(next === "" || next === "." ? null : rupeesToPaisa(next));
        }}
        className={cn("pl-9 tabular", suffix && "pr-16")}
      />
      {suffix ? (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
      ) : null}
    </div>
  );
}

/** MoneyInput bound to a React Hook Form field holding paisa. */
export function MoneyField({
  name,
  label,
  required,
  hint,
  disabled,
  className,
  hideLabel,
  placeholder,
  suffix,
}: BaseFieldProps & { placeholder?: string; suffix?: string }) {
  const { control } = useFormContext();
  const error = useFieldError(name);
  return (
    <FormField label={label} required={required} hint={hint} error={error} className={className} hideLabel={hideLabel}>
      {({ id, describedBy, invalid }) => (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <MoneyInput
              id={id}
              value={field.value as string | null | undefined}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder={placeholder}
              disabled={disabled}
              suffix={suffix}
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
