"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { passwordStrength } from "@/lib/validation";
import { FormField, useFieldError, type BaseFieldProps } from "./FormField";

const STRENGTH_COLORS = ["bg-danger", "bg-danger", "bg-warning", "bg-success"] as const;

function StrengthMeter({ name }: { name: string }) {
  const value = useWatch({ name }) as string | undefined;
  const { score, label } = passwordStrength(value ?? "");
  if (!value) return null;
  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3].map((step) => (
          <span key={step} className={cn("h-1.5 flex-1 rounded-full", score >= step ? STRENGTH_COLORS[score] : "bg-muted")} />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/** Password input with show/hide and an optional strength hint. */
export function PasswordField({
  name,
  label,
  required,
  hint,
  disabled,
  className,
  autoComplete = "current-password",
  showStrength,
}: BaseFieldProps & { autoComplete?: "current-password" | "new-password"; showStrength?: boolean }) {
  const { register } = useFormContext();
  const error = useFieldError(name);
  const [visible, setVisible] = useState(false);
  return (
    <FormField label={label} required={required} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="space-y-2">
          <div className="relative">
            <Input
              id={id}
              type={visible ? "text" : "password"}
              autoComplete={autoComplete}
              disabled={disabled}
              aria-required={required || undefined}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              className="pr-10"
              {...register(name)}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {showStrength ? <StrengthMeter name={name} /> : null}
        </div>
      )}
    </FormField>
  );
}
