"use client";

import { useMemo } from "react";
import { useGetEquipmentBalancesQuery, useGetEquipmentListQuery } from "@/api/services/equipment.api";
import { useGetStockLocationsQuery } from "@/api/services/inventory.api";
import type {
  AllocationLocation,
  EquipmentCategory,
  EquipmentKind,
  EquipmentQuery,
  EquipmentRef,
  LocationRef,
} from "@/api/types";
import { useCan, usePermissions } from "@/components/common/PermissionGate";
import type { ComboboxOption } from "@/components/forms/ComboboxField";
import { useEnumT, useT, type TranslationKey } from "@/i18n/useT";
import { formatQty } from "@/lib/quantity";

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  "SHUTTERING_PLATE",
  "PROP",
  "SCAFFOLDING",
  "MIXER",
  "VIBRATOR",
  "GENERATOR",
  "PUMP",
  "TOOL",
  "OTHER",
];
export const EQUIPMENT_KINDS: EquipmentKind[] = ["BULK", "MACHINE"];

/** "Yard" for the Central Store, "In transit" for the transit bucket, otherwise the site name. */
export function placeName(
  t: (key: TranslationKey) => string,
  location: Pick<LocationRef, "type" | "name"> | null | undefined,
): string {
  if (!location) return "—";
  if (location.type === "STORE") return t("equipment.common.yard");
  if (location.type === "TRANSIT") return t("equipment.common.inTransit");
  return location.name;
}

/** Rates, values and amounts are shown only with `fields.rates` (the API leaves them out otherwise). */
export function useSeesRates(): boolean {
  return usePermissions().canSee("rates");
}

/** Category / kind choices in the current language. */
export function useCategoryOptions() {
  const te = useEnumT();
  return EQUIPMENT_CATEGORIES.map((value) => ({ value, label: te("equipmentCategory", value) }));
}

export function useKindOptions() {
  const te = useEnumT();
  return EQUIPMENT_KINDS.map((value) => ({ value, label: te("equipmentKind", value) }));
}

/** Active equipment of the register for pickers. */
export function useEquipmentOptions(): {
  options: ComboboxOption[];
  byId: Map<string, EquipmentRef>;
  loading: boolean;
} {
  const te = useEnumT();
  const { data, isLoading } = useGetEquipmentListQuery({ active: "true", limit: 100 } as EquipmentQuery);
  return useMemo(() => {
    const rows = data?.items ?? [];
    return {
      options: rows.map((e) => ({
        value: e.id,
        label: e.code ? `${e.name} (${e.code})` : e.name,
        description: te("equipmentCategory", e.category),
      })),
      byId: new Map(rows.map((e) => [e.id, e])),
      loading: isLoading,
    };
  }, [data, isLoading, te]);
}

/** One countable pile at a location: owned units of an item, or the units of one rental. */
export interface Bucket {
  /** `equipmentId:rentalId` ("" for owned). */
  key: string;
  equipment: EquipmentRef;
  rental: { id: string; number: string } | null;
  qty: number;
}

export const bucketKey = (equipmentId: string, rentalId: string | null | undefined) =>
  `${equipmentId}:${rentalId ?? ""}`;
export const splitBucket = (key: string) => {
  const [equipmentId = "", rentalId = ""] = key.split(":");
  return { equipmentId, rentalId: rentalId || null };
};

/** Owned and per-rental piles at one location of the allocation map. */
export function bucketsOf(location: AllocationLocation | undefined): Bucket[] {
  if (!location) return [];
  return location.items.flatMap((item) => {
    const own: Bucket[] =
      item.ownedQty > 0
        ? [
            {
              key: bucketKey(item.equipment.id, null),
              equipment: item.equipment,
              rental: null,
              qty: item.ownedQty,
            },
          ]
        : [];
    const rented: Bucket[] = item.rentals
      .filter((r) => r.qty > 0)
      .map((r) => ({
        key: bucketKey(item.equipment.id, r.id),
        equipment: item.equipment,
        rental: { id: r.id, number: r.number },
        qty: r.qty,
      }));
    return [...own, ...rented];
  });
}

/** Picker label of a pile: "Steel plate — own · 240 nos" / "Steel plate — RNT-0003 · 100 nos". */
export function useBucketOptions(buckets: Bucket[]): ComboboxOption[] {
  const t = useT();
  return buckets.map((b) => ({
    value: b.key,
    label: `${b.equipment.name} — ${b.rental ? b.rental.number : t("equipment.common.owned")}`,
    description: t("equipment.common.availableQty", { qty: formatQty(b.qty, b.equipment.unit) }),
  }));
}

/**
 * Where equipment is (allocation map) and the yard. The yard comes from the stock locations when
 * the caller may list them; otherwise from the map (only when something is in the yard).
 */
export function useEquipmentPlaces(): {
  map: AllocationLocation[];
  yard: LocationRef | null;
  loading: boolean;
} {
  const canListLocations = useCan("inventory.stock.view");
  const balances = useGetEquipmentBalancesQuery();
  const locations = useGetStockLocationsQuery(undefined, { skip: !canListLocations });
  return useMemo(() => {
    const map = balances.data?.locations ?? [];
    const yard =
      locations.data?.find((l) => l.type === "STORE") ??
      map.find((l) => l.location.type === "STORE")?.location ??
      null;
    return { map, yard, loading: balances.isLoading };
  }, [balances.data, balances.isLoading, locations.data]);
}
