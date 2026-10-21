"use client";

import { useContext, useState } from "react";
import { ReactReduxContext } from "react-redux";
import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { translate, type TranslationKey, type TranslationVars } from "@/i18n/useT";
import type { RootState } from "@/store";
import { cn } from "@/lib/cn";
import { FormField, useFieldError, type BaseFieldProps } from "./FormField";

const toText = (value: number | null | undefined) => (value === null || value === undefined || Number.isNaN(value) ? "" : String(value));
const fmtBound = (n: number) => String(Math.round(n * 10000) / 10000);

/**
 * Controlled numeric input with a unit suffix ("ft", "sq ft", "%"). Emits number | null.
 *
 * QA B-27: a minus sign is never dropped silently ("-5" must not turn "15" into "155"): without
 * `allowNegative` the text stays as typed and an inline message says negatives are not allowed.
 * `min` / `max` add an inline message while the value is outside them (unless the form already shows
 * an error for the field); `step` is what ↑ / ↓ add or take away.
 */
export function NumberInput({
  value,
  onChange,
  onBlur,
  unit,
  decimals = 2,
  allowNegative,
  min,
  max,
  step,
  error,
  className,
  ...rest
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  unit?: string;
  decimals?: number;
  allowNegative?: boolean;
  min?: number;
  max?: number;
  step?: number;
  /** A translated error shown under the input (inputs outside a FormField, e.g. table cells). */
  error?: string;
  className?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
  "aria-label"?: string;
}) {
  // The UI language when a store is there (the input is also used outside one, e.g. in isolated tests)
  const redux = useContext(ReactReduxContext);
  const language = redux ? (redux.store.getState() as RootState).ui.language : "en";
  const t = (key: TranslationKey, vars?: TranslationVars) => translate(language, key, vars);
  // Draft text only while focused (so "12." can be typed); otherwise show the value.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? toText(value);

  const pattern = new RegExp(`^-?\\d*${decimals > 0 ? `(\\.\\d{0,${decimals}})?` : ""}$`);
  const negative = !allowNegative && (text.startsWith("-") || (typeof value === "number" && value < 0));
  const message = error
    ? error
    : rest["aria-invalid"]
      ? null
      : negative
        ? t("validation.noNegative")
        : typeof value === "number" && min !== undefined && value < min
          ? t("validation.mustBeAtLeast", { n: unit ? `${fmtBound(min)} ${unit}` : fmtBound(min) })
          : typeof value === "number" && max !== undefined && value > max
            ? t("validation.mustBeAtMost", { n: unit ? `${fmtBound(max)} ${unit}` : fmtBound(max) })
            : null;

  const emit = (next: string) => {
    setDraft(next);
    onChange(next === "" || next === "-" || next === "." || next === "-." ? null : Number(next));
  };

  return (
    <div className={className}>
      <div className="relative">
        <Input
          {...rest}
          aria-invalid={rest["aria-invalid"] || Boolean(message) || undefined}
          inputMode={decimals > 0 ? "decimal" : "numeric"}
          value={text}
          onChange={(e) => {
            const next = e.target.value.replace(/,/g, "");
            if (!pattern.test(next)) return;
            emit(next);
          }}
          onKeyDown={(e) => {
            if (!step || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
            e.preventDefault();
            const base = typeof value === "number" ? value : (min ?? 0);
            let next = Math.round((base + (e.key === "ArrowUp" ? step : -step)) * 10 ** decimals) / 10 ** decimals;
            if (min !== undefined) next = Math.max(min, next);
            if (max !== undefined) next = Math.min(max, next);
            if (!allowNegative) next = Math.max(0, next);
            emit(String(next));
          }}
          onFocus={() => setDraft(toText(value))}
          onBlur={() => {
            setDraft(null);
            onBlur?.();
          }}
          className={cn("tabular", unit && (unit.length <= 2 ? "pr-7" : "pr-14"))}
        />
        {unit ? (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
        ) : null}
      </div>
      {message ? (
        <p role="alert" className="mt-1 text-xs font-medium text-destructive" data-testid="number-input-message">
          {message}
        </p>
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
  min,
  max,
  step,
}: BaseFieldProps & { unit?: string; decimals?: number; placeholder?: string; allowNegative?: boolean; min?: number; max?: number; step?: number }) {
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
              min={min}
              max={max}
              step={step}
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
