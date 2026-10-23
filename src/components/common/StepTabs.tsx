"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";

export interface Step {
  id: number;
  /** Shown in the circle when it differs from `id` (a hidden step renumbers the rest). */
  number?: number;
  label: string;
  completed?: boolean;
  hasError?: boolean;
  disabled?: boolean;
}

/**
 * Where `current` sits among the steps, for the compact "Step 6 of 7 · Estimate" header: its
 * number, the total, its label and the nearest enabled step before / after it (null at either end).
 */
export function stepPosition(steps: Step[], current: number) {
  const index = steps.findIndex((s) => s.id === current);
  const step = index >= 0 ? steps[index] : undefined;
  const nearest = (dir: 1 | -1) => {
    if (index < 0) return null;
    for (let i = index + dir; i >= 0 && i < steps.length; i += dir) {
      if (!steps[i].disabled) return steps[i].id;
    }
    return null;
  };
  return { number: step ? (step.number ?? step.id) : 0, total: steps.length, label: step?.label ?? "", prev: nearest(-1), next: nearest(1) };
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Numbered tab bar (New Project wizard): green check on completed steps, red dot on steps
 * with errors. Arrow keys move between enabled steps. The bar scrolls the active step into view
 * on mount and on every change (QA R-01); below 1100 px, where the bar no longer fits, a compact
 * "Step 6 of 7 · Estimate" header with previous / next arrows sits above it.
 */
export function StepTabs({
  steps,
  current,
  onSelect,
  ariaLabel,
  className,
}: {
  steps: Step[];
  current: number;
  onSelect: (id: number) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const t = useT();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const mounted = useRef(false);
  const activeIndex = steps.findIndex((s) => s.id === current);
  const position = stepPosition(steps, current);

  // Instantly on mount, smoothly afterwards (unless the user prefers reduced motion).
  useEffect(() => {
    const smooth = mounted.current && !prefersReducedMotion();
    mounted.current = true;
    refs.current[activeIndex]?.scrollIntoView?.({ inline: "center", block: "nearest", behavior: smooth ? "smooth" : "auto" });
  }, [activeIndex]);

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
    <div className={cn("space-y-2", className)}>
      <div data-testid="step-compact" className="flex items-center justify-between gap-2 min-[1100px]:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label={t("app.components.steps.previous")}
          disabled={position.prev === null}
          onClick={() => position.prev !== null && onSelect(position.prev)}
        >
          <ChevronLeft className="rtl:-scale-x-100" />
        </Button>
        <p className="min-w-0 truncate text-center text-sm font-semibold" aria-live="polite">
          {t("app.components.steps.position", { n: position.number, total: position.total })}
          {position.label ? ` · ${position.label}` : null}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label={t("app.components.steps.next")}
          disabled={position.next === null}
          onClick={() => position.next !== null && onSelect(position.next)}
        >
          <ChevronRight className="rtl:-scale-x-100" />
        </Button>
      </div>
      <div role="tablist" aria-label={ariaLabel ?? t("app.components.steps.label")} className="flex gap-1 overflow-x-auto rounded-2xl border border-transparent bg-card p-1.5 shadow-card">
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
                {step.completed ? <Check className="size-4" aria-label={t("app.components.steps.completed")} /> : (step.number ?? step.id)}
              </span>
              <span>{step.label}</span>
              {step.hasError ? (
                <span className="absolute top-2 end-2 size-2 rounded-full bg-danger" aria-label={t("app.components.steps.hasErrors")} role="img" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
