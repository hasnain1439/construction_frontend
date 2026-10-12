import { z } from "zod";
import { percentTotal } from "@/components/common/PercentTotalChip";
import { translate, type TranslationKey } from "@/i18n/useT";
import { optionalAnyPhoneSchema, optionalPhoneSchema, optionalText, requiredText } from "@/lib/validation";
import { OTHER_WORKER_TYPE } from "@/lib/workerTypes";

export const materialSchema = z.object({
  name: requiredText("Name", 2, 80),
  groupId: z.string().min(1, "Choose a group"),
  unit: requiredText("Unit", 1, 20),
  unitDetail: z.string().trim().max(80, "Too long"),
  altUnits: z
    .array(
      z.object({
        unit: requiredText("Unit", 1, 20),
        factor: z
          .number({ error: "Enter a number" })
          .nullable()
          .refine((v): v is number => v !== null && v > 0, "Must be more than 0"),
      }),
    )
    .max(5, "Up to 5 other units"),
  supplyCategory: z.enum(["GREY_STRUCTURE", "FINISHING"]),
});

const categoryCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9_]{1,9}$/, "2–10 capital letters, digits or _ (start with a letter)");

export const categorySchema = z.object({
  name: requiredText("Category name", 1, 60),
  code: categoryCode,
  description: z.string().trim().max(300, "Too long"),
  copyRatesFromCategoryId: z.string(),
});

export const renameCategorySchema = z.object({
  name: requiredText("Category name", 1, 60),
  description: z.string().trim().max(300, "Too long"),
});

export const duplicateCategorySchema = z.object({
  name: requiredText("Category name", 1, 60),
  code: categoryCode,
});

export const bulkPercentSchema = z.object({
  percent: z
    .number({ error: "Enter a percentage" })
    .nullable()
    .refine((v): v is number => v !== null && v !== 0 && v >= -50 && v <= 100, "Between −50 and +100 (not 0)"),
  groupId: z.string(),
});

const stageSchema = z.object({
  label: requiredText("Stage name", 1, 80),
  percent: z
    .number({ error: "Enter %" })
    .nullable()
    .refine((v): v is number => v !== null && v > 0 && v <= 100, "1–100 %"),
  isRetention: z.boolean(),
});

/** Stages must add up to exactly 100 % (backend: PERCENT_TOTAL_INVALID). */
export const stagesSchema = z
  .array(stageSchema)
  .min(1, "Add at least one stage")
  .max(15, "Up to 15 stages")
  .superRefine((stages, ctx) => {
    const total = percentTotal(stages.map((s) => s.percent));
    if (total !== 100) ctx.addIssue({ code: "custom", message: `${total}% — must be 100%` });
    if (stages.filter((s) => s.isRetention).length > 1) ctx.addIssue({ code: "custom", message: "Only one retention stage" });
  });

export const templateSchema = z.object({
  name: requiredText("Template name", 2, 80),
  billingModel: z.enum(["STAGE_SCHEDULE", "RUNNING_BILLS"]),
  stages: stagesSchema,
  isDefault: z.boolean(),
});

export const supplierSchema = z.object({
  name: requiredText("Supplier name", 2, 80),
  category: requiredText("Category", 2, 40),
  phone: optionalAnyPhoneSchema,
  city: z
    .string()
    .trim()
    .refine((v) => v === "" || v.length >= 2, "City is too short")
    .max(60),
  address: z.string().trim().max(200, "Too long"),
  ntn: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{7}-\d$/.test(v), "NTN looks like 1234567-8"),
  notes: z.string().trim().max(500, "Too long"),
});

export const workerSchema = z.object({
  name: requiredText("Name", 2, 80),
  /** A worker type key of the company (GET /worker-types) or OTHER. */
  type: z.string().trim().min(1, "Choose a type"),
  phone: optionalPhoneSchema,
  dailyRatePaisa: z.string().nullable(),
  notes: optionalText(500),
})
  // OTHER has no standard rate (backend: DAILY_RATE_REQUIRED).
  .refine((v) => v.type !== OTHER_WORKER_TYPE || Boolean(v.dailyRatePaisa && Number(v.dailyRatePaisa) > 0), {
    message: "Enter the daily rate for “Other”",
    path: ["dailyRatePaisa"],
  });

type Translate = (key: TranslationKey) => string;
const english: Translate = (key) => translate("en", key);

/** Add / edit a worker type. Pass the UI's `t` so messages follow the language (English by default). */
export function createWorkerTypeSchema(t: Translate = english) {
  const name = z.string().trim().max(60, t("workerTypes.nameLong"));
  const optionalName = name.refine((v) => v === "" || v.length >= 2, t("workerTypes.nameShort"));
  return z.object({
    label: optionalName.refine((v) => v !== "", t("workerTypes.nameRequired")),
    labelRoman: optionalName,
    labelUrdu: optionalName,
    ratePaisa: z
      .string()
      .nullable()
      .refine((v): v is string => v !== null && v !== "" && Number(v) > 0, t("workerTypes.rateRequired")),
    overtimeMultiplier: z
      .number({ error: t("workerTypes.overtimeRange") })
      .nullable()
      .refine((v): v is number => v !== null && v >= 1 && v <= 3, t("workerTypes.overtimeRange")),
    isActive: z.boolean(),
  });
}
export type WorkerTypeFormSchema = ReturnType<typeof createWorkerTypeSchema>;

export const subcontractorSchema = z.object({
  name: requiredText("Name", 2, 80),
  trade: z.enum([
    "SHUTTERING",
    "STEEL_FIXING",
    "BRICK_MASONRY",
    "PLASTER",
    "TILE_LAYING",
    "ELECTRICAL_CONDUIT",
    "PLUMBING_ROUGH_IN",
    "WATERPROOFING",
    "PAINT",
  ]),
  phone: optionalAnyPhoneSchema,
  notes: optionalText(500),
});
