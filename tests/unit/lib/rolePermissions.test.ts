import { describe, expect, it } from "vitest";
import type { PermissionRole } from "@/api/types";
import { grantsFromRole, type GrantMap } from "@/lib/permissionCatalog";
import {
  accountOfRoles,
  canGive,
  canGiveRole,
  diffGrants,
  fitsWith,
  orderRoles,
  reapplyChanges,
  resolveRoles,
  roleKind,
  unionGrants,
} from "@/lib/rolePermissions";
import { catalogFixture, meFixture, rolesFixture } from "../fixtures";

const custom = (over: Partial<PermissionRole>): PermissionRole => ({
  ...rolesFixture()[0]!,
  id: "c1",
  key: "CUSTOM_1",
  name: "Custom",
  isSystem: false,
  ...over,
});
const roles = rolesFixture();
const byKey = (key: string) => roles.find((r) => r.key === key)!;
const pm = byKey("PROJECT_MANAGER");
const accountant = byKey("ACCOUNTANT");
const owner = meFixture("THEKEDAR");

describe("unionGrants (several roles)", () => {
  it("every key of every role; widest scope; highest limit, 'no limit' wins", () => {
    const u = unionGrants([pm, accountant]);
    expect(Object.keys(u).sort()).toEqual(
      [...new Set([...pm.permissions, ...accountant.permissions].map((g) => g.key))].sort(),
    );
    expect(u["projects.project.view"]!.scope).toBe("ALL_PROJECTS"); // PM: assigned, Accountant: all
    const a = custom({
      id: "a",
      permissions: [{ key: "cashbook.expense.approve", scope: "ASSIGNED_PROJECTS", maxAmountPaisa: "100" }],
    });
    const b = custom({
      id: "b",
      permissions: [{ key: "cashbook.expense.approve", scope: "ASSIGNED_PROJECTS", maxAmountPaisa: "500" }],
    });
    const c = custom({
      id: "c",
      permissions: [{ key: "cashbook.expense.approve", scope: "ASSIGNED_PROJECTS", maxAmountPaisa: null }],
    });
    expect(unionGrants([a, b])["cashbook.expense.approve"]!.maxAmountPaisa).toBe("500");
    expect(unionGrants([a, c])["cashbook.expense.approve"]!.maxAmountPaisa).toBeNull();
  });
});

describe("diffGrants (checklist vs the roles' union → overrides)", () => {
  it("same as the roles → nothing to send", () => {
    expect(diffGrants(grantsFromRole(pm), grantsFromRole(pm), catalogFixture)).toEqual({
      added: [],
      removed: [],
      changed: [],
      overrides: [],
    });
  });

  it("ticked beyond the roles → ALLOW (scope only for scoped keys), unticked → DENY, catalogue order", () => {
    const ticked: GrantMap = {
      ...grantsFromRole(pm),
      "fields.amounts": { scope: null, maxAmountPaisa: null },
    };
    ticked["billing.invoice.view"] = { scope: "ASSIGNED_PROJECTS", maxAmountPaisa: null };
    delete ticked["clients.client.create"];
    const d = diffGrants(grantsFromRole(pm), ticked, catalogFixture);
    expect(d.added).toEqual(["billing.invoice.view", "fields.amounts"]);
    expect(d.removed).toEqual(["clients.client.create"]);
    expect(d.overrides).toEqual([
      { key: "clients.client.create", effect: "DENY" },
      { key: "billing.invoice.view", effect: "ALLOW", scope: "ASSIGNED_PROJECTS" },
      { key: "fields.amounts", effect: "ALLOW" },
    ]);
  });

  it("a changed scope / limit of a role key → ALLOW with the new values; owner-only keys never sent", () => {
    const ticked = grantsFromRole(pm);
    ticked["projects.project.view"] = { scope: "ALL_PROJECTS", maxAmountPaisa: null };
    ticked["subscription.manage"] = { scope: null, maxAmountPaisa: null };
    const d = diffGrants(grantsFromRole(pm), ticked, catalogFixture);
    expect(d.changed).toEqual(["projects.project.view"]);
    expect(d.overrides).toEqual([{ key: "projects.project.view", effect: "ALLOW", scope: "ALL_PROJECTS" }]);
  });
});

describe("changing the roles keeps the person's own changes", () => {
  it("added / removed keys survive ticking another role", () => {
    const before = unionGrants([pm]);
    const ticked: GrantMap = { ...before, "finance.pnl.view": { scope: null, maxAmountPaisa: null } };
    delete ticked["clients.client.create"];
    const after = unionGrants([pm, accountant]);
    const next = reapplyChanges(before, ticked, after, catalogFixture);
    expect(next["clients.client.create"]).toBeUndefined();
    expect(next["billing.invoice.view"]).toBeDefined(); // from Accountant
    const d = diffGrants(after, next, catalogFixture);
    expect(d.removed).toEqual(["clients.client.create"]);
    expect(d.added).toEqual([]); // finance.pnl.view now comes from Accountant
  });

  it("resolveRoles: the ticked roles in order, their union and the diff", () => {
    const ticked = { ...unionGrants([pm, accountant]) };
    delete ticked["clients.client.create"];
    const r = resolveRoles({ roles, catalog: catalogFixture, selected: [pm.id, accountant.id], ticked });
    expect(r.roles.map((x) => x.key)).toEqual(["PROJECT_MANAGER", "ACCOUNTANT"]);
    expect(r.diff.overrides).toEqual([{ key: "clients.client.create", effect: "DENY" }]);
  });
});

describe("account type from the roles", () => {
  it("office templates / PM roles → office; Munshi roles → site; custom 'any' → the person chooses", () => {
    expect(roleKind(byKey("ADMINISTRATOR"))).toBe("office");
    expect(roleKind(byKey("STORE_KEEPER"))).toBe("office");
    expect(roleKind(byKey("MUNSHI"))).toBe("site");
    expect(roleKind(custom({ baseRole: "OTHER" }))).toBe("any");
    expect(accountOfRoles([pm, accountant])).toBe("PM");
    expect(accountOfRoles([byKey("MUNSHI"), custom({ baseRole: "OTHER" })])).toBe("MUNSHI");
    expect(accountOfRoles([custom({ baseRole: "OTHER" })])).toBeNull();
    expect(accountOfRoles([])).toBeNull();
  });

  it("office and site roles can't be mixed; 'any' roles fit both; a fixed account allows only its roles", () => {
    expect(fitsWith(byKey("MUNSHI"), [pm])).toBe(false);
    expect(fitsWith(accountant, [byKey("MUNSHI")])).toBe(false);
    expect(fitsWith(custom({ baseRole: "OTHER" }), [byKey("MUNSHI")])).toBe(true);
    expect(fitsWith(accountant, [pm])).toBe(true);
    expect(fitsWith(byKey("MUNSHI"), [], "PM")).toBe(false);
    expect(fitsWith(pm, [], "MUNSHI")).toBe(false);
  });

  it("orders templates first (Administrator first), then custom roles by name", () => {
    const list = [
      custom({ id: "z", name: "Site lead" }),
      ...roles,
      custom({ id: "y", name: "Billing clerk" }),
    ];
    expect(orderRoles(list, catalogFixture).map((r) => r.name)).toEqual([
      "Administrator",
      "Project Manager",
      "Munshi",
      "Accountant",
      "Store Keeper",
      "Billing clerk",
      "Site lead",
    ]);
  });
});

describe("what the manager may give", () => {
  it("the owner gives everything; a PM manager only keys / scopes / roles they hold", () => {
    const manager = meFixture("PM", {
      permissions: [...pm.permissions.map((g) => g.key), "team.member.manage"] as never,
    });
    const amounts = catalogFixture.permissions.find((p) => p.key === "fields.amounts")!;
    const view = catalogFixture.permissions.find((p) => p.key === "projects.project.view")!;
    expect(canGive(owner, amounts)).toBe(true);
    expect(canGive(manager, amounts)).toBe(false);
    expect(canGive(manager, view, { scope: "ALL_PROJECTS", maxAmountPaisa: null })).toBe(false);
    expect(canGiveRole(manager, pm, catalogFixture)).toBe(true);
    expect(canGiveRole(manager, byKey("ADMINISTRATOR"), catalogFixture)).toBe(false);
  });

  it("an approval limit can only be given at or below the manager's own", () => {
    const approve = catalogFixture.permissions.find((p) => p.key === "cashbook.expense.approve")!;
    const limited = meFixture("PM", { approvalLimits: { "cashbook.expense.approve": "1000000" } });
    expect(canGive(limited, approve, { scope: null, maxAmountPaisa: "500000" })).toBe(true);
    expect(canGive(limited, approve, { scope: null, maxAmountPaisa: "2000000" })).toBe(false);
    expect(canGive(limited, approve, { scope: null, maxAmountPaisa: null })).toBe(false);
  });
});
