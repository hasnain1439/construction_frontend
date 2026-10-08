// @vitest-environment node
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { matchCompanyRoute, toAdminDataPath } from "@/lib/companyRoutes";
import { COMPANY_ROUTES } from "@/lib/companyRoutes.generated";

const match = (p: string) => matchCompanyRoute(COMPANY_ROUTES, p.split("/").filter(Boolean));
const pageOf = (p: string) => {
  const m = match(p);
  return m
    ? m.route.segments
        .map((s) => (s.kind === "static" ? s.name : s.kind === "param" ? `[${s.name}]` : `[...${s.name}]`))
        .join("/")
    : null;
};

function countPages(dir: string): number {
  return readdirSync(dir).reduce((n, name) => {
    const full = path.join(dir, name);
    return n + (statSync(full).isDirectory() ? countPages(full) : name === "page.tsx" ? 1 : 0);
  }, 0);
}

describe("Company data routes (admin console ↔ company pages)", () => {
  it("the generated registry has every company and project page (run `npm run routes:company` after adding one)", () => {
    const pages = countPages("src/app/(company)") + countPages("src/app/(project)");
    expect(COMPANY_ROUTES).toHaveLength(pages);
  });

  it("static beats [param] beats [...rest], like Next.js", () => {
    expect(pageOf("/suppliers-stock/purchases/new")).toBe("suppliers-stock/purchases/new");
    expect(pageOf("/suppliers-stock/purchases/0199")).toBe("suppliers-stock/purchases/[purchaseId]");
    expect(pageOf("/suppliers-stock/anything/else")).toBe("suppliers-stock/[...rest]");
    expect(pageOf("/projects")).toBe("projects");
    expect(pageOf("/projects/closed")).toBe("projects/closed");
    expect(pageOf("/projects/abc")).toBe("projects/[projectId]");
    expect(pageOf("/projects/abc/site/incoming/dispatch/d1")).toBe(
      "projects/[projectId]/site/incoming/[kind]/[docId]",
    );
    expect(pageOf("/projects/abc/unknown/page")).toBe("projects/[projectId]/[...rest]");
  });

  it("passes the params the page expects", () => {
    expect(match("/projects/p1/labor/settlements/s9")?.params).toEqual({
      projectId: "p1",
      settlementId: "s9",
    });
    expect(match("/finance/some/where")?.params).toEqual({ rest: ["some", "where"] });
  });

  it("unknown paths have no page", () => {
    expect(match("/nothing-here")).toBeNull();
    expect(match("/")).toBeNull();
  });

  it("maps a company link to the admin console", () => {
    expect(toAdminDataPath("/team/members")).toBe("/admin/data/team/members");
  });
});
