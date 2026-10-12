import { describe, expect, it } from "vitest";
import { createWorkerTypeSchema, workerSchema } from "@/features/master-data/schemas";
import { translate, type TranslationKey } from "@/i18n/useT";
import { namesFromWorker, otherTypeNames, pickTypeName, workerTypeName } from "@/lib/workerTypes";

const mason = { label: "Mason", labelRoman: "Mistri", labelUrdu: "مستری" };
const englishOnly = { label: "Electrician", labelRoman: null, labelUrdu: null };
const romanOnly = { label: "Electrician", labelRoman: "Bijli wala", labelUrdu: null };

describe("worker type names", () => {
  it("picks the name for the UI language with fallbacks", () => {
    expect(pickTypeName(mason, "en")).toBe("Mason");
    expect(pickTypeName(mason, "roman-ur")).toBe("Mistri");
    expect(pickTypeName(mason, "ur")).toBe("مستری");
    // urdu → labelUrdu ?? labelRoman ?? label
    expect(pickTypeName(romanOnly, "ur")).toBe("Bijli wala");
    expect(pickTypeName(englishOnly, "ur")).toBe("Electrician");
    // roman → labelRoman ?? label
    expect(pickTypeName(englishOnly, "roman-ur")).toBe("Electrician");
    // blank names count as missing
    expect(pickTypeName({ label: "Watchman", labelRoman: "  ", labelUrdu: "" }, "ur")).toBe("Watchman");
  });

  it("lists the other names without the shown one or repeats", () => {
    expect(otherTypeNames(mason, "en")).toEqual(["Mistri", "مستری"]);
    expect(otherTypeNames(mason, "ur")).toEqual(["Mason", "Mistri"]);
    expect(otherTypeNames(englishOnly, "en")).toEqual([]);
    expect(otherTypeNames({ label: "Mazdoor", labelRoman: "Mazdoor", labelUrdu: "مزدور" }, "roman-ur")).toEqual(["مزدور"]);
  });

  it("resolves a key: company types first, then names on the record, OTHER and unknown keys", () => {
    const types = new Map([["MISTRI", mason]]);
    expect(workerTypeName("MISTRI", "ur", { types, otherName: "دیگر" })).toBe("مستری");
    // A renamed type wins over the (older) names sent with the record
    expect(workerTypeName("MISTRI", "en", { types, names: { label: "Old name" }, otherName: "Other" })).toBe("Mason");
    expect(workerTypeName("ELECTRICIAN", "roman-ur", { types, names: romanOnly, otherName: "Deegar" })).toBe("Bijli wala");
    expect(workerTypeName("OTHER", "roman-ur", { types, names: { label: "Other" }, otherName: "Deegar" })).toBe("Deegar");
    expect(workerTypeName("STEEL_FIXER_HELPER", "en", { otherName: "Other" })).toBe("Steel fixer helper");
  });

  it("reads the names carried on a worker", () => {
    expect(namesFromWorker({ typeLabel: "Mason", typeLabelRoman: "Mistri", typeLabelUrdu: null })).toEqual({ label: "Mason", labelRoman: "Mistri", labelUrdu: null });
    expect(namesFromWorker({})).toBeNull();
  });

  it("OTHER falls back to Other / Deegar / دیگر", () => {
    expect(translate("en", "workerTypes.other")).toBe("Other");
    expect(translate("roman-ur", "workerTypes.other")).toBe("Deegar");
    expect(translate("ur", "workerTypes.other")).toBe("دیگر");
  });
});

describe("worker type form", () => {
  const schema = createWorkerTypeSchema();
  const valid = { label: "Electrician", labelRoman: "Bijli wala", labelUrdu: "بجلی والا", ratePaisa: "300000", overtimeMultiplier: 1.5, isActive: true };
  const errorsOf = (values: Record<string, unknown>) => {
    const result = schema.safeParse(values);
    return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]));
  };

  it("accepts a full type and trims names", () => {
    const result = schema.safeParse({ ...valid, label: "  Electrician  " });
    expect(result.success).toBe(true);
    expect(result.data?.label).toBe("Electrician");
  });

  it("Roman Urdu / Urdu names are optional", () => {
    expect(schema.safeParse({ ...valid, labelRoman: "", labelUrdu: "" }).success).toBe(true);
  });

  it("needs the English name, a daily rate and an overtime multiplier of 1–3", () => {
    expect(errorsOf({ ...valid, label: "" })).toEqual({ label: "Enter the English name" });
    expect(errorsOf({ ...valid, label: "E" })).toEqual({ label: "Name is too short" });
    expect(errorsOf({ ...valid, label: "x".repeat(61) })).toHaveProperty("label");
    expect(errorsOf({ ...valid, labelUrdu: "ب" })).toEqual({ labelUrdu: "Name is too short" });
    expect(errorsOf({ ...valid, ratePaisa: null })).toEqual({ ratePaisa: "Enter the daily rate" });
    expect(errorsOf({ ...valid, ratePaisa: "0" })).toEqual({ ratePaisa: "Enter the daily rate" });
    expect(errorsOf({ ...valid, overtimeMultiplier: null })).toEqual({ overtimeMultiplier: "Between 1 and 3" });
    expect(errorsOf({ ...valid, overtimeMultiplier: 0.5 })).toEqual({ overtimeMultiplier: "Between 1 and 3" });
    expect(errorsOf({ ...valid, overtimeMultiplier: 3.5 })).toEqual({ overtimeMultiplier: "Between 1 and 3" });
    expect(schema.safeParse({ ...valid, overtimeMultiplier: 1 }).success).toBe(true);
    expect(schema.safeParse({ ...valid, overtimeMultiplier: 3 }).success).toBe(true);
  });

  it("messages follow the UI language", () => {
    const urdu = createWorkerTypeSchema((key: TranslationKey) => translate("ur", key));
    const result = urdu.safeParse({ ...valid, ratePaisa: null });
    expect(result.error?.issues[0].message).toBe("یومیہ ریٹ لکھیں");
  });
});

describe("worker form type", () => {
  const worker = { name: "Ustad Akram", type: "ELECTRICIAN", phone: "", dailyRatePaisa: null, notes: "" };

  it("takes any company type key; a type must be chosen", () => {
    expect(workerSchema.safeParse(worker).success).toBe(true);
    expect(workerSchema.safeParse({ ...worker, type: "" }).success).toBe(false);
  });

  it("“Other” needs the worker's own daily rate", () => {
    const other = workerSchema.safeParse({ ...worker, type: "OTHER" });
    expect(other.success).toBe(false);
    expect(other.error?.issues[0].path).toEqual(["dailyRatePaisa"]);
    expect(workerSchema.safeParse({ ...worker, type: "OTHER", dailyRatePaisa: "250000" }).success).toBe(true);
  });
});
