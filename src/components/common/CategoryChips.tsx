"use client";

import { Bike, Coffee, Fuel, Hammer, HelpCircle, Home, PackageOpen, Truck, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type KharchaCategory = "TEA_WATER" | "TRANSPORT" | "UNLOADING" | "FUEL" | "SMALL_TOOLS" | "URGENT_MATERIAL" | "OWNER_PURCHASE" | "REPAIRS" | "OTHER";

export const KHARCHA_CATEGORIES: Array<{ value: KharchaCategory; label: string; icon: LucideIcon }> = [
  { value: "TEA_WATER", label: "Tea / water", icon: Coffee },
  { value: "TRANSPORT", label: "Transport", icon: Bike },
  { value: "UNLOADING", label: "Unloading", icon: Truck },
  { value: "FUEL", label: "Fuel", icon: Fuel },
  { value: "SMALL_TOOLS", label: "Small tools", icon: Hammer },
  { value: "URGENT_MATERIAL", label: "Urgent material", icon: PackageOpen },
  { value: "OWNER_PURCHASE", label: "For the owner", icon: Home },
  { value: "REPAIRS", label: "Repairs", icon: Wrench },
  { value: "OTHER", label: "Other", icon: HelpCircle },
];

export const categoryLabel = (value: string | null | undefined) => KHARCHA_CATEGORIES.find((c) => c.value === value)?.label ?? "—";

/**
 * Kharcha categories as big tappable chips (radio group). `allowAll` adds an "All" chip
 * for filtering (value `undefined`).
 */
export function CategoryChips({
  value,
  onChange,
  allowAll,
  ariaLabel = "Category",
  className,
}: {
  value: KharchaCategory | undefined;
  onChange: (value: KharchaCategory | undefined) => void;
  allowAll?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const options: Array<{ value: KharchaCategory | undefined; label: string; icon?: LucideIcon }> = [...(allowAll ? [{ value: undefined, label: "All" }] : []), ...KHARCHA_CATEGORIES];
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("flex flex-wrap gap-2", className)}>
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
