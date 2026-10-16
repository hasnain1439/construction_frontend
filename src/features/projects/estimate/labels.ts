import type { EstimateFormula, EstimateLine, EstimateMaterial } from "@/api/types";
import { formatPKR, toPaisaBigInt, type PaisaInput } from "@/lib/money";
import { isTranslationKey, type TranslationKey, type TranslationVars } from "@/i18n/useT";

type T = (key: TranslationKey, vars?: TranslationVars) => string;

const numberFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** 1234.5 → "1,234.5" (Pakistani grouping, at most 2 decimals). */
export const fmt = (n: number) => numberFormat.format(n);

/** Rounded up for buying: 289.04 bags → "290". */
export const fmtUp = (n: number) => numberFormat.format(Math.ceil(n - 1e-9));

/** "bag" → "bags" / "بوری"; units we don't know (a company's own) stay as they are. */
export function unitText(t: T, unit: string | null | undefined): string {
  if (!unit) return "—";
  const key = `projects.estimate.unit.${unit}`;
  return isTranslationKey(key) ? t(key) : unit;
}

export function materialText(t: T, material: EstimateMaterial): string {
  return t(`projects.estimate.material.${material}` as TranslationKey);
}

/** "Roof slab — volume", or the material name for a material line. */
export function lineText(t: T, line: EstimateLine): string {
  const element = t(`projects.estimate.element.${line.element}` as TranslationKey);
  if (line.kind === "MATERIAL" && line.material) return materialText(t, line.material);
  return line.measure
    ? `${element} — ${t(`projects.estimate.measure.${line.measure}` as TranslationKey)}`
    : element;
}

/** The formula in the user's language (numbers formatted); falls back to the API's English text. */
export function formulaText(t: T, formula: EstimateFormula, fallback: string): string {
  const key = `projects.estimate.formula.${formula.key}`;
  if (!isTranslationKey(key)) return fallback;
  const vars: TranslationVars = {};
  for (const [k, v] of Object.entries(formula.params)) vars[k] = typeof v === "number" ? fmt(v) : v;
  return t(key, vars);
}

/** Paisa → "Rs 62,59,721": estimate amounts are shown to the rupee. */
export function rupees(paisa: PaisaInput): string {
  const value = toPaisaBigInt(paisa);
  if (value === null) return "—";
  const hundred = BigInt(100);
  const abs = value < BigInt(0) ? -value : value;
  const rounded = ((abs + BigInt(50)) / hundred) * hundred;
  return formatPKR(value < BigInt(0) ? -rounded : rounded);
}
