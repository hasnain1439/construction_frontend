"use client";

import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

/** Inline checkbox with its label (e.g. "Remember me"); the field holds a boolean. */
export function CheckboxField({ name, label, disabled, className }: { name: string; label: string; disabled?: boolean; className?: string }) {
  const { control } = useFormContext();
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className={cn("flex items-center gap-2", className)}>
          <Checkbox id={id} checked={Boolean(field.value)} onCheckedChange={(v) => field.onChange(v === true)} onBlur={field.onBlur} disabled={disabled} />
          <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
            {label}
          </Label>
        </div>
      )}
    />
  );
}
