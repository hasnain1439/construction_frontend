/**
 * Quantities: the API stores Decimal(14,3) and accepts a number or numeric string with at
 * most 3 decimals. Forms keep quantities as strings ("12.5") so nothing is lost to floats;
 * amounts are worked out in BigInt exactly like the backend (qty × rate, half-up to paisa).
 */
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

/** 5000 → "5,000"; with a unit → "5,000 bags". `null` → "—". */
export function formatQty(value: number | string | null | undefined, unit?: string): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  const text = qtyFormatter.format(n);
  return unit ? `${text} ${unitLabel(unit, n)}` : text;
}

/** "bag" → "bags" for counts other than 1; units like "cft", "kg", "nos" stay as they are. */
export function unitLabel(unit: string, n: number): string {
  if (Math.abs(n) === 1) return unit;
  if (["bag", "coil", "drum", "gallon", "litre", "trolley", "ton", "lot"].includes(unit)) return `${unit}s`;
  return unit;
}

/** Signed with an explicit "+" for positive differences ("+2", "-10", "0"). */
export function formatSignedQty(value: number | null | undefined, unit?: string): string {
  if (value === null || value === undefined) return "—";
  const text = formatQty(Math.abs(value), unit);
  return value > 0 ? `+${text}` : value < 0 ? `-${text}` : text;
}
