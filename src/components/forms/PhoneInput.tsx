"use client";

import { Phone } from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { formatPhone, normaliseAnyPhone, normalisePhone } from "@/lib/phone";
import { FormField, useFieldError, type BaseFieldProps } from "./FormField";

export interface PhoneInputProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Allow landlines (company office, suppliers, clients). */
  allowLandline?: boolean;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
}

/**
 * Pakistani phone input. Accepts 0300 1234567 / +92 300 1234567 / 923001234567 and
 * tidies a valid number to "+92 300 1234567" on blur. Validation lives in the form schema
 * (lib/validation), which sends the backend the normalised +92 form.
 */
export function PhoneInput({ value, onChange, onBlur, allowLandline, className, placeholder, ...rest }: PhoneInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        {...rest}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={placeholder ?? (allowLandline ? "0300 1234567 or 042 35761234" : "0300 1234567")}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          const normalised = allowLandline ? normaliseAnyPhone(value) : normalisePhone(value);
          if (normalised) onChange(formatPhone(normalised));
          onBlur?.();
        }}
        className="pl-9"
      />
    </div>
  );
}

export function PhoneField({
  name,
  label,
  required,
  hint,
  disabled,
  className,
  hideLabel,
  allowLandline,
  placeholder,
}: BaseFieldProps & { allowLandline?: boolean; placeholder?: string }) {
  const { control } = useFormContext();
  const error = useFieldError(name);
  return (
    <FormField label={label} required={required} hint={hint} error={error} className={className} hideLabel={hideLabel}>
      {({ id, describedBy, invalid }) => (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <PhoneInput
              id={id}
              value={field.value as string | null | undefined}
              onChange={field.onChange}
              onBlur={field.onBlur}
              allowLandline={allowLandline}
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
