/**
 * Bidirectional text helpers for the Urdu (right-to-left) UI.
 *
 * Numbers, money and Latin dates inside Urdu text are left-to-right islands, or the browser moves
 * their parts: "-Rs 36,470" turns into "Rs 36,470-" and "8 Oct 2026" into "Oct 2026 8" (QA-B-04).
 * Text in Urdu script must NOT be forced left-to-right: "17 فروری 2027" in an LTR island reads
 * "فروری 2027 17" (R2-B-01). `isolate` picks the island's direction from the text itself.
 *
 * Marks are added only while the page is right-to-left (<html dir="rtl">), so English and Roman Urdu
 * pages, the server render and tests get plain text. Values shown in data views render after the
 * session loads on the client (never in the server HTML), so this never changes hydration text.
 */
export const LRI = "⁦";
export const RLI = "⁧";
export const PDI = "⁩";

/** Arabic-script letters (Urdu). */
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

export const hasArabicScript = (text: string) => ARABIC_SCRIPT.test(text);

/** True while the page reads right to left (Urdu). */
export function isRtlPage(): boolean {
  return typeof document !== "undefined" && document.documentElement.dir === "rtl";
}

/** Pure left-to-right island (numbers, money, Latin dates and codes) — on an RTL page only. */
export function isolateLtrText(text: string): string {
  return isRtlPage() && text ? `${LRI}${text}${PDI}` : text;
}

/**
 * One island in its own direction — on an RTL page only: Urdu-script text right-to-left
 * ("17 فروری 2027", "10 بوری"), anything else left-to-right ("-Rs 28,024", "8 Oct 2026").
 */
export function isolate(text: string): string {
  if (!isRtlPage() || !text) return text;
  return `${hasArabicScript(text) ? RLI : LRI}${text}${PDI}`;
}

/**
 * Quantity + unit as one island: a Latin unit keeps "-155.687 cft" left to right; an Urdu unit
 * reads right to left after the number ("-155.687 مکعب فٹ"), and the signed number stays LTR.
 */
export function isolateQty(numberText: string, unitText: string): string {
  if (!unitText) return isolateLtrText(numberText);
  if (!isRtlPage()) return `${numberText} ${unitText}`;
  return hasArabicScript(unitText) ? `${RLI}${LRI}${numberText}${PDI} ${unitText}${PDI}` : `${LRI}${numberText} ${unitText}${PDI}`;
}
