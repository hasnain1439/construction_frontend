/**
 * Money helpers. The API sends paisa (Rs × 100) as strings; everything here is BigInt
 * based so crore-sized contract values never lose precision.
 */

export type PaisaInput = string | number | bigint | null | undefined;

const PAISA_PER_RUPEE = BigInt(100);
const ZERO = BigInt(0);

/** Parses a paisa value; returns null for empty / invalid input. */
export function toPaisaBigInt(value: PaisaInput): bigint | null {
  if (value === null || value === undefined || value === "") return null;
  try {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return null;
      return BigInt(Math.round(value));
    }
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) return null;
    return BigInt(trimmed);
  } catch {
    return null;
  }
}

/** South Asian digit grouping: 18500000 → "1,85,00,000". */
export function groupSouthAsian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}`;
}

function splitPaisa(paisa: bigint) {
  const negative = paisa < ZERO;
  const abs = negative ? -paisa : paisa;
  return { negative, rupees: abs / PAISA_PER_RUPEE, fraction: abs % PAISA_PER_RUPEE };
}

/**
 * `formatPKR("1850000000")` → "Rs 1,85,00,000". Paisa are shown only when non-zero
 * ("Rs 1,450.50"). `null`/invalid → "—".
 */
export function formatPKR(paisa: PaisaInput, options: { prefix?: boolean } = {}): string {
  const value = toPaisaBigInt(paisa);
  if (value === null) return "—";
  const { negative, rupees, fraction } = splitPaisa(value);
  const whole = groupSouthAsian(rupees.toString());
  const decimals = fraction === ZERO ? "" : `.${fraction.toString().padStart(2, "0")}`;
  const prefix = options.prefix === false ? "" : "Rs ";
  return `${negative ? "-" : ""}${prefix}${whole}${decimals}`;
}

/** Rounds `numerator / denominator` half away from zero (BigInt). */
function divRound(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < ZERO !== denominator < ZERO;
  const n = numerator < ZERO ? -numerator : numerator;
  const d = denominator < ZERO ? -denominator : denominator;
  const q = (n * BigInt(2) + d) / (d * BigInt(2));
  return negative ? -q : q;
}

/** "185" (hundredths) → "1.85"; trims trailing zeros ("14.70" → "14.7", "2.00" → "2"). */
function hundredthsToString(hundredths: bigint): string {
  const negative = hundredths < ZERO;
  const abs = negative ? -hundredths : hundredths;
  const whole = abs / PAISA_PER_RUPEE;
  const frac = (abs % PAISA_PER_RUPEE).toString().padStart(2, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${groupSouthAsian(whole.toString())}${frac ? `.${frac}` : ""}`;
}

const PAISA_PER_CRORE = BigInt(1_00_00_000) * PAISA_PER_RUPEE;
const PAISA_PER_LAKH = BigInt(1_00_000) * PAISA_PER_RUPEE;

/**
 * Compact form for KPI cards: "Rs 1.85 Cr", "Rs 14.7 L", below a lakh the full amount
 * rounded to the rupee ("Rs 9,500").
 */
export function formatPKRShort(paisa: PaisaInput): string {
  const value = toPaisaBigInt(paisa);
  if (value === null) return "—";
  const abs = value < ZERO ? -value : value;
  if (abs >= PAISA_PER_CRORE) return `Rs ${hundredthsToString(divRound(value * PAISA_PER_RUPEE, PAISA_PER_CRORE))} Cr`;
  if (abs >= PAISA_PER_LAKH) return `Rs ${hundredthsToString(divRound(value * PAISA_PER_RUPEE, PAISA_PER_LAKH))} L`;
  return formatPKR(divRound(value, PAISA_PER_RUPEE) * PAISA_PER_RUPEE);
}

/** Paisa → rupees as a plain decimal string for inputs: "18550" → "185.5", "100" → "1". */
export function paisaToRupees(paisa: PaisaInput): string {
  const value = toPaisaBigInt(paisa);
  if (value === null) return "";
  const { negative, rupees, fraction } = splitPaisa(value);
  const frac = fraction.toString().padStart(2, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${rupees.toString()}${frac ? `.${frac}` : ""}`;
}

/**
 * Rupees typed by a person → paisa string. Accepts grouping commas and spaces,
 * "Rs" prefix, up to 2 decimals (more are rounded half-up). Invalid → null.
 *   "1,85,000.50" → "18500050"   "450" → "45000"   "abc" → null
 */
export function rupeesToPaisa(rupees: string | number | null | undefined): string | null {
  if (rupees === null || rupees === undefined) return null;
  let text = typeof rupees === "number" ? (Number.isFinite(rupees) ? rupees.toString() : "") : rupees;
  text = text.trim().replace(/^rs\.?\s*/i, "").replace(/[,\s]/g, "");
  if (text === "" || text === "-" || text === ".") return null;
  const match = /^(-)?(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match) return null;
  const [, sign, intPart = "", fracPart = ""] = match;
  if (intPart === "" && fracPart === "") return null;
  const whole = BigInt(intPart || "0");
  const frac2 = (fracPart + "00").slice(0, 2);
  let paisa = whole * PAISA_PER_RUPEE + BigInt(frac2);
  // Round half-up on the third decimal.
  if (fracPart.length > 2 && Number(fracPart[2]) >= 5) paisa += BigInt(1);
  if (sign) paisa = -paisa;
  return paisa.toString();
}

/** Sum of paisa strings (BigInt-safe). */
export function sumPaisa(values: PaisaInput[]): string {
  return values.reduce<bigint>((acc, v) => acc + (toPaisaBigInt(v) ?? ZERO), ZERO).toString();
}

/** paisa × percent / 100, rounded to the nearest rupee (backend rule for stage amounts). */
export function percentOfPaisa(total: PaisaInput, percent: number): string | null {
  const value = toPaisaBigInt(total);
  if (value === null || !Number.isFinite(percent)) return null;
  // percent may have up to 2 decimals → scale by 100 to stay in integers.
  const scaledPercent = BigInt(Math.round(percent * 100));
  const rupees = divRound(value * scaledPercent, PAISA_PER_RUPEE * BigInt(100) * BigInt(100));
  return (rupees * PAISA_PER_RUPEE).toString();
}

/** rate (paisa) × quantity, rounded to the nearest rupee (e.g. labour-only rate × sq ft). */
export function multiplyPaisa(rate: PaisaInput, quantity: number): string | null {
  const value = toPaisaBigInt(rate);
  if (value === null || !Number.isFinite(quantity)) return null;
  const scaledQty = BigInt(Math.round(quantity * 100));
  const rupees = divRound(value * scaledQty, PAISA_PER_RUPEE * BigInt(100));
  return (rupees * PAISA_PER_RUPEE).toString();
}
