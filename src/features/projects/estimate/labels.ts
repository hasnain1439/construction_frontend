import type { EstimateFormula, EstimateLine, EstimateMaterial } from "@/api/types";
import { formatPKR, toPaisaBigInt, type PaisaInput } from "@/lib/money";
import { boqUnit } from "@/features/estimates/labels";
import { isTranslationKey, type TranslationKey, type TranslationVars } from "@/i18n/useT";

type T = (key: TranslationKey, vars?: TranslationVars) => string;

const numberFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const smallFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 });

/**
 * 1234.5 → "1,234.5" (Pakistani grouping, at most 2 decimals). Values under 0.1 keep up to 4 decimals,
 * so a rate prints as it is used (QA B-19: termite 0.005 L / sq ft, not "0.01").
 */
export const fmt = (n: number) => (n !== 0 && Math.abs(n) < 0.1 ? smallFormat : numberFormat).format(n);

/** Rounded up for buying: 289.04 bags → "290". */
export const fmtUp = (n: number) => numberFormat.format(Math.ceil(n - 1e-9));

/** "bag" → "bags" / "بوری"; units we don't know (a company's own) stay as they are. */
export function unitText(t: T, unit: string | null | undefined): string {
  if (!unit) return "—";
  const key = `projects.estimate.unit.${unit}`;
  return isTranslationKey(key) ? t(key) : boqUnit(t, unit);
}

export function materialText(t: T, material: EstimateMaterial): string {
  return t(`projects.estimate.material.${material}` as TranslationKey);
}

/** "Roof slab — volume", or the material name for a material line. */
export function lineText(t: T, line: EstimateLine): string {
  if (line.kind === "MATERIAL" && line.material && isTranslationKey(`projects.estimate.material.${line.material}`)) {
    return materialText(t, line.material);
  }
  const elementKey = `projects.estimate.element.${line.element}`;
  // An element or material this app does not know yet: the API's plain-string label (QA re-check NEW-3)
  if (!isTranslationKey(elementKey) || (line.kind === "MATERIAL" && line.material)) return line.label ?? String(line.material ?? line.element);
  const element = t(elementKey);
  return line.measure
    ? `${element} — ${t(`projects.estimate.measure.${line.measure}` as TranslationKey)}`
    : element;
}

/** The formula in the user's language (numbers formatted); falls back to the API's English text. */
export function formulaText(t: T, formula: EstimateFormula, fallback: string): string {
  const key = `projects.estimate.formula.${formula.key}`;
  if (!isTranslationKey(key)) return fallback;
  const vars: TranslationVars = {};
  // Only numbers and strings are printed: an object (an older API's `floor: { level, name }`) prints
  // its name, never "[object Object]" (QA re-check NEW-3).
  for (const [k, v] of Object.entries(formula.params as Record<string, unknown>)) {
    if (typeof v === "number") vars[k] = fmt(v);
    else if (typeof v === "string") vars[k] = v;
    else if (v && typeof v === "object" && typeof (v as { name?: unknown }).name === "string") vars[k] = (v as { name: string }).name;
  }
  const text = t(key, vars);
  // QA re-check NEW-1: a floor whose rooms cover too little of it is scaled up — runs by the square
  // root of the area factor (LINEAR), areas by the area factor (AREA); the API sends which one.
  const { coverageScale, scaleKind } = formula.params;
  if (typeof coverageScale !== "number" || (scaleKind !== "LINEAR" && scaleKind !== "AREA")) return text;
  return (
    text +
    t(`projects.estimate.formulaScale.${scaleKind}`, {
      scale: fmt(coverageScale),
      areaScale: vars.areaScale ?? "",
      roomsPercent: vars.roomsPercent ?? "",
    })
  );
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
