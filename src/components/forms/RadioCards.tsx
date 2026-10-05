"use client";

import { Check, type LucideIcon } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { cn } from "@/lib/cn";
import { useFieldError } from "./FormField";

export interface RadioCardOption<V extends string> {
  value: V;
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Small tag, e.g. "Most common". */
  badge?: string;
  disabled?: boolean;
}

/** Controlled card-style radio group (keyboard: arrow keys). */
export function RadioCardGroup<V extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  columns = 2,
  invalid,
  disabled,
}: {
  value: V | null | undefined;
  onChange: (value: V) => void;
  options: RadioCardOption<V>[];
  ariaLabel: string;
  columns?: 2 | 3;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const dir = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = (index + dir + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  const selectedIndex = options.findIndex((o) => o.value === value);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      className={cn("grid gap-3", columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (selectedIndex === -1 && index === 0) ? 0 : -1}
            disabled={disabled || option.disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "relative flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              selected ? "border-primary bg-accent/60 ring-1 ring-primary" : "hover:border-primary/40 hover:bg-muted/40",
              invalid && !selected && "border-destructive",
              (disabled || option.disabled) && "cursor-not-allowed opacity-60",
            )}
          >
            {Icon ? (
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                <Icon className="size-5" aria-hidden />
              </span>
            ) : null}
            <span className="min-w-0 flex-1 space-y-1">
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                {option.title}
                {option.badge ? (
                  <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-medium text-warning">{option.badge}</span>
                ) : null}
              </span>
              {option.description ? <span className="block text-xs text-muted-foreground">{option.description}</span> : null}
            </span>
            {selected ? (
              <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3.5" aria-hidden />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Radio cards bound to a form field, with label, required marker and error. */
export function RadioCards<V extends string>({
  name,
  label,
  required,
  hint,
  options,
  columns,
  disabled,
  className,
}: {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  options: RadioCardOption<V>[];
  columns?: 2 | 3;
  disabled?: boolean;
  className?: string;
}) {
  const { control } = useFormContext();
  const error = useFieldError(name);
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-sm font-medium">
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </p>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <RadioCardGroup<V>
            ariaLabel={label}
            value={field.value as V | undefined}
            onChange={field.onChange}
            options={options}
            columns={columns}
            invalid={Boolean(error)}
            disabled={disabled}
          />
        )}
      />
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
