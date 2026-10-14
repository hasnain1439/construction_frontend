import { z } from "zod";
import { msg } from "@/i18n/message";
import { optionalEmailSchema, phoneSchema, requiredText } from "@/lib/validation";

export const inviteSchema = z.object({
  name: requiredText("field.name", 2, 80),
  phone: phoneSchema,
  email: optionalEmailSchema,
  role: z.enum(["PM", "MUNSHI"], { error: msg("teamCompany.v.chooseRole") }),
  projectIds: z.array(z.string()),
  canSeeFinancials: z.boolean(),
  /** Permission role template; null = the standard one for the account type. */
  roleId: z.string().nullable(),
});

export const editMemberSchema = z.object({
  name: requiredText("field.name", 2, 80),
  phone: phoneSchema,
  role: z.enum(["THEKEDAR", "PM", "MUNSHI"]),
  canSeeFinancials: z.boolean(),
  projectIds: z.array(z.string()),
});
