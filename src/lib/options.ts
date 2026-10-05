/**
 * Domain vocabulary used by more than one screen (labels for backend enums and option
 * lists for selects). Keep labels here, not in pages.
 */
import type { Role } from "@/api/types";

export const REGION_OPTIONS = [
  { value: "PUNJAB_KP" as const, title: "Punjab / KP", description: "Brick construction" },
  { value: "KARACHI_SINDH" as const, title: "Karachi / Sindh", description: "Block construction" },
];

export const REGION_LABEL: Record<string, string> = { PUNJAB_KP: "Punjab / KP", KARACHI_SINDH: "Karachi / Sindh" };

export const MARLA_OPTIONS = [
  { value: "225" as const, label: "225 sq ft" },
  { value: "272.25" as const, label: "272.25 sq ft" },
];

export const ROLE_LABEL: Record<Role, string> = { THEKEDAR: "Thekedar", PM: "Project Manager", MUNSHI: "Munshi" };
export const ROLE_SHORT: Record<Role, string> = { THEKEDAR: "Thekedar", PM: "PM", MUNSHI: "Munshi" };

export const LANGUAGE_LABEL: Record<string, string> = { ENGLISH: "English", ROMAN_URDU: "Roman Urdu", URDU: "اردو (Urdu)" };

export const PAYMENT_METHOD_OPTIONS = [
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "EASYPAISA", label: "Easypaisa" },
  { value: "RAAST", label: "Raast" },
  { value: "IBFT", label: "Bank transfer (IBFT)" },
] as const;
export const PAYMENT_METHOD_LABEL: Record<string, string> = Object.fromEntries(PAYMENT_METHOD_OPTIONS.map((o) => [o.value, o.label]));

export const HOLIDAY_TYPE_LABEL: Record<string, string> = { NON_WORKING: "Non-working day", PARTIAL: "Partial day" };

export const PLATFORM_LABEL: Record<string, string> = { ANDROID: "Android", IOS: "iPhone", WEB: "Web browser" };

export const WORKER_TYPE_LABEL: Record<string, string> = {
  MISTRI: "Mistri",
  MISTRI_TILES: "Mistri (tiles)",
  MAZDOOR: "Mazdoor",
  STEEL_FIXER_HELPER: "Steel-fixer helper",
  CHOWKIDAR: "Chowkidar",
  OTHER: "Other",
};

export const TRADE_LABEL: Record<string, string> = {
  SHUTTERING: "Shuttering",
  STEEL_FIXING: "Steel fixing",
  BRICK_MASONRY: "Brick masonry",
  PLASTER: "Plaster",
  TILE_LAYING: "Tile laying",
  ELECTRICAL_CONDUIT: "Electrical conduit",
  PLUMBING_ROUGH_IN: "Plumbing rough-in",
  WATERPROOFING: "Waterproofing",
  PAINT: "Paint",
};

export const SUPPLY_CATEGORY_LABEL: Record<string, string> = { GREY_STRUCTURE: "Grey structure", FINISHING: "Finishing" };
export const SECTION_LABEL: Record<string, string> = { CIVIL: "Civil / Structural", FINISHING: "Finishing" };

export const LABOR_UNIT_LABEL: Record<string, string> = {
  DAY: "per day",
  SQFT: "per sq ft",
  TON: "per ton",
  BRICK: "per brick",
  RFT: "per running ft",
  LUMPSUM: "lump sum",
};

export const BILLING_MODEL_LABEL: Record<string, string> = { STAGE_SCHEDULE: "Stage schedule", RUNNING_BILLS: "Running bills" };

/** "1 bag = 50 kg" style text for alternate units. */
export function formatAltUnits(unit: string, altUnits: Array<{ unit: string; factor: number }>): string {
  return altUnits.map((a) => `1 ${unit} = ${a.factor.toLocaleString("en-PK")} ${a.unit}`).join(" · ");
}

export const toOptions = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));
