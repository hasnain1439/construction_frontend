"use client";

import { useFormContext } from "react-hook-form";
import type { HTMLInputTypeAttribute, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { FormField, useFieldError, type BaseFieldProps } from "./FormField";

export function TextField({
  name,
  label,
  required,
  hint,
  disabled,
  className,
  hideLabel,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
  trailing,
  autoFocus,
  uppercase,
  dir,
}: BaseFieldProps & {
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "numeric" | "decimal" | "tel" | "search" | "url";
  maxLength?: number;
  /** Element inside the input on the right (e.g. show-password button). */
  trailing?: ReactNode;
  autoFocus?: boolean;
  uppercase?: boolean;
  /** Text direction of the input, e.g. "rtl" for an Urdu-script value. */
  dir?: "ltr" | "rtl" | "auto";
}) {
  const { register } = useFormContext();
  const error = useFieldError(name);
  return (
    <FormField label={label} required={required} hint={hint} error={error} className={className} hideLabel={hideLabel}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <Input
            id={id}
            type={type}
            placeholder={placeholder}
            autoComplete={autoComplete}
            inputMode={inputMode}
            maxLength={maxLength}
            disabled={disabled}
            autoFocus={autoFocus}
            dir={dir}
            aria-required={required || undefined}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(trailing && "pe-10", uppercase && "uppercase")}
            {...register(name)}
          />
          {trailing ? <div className="absolute end-1.5 top-1/2 -translate-y-1/2">{trailing}</div> : null}
        </div>
      )}
    </FormField>
  );
}
