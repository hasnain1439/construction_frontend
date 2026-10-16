import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COMPANY_NAV, visibleSections } from "@/lib/navigation";
import { meFixture } from "../fixtures";

const section = (id: string) => COMPANY_NAV.find((s) => s.id === id)!;
const visible = (me: ReturnType<typeof meFixture>, id: string) =>
  visibleSections(me, COMPANY_NAV)
    .find((s) => s.id === id)
    ?.items.map((i) => i.id) ?? [];

describe("Step 9 navigation", () => {
  it("dashboard, finance and report pages are built (not ComingSoon) — Step 18 adds delay, variance, change orders, equipment, snags", () => {
    for (const id of ["dashboard.overview", "dashboard.approvals", "dashboard.alerts"]) expect(section("dashboard").items.find((i) => i.id === id)?.available).toBe(true);
    expect(section("finance").items.every((i) => i.available)).toBe(true);
    const reports = section("reports").items;
    expect(reports.filter((i) => i.available).map((i) => i.href)).toEqual([
      "/reports/project-summary",
      "/reports/material-audit",
      "/reports/labor-peshgi",
      "/reports/cash-book",
      "/reports/supplier-ageing",
      "/reports/receivables-ageing",
      "/reports/stock-valuation",
      "/reports/delay-analysis",
      "/reports/variance",
      "/reports/change-orders",
      "/reports/equipment-utilisation",
      "/reports/snags",
    ]);
    expect(reports.every((i) => i.available)).toBe(true);
  });

  it("PM without financials: Finance has only cash floats (cashbook.float.view), no money reports", () => {
    const pm = meFixture("PM");
    expect(visible(pm, "finance")).toEqual(["finance.floats"]);
    expect(visible(pm, "reports")).toEqual(["reports.material", "reports.labor", "reports.cashbook", "reports.delay", "reports.variance", "reports.changeOrders", "reports.equipment", "reports.snags"]);
  });

  it("PM with financials: Profit & Loss and the project summary report, not the company reports", () => {
    const pm = meFixture("PM", { canSeeFinancials: true });
    expect(visible(pm, "finance")).toEqual(["finance.pl", "finance.floats"]);
    expect(visible(pm, "reports")).toContain("reports.summary");
    expect(visible(pm, "reports")).not.toContain("reports.ageing");
  });

  it("owner sees all of Finance; MUNSHI sees neither Finance nor Reports", () => {
    expect(visible(meFixture("THEKEDAR"), "finance")).toEqual(["finance.receivables", "finance.cashflow", "finance.pl", "finance.floats"]);
    const munshi = meFixture("MUNSHI");
    expect(visible(munshi, "finance")).toEqual([]);
    expect(visible(munshi, "reports")).toEqual([]);
  });
});

describe("RTK Query services", () => {
  it("no two services inject the same endpoint name (the later one would silently replace the other)", () => {
    const dir = path.resolve(__dirname, "../../../src/api/services");
    const files = readdirSync(dir).filter((f) => f.endsWith(".api.ts"));
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const f of files) {
      for (const m of readFileSync(path.join(dir, f), "utf8").matchAll(/^ {4}(\w+): build\.(?:query|mutation)/gm)) {
        const name = m[1]!;
        if (seen.has(name)) dupes.push(`${name} (${seen.get(name)} + ${f})`);
        else seen.set(name, f);
      }
    }
    expect(dupes).toEqual([]);
    expect(seen.size).toBeGreaterThan(100);
  });
});
