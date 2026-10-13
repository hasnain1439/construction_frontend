import { describe, expect, it } from "vitest";
import {
  COMPANY_NAV,
  CREATE_ACTIONS,
  PROJECT_NAV,
  visibleItemIds,
  visibleSections,
  type NavItem,
  type NavSection,
} from "@/lib/navigation";
import { canAccess, PERMISSION_KEYS } from "@/lib/permissions";
import { meFixture } from "../fixtures";

const allItems = (sections: NavSection[]): NavItem[] => sections.flatMap((s) => s.items);

describe("navigation uses permission keys only", () => {
  it("no nav rule, page rule or quick action checks the account role", () => {
    const rules = [
      ...COMPANY_NAV.map((s) => s.access),
      ...PROJECT_NAV.map((s) => s.access),
      ...allItems([...COMPANY_NAV, ...PROJECT_NAV]).map((i) => i.access),
      ...CREATE_ACTIONS.map((a) => a.access),
    ];
    expect(rules.filter((r) => r?.roles)).toEqual([]);
    const keys = new Set<string>(PERMISSION_KEYS);
    for (const rule of rules) {
      for (const key of [rule?.permission, ...(rule?.anyPermission ?? []), ...(rule?.allPermissions ?? [])]) {
        if (key) expect(keys.has(key), key).toBe(true);
      }
    }
  });

  it("THEKEDAR sees every item", () => {
    const owner = meFixture("THEKEDAR");
    expect(visibleItemIds(owner, COMPANY_NAV)).toEqual(allItems(COMPANY_NAV).map((i) => i.id));
    expect(visibleItemIds(owner, PROJECT_NAV)).toEqual(allItems(PROJECT_NAV).map((i) => i.id));
  });

  it("Team → Roles & Permissions needs team.member.manage", () => {
    expect(visibleItemIds(meFixture("THEKEDAR"), COMPANY_NAV)).toContain("team.roles");
    const pm = meFixture("PM");
    expect(visibleItemIds(pm, COMPANY_NAV)).not.toContain("team.roles");
    // PM sees the member list read-only (team.member.view) but no invitations / devices / roles.
    expect(
      visibleSections(pm, COMPANY_NAV)
        .find((s) => s.id === "team")
        ?.items.map((i) => i.id),
    ).toEqual(["team.members"]);
    // An ALLOW override of team.member.manage opens the whole Team menu.
    const manager = meFixture("PM", { permissions: ["team.member.manage", "projects.project.view"] });
    expect(visibleItemIds(manager, COMPANY_NAV)).toEqual(
      expect.arrayContaining(["team.members", "team.invitations", "team.devices", "team.roles"]),
    );
  });

  it("drops a section when none of its items is allowed, and owner-only pages stay hidden", () => {
    const pm = meFixture("PM");
    const settings = visibleSections(pm, COMPANY_NAV).find((s) => s.id === "settings")!;
    expect(settings.items.map((i) => i.id)).not.toContain("settings.company");
    expect(settings.items.map((i) => i.id)).not.toContain("settings.subscription");
    const onlyProjects = meFixture("PM", { permissions: ["projects.project.view"] });
    expect(visibleSections(onlyProjects, COMPANY_NAV).map((s) => s.id)).toEqual(["dashboard", "projects"]);
  });

  it("a DENY override hides the matching menu item", () => {
    const withoutAdvances = meFixture("MUNSHI", { deny: ["labor.advance.view"] });
    expect(visibleItemIds(withoutAdvances, PROJECT_NAV)).not.toContain("p.labor.peshgi");
    expect(visibleItemIds(meFixture("MUNSHI"), PROJECT_NAV)).toContain("p.labor.peshgi");
  });

  it("quick actions follow create keys", () => {
    const munshi = meFixture("MUNSHI");
    const ids = CREATE_ACTIONS.filter((a) => canAccess(munshi, a.access)).map((a) => a.id);
    expect(ids).toEqual(["create.worker", "create.purchase"]);
    expect(CREATE_ACTIONS.filter((a) => canAccess(meFixture("THEKEDAR"), a.access))).toHaveLength(
      CREATE_ACTIONS.length,
    );
  });
});
