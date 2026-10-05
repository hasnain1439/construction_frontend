"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";

/** One joined filter bar above a list: search, selects, date range, toggles. */
export function FilterBar({
  children,
  onClear,
  canClear,
  trailing,
  className,
}: {
  children: ReactNode;
  onClear?: () => void;
  /** Show "Clear" only while a filter is active. */
  canClear?: boolean;
  /** Right-aligned controls (view toggles …). */
  trailing?: ReactNode;
  className?: string;
}) {
  const t = useT();
  return (
    <div
      role="search"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 shadow-card",
        className,
      )}
    >
      {children}
      {onClear && canClear ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X data-icon="inline-start" />
          {t("common.clear")}
        </Button>
      ) : null}
      {trailing ? <div className="ml-auto flex items-center gap-2">{trailing}</div> : null}
    </div>
  );
}

export interface FilterOption {
  value: string;
  label: string;
}

const ALL = "__all__";

/** Compact select used inside a FilterBar; empty value = "All". */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  allLabel?: string;
  className?: string;
}) {
  const t = useT();
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
      <SelectTrigger className={cn("min-w-36 rounded-full", className)} aria-label={label}>
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel ?? t("common.all")}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
