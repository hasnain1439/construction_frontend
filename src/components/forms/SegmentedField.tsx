"use client";

import { Controller, useFormContext } from "react-hook-form";
import { SegmentedControl, type SegmentOption } from "@/components/common/SegmentedControl";
import { FormField, useFieldError, type BaseFieldProps } from "./FormField";

/** Segmented pill bound to a form field (Trial / Paid, Contractor / Owner …). */
export function SegmentedField<V extends string>({
  name,
  label,
  required,
  hint,
  disabled,
  className,
  hideLabel,
  options,
  onValueChange,
}: BaseFieldProps & { options: SegmentOption<V>[]; /** Called after the field changes (e.g. to follow a default). */ onValueChange?: (value: V) => void }) {
  const { control } = useFormContext();
  const error = useFieldError(name);
  return (
    <FormField label={label} required={required} hint={hint} error={error} className={className} hideLabel={hideLabel}>
      {({ id, invalid }) => (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <div>
              <SegmentedControl<V>
                id={id}
                ariaLabel={label}
                value={field.value as V | undefined}
                onChange={(v) => {
                  field.onChange(v);
                  onValueChange?.(v);
                }}
                options={options}
                disabled={disabled}
                invalid={invalid}
              />
            </div>
          )}
        />
      )}
    </FormField>
  );
}
