import { z } from "zod";
import { optionalAnyPhoneSchema, optionalEmailSchema, requiredText } from "@/lib/validation";

export const companyProfileSchema = z.object({
  name: requiredText("Company name", 3, 100),
  ntn: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{7}-\d$/.test(v), "NTN looks like 1234567-8"),
  address: z.string().trim().max(300, "Address is too long"),
  phone: optionalAnyPhoneSchema,
  email: optionalEmailSchema,
  region: z.enum(["PUNJAB_KP", "KARACHI_SINDH"]),
  marlaStandard: z.enum(["225", "272.25"]),
  logo: z
    .object({ id: z.string(), url: z.string().nullable(), fileName: z.string(), mimeType: z.string() })
    .nullable(),
});

export const companySettingsSchema = z.object({
  kharchaApprovalLimitPaisa: z
    .string({ error: "Enter an amount" })
    .nullable()
    .refine((v): v is string => v !== null && /^\d{1,15}$/.test(v), "Enter an amount"),
  overuseAlertPercent: z
    .number({ error: "Enter a percentage" })
    .nullable()
    .refine((v): v is number => v !== null && Number.isInteger(v) && v >= 1 && v <= 20, "Between 1 and 20 %"),
  missingLogAlertTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 18:00"),
  quoteValidityDays: z
    .number({ error: "Enter days" })
    .nullable()
    .refine((v): v is number => v !== null && Number.isInteger(v) && v >= 1 && v <= 90, "Between 1 and 90 days"),
  taxEnabled: z.boolean(),
  pmCanSeeFinancials: z.boolean(),
  defaultLanguage: z.enum(["ENGLISH", "ROMAN_URDU", "URDU"]),
});

export const holidaySchema = z
  .object({
    name: requiredText("Holiday name", 2, 100),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date is required"),
    endDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date"),
    type: z.enum(["NON_WORKING", "PARTIAL"]),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, { path: ["endDate"], message: "End date can't be before the start date" });
