/**
 * Zod building blocks shared by every form, mirroring the backend's rules so most
 * mistakes are caught before a request is sent.
 */
import { z } from "zod";
import { ANY_PHONE_ERROR, normaliseAnyPhone, normalisePhone, PHONE_ERROR } from "@/lib/phone";

export const requiredText = (label: string, min = 1, max = 200) =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `${label} is required` : `${label} is too short`)
    .max(max, `${label} is too long`);

export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, "Too long")
    .transform((v) => (v === "" ? undefined : v))
    .optional();

/** Pakistani mobile → "+923XXXXXXXXX". */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
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
  .min(1, "Phone number is required")
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
  .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address")
  .transform((v) => (v === "" ? undefined : v.toLowerCase()))
  .optional();

/** Same rule as the backend: 8–72 chars with a letter and a number. */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/\d/, "Password must contain at least one number");

/** Paisa string from MoneyInput (null when empty). */
export const paisaSchema = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .nullable()
    .refine((v): v is string => v !== null && v !== "", `${label} is required`)
    .refine((v) => v === null || /^\d+$/.test(v), `${label} must be a positive amount`);

export const optionalPaisaSchema = z
  .string()
  .nullable()
  .optional()
  .refine((v) => v === null || v === undefined || /^\d+$/.test(v), "Enter a valid amount");

/** NumberInput value (number | null). */
export const requiredNumber = (label: string, options: { min?: number; max?: number; positive?: boolean } = {}) =>
  z
    .number({ error: `${label} is required` })
    .nullable()
    .refine((v): v is number => v !== null, `${label} is required`)
    .refine((v) => v === null || !options.positive || v > 0, `${label} must be more than 0`)
    .refine((v) => v === null || options.min === undefined || v >= options.min, `${label} must be at least ${options.min}`)
    .refine((v) => v === null || options.max === undefined || v <= options.max, `${label} must be at most ${options.max}`);

export const optionalNumber = (options: { min?: number; max?: number } = {}) =>
  z
    .number()
    .nullable()
    .optional()
    .refine((v) => v === null || v === undefined || options.min === undefined || v >= options.min, `Must be at least ${options.min}`)
    .refine((v) => v === null || v === undefined || options.max === undefined || v <= options.max, `Must be at most ${options.max}`);

export const isoDateSchema = (label: string) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is required`);

/** Password strength hint for signup / reset forms. */
export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (!password) return { score: 0, label: "" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1;
  if (password.length >= 12 || /[^A-Za-z0-9]/.test(password)) score += 1;
  const labels = ["Too weak", "Weak", "Good", "Strong"] as const;
  return { score: score as 0 | 1 | 2 | 3, label: labels[score] };
}
