"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormField, useFieldError, type BaseFieldProps } from "./FormField";

/** Calendar date ("YYYY-MM-DD") using the browser's date picker. */
export function DateField({
  name,
  label,
  required,
  hint,
  disabled,
  className,
  hideLabel,
  min,
  max,
}: BaseFieldProps & { min?: string; max?: string }) {
  const { register } = useFormContext();
  const error = useFieldError(name);
  return (
    <FormField label={label} required={required} hint={hint} error={error} className={className} hideLabel={hideLabel}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          type="date"
          min={min}
          max={max}
          disabled={disabled}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          {...register(name)}
        />
      )}
    </FormField>
  );
}
