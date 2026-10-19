/**
 * Quantities: the API stores Decimal(14,3) and accepts a number or numeric string with at
 * most 3 decimals. Forms keep quantities as strings ("12.5") so nothing is lost to floats;
 * amounts are worked out in BigInt exactly like the backend (qty × rate, half-up to paisa).
 */
import { en } from "@/i18n/en";
import { romanUr } from "@/i18n/roman-ur";
import { ur } from "@/i18n/ur";
import type { UiLanguage } from "@/store/slices/uiSlice";
import { isolateQty } from "./bidi";
import { toPaisaBigInt, type PaisaInput } from "./money";

export const QTY_DECIMALS = 3;
const QTY_PATTERN = /^\d{0,10}(\.\d{0,3})?$/;

/** True while typing ("", "12.", "0.125"); false for anything with 4+ decimals or letters. */
export function isQtyDraft(text: string): boolean {
  return QTY_PATTERN.test(text);
}

/** "12." / "" → null; "012.50" → "12.5". Returns null for invalid input. */
export function normalizeQty(text: string | number | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  const raw = String(text).replace(/,/g, "").trim();
  if (raw === "" || raw === "." || !/^\d*\.?\d*$/.test(raw)) return null;
  const [whole = "0", fraction = ""] = raw.split(".");
  if (fraction.length > QTY_DECIMALS) return null;
  const w = whole.replace(/^0+(?=\d)/, "") || "0";
  const f = fraction.replace(/0+$/, "");
  return f ? `${w}.${f}` : w;
}

/** Quantity → thousandths as BigInt ("12.5" → 12500n). */
function toThousandths(qty: string | number): bigint | null {
  const normal = normalizeQty(qty);
  if (normal === null) return null;
  const [whole, fraction = ""] = normal.split(".");
  return BigInt(whole!) * BigInt(1000) + BigInt(fraction.padEnd(3, "0"));
}

/** qty × rate (paisa), rounded half-up to whole paisa — same as the backend's valueOf. */
export function qtyTimesRate(qty: string | number | null | undefined, ratePaisa: PaisaInput): string | null {
  if (qty === null || qty === undefined || qty === "") return null;
  const t = toThousandths(qty);
  const rate = toPaisaBigInt(ratePaisa);
  if (t === null || rate === null) return null;
  const product = t * rate;
  const thousand = BigInt(1000);
  return ((product * BigInt(2) + thousand) / (thousand * BigInt(2))).toString();
}

/** a − b for quantity strings / numbers, as a number with ≤ 3 decimals. */
export function qtyDiff(a: string | number | null | undefined, b: string | number | null | undefined): number | null {
  const x = a === null || a === undefined || a === "" ? null : toThousandths(a);
  const y = b === null || b === undefined || b === "" ? null : toThousandths(b);
  if (x === null || y === null) return null;
  return Number(x - y) / 1000;
}

const qtyFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: QTY_DECIMALS });

/**
 * 5000 → "5,000"; with a unit → "5,000 bags" / "5,000 بوری" (the unit in the page language, QA-A-10 /
 * QA-B-24). On an Urdu page the signed number stays one LTR island (QA-B-04). `null` → "—".
 */
export function formatQty(value: number | string | null | undefined, unit?: string | null, language?: UiLanguage): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  const text = qtyFormatter.format(n);
  return isolateQty(text, unit ? unitLabel(unit, n, language) : "");
}

type UnitKey = keyof typeof en.enum.measureUnit;
const UNIT_NAMES: Record<UiLanguage, Record<UnitKey, string>> = { en: en.enum.measureUnit, "roman-ur": romanUr.enum.measureUnit, ur: ur.enum.measureUnit };

/** Spellings people and older data use for the same unit. */
const UNIT_ALIASES: Record<string, UnitKey> = {
  "sq ft": "sqft",
  "sq. ft": "sqft",
  "sq.ft": "sqft",
  "sq ft.": "sqft",
  sft: "sqft",
  "sq-ft": "sqft",
  no: "nos",
  "no.": "nos",
  "nos.": "nos",
  number: "nos",
  numbers: "nos",
  pcs: "piece",
  pc: "piece",
  "lump sum": "ls",
  lumpsum: "ls",
  kgs: "kg",
  ltr: "litre",
  liter: "litre",
  liters: "litre",
  "cu ft": "cft",
  "running ft": "rft",
  days: "day",
};

/** The catalogue key of a unit ("bags" → "bag", "Sq Ft" → "sqft"); null for a unit typed by hand. */
export function unitKey(unit: string | null | undefined): UnitKey | null {
  if (!unit) return null;
  const u = unit.trim().toLowerCase();
  if (Object.hasOwn(UNIT_NAMES.en, u)) return u as UnitKey;
  if (Object.hasOwn(UNIT_ALIASES, u)) return UNIT_ALIASES[u]!;
  const singular = u.endsWith("es") && Object.hasOwn(UNIT_NAMES.en, u.slice(0, -2)) ? u.slice(0, -2) : u.endsWith("s") ? u.slice(0, -1) : u;
  return Object.hasOwn(UNIT_NAMES.en, singular) ? (singular as UnitKey) : null;
}

/** English units counted one by one: "1 bag" / "2 bags". "cft", "kg", "sq ft", "nos" never change. */
const COUNTABLE = new Set<UnitKey>(["bag", "coil", "drum", "gallon", "litre", "trolley", "ton", "lot", "brick", "tile", "block", "trip", "hour", "day", "week", "month", "job", "point", "set", "piece", "sheet", "bundle", "roll", "box"]);

/** The page language from <html lang> (set by StoreProvider); English on the server and in tests. */
export function pageLanguage(): UiLanguage {
  if (typeof document === "undefined") return "en";
  const lang = document.documentElement.lang;
  return lang === "ur" ? "ur" : lang === "ur-Latn" ? "roman-ur" : "en";
}

/**
 * A unit for `n` of it in `language` (default: the page language): English "1 bag" / "2 bags",
 * "1 no." / "2 nos"; Roman Urdu / Urdu words ("bori", "بوری", "مکعب فٹ"). A unit typed by hand stays
 * as typed. `n = 1` is also the per-unit form: "Rs 1,450 / bag" (QA-A-28).
 */
export function unitLabel(unit: string, n: number, language: UiLanguage = pageLanguage()): string {
  const key = unitKey(unit);
  if (!key) return unit;
  const name = (UNIT_NAMES[language] ?? UNIT_NAMES.en)[key];
  if (language !== "en") return name;
  if (Math.abs(n) === 1) return key === "nos" ? "no." : name;
  return COUNTABLE.has(key) ? `${name}s` : name;
}

/** "/ bag", "/ بوری" — the per-unit form of a rate. */
export const perUnitLabel = (unit: string, language?: UiLanguage) => unitLabel(unit, 1, language);

/** Signed with an explicit "+" for positive differences ("+2", "-10", "0"). */
export function formatSignedQty(value: number | null | undefined, unit?: string | null, language?: UiLanguage): string {
  if (value === null || value === undefined) return "—";
  const n = Math.abs(value);
  const text = `${value > 0 ? "+" : value < 0 ? "-" : ""}${qtyFormatter.format(n)}`;
  return isolateQty(text, unit ? unitLabel(unit, n, language) : "");
}
