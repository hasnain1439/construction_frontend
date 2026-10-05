"use client";

import { useFormContext } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { FormField, useFieldError, type BaseFieldProps } from "./FormField";

export function TextareaField({
  name,
  label,
  required,
  hint,
  disabled,
  className,
  hideLabel,
  placeholder,
  rows = 3,
  maxLength,
}: BaseFieldProps & { placeholder?: string; rows?: number; maxLength?: number }) {
  const { register } = useFormContext();
  const error = useFieldError(name);
  return (
    <FormField label={label} required={required} hint={hint} error={error} className={className} hideLabel={hideLabel}>
      {({ id, describedBy, invalid }) => (
        <Textarea
          id={id}
          rows={rows}
          placeholder={placeholder}
          maxLength={maxLength}
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
