/** Tax form rules (mirroring the backend, PHASE_2_3_CONTRACTS.md → Step 18 — Tax). */
import { z } from "zod";
import type { UploadedFile } from "@/components/common/FileUpload";
import { msg } from "@/i18n/message";

const AUTHORITIES = ["PRA", "SRB", "KPRA", "ICT"] as const;
const rate = z
  .number()
  .nullable()
  .refine((v) => v === null || (v >= 0 && v <= 30), msg("tax.v.rateRange", { min: 0, max: 30 }));
const regNo = z
  .string()
  .trim()
  .refine((v) => v === "" || /^[0-9A-Za-z-]{5,20}$/.test(v), msg("tax.v.regNo"));

export const taxSettingsSchema = z
  .object({
    enabled: z.boolean(),
    authority: z.enum(AUTHORITIES).nullable(),
    ratePercent: rate,
    label: z.string().trim().max(30),
    ntn: regNo,
    strn: regNo,
    whtDefaultRatePercent: rate,
  })
  .superRefine((v, ctx) => {
    if (!v.enabled) return;
    if (!v.authority) ctx.addIssue({ code: "custom", path: ["authority"], message: msg("tax.v.authorityRequired") });
    if (!v.ratePercent || v.ratePercent <= 0) ctx.addIssue({ code: "custom", path: ["ratePercent"], message: msg("tax.v.rateRequired") });
  });
export type TaxSettingsValues = z.input<typeof taxSettingsSchema>;

export const projectTaxSchema = z.object({
  mode: z.enum(["INHERIT", "ON", "OFF"]),
  authority: z.enum(AUTHORITIES).nullable(),
  ratePercent: rate,
});
export type ProjectTaxValues = z.input<typeof projectTaxSchema>;

export const whtCertificateSchema = z.object({
  certificateNo: z.string().trim().min(1, msg("tax.v.certRequired")).max(40),
  certificateDate: z.string(),
  file: z.custom<UploadedFile | null>().nullable(),
});
export type WhtCertificateValues = z.input<typeof whtCertificateSchema>;

/** WHT from the cash received at r % of the gross (the backend's rule): round(cash × r ÷ (100 − r)). */
export function whtFromRate(cashPaisa: string | null | undefined, ratePercent: number | null | undefined): string | null {
  if (!cashPaisa || !/^\d+$/.test(cashPaisa) || !ratePercent || ratePercent <= 0 || ratePercent >= 100) return null;
  const cash = BigInt(cashPaisa);
  // Rate in hundredths of a percent keeps the maths in integers: cash × r100 ÷ (10000 − r100), half-up.
  const r100 = BigInt(Math.round(ratePercent * 100));
  const den = BigInt(10000) - r100;
  return ((cash * r100 * BigInt(2) + den) / (den * BigInt(2))).toString();
}

/** Tax on a base at `ratePercent`, half-up on the paisa (the backend's rule). */
export function taxOf(basePaisa: string, ratePercent: number): string {
  const r100 = BigInt(Math.round(ratePercent * 100));
  return ((BigInt(basePaisa) * r100 * BigInt(2) + BigInt(10000)) / BigInt(20000)).toString();
}
