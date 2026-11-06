import { z } from "zod";
import type { CompanyAccountType, FloatMethod } from "@/api/types";
import type { UploadedFile } from "@/components/common/FileUpload";
import { msg } from "@/i18n/message";
import { requiredText } from "@/lib/validation";

export const PAID_VIA_VALUES = [
  "CASH",
  "BANK",
  "JAZZCASH",
  "EASYPAISA",
] as const satisfies readonly FloatMethod[];

export const COMPANY_ACCOUNT_TYPES = ["CASH", "WALLET", "BANK"] as const satisfies readonly CompanyAccountType[];

/** Add / change one company account. Which details it needs follows from the chosen group's type. */
export const companyAccountSchema = z.object({
  groupId: z
    .string()
    .nullable()
    .refine((v): v is string => Boolean(v), msg("cashSite.accounts.chooseGroup")),
  name: requiredText("cashSite.accounts.name", 2, 60),
  accountTitle: z.string().trim().max(100),
  accountNumber: z.string().trim().max(40),
  iban: z.string().trim().max(40),
  branch: z.string().trim().max(100),
  note: z.string().trim().max(300),
});
export type CompanyAccountValues = z.input<typeof companyAccountSchema>;

/** Add / change one office expense. Amount is paisa (MoneyField); the receipt is an optional upload. */
export const officeExpenseSchema = z.object({
  date: z.string().min(1, msg("validation.dateRequired")),
  categoryId: z
    .string()
    .nullable()
    .refine((v): v is string => Boolean(v), msg("cashSite.office.chooseCategory")),
  amountPaisa: z
    .string()
    .nullable()
    .refine(
      (v): v is string => v !== null && Number(v) > 0,
      msg("validation.moreThanZero", { label: "field.amount" }),
    ),
  paidVia: z.enum(PAID_VIA_VALUES),
  paidTo: z.string().trim().max(120, msg("validation.tooLongPlain")),
  description: requiredText("cashSite.office.whatFor", 2, 300),
  receipt: z.custom<UploadedFile | null>().nullable(),
});
export type OfficeExpenseValues = z.input<typeof officeExpenseSchema>;
