// @vitest-environment node
import { describe, expect, it } from "vitest";
import { acceptInviteSchema } from "@/features/auth/schemas";

const ok = (v: Record<string, unknown>) => acceptInviteSchema.safeParse({ name: "", password: "", confirmPassword: "", munshi: false, ...v }).success;

describe("accept invitation form", () => {
  it("a PM must choose a password", () => {
    expect(ok({})).toBe(false);
    expect(ok({ password: "Usman#2026", confirmPassword: "Usman#2026" })).toBe(true);
  });

  it("a Munshi may skip the password (code sign-in) or choose one (password sign-in)", () => {
    expect(ok({ munshi: true })).toBe(true);
    expect(ok({ munshi: true, password: "Usman#2026", confirmPassword: "Usman#2026" })).toBe(true);
    expect(ok({ munshi: true, password: "Usman#2026", confirmPassword: "other" })).toBe(false);
    expect(ok({ munshi: true, password: "123", confirmPassword: "123" })).toBe(false);
  });
});
