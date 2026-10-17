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
import { matchCompanyRoute } from "@/lib/companyRoutes";
import { COMPANY_ROUTES } from "@/lib/companyRoutes.generated";
import { COMPANY_NAV, CREATE_ACTIONS, PROJECT_NAV, type NavItem } from "@/lib/navigation";
import type { AccessRule } from "@/lib/permissions";

/** Phase 1 pages without a page-level gate (the view or the API decides). Do not add new ones. */
const LEGACY_UNGATED = new Set([
  "projects.all",
  "projects.closed",
  "p.site.logs",
  "p.site.incoming",
  "p.site.deliveries",
  "p.site.usage",
  "p.site.stock",
  "p.site.counts",
  "p.labor.team",
  "p.labor.hazri",
  "p.labor.measurements",
  "p.labor.peshgi",
  "p.labor.settlements",
  "p.cash.kharcha",
  "p.cash.floats",
  "p.cash.topups",
  "p.cash.counts",
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
