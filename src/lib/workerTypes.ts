/**
 * Worker types are company-defined (GET /worker-types): each has an English `label` and optional
 * Roman Urdu / Urdu names. These helpers pick the name for the current UI language.
 */
import type { UiLanguage } from "@/store/slices/uiSlice";
import { humanize } from "@/lib/status";

/** Always allowed, never listed by the API; it has no rate (the worker's own rate is required). */
export const OTHER_WORKER_TYPE = "OTHER";

export interface TypeNames {
  label: string;
  labelRoman?: string | null;
  labelUrdu?: string | null;
}

const clean = (value: string | null | undefined) => (value && value.trim() ? value.trim() : null);

/** urdu → labelUrdu ?? labelRoman ?? label · roman → labelRoman ?? label · en → label. */
export function pickTypeName(names: TypeNames, language: UiLanguage): string {
  const label = names.label.trim();
  if (language === "ur") return clean(names.labelUrdu) ?? clean(names.labelRoman) ?? label;
  if (language === "roman-ur") return clean(names.labelRoman) ?? label;
  return label;
}

/** The type's other names (not the one shown), without blanks or repeats — shown small under it. */
export function otherTypeNames(names: TypeNames, language: UiLanguage): string[] {
  const shown = pickTypeName(names, language);
  const all = [names.label.trim(), clean(names.labelRoman), clean(names.labelUrdu)].filter((n): n is string => Boolean(n));
  return all.filter((n, i) => n !== shown && all.indexOf(n) === i);
}

/** Names carried on a worker (`typeLabel`, `typeLabelRoman`, `typeLabelUrdu`), if the response has them. */
export function namesFromWorker(w: { typeLabel?: string; typeLabelRoman?: string | null; typeLabelUrdu?: string | null }): TypeNames | null {
  return w.typeLabel ? { label: w.typeLabel, labelRoman: w.typeLabelRoman ?? null, labelUrdu: w.typeLabelUrdu ?? null } : null;
}

/**
 * Name of a worker type `key` in the current language. Looks the key up in the company's types
 * first (fresh after a rename), then in names sent with the record; OTHER → `otherName`
 * (translated), unknown keys → a readable form of the key.
 */
export function workerTypeName(
  key: string,
  language: UiLanguage,
  options: { types?: ReadonlyMap<string, TypeNames>; names?: TypeNames | null; otherName: string },
): string {
  if (key === OTHER_WORKER_TYPE) return options.otherName;
  const names = options.types?.get(key) ?? options.names;
  if (names?.label) return pickTypeName(names, language);
  return key ? humanize(key) : "—";
}
