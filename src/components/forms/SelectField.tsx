"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, useFieldError, type BaseFieldProps } from "./FormField";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

const NONE = "__none__";

export function SelectField({
  name,
  label,
  required,
  hint,
  disabled,
  className,
  hideLabel,
  options,
  placeholder = "Select…",
  /** Adds a "None" choice that sets the field to null. */
  noneLabel,
}: BaseFieldProps & { options: SelectOption[]; placeholder?: string; noneLabel?: string }) {
  const { control } = useFormContext();
  const error = useFieldError(name);
  return (
    <FormField label={label} required={required} hint={hint} error={error} className={className} hideLabel={hideLabel}>
      {({ id, describedBy, invalid }) => (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <Select
              value={field.value === null || field.value === undefined || field.value === "" ? (noneLabel && field.value === null ? NONE : "") : String(field.value)}
              onValueChange={(v) => field.onChange(v === NONE ? null : v)}
              disabled={disabled}
            >
              <SelectTrigger
                id={id}
                className="w-full"
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                aria-required={required || undefined}
                onBlur={field.onBlur}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {noneLabel ? <SelectItem value={NONE}>{noneLabel}</SelectItem> : null}
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      )}
    </FormField>
  );
}
