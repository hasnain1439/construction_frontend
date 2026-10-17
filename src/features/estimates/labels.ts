import type { BoqLine, BoqMoney, BoqSection, BoqSectionBlock, BuildStageKey, LocalizedLabel } from "@/api/types";
import { BOQ_SECTIONS } from "@/api/types";
import type { PdfLang } from "@/api/services/estimates.api";
import { isTranslationKey, type TranslationKey, type TranslationVars } from "@/i18n/useT";
import type { UiLanguage } from "@/store/slices/uiSlice";

type T = (key: TranslationKey, vars?: TranslationVars) => string;

export { fmt, fmtUp, rupees } from "@/features/projects/estimate/labels";

/** Rulebook / document language of a UI language. */
export const pdfLang = (language: UiLanguage): PdfLang => (language === "roman-ur" ? "roman" : language === "ur" ? "ur" : "en");

/** The API label in the UI language (rulebook parameters carry en / roman / ur). */
export const localized = (label: LocalizedLabel, language: UiLanguage) => (language === "roman-ur" ? label.roman : language === "ur" ? label.ur : label.en) || label.en;

export const sectionText = (t: T, section: BoqSection) => t(`estimates.section.${section}`);

export const stageText = (t: T, stage: BuildStageKey | null) => t(stage ? `estimates.stage.${stage}` : "estimates.stage.ALL");

/** "bag" → "bags" / "بوری"; units we don't know ("%", a company's own) stay as they are. */
/** A unit as the price list / API spells it ("TON", "Sq Ft", "bags") → our dictionary key ("ton", "sqft", "bag"). */
export function unitKey(unit: string): string {
  const u = unit.trim().toLowerCase().replace(/[\s._-]+/g, "");
  const ALIASES: Record<string, string> = {
    bags: "bag",
    no: "nos",
    pcs: "nos",
    piece: "nos",
    pieces: "nos",
    tons: "ton",
    tonne: "ton",
    bricks: "brick",
    blocks: "block",
    sqft: "sqft",
    sft: "sqft",
    squarefeet: "sqft",
    gallons: "gallon",
    litres: "litre",
    liter: "litre",
    trolleys: "trolley",
    ls: "LS",
    lumpsum: "LS",
  };
  return ALIASES[u] ?? u;
}

export function boqUnit(t: T, unit: string | null | undefined): string {
  if (!unit) return "—";
  const exact = `estimates.unit.${unit}`;
  if (isTranslationKey(exact)) return t(exact);
  const key = `estimates.unit.${unitKey(unit)}`;
  return isTranslationKey(key) ? t(key) : unit;
}

/** The unit after "/" in a rate, singular and translated: "Rs 9 / brick" (QA-A-28). */
export function boqRateUnit(t: T, unit: string | null | undefined): string {
  if (!unit) return "—";
  const key = `estimates.rateUnit.${unitKey(unit)}`;
  return isTranslationKey(key) ? t(key) : boqUnit(t, unit);
}

/**
 * Item name: a price-list material keeps the company's own name (`description`); engine lines
 * (lump sums, labour, overheads) and materials without a price-list item use our dictionary.
 */
export function lineText(t: T, line: Pick<BoqLine, "lineKey" | "kind" | "material" | "materialId" | "description">): string {
  if (line.kind === "MATERIAL" && line.materialId) return line.description;
  const item = line.lineKey.split(".").at(-1) ?? "";
  const itemKey = `estimates.item.${item}`;
  if (line.kind !== "MATERIAL" && isTranslationKey(itemKey)) return t(itemKey);
  const materialKey = `estimates.material.${line.material ?? item}`;
  if (isTranslationKey(materialKey)) return t(materialKey);
  return line.description;
}

/** Sections in BoQ order (the API leaves out empty ones). */
export function orderedSections(sections: BoqSectionBlock[]): BoqSectionBlock[] {
  return [...sections].sort((a, b) => BOQ_SECTIONS.indexOf(a.section) - BOQ_SECTIONS.indexOf(b.section));
}

/**
 * Formula / trace text a user without rates may see: the API writes lump-sum rates into the text
 * ("Covered 3950 sq ft × Rs 150 per sq ft"), so lines naming a rupee amount are dropped.
 */
export const visibleText = (text: string, money: boolean) => money || !/\bRs\.?\s?\d/.test(text);

/** True when the response carries money (the keys are absent without fields.rates). */
export const hasMoney = (m: BoqMoney) => m.totalPaisa !== undefined;

/** True when the margin is visible (fields.contract + fields.profit). */
export const hasMargin = (m: BoqMoney) => m.marginPercent !== undefined;

/** A rulebook parameter's description in the UI language (QA-A-10); the API's English text for an unknown key. */
export function ruleDescText(t: T, p: { key: string; description: string }): string {
  const key = `estimates.ruleDesc.${p.key}`;
  return isTranslationKey(key) ? t(key) : p.description;
}

/** A rulebook parameter's unit in the UI language (QA-A-10). */
export function ruleUnitText(t: T, p: { key: string; unit: string }): string {
  const key = `estimates.ruleUnit.${p.key}`;
  return isTranslationKey(key) ? t(key) : p.unit;
}

/** A number / amount isolated inside a translated sentence, so Urdu text around it keeps its order (QA-A-30). */
export const iso = (text: string) => `⁨${text}⁩`;
