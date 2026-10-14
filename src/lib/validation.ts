/**
 * Zod building blocks shared by every form, mirroring the backend's rules so most
 * mistakes are caught before a request is sent.
 */
import { z } from "zod";
import { msg } from "@/i18n/message";
import type { TranslationKey } from "@/i18n/useT";
import { ANY_PHONE_ERROR, normaliseAnyPhone, normalisePhone, PHONE_ERROR } from "@/lib/phone";

/** Field name used inside a message: a dictionary key ("field.amount"), translated when shown (plain text is shown as it is — admin console only). */
export type FieldLabel = TranslationKey | (string & {});

export const requiredText = (label: FieldLabel, min = 1, max = 200) =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? msg("validation.required", { label }) : msg("validation.tooShort", { label }))
    .max(max, msg("validation.tooLong", { label }));

export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, msg("validation.tooLongPlain"))
    .transform((v) => (v === "" ? undefined : v))
    .optional();

/** Pakistani mobile → "+923XXXXXXXXX". */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, msg("validation.phoneRequired"))
  .refine((v) => normalisePhone(v) !== null, PHONE_ERROR)
  .transform((v) => normalisePhone(v) as string);

export const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || normalisePhone(v) !== null, PHONE_ERROR)
  .transform((v) => (v === "" ? undefined : (normalisePhone(v) as string)))
  .optional();

/** Mobile or landline → E.164. */
export const anyPhoneSchema = z
  .string()
  .trim()
  .min(1, msg("validation.phoneRequired"))
  .refine((v) => normaliseAnyPhone(v) !== null, ANY_PHONE_ERROR)
  .transform((v) => normaliseAnyPhone(v) as string);

export const optionalAnyPhoneSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || normaliseAnyPhone(v) !== null, ANY_PHONE_ERROR)
  .transform((v) => (v === "" ? undefined : (normaliseAnyPhone(v) as string)))
  .optional();

export const optionalEmailSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || z.email().safeParse(v).success, msg("validation.validEmail"))
  .transform((v) => (v === "" ? undefined : v.toLowerCase()))
  .optional();

/** Same rule as the backend: 8–72 chars with a letter and a number. */
export const passwordSchema = z
  .string()
  .min(8, msg("validation.passwordMin"))
  .max(72, msg("validation.passwordMax"))
  .regex(/[A-Za-z]/, msg("validation.passwordLetter"))
  .regex(/\d/, msg("validation.passwordNumber"));

/** Paisa string from MoneyInput (null when empty). */
export const paisaSchema = (label: FieldLabel) =>
  z
    .string({ error: msg("validation.required", { label }) })
    .nullable()
    .refine((v): v is string => v !== null && v !== "", msg("validation.required", { label }))
    .refine((v) => v === null || /^\d+$/.test(v), msg("validation.positiveAmount", { label }));

export const optionalPaisaSchema = z
  .string()
  .nullable()
  .optional()
  .refine((v) => v === null || v === undefined || /^\d+$/.test(v), msg("validation.validAmount"));

/** NumberInput value (number | null). */
export const requiredNumber = (label: FieldLabel, options: { min?: number; max?: number; positive?: boolean } = {}) =>
  z
    .number({ error: msg("validation.required", { label }) })
    .nullable()
    .refine((v): v is number => v !== null, msg("validation.required", { label }))
    .refine((v) => v === null || !options.positive || v > 0, msg("validation.moreThanZero", { label }))
    .refine((v) => v === null || options.min === undefined || v >= options.min, msg("validation.atLeast", { label, n: options.min ?? 0 }))
    .refine((v) => v === null || options.max === undefined || v <= options.max, msg("validation.atMost", { label, n: options.max ?? 0 }));

export const optionalNumber = (options: { min?: number; max?: number } = {}) =>
  z
    .number()
    .nullable()
    .optional()
    .refine((v) => v === null || v === undefined || options.min === undefined || v >= options.min, msg("validation.mustBeAtLeast", { n: options.min ?? 0 }))
    .refine((v) => v === null || v === undefined || options.max === undefined || v <= options.max, msg("validation.mustBeAtMost", { n: options.max ?? 0 }));

export const isoDateSchema = (label: FieldLabel) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, msg("validation.required", { label }));

/** Password strength hint for signup / reset forms. */
export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3; label: TranslationKey | null } {
  if (!password) return { score: 0, label: null };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1;
  if (password.length >= 12 || /[^A-Za-z0-9]/.test(password)) score += 1;
  const labels = ["passwordStrength.tooWeak", "passwordStrength.weak", "passwordStrength.good", "passwordStrength.strong"] as const;
  return { score: score as 0 | 1 | 2 | 3, label: labels[score] };
}
