import { z } from "zod";
import { stagesSchema } from "@/features/master-data/schemas";
import { normaliseAnyPhone, ANY_PHONE_ERROR } from "@/lib/phone";
import { requiredText } from "@/lib/validation";

const isoDate = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is required`);
const positive = (label: string, max: number) =>
  z
    .number({ error: `${label} is required` })
    .nullable()
    .refine((v): v is number => v !== null, `${label} is required`)
    .refine((v) => v === null || (v > 0 && v <= max), `${label} must be between 0 and ${max.toLocaleString("en-PK")}`);
const nonNegative = (max: number) =>
  z
    .number()
    .nullable()
    .refine((v) => v === null || (v >= 0 && v <= max), "Enter 0 or more");

// ─── Tab 1 ──────────────────────────────────────────────────────────────────

export const basicSchema = z
  .object({
    name: requiredText("Project name", 3, 120),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === "" || /^[A-Z0-9][A-Z0-9-]{1,29}$/.test(v), "Letters, numbers and dashes, e.g. MSB-2026-014"),
    clientMode: z.enum(["existing", "new"]),
    clientId: z.string(),
    newClientName: z.string().trim(),
    newClientPhone: z.string().trim(),
    siteAddress: requiredText("Site address", 3, 300),
    city: requiredText("City", 2, 60),
    startDate: isoDate("Start date"),
    endDate: isoDate("End date"),
    pmId: z.string().nullable(),
    munshiIds: z.array(z.string()),
  })
  .superRefine((v, ctx) => {
    if (v.clientMode === "existing" && !v.clientId) ctx.addIssue({ code: "custom", path: ["clientId"], message: "Choose a client or add a new one" });
    if (v.clientMode === "new") {
      if (v.newClientName.length < 2) ctx.addIssue({ code: "custom", path: ["newClientName"], message: "Client name is required" });
      if (!normaliseAnyPhone(v.newClientPhone)) ctx.addIssue({ code: "custom", path: ["newClientPhone"], message: ANY_PHONE_ERROR });
    }
    if (v.startDate && v.endDate && v.endDate < v.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date can't be before the start date" });
    }
  });

// ─── Tab 2 ──────────────────────────────────────────────────────────────────

export const supplyRuleSchema = z.object({
  categoryKey: z.string(),
  label: z.string(),
  suppliedBy: z.enum(["CONTRACTOR", "OWNER"]),
  qualityCategoryId: z.string().nullable(),
  locked: z.boolean(),
});

export function contractSchema(seesMoney: boolean) {
  return z
    .object({
      contractType: z.enum(["FULL", "GREY_OWNER_FINISHING", "LABOR_ONLY"], { error: "Choose a contract type" }),
      billingModel: z.enum(["STAGE_SCHEDULE", "RUNNING_BILLS"]),
      contractValuePaisa: z.string().nullable(),
      ratePerSqftPaisa: z.string().nullable(),
      retentionPercent: z
        .number({ error: "Enter retention %" })
        .nullable()
        .refine((v): v is number => v !== null && v >= 0 && v <= 10, "Between 0 and 10 %"),
      defectPeriodMonths: z
        .number({ error: "Enter months" })
        .nullable()
        .refine((v): v is number => v !== null && Number.isInteger(v) && v >= 0 && v <= 24, "Between 0 and 24 months"),
      supplyRules: z.array(supplyRuleSchema),
      stages: stagesSchema,
    })
    .superRefine((v, ctx) => {
      if (seesMoney && v.contractType !== "LABOR_ONLY" && !v.contractValuePaisa) {
        ctx.addIssue({ code: "custom", path: ["contractValuePaisa"], message: "Contract value is required" });
      }
      if (seesMoney && v.contractType === "LABOR_ONLY" && !v.ratePerSqftPaisa) {
        ctx.addIssue({ code: "custom", path: ["ratePerSqftPaisa"], message: "Rate per sq ft is required" });
      }
      v.supplyRules.forEach((rule, index) => {
        if (rule.suppliedBy === "CONTRACTOR" && !rule.qualityCategoryId && !rule.locked) {
          ctx.addIssue({ code: "custom", path: ["supplyRules", index, "qualityCategoryId"], message: "Choose a quality" });
        }
      });
    });
}

// ─── Tab 3 ──────────────────────────────────────────────────────────────────

export const floorRowSchema = z.object({
  level: z.enum(["BASEMENT", "GROUND", "FIRST", "SECOND", "THIRD", "MUMTY"]),
  ceilingHeightFt: positive("Height", 30),
});

export const plotStructureSchema = z
  .object({
    plotUnit: z.enum(["MARLA", "KANAL", "SQFT"]),
    plotSize: positive("Plot size", 100000),
    marlaStandard: z.enum(["225", "272.25"]),
    frontFt: positive("Front", 1000),
    depthFt: positive("Depth", 1000),
    cornerPlot: z.boolean(),
    structureType: z.enum(["FRAMED", "LOAD_BEARING"], { error: "Choose a structure type" }),
    hasBasement: z.boolean(),
    basementHeightFt: z.number().nullable(),
    floors: z.array(floorRowSchema).min(1, "Add at least the ground floor"),
  })
  .superRefine((v, ctx) => {
    if (!v.floors.some((f) => f.level === "GROUND")) ctx.addIssue({ code: "custom", path: ["floors"], message: "The ground floor is required" });
    if (v.hasBasement && !(v.basementHeightFt && v.basementHeightFt > 0 && v.basementHeightFt <= 30)) {
      ctx.addIssue({ code: "custom", path: ["basementHeightFt"], message: "Basement height is required (up to 30 ft)" });
    }
  });

// ─── Tab 4 ──────────────────────────────────────────────────────────────────

export const coverageSchema = z
  .object({
    coveredAreaSqft: positive("Covered area", 1_000_000),
    semiCoveredSqft: nonNegative(1_000_000),
    openAreaSqft: nonNegative(1_000_000),
    boundaryWall: z.boolean(),
    boundaryLengthFt: z.number().nullable(),
    boundaryHeightFt: z.number().nullable(),
    boundaryThickness: z.enum(["IN_4_5", "IN_9"]).nullable(),
    boundaryPlasterSides: z.enum(["1", "2"]).nullable(),
  })
  .superRefine((v, ctx) => {
    if (!v.boundaryWall) return;
    if (!(v.boundaryLengthFt && v.boundaryLengthFt > 0)) ctx.addIssue({ code: "custom", path: ["boundaryLengthFt"], message: "Length is required" });
    if (!(v.boundaryHeightFt && v.boundaryHeightFt > 0 && v.boundaryHeightFt <= 30)) {
      ctx.addIssue({ code: "custom", path: ["boundaryHeightFt"], message: "Height is required (up to 30 ft)" });
    }
    if (!v.boundaryThickness) ctx.addIssue({ code: "custom", path: ["boundaryThickness"], message: "Choose a thickness" });
    if (!v.boundaryPlasterSides) ctx.addIssue({ code: "custom", path: ["boundaryPlasterSides"], message: "Choose plaster sides" });
  });

// ─── Tab 5 (one room card) ──────────────────────────────────────────────────

export const openingRowSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["DOOR", "WINDOW", "VENTILATOR"]),
  widthFt: positive("Width", 50),
  heightFt: positive("Height", 30),
  quantity: z
    .number({ error: "Qty" })
    .nullable()
    .refine((v): v is number => v !== null && Number.isInteger(v) && v >= 1 && v <= 50, "1–50"),
});

export const roomSchema = z.object({
  type: z.enum([
    "MASTER_BEDROOM",
    "BEDROOM",
    "ATTACHED_BATH",
    "POWDER_ROOM",
    "KITCHEN",
    "TV_LOUNGE",
    "DRAWING_ROOM",
    "DINING",
    "STORE",
    "TERRACE",
    "STAIR",
    "GARAGE",
    "OTHER",
  ]),
  name: z.string().trim().max(60, "Up to 60 characters"),
  lengthFt: positive("Length", 200),
  widthFt: positive("Width", 200),
  heightFt: positive("Height", 30),
  wetMode: z.enum(["auto", "wet", "dry"]),
  openings: z.array(openingRowSchema).max(30, "Up to 30 openings"),
});
