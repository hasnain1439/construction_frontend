"use client";

import { Check } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface Step {
  id: number;
  label: string;
  completed?: boolean;
  hasError?: boolean;
  disabled?: boolean;
}

/**
 * Numbered tab bar (New Project wizard): green check on completed steps, red dot on steps
 * with errors. Arrow keys move between enabled steps.
 */
export function StepTabs({
  steps,
  current,
  onSelect,
  ariaLabel = "Steps",
  className,
}: {
  steps: Step[];
  current: number;
  onSelect: (id: number) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const dir = event.key === "ArrowRight" ? 1 : -1;
    for (let i = index + dir; i >= 0 && i < steps.length; i += dir) {
      if (!steps[i].disabled) {
        refs.current[i]?.focus();
        onSelect(steps[i].id);
        return;
      }
    }
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("flex gap-1 overflow-x-auto rounded-2xl border border-transparent bg-card p-1.5 shadow-card", className)}>
      {steps.map((step, index) => {
        const active = step.id === current;
        return (
          <button
            key={step.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`step-tab-${step.id}`}
            aria-selected={active}
            aria-controls={`step-panel-${step.id}`}
            tabIndex={active ? 0 : -1}
            disabled={step.disabled}
            data-completed={step.completed || undefined}
            data-error={step.hasError || undefined}
            onClick={() => onSelect(step.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "relative flex min-w-max flex-1 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
              active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              step.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                step.completed
                  ? "border-success bg-success text-white"
                  : active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
              )}
            >
              {step.completed ? <Check className="size-4" aria-label="Completed" /> : step.id}
            </span>
            <span>{step.label}</span>
            {step.hasError ? (
              <span className="absolute top-2 right-2 size-2 rounded-full bg-danger" aria-label="Has errors" role="img" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
