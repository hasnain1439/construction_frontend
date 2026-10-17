import { z } from "zod";
import type { QuoteInputs, QuoteInputsBody } from "@/api/types";
import { msg } from "@/i18n/message";
import { anyPhoneSchema, optionalNumber, optionalPaisaSchema, optionalText, requiredNumber } from "@/lib/validation";

/** Quote inputs (plot, building, contract, price settings) — shared by New quote and New revision. */
export const quoteInputsFields = {
  plotUnit: z.enum(["MARLA", "KANAL", "SQFT"]),
  plotSize: requiredNumber("sales.form.plotSize", { positive: true, max: 100_000 }),
  frontFt: optionalNumber({ min: 1, max: 1000 }),
  depthFt: optionalNumber({ min: 1, max: 1000 }),
  coveredAreaSqft: requiredNumber("sales.form.coveredArea", { positive: true, max: 200_000 }),
  floors: z.enum(["1", "2", "3", "4"]),
  mumty: z.boolean(),
  basement: z.boolean(),
  basementHeightFt: optionalNumber({ min: 6, max: 20 }),
  structureType: z.enum(["FRAMED", "LOAD_BEARING"]),
  contractType: z.enum(["FULL", "GREY_OWNER_FINISHING", "LABOR_ONLY"]),
  qualityCategoryId: z.string().nullable().optional(),
  paymentTemplateId: z.string().nullable().optional(),
  marginPercent: optionalNumber({ min: 0, max: 100 }),
  finishingAllowancePercent: optionalNumber({ min: 0, max: 200 }),
  finalPricePaisa: optionalPaisaSchema,
  note: optionalText(300),
};

export const revisionSchema = z.object(quoteInputsFields);

export const newQuoteSchema = z
  .object({
    clientMode: z.enum(["existing", "new"]),
    clientId: z.string().nullable().optional(),
    newName: z.string().trim().max(80).optional(),
    newPhone: z.string().optional(),
    title: z.string().trim().min(3, msg("validation.tooShort", { label: "sales.form.quoteTitle" })).max(120, msg("validation.tooLong", { label: "sales.form.quoteTitle" })),
    siteAddress: optionalText(300),
    city: optionalText(60),
    ...quoteInputsFields,
  })
  .superRefine((v, ctx) => {
    if (v.clientMode === "existing" && !v.clientId) ctx.addIssue({ code: "custom", path: ["clientId"], message: msg("validation.required", { label: "sales.form.client" }) });
    if (v.clientMode === "new") {
      if (!v.newName || v.newName.length < 2) ctx.addIssue({ code: "custom", path: ["newName"], message: msg("validation.required", { label: "sales.form.clientName" }) });
      const phone = anyPhoneSchema.safeParse(v.newPhone ?? "");
      if (!phone.success) ctx.addIssue({ code: "custom", path: ["newPhone"], message: phone.error.issues[0]?.message ?? msg("validation.phoneRequired") });
    }
  });

export type QuoteInputValues = z.input<typeof revisionSchema>;
export type NewQuoteValues = z.input<typeof newQuoteSchema>;

export const DEFAULT_INPUT_VALUES: QuoteInputValues = {
  plotUnit: "MARLA",
  plotSize: null,
  frontFt: null,
  depthFt: null,
  coveredAreaSqft: null,
  floors: "2",
  mumty: true,
  basement: false,
  basementHeightFt: 10,
  structureType: "FRAMED",
  contractType: "GREY_OWNER_FINISHING",
  qualityCategoryId: null,
  paymentTemplateId: null,
  marginPercent: null,
  finishingAllowancePercent: null,
  finalPricePaisa: null,
  note: "",
};

/** Form values of an existing revision's inputs (New revision starts from the latest). */
export function valuesFromInputs(i: QuoteInputs): QuoteInputValues {
  return {
    plotUnit: i.plot.unit,
    plotSize: i.plot.size,
    frontFt: i.plot.frontFt,
    depthFt: i.plot.depthFt,
    coveredAreaSqft: i.coveredAreaSqft,
    floors: String(Math.min(4, Math.max(1, i.floors))) as QuoteInputValues["floors"],
    mumty: i.mumty,
    basement: i.basement,
    basementHeightFt: i.basementHeightFt,
    structureType: i.structureType,
    contractType: i.contractType,
    qualityCategoryId: i.qualityCategoryId,
    paymentTemplateId: i.paymentTemplateId,
    marginPercent: i.marginPercent ?? null,
    finishingAllowancePercent: i.finishingAllowancePercent ?? null,
    finalPricePaisa: i.finalPricePaisa ?? null,
    note: "",
  };
}

/** Request `inputs` from form values; null while the minimum (plot size, covered area) is missing. */
export function toInputsBody(v: Partial<QuoteInputValues>): QuoteInputsBody | null {
  if (!v.plotSize || v.plotSize <= 0 || !v.coveredAreaSqft || v.coveredAreaSqft <= 0 || !v.plotUnit || !v.structureType || !v.contractType) return null;
  return {
    plot: { unit: v.plotUnit, size: v.plotSize, ...(v.frontFt ? { frontFt: v.frontFt } : {}), ...(v.depthFt ? { depthFt: v.depthFt } : {}) },
    coveredAreaSqft: v.coveredAreaSqft,
    floors: Number(v.floors ?? "2"),
    mumty: v.mumty ?? true,
    basement: v.basement ?? false,
    ...(v.basement && v.basementHeightFt ? { basementHeightFt: v.basementHeightFt } : {}),
    structureType: v.structureType,
    contractType: v.contractType,
    ...(v.qualityCategoryId ? { qualityCategoryId: v.qualityCategoryId } : {}),
    ...(v.paymentTemplateId ? { paymentTemplateId: v.paymentTemplateId } : {}),
    ...(v.marginPercent !== null && v.marginPercent !== undefined ? { marginPercent: v.marginPercent } : {}),
    ...(v.contractType === "FULL" && v.finishingAllowancePercent !== null && v.finishingAllowancePercent !== undefined ? { finishingAllowancePercent: v.finishingAllowancePercent } : {}),
    ...(v.finalPricePaisa ? { finalPricePaisa: v.finalPricePaisa } : {}),
  } as QuoteInputsBody;
}
