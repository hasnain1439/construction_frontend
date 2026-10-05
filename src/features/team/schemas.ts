import { z } from "zod";
import { optionalEmailSchema, phoneSchema, requiredText } from "@/lib/validation";

export const inviteSchema = z.object({
  name: requiredText("Name", 2, 80),
  phone: phoneSchema,
  email: optionalEmailSchema,
  role: z.enum(["PM", "MUNSHI"], { error: "Choose a role" }),
  projectIds: z.array(z.string()),
  canSeeFinancials: z.boolean(),
});

export const editMemberSchema = z.object({
  name: requiredText("Name", 2, 80),
  phone: phoneSchema,
  role: z.enum(["THEKEDAR", "PM", "MUNSHI"]),
  canSeeFinancials: z.boolean(),
  projectIds: z.array(z.string()),
});
