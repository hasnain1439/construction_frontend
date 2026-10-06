/** Billing form rules (mirroring the backend). Money = paisa strings. */
import { z } from "zod";
import type { UploadedFile } from "@/components/common/FileUpload";
import { requiredText } from "@/lib/validation";

const paisa = z.string().nullable();
const positive = (label: string) => paisa.refine((v): v is string => v !== null && Number(v) > 0, `${label} must be more than 0`);
const file = z.custom<UploadedFile | null>().nullable();

export const markReadySchema = z.object({
  photo: file.refine((v): v is UploadedFile => v !== null, "Add a photo of the finished work"),
  photo2: file,
  note: z.string().trim().max(500),
});
export type MarkReadyValues = z.input<typeof markReadySchema>;

export const progressSchema = z.object({
  date: z.string().min(1, "Date is required"),
  quantity: z.string().nullable().refine((v): v is string => v !== null && Number(v) > 0, "Sq ft must be more than 0"),
  description: requiredText("What was done", 2, 300),
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
    if (v.type === "STAGE" && !v.billingStageId) add("billingStageId", "Choose the stage");
    if (v.type === "STAGE" && v.force && v.forceNote.length < 3) add("forceNote", "Say why it is billed before it is ready");
    if (v.type === "RUNNING_BILL" && (!v.from || !v.to)) add("from", "Choose the period");
    if (v.type === "RUNNING_BILL" && v.from && v.to && v.from > v.to) add("to", "End must be on or after the start");
    if (v.type === "RECOVERABLE" && v.cashEntryIds.length === 0) add("cashEntryIds", "Choose at least one item");
    if (v.type === "OTHER") {
      if (!v.lines.length) add("lines", "Add a line");
      v.lines.forEach((l, i) => {
        if (l.description.length < 2) ctx.addIssue({ code: "custom", path: ["lines", i, "description"], message: "Describe the line" });
        const hasAmount = l.amountPaisa !== null && Number(l.amountPaisa) !== 0;
        const hasQtyRate = l.quantity !== null && Number(l.quantity) > 0 && l.ratePaisa !== null && Number(l.ratePaisa) > 0;
        if (!hasAmount && !hasQtyRate) ctx.addIssue({ code: "custom", path: ["lines", i, "amountPaisa"], message: "Enter an amount (or quantity and rate)" });
      });
    }
  });
export type NewInvoiceValues = z.input<typeof newInvoiceSchema>;

export const paymentSchema = z
  .object({
    receivedOn: z.string().min(1, "Date is required"),
    amountPaisa: positive("Amount"),
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
    if (v.method === "CHEQUE" && !v.chequeNo) ctx.addIssue({ code: "custom", path: ["chequeNo"], message: "Enter the cheque number" });
  });
export type PaymentValues = z.input<typeof paymentSchema>;
