import { z } from "zod";
import { datePlusDays, todayPK } from "@/lib/dates";
import { anyPhoneSchema, optionalEmailSchema, phoneSchema, requiredText } from "@/lib/validation";

export const createCompanySchema = z
  .object({
    name: requiredText("Company name", 3, 100),
    slug: z
      .string()
      .trim()
      .refine((v) => v === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), "Lower-case letters, numbers and dashes"),
    phone: anyPhoneSchema,
    email: optionalEmailSchema,
    ntn: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{7}-\d$/.test(v), "NTN looks like 1234567-8"),
    address: z.string().trim().max(300),
    region: z.enum(["PUNJAB_KP", "KARACHI_SINDH"]),
    marlaStandard: z.enum(["225", "272.25"]),
    ownerName: requiredText("Owner name", 2, 80),
    ownerPhone: phoneSchema,
    ownerEmail: optionalEmailSchema,
    mode: z.enum(["TRIAL", "PAID"]),
    planCode: z.string().min(1, "Choose a plan"),
    trialDays: z.number().nullable(),
    method: z.enum(["JAZZCASH", "EASYPAISA", "RAAST", "IBFT"]),
    transactionId: z.string().trim().toUpperCase(),
    amountPaisa: z.string().nullable(),
    paidOn: z.string(),
    note: z.string().trim().max(500),
  })
  .superRefine((v, ctx) => {
    if (v.mode === "TRIAL") {
      if (!(v.trialDays && Number.isInteger(v.trialDays) && v.trialDays >= 1 && v.trialDays <= 60)) {
        ctx.addIssue({ code: "custom", path: ["trialDays"], message: "1–60 days" });
      }
      return;
    }
    if (!/^[A-Z0-9][A-Z0-9_-]{3,39}$/.test(v.transactionId)) ctx.addIssue({ code: "custom", path: ["transactionId"], message: "4–40 letters or numbers" });
    if (!v.amountPaisa) ctx.addIssue({ code: "custom", path: ["amountPaisa"], message: "Enter the amount" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.paidOn)) ctx.addIssue({ code: "custom", path: ["paidOn"], message: "Choose the payment date" });
    else if (v.paidOn > todayPK()) ctx.addIssue({ code: "custom", path: ["paidOn"], message: "Can't be in the future" });
    else if (v.paidOn < datePlusDays(-30)) ctx.addIssue({ code: "custom", path: ["paidOn"], message: "Within the last 30 days" });
  });

export const planSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{1,29}$/, "Capitals, digits or _, e.g. PROFESSIONAL"),
  name: requiredText("Plan name", 2, 60),
  pricePaisa: z
    .string()
    .nullable()
    .refine((v): v is string => v !== null && /^\d+$/.test(v), "Enter the monthly price"),
  unlimitedProjects: z.boolean(),
  maxActiveProjects: z.number().nullable(),
  unlimitedUsers: z.boolean(),
  maxOfficeUsers: z.number().nullable(),
  features: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number().nullable(),
}).superRefine((v, ctx) => {
  if (!v.unlimitedProjects && !(v.maxActiveProjects && v.maxActiveProjects >= 1)) {
    ctx.addIssue({ code: "custom", path: ["maxActiveProjects"], message: "At least 1, or tick unlimited" });
  }
  if (!v.unlimitedUsers && !(v.maxOfficeUsers && v.maxOfficeUsers >= 1)) {
    ctx.addIssue({ code: "custom", path: ["maxOfficeUsers"], message: "At least 1, or tick unlimited" });
  }
  if (v.features.split("\n").filter((f) => f.trim()).length > 20) ctx.addIssue({ code: "custom", path: ["features"], message: "Up to 20 features" });
});

export const platformHolidaySchema = z
  .object({
    name: requiredText("Holiday name", 2, 100),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date is required"),
    endDate: z.string(),
    type: z.enum(["NON_WORKING", "PARTIAL"]),
    region: z.enum(["ALL", "PUNJAB_KP", "KARACHI_SINDH"]),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, { path: ["endDate"], message: "End date can't be before the start date" });

export const catalogMaterialSchema = z.object({
  groupId: z.string().min(1, "Choose a group"),
  name: requiredText("Name", 2, 80),
  unit: requiredText("Unit", 1, 20),
  unitDetail: z.string().trim().max(80),
  altUnits: z.array(
    z.object({
      unit: requiredText("Unit", 1, 20),
      factor: z
        .number({ error: "Enter a number" })
        .nullable()
        .refine((v): v is number => v !== null && v > 0, "Must be more than 0"),
    }),
  ),
  supplyCategory: z.enum(["GREY_STRUCTURE", "FINISHING"]),
  usedByRulebook: z.boolean(),
  rulebookKey: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[a-z][a-z0-9_]{1,39}$/.test(v), "lower_case key, e.g. cement_opc"),
  sortOrder: z.number().nullable(),
  pushToTenants: z.boolean(),
  isActive: z.boolean(),
});
