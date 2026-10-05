"use client";

import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { FormField, useFieldError, type BaseFieldProps } from "./FormField";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** "+ New client" style action at the bottom of the list. */
  createLabel?: string;
  onCreate?: () => void;
  /** Multi-select stores string[]. */
  multiple?: boolean;
  loading?: boolean;
}

/** Controlled searchable select (single or multiple). */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "Nothing found",
  createLabel,
  onCreate,
  multiple,
  loading,
  id,
  disabled,
  invalid,
  describedBy,
  ariaLabel,
}: ComboboxProps & {
  value: string | string[] | null | undefined;
  onChange: (value: string | string[] | null) => void;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** Accessible name when there is no visible <label> (table cells). */
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const selected = multiple ? ((value as string[] | undefined) ?? []) : value ? [value as string] : [];
  const labels = selected.map((v) => options.find((o) => o.value === v)?.label ?? v);

  const toggle = (optionValue: string) => {
    if (multiple) {
      onChange(selected.includes(optionValue) ? selected.filter((v) => v !== optionValue) : [...selected, optionValue]);
    } else {
      onChange(optionValue === value ? null : optionValue);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-1.5 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
            invalid && "border-destructive ring-3 ring-destructive/20",
          )}
        >
          <span className={cn("flex min-w-0 flex-1 flex-wrap gap-1", !labels.length && "text-muted-foreground")}>
            {labels.length === 0
              ? placeholder
              : multiple
                ? labels.map((label, i) => (
                    <span key={selected[i]} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                      {label}
                    </span>
                  ))
                : <span className="truncate">{labels[0]}</span>}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent id={listId} className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{loading ? "Loading…" : emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.description ?? ""} ${option.value}`}
                  onSelect={() => toggle(option.value)}
                >
                  <Check className={cn("size-4", selected.includes(option.value) ? "opacity-100" : "opacity-0")} aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate">{option.label}</p>
                    {option.description ? <p className="truncate text-xs text-muted-foreground">{option.description}</p> : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {(onCreate && createLabel) || (multiple && selected.length) ? (
            <div className="flex items-center justify-between gap-2 border-t p-1.5">
              {onCreate && createLabel ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    onCreate();
                  }}
                >
                  <Plus data-icon="inline-start" />
                  {createLabel}
                </Button>
              ) : (
                <span />
              )}
              {multiple && selected.length ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
                  <X data-icon="inline-start" />
                  Clear
                </Button>
              ) : null}
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Searchable select bound to a form field (string, or string[] with `multiple`). */
export function ComboboxField({
  name,
  label,
  required,
  hint,
  disabled,
  className,
  hideLabel,
  ...combobox
}: BaseFieldProps & ComboboxProps) {
  const { control } = useFormContext();
  const error = useFieldError(name);
  return (
    <FormField label={label} required={required} hint={hint} error={error} className={className} hideLabel={hideLabel}>
      {({ id, describedBy, invalid }) => (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <Combobox
              {...combobox}
              id={id}
              value={field.value as string | string[] | null | undefined}
              onChange={field.onChange}
              disabled={disabled}
              invalid={invalid}
              describedBy={describedBy}
            />
          )}
        />
      )}
    </FormField>
  );
}
