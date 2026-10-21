/**
 * English must be plain English: when the user picks English, no Roman Urdu words are left in the
 * texts (udhaar → credit / balance owed, peshgi → advance, munshi → site clerk, hazri → attendance …).
 * Roman Urdu and Urdu keep their own words. Keys, enum values and API codes (UDHAAR, PESHGI …) are
 * not texts and are not checked.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { EN_SINGULAR } from "@/i18n/plurals";
import { ROLE_LABEL, ROLE_SHORT } from "@/lib/options";

/** Roman Urdu words that are never English (a curated list — none of them is also an English word). */
const BANNED = [
  "udhaar", "udhar", "peshgi", "munshi", "munshis", "hazri", "haziri", "thekedar", "thekedaar", "theka", "thekay",
  "khata", "khaata", "dihari", "dihaari", "mistri", "mistris", "mazdoor", "mazdoors", "mazdoori", "lenter", "bunyaad",
  "chunai", "bharai", "khudai", "tarai", "sariya", "sarya", "bajri", "eent", "kharcha", "kharidari", "kharida",
  "rozana", "maal", "wapsi", "hisaab", "challan", "challans", "garder", "garders", "mumty", "chajja", "deemak",
  "mitti", "chikni", "ustad", "mazeed", "aaj", "karein", "nahi", "naya", "nayi", "adaigi", "gaari",
];
const BANNED_RE = new RegExp(`\\b(${BANNED.join("|")})\\b`, "i");

/** Brand / proper names that may contain a banned word: the mobile app is called "Munshi". */
const ALLOWED = [/\bMunshi app\b/g];

function flatten(node: unknown, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) flatten(value, prefix ? `${prefix}.${key}` : key, out);
  } else if (typeof node === "string") out[prefix] = node;
  return out;
}

const offenders = (texts: Record<string, string>) =>
  Object.entries(texts)
    .map(([key, text]) => {
      const clean = ALLOWED.reduce((rest, re) => rest.replace(re, ""), text.replace(/\{\w+\}/g, ""));
      const hit = clean.match(BANNED_RE);
      return hit ? `${key}: "${text}" (${hit[1]})` : null;
    })
    .filter(Boolean);

describe("English texts are plain English", () => {
  it("the English dictionary (every area, enums and the rulebook) has no Roman Urdu words", () => {
    expect(offenders(flatten(en))).toEqual([]);
  });

  it("the English singular forms have no Roman Urdu words", () => {
    expect(offenders(EN_SINGULAR as Record<string, string>)).toEqual([]);
  });

  it("the English role names say Owner / Project Manager / Site clerk", () => {
    expect(ROLE_LABEL).toEqual({ THEKEDAR: "Owner", PM: "Project Manager", MUNSHI: "Site clerk" });
    expect(offenders(ROLE_SHORT)).toEqual([]);
    expect(en.role).toEqual({ THEKEDAR: "Owner", PM: "Project Manager", MUNSHI: "Site clerk" });
  });

  it("the English error messages and menu labels in code have no Roman Urdu words", () => {
    const texts: Record<string, string> = {};
    const string = String.raw`"((?:[^"\\]|\\.)*)"`;
    const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
    for (const m of read("src/lib/apiErrors.ts").matchAll(new RegExp(String.raw`\ben:\s*` + string, "g"))) texts[`apiErrors@${m.index}`] = m[1]!;
    for (const m of read("src/lib/navigation.ts").matchAll(new RegExp(String.raw`\bL\(\s*` + string, "g"))) texts[`navigation@${m.index}`] = m[1]!;
    expect(Object.keys(texts).length).toBeGreaterThan(100);
    expect(offenders(texts)).toEqual([]);
  });

  it("the guard itself catches Roman Urdu and lets plain English through", () => {
    expect(offenders({ a: "Supplier udhaar", b: "Give peshgi", c: "Hazri register" })).toHaveLength(3);
    expect(offenders({ a: "Balance owed", b: "Give advance", c: "Your team on site with the Munshi app", d: "Making a {munshi} PM" })).toEqual([]);
  });
});
