import { z } from "zod";
import { normalisePhone } from "@/lib/phone";
import { optionalEmailSchema, passwordSchema, phoneSchema, requiredText } from "@/lib/validation";

/** Email or Pakistani mobile (same rule as the backend's `loginIdentifierSchema`). */
export const loginIdentifierSchema = z
  .string()
  .trim()
  .min(1, "Email or phone is required")
  .refine(
    (v) => (v.includes("@") ? z.email().safeParse(v).success : normalisePhone(v) !== null),
    "Enter a valid email or Pakistani mobile number",
  )
  .transform((v) => (v.includes("@") ? v.toLowerCase() : (normalisePhone(v) as string)));

export const loginSchema = z.object({
  login: loginIdentifierSchema,
  password: z.string().min(1, "Password is required"),
});

export const otpRequestSchema = z.object({ phone: phoneSchema });

export const signupSchema = z.object({
  companyName: requiredText("Company name", 2, 120),
  ownerName: requiredText("Your name", 2, 80),
  phone: phoneSchema,
  email: optionalEmailSchema,
  password: passwordSchema,
  region: z.enum(["PUNJAB_KP", "KARACHI_SINDH"], { error: "Choose your region" }),
  marlaStandard: z.enum(["225", "272.25"]),
});

export const forgotSchema = z.object({ login: loginIdentifierSchema });

export const resetSchema = z
  .object({
    login: loginIdentifierSchema,
    code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });

export const acceptInviteSchema = z
  .object({
    name: z
      .string()
      .trim()
      .refine((v) => v === "" || v.length >= 2, "Name is too short")
      .optional(),
    password: z.string(),
    confirmPassword: z.string(),
    /** Munshis may join without a password (they sign in with a phone code) or set one for password sign-in. */
    munshi: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.munshi && !v.password && !v.confirmPassword) return;
    const result = passwordSchema.safeParse(v.password);
    if (!result.success) ctx.addIssue({ code: "custom", path: ["password"], message: result.error.issues[0].message });
    else if (v.password !== v.confirmPassword) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords don't match" });
  });

export const adminLoginSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});
