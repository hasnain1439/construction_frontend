import { z } from "zod";
import { stagesSchema } from "@/features/master-data/schemas";
import { msg } from "@/i18n/message";
import type { TranslationKey } from "@/i18n/useT";
import { normaliseAnyPhone, ANY_PHONE_ERROR } from "@/lib/phone";
import { requiredText } from "@/lib/validation";
import { hasFootingWidth, hasPads, isPile } from "../utils/foundation";

/** `label` is a dictionary key ("projects.basic.startDate"). */
const required = (label: TranslationKey) => msg("validation.required", { label });
const isoDate = (label: TranslationKey) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, required(label));
const positive = (label: TranslationKey, max: number) =>
  z
    .number({ error: required(label) })
    .nullable()
    .refine((v): v is number => v !== null, required(label))
    .refine((v) => v === null || (v > 0 && v <= max), msg("projects.v.between", { label, max: max.toLocaleString("en-PK") }));
const nonNegative = (max: number) =>
  z
    .number()
    .nullable()
    .refine((v) => v === null || (v >= 0 && v <= max), msg("projects.v.zeroOrMore"));

// ─── Tab 1 ──────────────────────────────────────────────────────────────────

export const basicSchema = z
  .object({
    name: requiredText("projects.basic.projectName", 3, 120),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === "" || /^[A-Z0-9][A-Z0-9-]{1,29}$/.test(v), msg("projects.v.codeFormat")),
    clientMode: z.enum(["existing", "new"]),
    clientId: z.string(),
    newClientName: z.string().trim(),
    newClientPhone: z.string().trim(),
    siteAddress: requiredText("projects.basic.siteAddress", 3, 300),
    city: requiredText("field.city", 2, 60),
    startDate: isoDate("projects.basic.startDate"),
    endDate: isoDate("projects.basic.endDate"),
    pmId: z.string().nullable(),
    munshiIds: z.array(z.string()),
  })
  .superRefine((v, ctx) => {
    if (v.clientMode === "existing" && !v.clientId) ctx.addIssue({ code: "custom", path: ["clientId"], message: msg("projects.v.chooseClient") });
    if (v.clientMode === "new") {
      if (v.newClientName.length < 2) ctx.addIssue({ code: "custom", path: ["newClientName"], message: required("projects.basic.clientName") });
      if (!normaliseAnyPhone(v.newClientPhone)) ctx.addIssue({ code: "custom", path: ["newClientPhone"], message: ANY_PHONE_ERROR });
    }
    if (v.startDate && v.endDate && v.endDate < v.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: msg("projects.v.endBeforeStart") });
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
      contractType: z.enum(["FULL", "GREY_OWNER_FINISHING", "LABOR_ONLY"], { error: msg("projects.v.chooseContractType") }),
      billingModel: z.enum(["STAGE_SCHEDULE", "RUNNING_BILLS"]),
      contractValuePaisa: z.string().nullable(),
      ratePerSqftPaisa: z.string().nullable(),
      retentionPercent: z
        .number({ error: msg("projects.v.enterRetention") })
        .nullable()
        .refine((v): v is number => v !== null && v >= 0 && v <= 10, msg("projects.v.retentionRange")),
      defectPeriodMonths: z
        .number({ error: msg("projects.v.enterMonths") })
        .nullable()
        .refine((v): v is number => v !== null && Number.isInteger(v) && v >= 0 && v <= 24, msg("projects.v.monthsRange")),
      supplyRules: z.array(supplyRuleSchema),
      stages: stagesSchema,
    })
    .superRefine((v, ctx) => {
      if (seesMoney && v.contractType !== "LABOR_ONLY" && !v.contractValuePaisa) {
        ctx.addIssue({ code: "custom", path: ["contractValuePaisa"], message: required("projects.section.contractValue") });
      }
      if (seesMoney && v.contractType === "LABOR_ONLY" && !v.ratePerSqftPaisa) {
        ctx.addIssue({ code: "custom", path: ["ratePerSqftPaisa"], message: required("projects.section.ratePerSqft") });
      }
      v.supplyRules.forEach((rule, index) => {
        if (rule.suppliedBy === "CONTRACTOR" && !rule.qualityCategoryId && !rule.locked) {
          ctx.addIssue({ code: "custom", path: ["supplyRules", index, "qualityCategoryId"], message: msg("projects.v.chooseQuality") });
        }
      });
    });
}

// ─── Tab 3 ──────────────────────────────────────────────────────────────────

export const floorRowSchema = z.object({
  level: z.enum(["BASEMENT", "GROUND", "FIRST", "SECOND", "THIRD", "MUMTY"]),
  ceilingHeightFt: positive("projects.room.height", 30),
});

/** Foundation (bunyaad) card: ranges as on the backend; type-specific fields checked only when they apply. */
export const foundationSchema = z
  .object({
    type: z.enum(["STRIP", "ISOLATED", "COMBINED", "RAFT", "PILE"]),
    excavationDepthFt: z.number().nullable(),
    footingWidthFt: z.number().nullable(),
    footingThicknessIn: z.number().nullable(),
    plinthHeightFt: z.number().nullable(),
    dpcThicknessIn: z.number().nullable(),
    footingCount: z.number().nullable(),
    footingLengthFt: z.number().nullable(),
    pileCount: z.number().nullable(),
    pileDiameterIn: z.number().nullable(),
    pileDepthFt: z.number().nullable(),
    masonry: z.enum(["BRICK", "STONE", "RCC_ONLY"]),
    pccMix: z.enum(["1:4:8", "1:3:6", "1:2:4"]),
    pccThicknessIn: z.number().nullable(),
    rccMix: z.enum(["1:2:4", "1:1.5:3"]),
    mainBarMm: z.enum(["10", "12", "16", "20"]),
    termiteTreatment: z.boolean(),
    dpcMaterial: z.enum(["BITUMEN", "PCC_WATERPROOF"]),
    soilType: z.enum(["HARD", "MEDIUM", "SOFT", "SANDY", "FILLED", "CLAY"]).nullable(),
    waterTableDepthFt: z.number().nullable(),
    dewateringNeeded: z.boolean(),
    soilTestDone: z.boolean(),
    soilTestNote: z.string().trim().max(300, msg("projects.v.upTo300")),
    notes: z.string().trim().max(1000, msg("projects.v.upTo1000")),
  })
  .superRefine((v, ctx) => {
    const check = (key: keyof typeof v, label: TranslationKey, min: number, max: number, opts: { optional?: boolean; whole?: boolean } = {}) => {
      const value = v[key] as number | null;
      if (value === null) {
        if (!opts.optional) ctx.addIssue({ code: "custom", path: [key], message: required(label) });
        return;
      }
      if (value < min || value > max) ctx.addIssue({ code: "custom", path: [key], message: msg("projects.v.range", { label, min: String(min), max: String(max) }) });
      else if (opts.whole && !Number.isInteger(value)) ctx.addIssue({ code: "custom", path: [key], message: msg("projects.v.wholeNumber") });
    };
    check("excavationDepthFt", "projects.foundation.excavationDepth", 1, 30);
    check("footingThicknessIn", "projects.foundation.footingThickness", 3, 36);
    check("plinthHeightFt", "projects.foundation.plinthHeight", 0, 6);
    check("dpcThicknessIn", "projects.foundation.dpcThickness", 0.5, 6);
    check("pccThicknessIn", "projects.foundation.pccThickness", 2, 12);
    check("waterTableDepthFt", "projects.foundation.waterTable", 0, 300, { optional: true });
    if (hasFootingWidth(v.type)) check("footingWidthFt", hasPads(v.type) ? "projects.foundation.footingWidthPad" : "projects.foundation.footingWidth", 1, 20);
    if (hasPads(v.type)) {
      check("footingCount", "projects.foundation.footingCount", 1, 500, { whole: true });
      check("footingLengthFt", "projects.foundation.footingLength", 1, 20);
    }
    if (isPile(v.type)) {
      check("pileCount", "projects.foundation.pileCount", 1, 1000, { whole: true });
      check("pileDiameterIn", "projects.foundation.pileDiameter", 6, 60);
      check("pileDepthFt", "projects.foundation.pileDepth", 5, 150);
    }
    if (v.excavationDepthFt !== null && v.footingThicknessIn !== null && v.pccThicknessIn !== null && v.excavationDepthFt * 12 < v.footingThicknessIn + v.pccThicknessIn) {
      ctx.addIssue({ code: "custom", path: ["excavationDepthFt"], message: msg("projects.v.excavationShallow") });
    }
  });

export const plotStructureSchema = z
  .object({
    plotUnit: z.enum(["MARLA", "KANAL", "SQFT"]),
    plotSize: positive("projects.plot.plotSize", 100000),
    marlaStandard: z.enum(["225", "272.25"]),
    frontFt: positive("projects.plot.front", 1000),
    depthFt: positive("projects.plot.depth", 1000),
    cornerPlot: z.boolean(),
    structureType: z.enum(["FRAMED", "LOAD_BEARING"], { error: msg("projects.v.chooseStructure") }),
    hasBasement: z.boolean(),
    basementHeightFt: z.number().nullable(),
    floors: z.array(floorRowSchema).min(1, msg("projects.v.addGroundFloor")),
    foundation: foundationSchema,
  })
  .superRefine((v, ctx) => {
    if (!v.floors.some((f) => f.level === "GROUND")) ctx.addIssue({ code: "custom", path: ["floors"], message: msg("projects.v.groundRequired") });
    if (v.hasBasement && !(v.basementHeightFt && v.basementHeightFt > 0 && v.basementHeightFt <= 30)) {
      ctx.addIssue({ code: "custom", path: ["basementHeightFt"], message: msg("projects.v.basementHeight") });
    }
  });

// ─── Tab 4 ──────────────────────────────────────────────────────────────────

export const coverageSchema = z
  .object({
    coveredAreaSqft: positive("projects.coverage.coveredArea", 1_000_000),
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
    if (!(v.boundaryLengthFt && v.boundaryLengthFt > 0)) ctx.addIssue({ code: "custom", path: ["boundaryLengthFt"], message: required("projects.coverage.length") });
    if (!(v.boundaryHeightFt && v.boundaryHeightFt > 0 && v.boundaryHeightFt <= 30)) {
      ctx.addIssue({ code: "custom", path: ["boundaryHeightFt"], message: msg("projects.v.heightUpTo30") });
    }
    if (!v.boundaryThickness) ctx.addIssue({ code: "custom", path: ["boundaryThickness"], message: msg("projects.v.chooseThickness") });
    if (!v.boundaryPlasterSides) ctx.addIssue({ code: "custom", path: ["boundaryPlasterSides"], message: msg("projects.v.choosePlasterSides") });
  });

// ─── Tab 5 (one room card) ──────────────────────────────────────────────────

export const openingRowSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["DOOR", "WINDOW", "VENTILATOR"]),
  widthFt: positive("projects.room.width", 50),
  heightFt: positive("projects.room.height", 30),
  quantity: z
    .number({ error: msg("projects.v.enterQty") })
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
  name: z.string().trim().max(60, msg("projects.v.upTo60")),
  lengthFt: positive("projects.room.length", 200),
  widthFt: positive("projects.room.width", 200),
  heightFt: positive("projects.room.height", 30),
  wetMode: z.enum(["auto", "wet", "dry"]),
  openings: z.array(openingRowSchema).max(30, msg("projects.v.upTo30Openings")),
});
