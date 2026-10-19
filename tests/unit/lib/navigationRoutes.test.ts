// @vitest-environment node
/**
 * Step 18 · navigation audit: every live menu item (company + project) and quick action opens a
 * real page (never a catch-all "Coming soon" route), and the page's own RequireAccess gate is the
 * same rule as the menu item's (P(x) = ALL(x)). Phase 1 pages that are gated inside their views /
 * by the API are listed in LEGACY_UNGATED; every Phase 2 / 3 page must gate itself.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REPORTS, isReportName } from "@/features/reports/reports.config";
import { MORE_OPTIONAL_STEPS, OPTIONAL_STEPS, resolveStep } from "@/features/onboarding/optionalSteps";
import { matchCompanyRoute } from "@/lib/companyRoutes";
import { COMPANY_ROUTES } from "@/lib/companyRoutes.generated";
import { COMPANY_NAV, CREATE_ACTIONS, PROJECT_NAV, type NavItem } from "@/lib/navigation";
import type { AccessRule } from "@/lib/permissions";

/**
 * Phase 1 pages without a page-level gate (the view or the API decides). Do not add new ones.
 * QA-C-02: the site, labour and cash pages now gate themselves, so they are no longer listed.
 */
const LEGACY_UNGATED = new Set([
  "projects.all",
  "projects.closed",
]);

interface Resolved {
  page: string;
  file: string;
  catchAll: boolean;
  params: Record<string, string>;
}

function resolve(href: string, project: boolean): Resolved | null {
  const path = (project ? "/projects/p1" : "") + href.split("?")[0];
  const parts = path.split("/").filter(Boolean);
  const m = matchCompanyRoute(COMPANY_ROUTES, parts);
  if (!m) return null;
  const params: Record<string, string> = {};
  const page = m.route.segments
    .map((s, i) => {
      if (s.kind === "static") return s.name;
      params[s.name] = parts[i] ?? "";
      return s.kind === "param" ? `[${s.name}]` : `[...${s.name}]`;
    })
    .join("/");
  return { page, file: `src/app/${project ? "(project)" : "(company)"}/${page}/page.tsx`, catchAll: m.route.segments.some((s) => s.kind === "catchAll"), params };
}

const list = (src: string) => [...src.matchAll(/"([^"]+)"/g)].map((x) => x[1]!);

/** The page's RequireAccess rule (null = no page-level gate). */
function pageGate(r: Resolved): AccessRule | null {
  const src = readFileSync(r.file, "utf8");
  const tag = /<RequireAccess\b([^>]*)>/.exec(src)?.[1];
  if (tag === undefined) return null;
  if (/\{\.\.\.REPORTS\[report\]\.access\}/.test(tag)) {
    const name = r.params["report"] ?? "";
    expect(isReportName(name), `unknown report ${name}`).toBe(true);
    return REPORTS[name as keyof typeof REPORTS].access;
  }
  const rule: { permission?: string; anyPermission?: string[]; allPermissions?: string[] } = {};
  const one = /permission="([^"]+)"/.exec(tag);
  if (one) rule.permission = one[1];
  const any = /anyPermission=\{\[([^\]]*)\]\}/.exec(tag);
  if (any) rule.anyPermission = list(any[1]!);
  const all = /allPermissions=\{\[([^\]]*)\]\}/.exec(tag);
  if (all) rule.allPermissions = list(all[1]!);
  expect(Object.keys(rule).length, `unparsed RequireAccess in ${r.file}: ${tag}`).toBeGreaterThan(0);
  return rule as AccessRule;
}

const norm = (rule: AccessRule | null | undefined) => ({
  all: [...new Set([...(rule?.permission ? [rule.permission] : []), ...(rule?.allPermissions ?? [])])].sort(),
  any: [...(rule?.anyPermission ?? [])].sort(),
});

const items: Array<{ item: NavItem; project: boolean }> = [
  ...COMPANY_NAV.flatMap((s) => s.items.map((item) => ({ item, project: false }))),
  ...PROJECT_NAV.flatMap((s) => s.items.map((item) => ({ item, project: true }))),
];

describe("navigation ↔ pages", () => {
  it("every live menu item opens a real page (no dead link, no catch-all)", () => {
    const dead = items
      .filter(({ item }) => item.available)
      .filter(({ item, project }) => {
        const r = resolve(item.href, project);
        return !r || r.catchAll;
      })
      .map(({ item }) => `${item.id} → ${item.href}`);
    expect(dead).toEqual([]);
  });

  it("every quick action opens a real page", () => {
    const dead = CREATE_ACTIONS.filter((a) => {
      const r = resolve(a.href, false);
      return !r || r.catchAll;
    }).map((a) => `${a.id} → ${a.href}`);
    expect(dead).toEqual([]);
  });

  it("no company / project item is left as Coming soon", () => {
    expect(items.filter(({ item }) => !item.available).map(({ item }) => item.id)).toEqual([]);
  });

  it("each page gates with the same rule as its menu item", () => {
    const problems: string[] = [];
    for (const { item, project } of items) {
      const r = resolve(item.href, project);
      if (!r) continue;
      const gate = pageGate(r);
      if (!item.access) {
        if (gate) problems.push(`${item.id}: page gated (${JSON.stringify(gate)}) but the menu item is open`);
        continue;
      }
      if (!gate) {
        if (!LEGACY_UNGATED.has(item.id)) problems.push(`${item.id}: ${r.file} has no RequireAccess (menu: ${JSON.stringify(item.access)})`);
        continue;
      }
      if (JSON.stringify(norm(gate)) !== JSON.stringify(norm(item.access))) problems.push(`${item.id}: menu ${JSON.stringify(norm(item.access))} ≠ page ${JSON.stringify(norm(gate))}`);
    }
    expect(problems).toEqual([]);
  });

  it("the legacy allow-list only holds items that are still ungated", () => {
    const stale = [...LEGACY_UNGATED].filter((id) => {
      const found = items.find(({ item }) => item.id === id);
      if (!found) return true;
      const r = resolve(found.item.href, found.project);
      return !r || pageGate(r) !== null;
    });
    expect(stale).toEqual([]);
  });
});

/**
 * QA-C-02 (re-test): a page gated with "any of" opens for a user who holds only ONE of the keys, so
 * every API call on it must be either open to each of those keys (the API also takes any of them) or
 * gated in the view by its own key (`useCan("<key>")` + `skip`). Every "any of" menu item is listed
 * here; new ones must say which way they work.
 */
const ANY_GATES: Record<string, { apiAcceptsAny: string } | { view: string; sections: string[] }> = {
  "team.members": { apiAcceptsAny: "GET /users takes team.member.view or team.member.manage" },
  "p.changes.instructions": { apiAcceptsAny: "GET /projects/:id/site-instructions takes view or create" },
  "p.site.deliveries": {
    view: "src/features/site/SiteViews.tsx",
    sections: ["procurement.dispatch.view", "procurement.purchase.view", "inventory.ownerdelivery.view"],
  },
};

describe("pages with an 'any of' gate", () => {
  const anyItems = items.filter(({ item }) => (item.access?.anyPermission?.length ?? 0) > 0);

  it("every 'any of' menu item is listed with how its sections are gated", () => {
    expect(anyItems.map(({ item }) => item.id).sort()).toEqual(Object.keys(ANY_GATES).sort());
  });

  it("a view that gates its sections checks every key of the gate (and fetches with skip)", () => {
    const problems: string[] = [];
    for (const { item } of anyItems) {
      const rule = ANY_GATES[item.id];
      if (!rule || !("view" in rule)) continue;
      const src = readFileSync(rule.view, "utf8");
      for (const key of new Set([...(item.access?.anyPermission ?? []), ...rule.sections])) {
        if (!src.includes(`useCan("${key}")`)) problems.push(`${item.id}: ${rule.view} never checks useCan("${key}")`);
      }
      if (!/\{ skip: !can\w+ \}/.test(src)) problems.push(`${item.id}: ${rule.view} fetches without a permission skip`);
    }
    expect(problems).toEqual([]);
  });
});

/**
 * Owner decision 5 · the optional next steps under the setup checklist are links to real pages, and
 * whoever a step is shown to may open its page (the step's rule includes the page's gate).
 */
describe("setup checklist · optional next steps", () => {
  const steps = [...OPTIONAL_STEPS, ...MORE_OPTIONAL_STEPS];
  const targets = steps.flatMap((s) =>
    [resolveStep(s, "p1"), resolveStep(s, null)].flatMap((r) => (r ? [{ id: s.id, href: r.href, access: r.access }] : [])),
  );

  it("first: quote, estimate, rulebook, equipment; under Show more: schedule, alert limits, change orders, closeout, tax", () => {
    expect(OPTIONAL_STEPS.map((s) => s.id)).toEqual(["quote", "estimate", "rulebook", "equipment"]);
    expect(MORE_OPTIONAL_STEPS.map((s) => s.id)).toEqual(["schedule", "alerts", "changeOrders", "closeout", "tax"]);
    expect(steps.every((s) => Boolean(s.access))).toBe(true);
  });

  it("every step opens a real page (no dead link, no catch-all)", () => {
    const dead = targets.filter((t) => {
      const project = t.href.startsWith("/projects/p1/");
      const r = resolve(project ? t.href.slice("/projects/p1".length) : t.href, project);
      return !r || r.catchAll;
    });
    expect(dead.map((t) => `${t.id} → ${t.href}`)).toEqual([]);
  });

  it("a step's rule includes its page's gate", () => {
    const problems: string[] = [];
    for (const t of targets) {
      const project = t.href.startsWith("/projects/p1/");
      const r = resolve(project ? t.href.slice("/projects/p1".length) : t.href, project)!;
      const gate = norm(pageGate(r));
      const step = norm(t.access);
      if (!gate.all.every((k) => step.all.includes(k))) problems.push(`${t.id} → ${t.href}: page needs ${JSON.stringify(gate.all)}, step checks ${JSON.stringify(step.all)}`);
      if (gate.any.length && !gate.any.some((k) => step.all.includes(k))) problems.push(`${t.id} → ${t.href}: page needs one of ${JSON.stringify(gate.any)}`);
    }
    expect(problems).toEqual([]);
  });
});
