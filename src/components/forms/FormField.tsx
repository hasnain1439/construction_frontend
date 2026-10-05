"use client";

import { useId, type ReactNode } from "react";
import { useFormContext, type FieldError, type FieldErrors } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

export interface FieldIds {
  id: string;
  hintId: string;
  errorId: string;
  describedBy: string | undefined;
  invalid: boolean;
}

/** Common props every field component takes. */
export interface BaseFieldProps {
  name: string;
  label: string;
  required?: boolean;
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
  /** Hide the visible label (still announced). */
  hideLabel?: boolean;
}

function getError(errors: FieldErrors, name: string): FieldError | undefined {
  let node: unknown = errors;
  for (const part of name.split(".")) node = (node as Record<string, unknown> | undefined)?.[part];
  return node as FieldError | undefined;
}

/** Error message for a (possibly nested) field name, from form context. */
export function useFieldError(name: string): string | undefined {
  const { formState } = useFormContext();
  const error = getError(formState.errors, name) as (FieldError & { root?: FieldError }) | undefined;
  if (typeof error?.message === "string") return error.message;
  // Field arrays keep list-level errors (e.g. "must total 100 %") under `root`.
  return typeof error?.root?.message === "string" ? error.root.message : undefined;
}

/**
 * Label (with red * when required) + control + helper text + inline red error.
 * The render prop receives ids/aria wiring for the control.
 */
export function FormField({
  label,
  required,
  hint,
  error,
  className,
  hideLabel,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  className?: string;
  hideLabel?: boolean;
  children: (ids: FieldIds) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className={cn("text-sm font-medium", hideLabel && "sr-only")}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {children({ id, hintId, errorId, describedBy, invalid: Boolean(error) })}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
