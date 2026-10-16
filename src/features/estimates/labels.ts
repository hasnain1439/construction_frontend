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
export function boqUnit(t: T, unit: string | null | undefined): string {
  if (!unit) return "—";
  const key = `estimates.unit.${unit}`;
  return isTranslationKey(key) ? t(key) : unit;
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
