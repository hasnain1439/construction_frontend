"use client";

import { useId, type ReactNode } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import { useFieldError } from "./FormField";

/** Switch row: label + description on the left, toggle on the right. */
export function ToggleField({
  name,
  label,
  description,
  disabled,
  className,
}: {
  name: string;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const { control } = useFormContext();
  const error = useFieldError(name);
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-4 rounded-xl border bg-card px-4 py-3", className)}>
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description ? (
          <p id={`${id}-desc`} className="text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch
            id={id}
            checked={Boolean(field.value)}
            onCheckedChange={field.onChange}
            onBlur={field.onBlur}
            disabled={disabled}
            aria-describedby={description ? `${id}-desc` : undefined}
          />
        )}
      />
    </div>
  );
}
