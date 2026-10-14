"use client";

import { Bike, Coffee, Fuel, Hammer, HelpCircle, Home, PackageOpen, Truck, Wrench, type LucideIcon } from "lucide-react";
import { useEnumT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";

export type KharchaCategory = "TEA_WATER" | "TRANSPORT" | "UNLOADING" | "FUEL" | "SMALL_TOOLS" | "URGENT_MATERIAL" | "OWNER_PURCHASE" | "REPAIRS" | "OTHER";

/** Kharcha categories; labels come from the `cashKharchaCategory` enum group (`te("cashKharchaCategory", value)`). */
export const KHARCHA_CATEGORIES: Array<{ value: KharchaCategory; icon: LucideIcon }> = [
  { value: "TEA_WATER", icon: Coffee },
  { value: "TRANSPORT", icon: Bike },
  { value: "UNLOADING", icon: Truck },
  { value: "FUEL", icon: Fuel },
  { value: "SMALL_TOOLS", icon: Hammer },
  { value: "URGENT_MATERIAL", icon: PackageOpen },
  { value: "OWNER_PURCHASE", icon: Home },
  { value: "REPAIRS", icon: Wrench },
  { value: "OTHER", icon: HelpCircle },
];

/**
 * Kharcha categories as big tappable chips (radio group). `allowAll` adds an "All" chip
 * for filtering (value `undefined`).
 */
export function CategoryChips({
  value,
  onChange,
  allowAll,
  ariaLabel,
  className,
}: {
  value: KharchaCategory | undefined;
  onChange: (value: KharchaCategory | undefined) => void;
  allowAll?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const t = useT();
  const te = useEnumT();
  const options: Array<{ value: KharchaCategory | undefined; label: string; icon?: LucideIcon }> = [
    ...(allowAll ? [{ value: undefined, label: t("common.all") }] : []),
    ...KHARCHA_CATEGORIES.map((c) => ({ ...c, label: te("cashKharchaCategory", c.value) })),
  ];
  return (
    <div role="radiogroup" aria-label={ariaLabel ?? t("field.category")} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const active = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value ?? "ALL"}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {Icon ? <Icon className="size-4" aria-hidden /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
