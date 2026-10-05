import { z } from "zod";
import { datePlusDays, todayPK } from "@/lib/dates";

export const paymentSlipSchema = z
  .object({
    planId: z.string().min(1, "Choose a plan"),
    method: z.enum(["JAZZCASH", "EASYPAISA", "RAAST", "IBFT"], { error: "Choose how you paid" }),
    transactionId: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9_-]{3,39}$/, "4–40 letters or numbers, as shown on the receipt"),
    amountPaisa: z
      .string({ error: "Enter the amount" })
      .nullable()
      .refine((v): v is string => v !== null && /^\d+$/.test(v), "Enter the amount"),
    paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the payment date"),
    slip: z
      .object({ id: z.string(), url: z.string().nullable(), fileName: z.string(), mimeType: z.string() })
      .nullable()
      .refine((v) => v !== null, "Upload the payment screenshot"),
  })
  .superRefine((v, ctx) => {
    if (v.paidOn > todayPK()) ctx.addIssue({ code: "custom", path: ["paidOn"], message: "Payment date can't be in the future" });
    else if (v.paidOn < datePlusDays(-30)) ctx.addIssue({ code: "custom", path: ["paidOn"], message: "Must be within the last 30 days" });
  });
