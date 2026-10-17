/** Form rules for Documents & Closeout (Step 17), mirroring the backend. Money is paisa strings. */
import { z } from "zod";
import type { UploadedFile } from "@/components/common/FileUpload";
import { msg } from "@/i18n/message";
import { optionalText, requiredText } from "@/lib/validation";

const file = z.custom<UploadedFile | null>().nullable();
const requiredFile = file.refine((v): v is UploadedFile => Boolean(v), msg("validation.required", { label: "closeout.drawings.file" }));
const date = z.string();

export const drawingSchema = z.object({
  folder: z.enum(["ARCHITECTURAL", "STRUCTURAL", "MEP", "SOCIETY_APPROVED", "OTHER"]),
  title: requiredText("closeout.drawings.title", 1, 200),
  number: optionalText(40),
  notes: optionalText(1000),
  file,
  approvedAt: date,
  revisionNotes: optionalText(1000),
});
export type DrawingValues = z.input<typeof drawingSchema>;

export const revisionSchema = z.object({ file: requiredFile, approvedAt: date, notes: optionalText(1000) });
export type RevisionValues = z.input<typeof revisionSchema>;

export const snagSchema = z
  .object({
    roomId: z.string().nullable(),
    location: optionalText(200),
    description: z.string().trim().min(3, msg("closeout.snags.descriptionShort")).max(1000),
    photo1: file,
    photo2: file,
    assigneeType: z.enum(["NONE", "WORKER", "SUBCONTRACTOR"]),
    workerId: z.string().nullable(),
    subcontractorId: z.string().nullable(),
    targetDate: date,
  })
  .superRefine((v, ctx) => {
    if (!v.roomId && !v.location) ctx.addIssue({ code: "custom", path: ["location"], message: msg("closeout.snags.locationRequired") });
    if (v.assigneeType === "WORKER" && !v.workerId) ctx.addIssue({ code: "custom", path: ["workerId"], message: msg("validation.required", { label: "closeout.snags.worker" }) });
    if (v.assigneeType === "SUBCONTRACTOR" && !v.subcontractorId)
      ctx.addIssue({ code: "custom", path: ["subcontractorId"], message: msg("validation.required", { label: "closeout.snags.subcontractor" }) });
  });
export type SnagValues = z.input<typeof snagSchema>;

export const fixSchema = z.object({ photo: file, note: optionalText(1000) });
export type FixValues = z.input<typeof fixSchema>;

export const reopenSchema = z.object({ reason: z.string().trim().min(3, msg("closeout.snags.reasonShort")).max(500) });
export type ReopenValues = z.input<typeof reopenSchema>;

export const costSchema = z
  .object({
    attribution: z.enum(["NONE", "REWORK", "SUBCONTRACTOR_DEDUCTION", "CHANGE_ORDER"]),
    amountPaisa: z.string().nullable(),
    subcontractAssignmentId: z.string().nullable(),
    note: optionalText(1000),
  })
  .superRefine((v, ctx) => {
    const needs = v.attribution === "REWORK" || v.attribution === "SUBCONTRACTOR_DEDUCTION";
    if (needs && !(v.amountPaisa && Number(v.amountPaisa) > 0)) ctx.addIssue({ code: "custom", path: ["amountPaisa"], message: msg("closeout.snags.amountRequired") });
  });
export type CostValues = z.input<typeof costSchema>;

export const itemSchema = z.object({ note: optionalText(1000), photo: file });
export type ItemValues = z.input<typeof itemSchema>;

export const signOffSchema = z.object({
  ownerName: requiredText("closeout.handover.ownerName", 2, 120),
  signedOn: z.string().min(1, msg("validation.required", { label: "closeout.handover.signedOn" })),
  signature: file,
  note: optionalText(1000),
});
export type SignOffValues = z.input<typeof signOffSchema>;

export const completeSchema = z.object({
  handoverDate: z.string().min(1, msg("validation.required", { label: "closeout.handover.handoverDate" })),
  acceptOpenSnags: z.boolean(),
});
export type CompleteValues = z.input<typeof completeSchema>;

export const reminderSchema = z.object({ reminderDaysBefore: z.string().nullable() });
export type ReminderValues = z.input<typeof reminderSchema>;
