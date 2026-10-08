"use client";

import type { LucideIcon } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  icon?: LucideIcon;
  /** Show only the icon (label becomes the accessible name). */
  iconOnly?: boolean;
}

/** Pill-shaped segmented control (radio group semantics, arrow-key navigation). */
export function SegmentedControl<V extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = "md",
  className,
  disabled,
  invalid,
  id,
}: {
  value: V | undefined;
  onChange: (value: V) => void;
  options: SegmentOption<V>[];
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const index = options.findIndex((o) => o.value === value);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = (i + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-transparent bg-muted p-1",
        invalid && "border-destructive",
        disabled && "opacity-60",
        className,
      )}
    >
      {options.map((option, i) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.iconOnly ? option.label : undefined}
            title={option.iconOnly ? option.label : undefined}
            tabIndex={selected || (index === -1 && i === 0) ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors",
              size === "sm" ? "h-7 px-3 text-xs" : "h-8 px-3.5 text-sm",
              selected ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="size-4" aria-hidden /> : null}
            {option.iconOnly ? null : option.label}
          </button>
        );
      })}
    </div>
  );
}
