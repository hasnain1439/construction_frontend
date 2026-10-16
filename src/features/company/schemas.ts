import { z } from "zod";
import { msg } from "@/i18n/message";
import { optionalAnyPhoneSchema, optionalEmailSchema, requiredText } from "@/lib/validation";

export const companyProfileSchema = z.object({
  name: requiredText("teamCompany.profile.companyName", 3, 100),
  ntn: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{7}-\d$/.test(v), msg("teamCompany.v.ntnFormat")),
  address: z.string().trim().max(300, msg("validation.tooLong", { label: "field.address" })),
  phone: optionalAnyPhoneSchema,
  email: optionalEmailSchema,
  region: z.enum(["PUNJAB_KP", "KARACHI_SINDH"]),
  marlaStandard: z.enum(["225", "272.25"]),
  logo: z
    .object({ id: z.string(), url: z.string().nullable(), fileName: z.string(), mimeType: z.string() })
    .nullable(),
});

/** Whole number between min and max (Step 14 thresholds). */
const intRange = (min: number, max: number, range: "control.v.pointsRange" | "teamCompany.v.daysRange" | "teamCompany.v.percentRange", enter: "teamCompany.v.enterPercent" | "teamCompany.v.enterDays") =>
  z
    .number({ error: msg(enter) })
    .nullable()
    .refine((v): v is number => v !== null && Number.isInteger(v) && v >= min && v <= max, msg(range, { min, max }));

export const companySettingsSchema = z.object({
  kharchaApprovalLimitPaisa: z
    .string({ error: msg("validation.validAmount") })
    .nullable()
    .refine((v): v is string => v !== null && /^\d{1,15}$/.test(v), msg("validation.validAmount")),
  overuseAlertPercent: z
    .number({ error: msg("teamCompany.v.enterPercent") })
    .nullable()
    .refine((v): v is number => v !== null && Number.isInteger(v) && v >= 1 && v <= 20, msg("teamCompany.v.percentRange", { min: 1, max: 20 })),
  missingLogAlertTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, msg("teamCompany.v.timeFormat")),
  quoteValidityDays: z
    .number({ error: msg("teamCompany.v.enterDays") })
    .nullable()
    .refine((v): v is number => v !== null && Number.isInteger(v) && v >= 1 && v <= 90, msg("teamCompany.v.daysRange", { min: 1, max: 90 })),
  taxEnabled: z.boolean(),
  taxRatePercent: z
    .number({ error: msg("teamCompany.v.enterPercent") })
    .nullable()
    .refine((v): v is number => v !== null && v >= 0 && v <= 30, msg("teamCompany.v.percentRange", { min: 0, max: 30 })),
  taxLabel: z.string().trim().max(20),
  paymentTermsDays: z
    .number({ error: msg("teamCompany.v.enterDays") })
    .nullable()
    .refine((v): v is number => v !== null && Number.isInteger(v) && v >= 0 && v <= 90, msg("teamCompany.v.daysRange", { min: 0, max: 90 })),
  pmCanRecordPayments: z.boolean(),
  defaultMarginPercent: z
    .number({ error: msg("teamCompany.v.enterPercent") })
    .nullable()
    .refine((v): v is number => v !== null && v >= 0 && v <= 100, msg("teamCompany.v.percentRange", { min: 0, max: 100 })),
  defaultFinishingAllowancePercent: z
    .number({ error: msg("teamCompany.v.enterPercent") })
    .nullable()
    .refine((v): v is number => v !== null && v >= 0 && v <= 200, msg("teamCompany.v.percentRange", { min: 0, max: 200 })),
  pmCanSeeFinancials: z.boolean(),
  defaultLanguage: z.enum(["ENGLISH", "ROMAN_URDU", "URDU"]),
  // Step 14 · control alert thresholds
  behindPlanAlertPoints: intRange(5, 50, "control.v.pointsRange", "teamCompany.v.enterPercent"),
  lateFinishGraceDays: intRange(0, 30, "teamCompany.v.daysRange", "teamCompany.v.enterDays"),
  quotaAlertPercent: intRange(50, 150, "teamCompany.v.percentRange", "teamCompany.v.enterPercent"),
  spendAheadAlertPoints: intRange(1, 50, "control.v.pointsRange", "teamCompany.v.enterPercent"),
  controlAlertsEnabled: z.boolean(),
});

export const holidaySchema = z
  .object({
    name: requiredText("teamCompany.holidays.name", 2, 100),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, msg("validation.required", { label: "teamCompany.holidays.startDate" })),
    endDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), msg("teamCompany.v.validDate")),
    type: z.enum(["NON_WORKING", "PARTIAL"]),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, { path: ["endDate"], message: msg("teamCompany.v.endBeforeStart") });
