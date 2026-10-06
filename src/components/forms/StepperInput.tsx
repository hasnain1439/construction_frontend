"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const round = (n: number, step: number) => Math.round(n / step) * step;

/** − value + for small counts (overtime hours, days). Big touch targets for site phones. */
export function StepperInput({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 99,
  suffix,
  disabled,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  "aria-label": string;
}) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, Number(round(next, step).toFixed(2)))));
  const btn = size === "sm" ? "size-7" : "size-9";
  return (
    <div
      role="spinbutton"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "ArrowUp" || e.key === "+") {
          e.preventDefault();
          set(value + step);
        } else if (e.key === "ArrowDown" || e.key === "-") {
          e.preventDefault();
          set(value - step);
        }
      }}
      className={cn("inline-flex items-center gap-1 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", className)}
    >
      <Button type="button" variant="outline" size="icon" className={btn} tabIndex={-1} aria-label={`Less ${ariaLabel}`} disabled={disabled || value <= min} onClick={() => set(value - step)}>
        <Minus aria-hidden />
      </Button>
      <span className={cn("min-w-8 text-center tabular", size === "sm" ? "text-xs" : "text-sm font-medium")}>
        {value}
        {suffix ? <span className="text-muted-foreground">{suffix}</span> : null}
      </span>
      <Button type="button" variant="outline" size="icon" className={btn} tabIndex={-1} aria-label={`More ${ariaLabel}`} disabled={disabled || value >= max} onClick={() => set(value + step)}>
        <Plus aria-hidden />
      </Button>
    </div>
  );
}
