import { describe, expect, it } from "vitest";
import {
  approvalLimitOf,
  can,
  canAccess,
  canAny,
  canSeeFinancials,
  canSeeRates,
  hasRole,
  PERMISSION_KEYS,
  scopeOf,
  withinLimit,
} from "@/lib/permissions";
import { catalogFixture, meFixture } from "../fixtures";

describe("permission keys", () => {
  it("the typed key list matches the live catalogue", () => {
    expect([...PERMISSION_KEYS].sort()).toEqual(catalogFixture.permissions.map((p) => p.key).sort());
  });
});

describe("can()", () => {
  const thekedar = meFixture("THEKEDAR");
  const pm = meFixture("PM");
  const pmWithFinancials = meFixture("PM", { canSeeFinancials: true });
  const munshi = meFixture("MUNSHI");

  it("THEKEDAR has every key — even when the snapshot lists none", () => {
    expect(can(thekedar, "team.member.manage")).toBe(true);
    expect(can({ ...thekedar, permissions: [] }, "subscription.manage")).toBe(true);
    expect(PERMISSION_KEYS.every((key) => can(thekedar, key))).toBe(true);
  });

  it("PM and MUNSHI follow their templates", () => {
    expect(can(pm, "projects.project.create")).toBe(true);
    expect(can(pm, "team.member.manage")).toBe(false);
    expect(can(pm, "subscription.manage")).toBe(false);
    expect(can(munshi, "labor.attendance.create")).toBe(true);
    expect(can(munshi, "projects.project.create")).toBe(false);
  });

  it("overrides change the result (ALLOW adds, DENY removes)", () => {
    expect(
      can(
        meFixture("PM", { permissions: ["projects.project.view", "team.member.manage"] }),
        "team.member.manage",
      ),
    ).toBe(true);
    expect(can(meFixture("MUNSHI", { deny: ["labor.advance.create"] }), "labor.advance.create")).toBe(false);
  });

  it("signed out = nothing", () => {
    expect(can(null, "projects.project.view")).toBe(false);
    expect(canAny(undefined, ["projects.project.view"])).toBe(false);
  });

  it("field access: financials only with the bundle, rates never for a MUNSHI", () => {
    expect(canSeeFinancials(thekedar)).toBe(true);
    expect(canSeeFinancials(pm)).toBe(false);
    expect(canSeeFinancials(pmWithFinancials)).toBe(true);
    expect(canSeeRates(munshi)).toBe(false);
    expect(canSeeRates(pm)).toBe(true);
  });

  it("scopes: THEKEDAR all projects, others as granted", () => {
    expect(scopeOf(thekedar, "projects.project.view")).toBe("ALL_PROJECTS");
    expect(scopeOf(pm, "projects.project.view")).toBe("ASSIGNED_PROJECTS");
    expect(scopeOf(munshi, "projects.project.create")).toBeNull();
  });

  it("approval limits", () => {
    const limited = meFixture("PM", { approvalLimits: { "cashbook.expense.approve": "5000000" } });
    expect(approvalLimitOf(limited, "cashbook.expense.approve")).toBe("5000000");
    expect(withinLimit(limited, "cashbook.expense.approve", "5000000")).toBe(true);
    expect(withinLimit(limited, "cashbook.expense.approve", "5000001")).toBe(false);
    expect(withinLimit(pm, "cashbook.expense.approve", "999999999999")).toBe(true);
    expect(withinLimit(thekedar, "cashbook.expense.approve", "999999999999")).toBe(true);
    expect(withinLimit(munshi, "cashbook.expense.approve", "1")).toBe(false);
  });

  it("evaluates access rules", () => {
    expect(canAccess(pm, { permission: "team.member.manage" })).toBe(false);
    expect(canAccess(thekedar, { permission: "company.settings.manage" })).toBe(true);
    expect(canAccess(pm, { anyPermission: ["team.member.manage", "team.member.view"] })).toBe(true);
    expect(canAccess(pm, { allPermissions: ["finance.reports.view", "fields.amounts"] })).toBe(false);
    expect(canAccess(pmWithFinancials, { allPermissions: ["finance.reports.view", "fields.amounts"] })).toBe(
      true,
    );
    expect(canAccess(null, { permission: "projects.project.view" })).toBe(false);
    expect(canAccess(null, undefined)).toBe(true);
    expect(hasRole(munshi, "PM", "MUNSHI")).toBe(true);
  });
});
