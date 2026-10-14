/** Billing form rules (mirroring the backend). Money = paisa strings. */
import { z } from "zod";
import type { UploadedFile } from "@/components/common/FileUpload";
import { msg } from "@/i18n/message";
import type { TranslationKey } from "@/i18n/useT";
import { requiredText } from "@/lib/validation";

const paisa = z.string().nullable();
const positive = (label: TranslationKey) => paisa.refine((v): v is string => v !== null && Number(v) > 0, msg("validation.moreThanZero", { label }));
const file = z.custom<UploadedFile | null>().nullable();

export const markReadySchema = z.object({
  photo: file.refine((v): v is UploadedFile => v !== null, msg("billing.v.addFinishedPhoto")),
  photo2: file,
  note: z.string().trim().max(500),
});
export type MarkReadyValues = z.input<typeof markReadySchema>;

export const progressSchema = z.object({
  date: z.string().min(1, msg("validation.dateRequired")),
  quantity: z.string().nullable().refine((v): v is string => v !== null && Number(v) > 0, msg("billing.v.sqftMoreThanZero")),
  description: requiredText("billing.forms.whatWasDone", 2, 300),
  photo: file,
});
export type ProgressValues = z.input<typeof progressSchema>;

export const manualLineSchema = z.object({
  description: z.string().trim().max(300),
  quantity: z.string().nullable(),
  unit: z.string().trim().max(20),
  ratePaisa: paisa,
  amountPaisa: paisa,
});

export const newInvoiceSchema = z
  .object({
    type: z.enum(["STAGE", "RUNNING_BILL", "RECOVERABLE", "RETENTION", "OTHER"]),
    billingStageId: z.string().nullable(),
    force: z.boolean(),
    forceNote: z.string().trim().max(500),
    from: z.string(),
    to: z.string(),
    cashEntryIds: z.array(z.string()),
    lines: z.array(manualLineSchema),
    notes: z.string().trim().max(500),
  })
  .superRefine((v, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (v.type === "STAGE" && !v.billingStageId) add("billingStageId", msg("billing.v.chooseStage"));
    if (v.type === "STAGE" && v.force && v.forceNote.length < 3) add("forceNote", msg("billing.v.sayWhyForce"));
    if (v.type === "RUNNING_BILL" && (!v.from || !v.to)) add("from", msg("billing.v.choosePeriod"));
    if (v.type === "RUNNING_BILL" && v.from && v.to && v.from > v.to) add("to", msg("billing.v.endAfterStart"));
    if (v.type === "RECOVERABLE" && v.cashEntryIds.length === 0) add("cashEntryIds", msg("billing.v.chooseItem"));
    if (v.type === "OTHER") {
      if (!v.lines.length) add("lines", msg("billing.v.addLine"));
      v.lines.forEach((l, i) => {
        if (l.description.length < 2) ctx.addIssue({ code: "custom", path: ["lines", i, "description"], message: msg("billing.v.describeLine") });
        const hasAmount = l.amountPaisa !== null && Number(l.amountPaisa) !== 0;
        const hasQtyRate = l.quantity !== null && Number(l.quantity) > 0 && l.ratePaisa !== null && Number(l.ratePaisa) > 0;
        if (!hasAmount && !hasQtyRate) ctx.addIssue({ code: "custom", path: ["lines", i, "amountPaisa"], message: msg("billing.v.enterAmount") });
      });
    }
  });
export type NewInvoiceValues = z.input<typeof newInvoiceSchema>;

export const paymentSchema = z
  .object({
    receivedOn: z.string().min(1, msg("validation.dateRequired")),
    amountPaisa: positive("field.amount"),
    method: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "JAZZCASH", "EASYPAISA", "RAAST"]),
    bankName: z.string().trim().max(60),
    reference: z.string().trim().max(60),
    chequeNo: z.string().trim().max(30),
    chequeDate: z.string(),
    whtDeductedPaisa: paisa,
    slip: file,
    note: z.string().trim().max(500),
  })
  .superRefine((v, ctx) => {
    if (v.method === "CHEQUE" && !v.chequeNo) ctx.addIssue({ code: "custom", path: ["chequeNo"], message: msg("billing.v.enterChequeNo") });
  });
export type PaymentValues = z.input<typeof paymentSchema>;
