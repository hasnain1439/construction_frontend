import { describe, expect, it } from "vitest";
import { canAccess, canSeeFinancials, canSeeRates, hasPermission, hasRole } from "@/lib/permissions";
import { meFixture } from "../fixtures";

describe("permissions", () => {
  const thekedar = meFixture("THEKEDAR");
  const pm = meFixture("PM");
  const pmWithFinancials = meFixture("PM", { canSeeFinancials: true });
  const munshi = meFixture("MUNSHI");

  it("follows the backend role matrix", () => {
    expect(hasPermission(thekedar, "users.manage")).toBe(true);
    expect(hasPermission(pm, "projects.manage")).toBe(true);
    expect(hasPermission(pm, "users.manage")).toBe(false);
    expect(hasPermission(munshi, "projects.manage")).toBe(false);
  });

  it("hides financials from a PM unless allowed", () => {
    expect(canSeeFinancials(thekedar)).toBe(true);
    expect(canSeeFinancials(pm)).toBe(false);
    expect(canSeeFinancials(pmWithFinancials)).toBe(true);
  });

  it("never shows rates to a MUNSHI", () => {
    expect(canSeeRates(munshi)).toBe(false);
    expect(canSeeRates(pm)).toBe(true);
  });

  it("evaluates access rules", () => {
    expect(canAccess(pm, { roles: ["THEKEDAR"] })).toBe(false);
    expect(canAccess(thekedar, { roles: ["THEKEDAR"], permission: "company.update" })).toBe(true);
    expect(canAccess(pm, { anyPermission: ["users.manage", "rates.view"] })).toBe(true);
    expect(canAccess(null, { permission: "site.entry" })).toBe(false);
    expect(canAccess(null, undefined)).toBe(true);
    expect(hasRole(munshi, "PM", "MUNSHI")).toBe(true);
  });
});
