/** Form rules for labour and the cash book (mirroring the backend). Money = paisa strings. */
import { z } from "zod";
import type { UploadedFile } from "@/components/common/FileUpload";
import { msg } from "@/i18n/message";
import type { TranslationKey } from "@/i18n/useT";
import { requiredText, type FieldLabel } from "@/lib/validation";

const paisa = z.string().nullable();
export const requiredAmount = (label: FieldLabel = "field.amount") => paisa.refine((v): v is string => v !== null && Number(v) > 0, msg("validation.moreThanZero", { label }));
const pick = (message: TranslationKey) => z.string().nullable().refine((v): v is string => Boolean(v), msg(message));
const reason = z.string().trim().min(3, msg("validation.shortReason")).max(500, msg("validation.tooLongPlain"));
const optionalNote = z.string().trim().max(500);
const file = z.custom<UploadedFile | null>().nullable();

export const assignWorkerSchema = z.object({
  workerId: pick("labor.v.chooseWorker"),
  dailyRatePaisa: paisa,
  startDate: z.string(),
});
export type AssignWorkerValues = z.input<typeof assignWorkerSchema>;

export const assignSubcontractSchema = z
  .object({
    subcontractorId: pick("labor.v.chooseSubcontractor"),
    scope: requiredText("labor.fieldName.scope", 2, 200),
    rateType: z.enum(["PER_SQFT", "PER_TON", "PER_BRICK", "PER_RFT", "PER_CFT", "LUMPSUM"]),
    ratePaisa: paisa,
    contractValuePaisa: paisa,
    retentionPercent: z.number().min(0).max(20, msg("labor.v.retentionMax")).nullable(),
    startDate: z.string(),
  });
export type AssignSubcontractValues = z.input<typeof assignSubcontractSchema>;

export const advanceSchema = z
  .object({
    payeeType: z.enum(["WORKER", "SUBCONTRACTOR"]),
    payeeId: pick("labor.v.choosePayee"),
    amountPaisa: requiredAmount(),
    date: z.string().min(1, msg("validation.dateRequired")),
    paidFrom: z.enum(["SITE_CASH", "OFFICE_CASH", "BANK", "JAZZCASH", "EASYPAISA"]),
    reference: z.string().trim().max(60),
    note: optionalNote,
  });
export type AdvanceValues = z.input<typeof advanceSchema>;

export const measurementSchema = z.object({
  assignmentId: pick("labor.v.chooseSubContract"),
  date: z.string().min(1, msg("validation.dateRequired")),
  description: requiredText("labor.fieldName.whatMeasured", 2, 300),
  quantity: z.string().nullable().refine((v): v is string => v !== null && Number(v) > 0, msg("validation.moreThanZero", { label: "field.quantity" })),
  photo: file,
});
export type MeasurementValues = z.input<typeof measurementSchema>;

export const subPaymentSchema = z.object({
  type: z.enum(["RUNNING", "FINAL", "RETENTION_RELEASE"]),
  amountPaisa: requiredAmount(),
  paidFrom: z.enum(["SITE_CASH", "OFFICE_CASH", "BANK", "JAZZCASH", "EASYPAISA"]),
  reference: z.string().trim().max(60),
  date: z.string().min(1),
  note: optionalNote,
  allowAdvance: z.boolean(),
});
export type SubPaymentValues = z.input<typeof subPaymentSchema>;

export const deductionSchema = z.object({ amountPaisa: requiredAmount(), reason, date: z.string().min(1) });
export type DeductionValues = z.input<typeof deductionSchema>;

export const progressSchema = z.object({
  percent: z.number({ error: msg("labor.v.enterPercent") }).gt(0, msg("labor.v.moreThanZero")).max(100, msg("validation.mustBeAtMost", { n: 100 })).nullable().refine((v): v is number => v !== null, msg("labor.v.enterPercent")),
  date: z.string().min(1),
  note: optionalNote,
});
export type ProgressValues = z.input<typeof progressSchema>;

export const lineAdjustSchema = z.object({ advanceAdjustedPaisa: paisa.refine((v): v is string => v !== null, msg("labor.v.enterPeshgiCut")), note: reason });
export type LineAdjustValues = z.input<typeof lineAdjustSchema>;

// ─── Cash book ──────────────────────────────────────────────────────────────

export const kharchaSchema = z
  .object({
    category: z.enum(["TEA_WATER", "TRANSPORT", "UNLOADING", "FUEL", "SMALL_TOOLS", "URGENT_MATERIAL", "OWNER_PURCHASE", "REPAIRS", "OTHER"]).nullable(),
    amountPaisa: requiredAmount(),
    description: requiredText("labor.fieldName.whatFor", 2, 300),
    date: z.string().min(1),
    receipt: file,
    withItems: z.boolean(),
    supplierId: z.string().nullable(),
    items: z.array(z.object({ materialId: z.string().nullable(), qty: z.string().nullable() })),
  })
  .superRefine((v, ctx) => {
    if (!v.category) ctx.addIssue({ code: "custom", path: ["category"], message: msg("labor.v.chooseCategory") });
    if (v.category === "URGENT_MATERIAL" && v.withItems) {
      if (!v.supplierId) ctx.addIssue({ code: "custom", path: ["supplierId"], message: msg("labor.v.chooseSeller") });
      if (!v.receipt) ctx.addIssue({ code: "custom", path: ["receipt"], message: msg("labor.v.addBillPhoto") });
      v.items.forEach((item, i) => {
        if (!item.materialId) ctx.addIssue({ code: "custom", path: ["items", i, "materialId"], message: msg("labor.v.chooseMaterial") });
        if (!item.qty || Number(item.qty) <= 0) ctx.addIssue({ code: "custom", path: ["items", i, "qty"], message: msg("validation.moreThanZero", { label: "field.quantity" }) });
      });
    }
  });
export type KharchaValues = z.input<typeof kharchaSchema>;

export const floatSchema = z.object({
  holderUserId: pick("labor.v.chooseCashReceiver"),
  amountPaisa: requiredAmount(),
  method: z.enum(["CASH", "BANK", "JAZZCASH", "EASYPAISA"]),
  reference: z.string().trim().max(60),
  projectId: z.string().nullable(),
  note: optionalNote,
});
export type FloatValues = z.input<typeof floatSchema>;

export const topupSchema = z.object({ amountPaisa: requiredAmount(), note: optionalNote });
export type TopupValues = z.input<typeof topupSchema>;

export const approveTopupSchema = z.object({ amountPaisa: requiredAmount(), method: z.enum(["CASH", "BANK", "JAZZCASH", "EASYPAISA"]), reference: z.string().trim().max(60) });
export type ApproveTopupValues = z.input<typeof approveTopupSchema>;

export const countSchema = z.object({ countedPaisa: paisa.refine((v): v is string => v !== null, msg("labor.v.enterCounted")), note: optionalNote });
export type CountValues = z.input<typeof countSchema>;

export const handoverSchema = z.object({ toUserId: pick("labor.v.chooseCashReceiver"), amountPaisa: requiredAmount(), note: optionalNote });
export type HandoverValues = z.input<typeof handoverSchema>;
