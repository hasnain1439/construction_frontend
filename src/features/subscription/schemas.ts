import { z } from "zod";
import { msg } from "@/i18n/message";
import { datePlusDays, todayPK } from "@/lib/dates";

export const paymentSlipSchema = z
  .object({
    planId: z.string().min(1, msg("teamCompany.v.choosePlan")),
    method: z.enum(["JAZZCASH", "EASYPAISA", "RAAST", "IBFT"], { error: msg("teamCompany.v.chooseMethod") }),
    transactionId: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9_-]{3,39}$/, msg("teamCompany.v.transactionId")),
    amountPaisa: z
      .string({ error: msg("teamCompany.v.enterAmount") })
      .nullable()
      .refine((v): v is string => v !== null && /^\d+$/.test(v), msg("teamCompany.v.enterAmount")),
    paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, msg("teamCompany.v.choosePaidOn")),
    slip: z
      .object({ id: z.string(), url: z.string().nullable(), fileName: z.string(), mimeType: z.string() })
      .nullable()
      .refine((v) => v !== null, msg("teamCompany.v.uploadSlip")),
  })
  .superRefine((v, ctx) => {
    if (v.paidOn > todayPK()) ctx.addIssue({ code: "custom", path: ["paidOn"], message: msg("teamCompany.v.paidOnFuture") });
    else if (v.paidOn < datePlusDays(-30)) ctx.addIssue({ code: "custom", path: ["paidOn"], message: msg("teamCompany.v.paidOnOld") });
  });
