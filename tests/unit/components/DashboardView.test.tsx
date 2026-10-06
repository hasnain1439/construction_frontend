import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DashboardOverview, SiteDashboard } from "@/api/types";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/dashboard", useSearchParams: () => new URLSearchParams() }));

const BASE: DashboardOverview = {
  period: { from: "2026-09-07", to: "2026-10-06" },
  asOf: "2026-10-06",
  seesFinancials: false,
  kpis: { activeProjects: { count: 3, atRisk: 0, delayed: 0 }, pendingApprovals: 2, openShortages: 2, dispatchesOnTheWay: 2 },
  site: { hazriToday: { mistri: 2, mazdoor: 4, other: 1, total: 7 }, assignedWorkers: 8, peshgiThisWeekPaisa: "0", siteKharchaThisWeekPaisa: "320000", week: { weekStart: "2026-10-05", weekEnd: "2026-10-11" }, deliveriesToday: 1, openShortages: 2 },
  labor: { period: { from: "2026-09-07", to: "2026-10-06" }, wagesPaisa: "15200000", byWorkerType: [{ type: "MAZDOOR", days: 64, wagesPaisa: "6200000" }], subcontractorsOverpaid: 1 },
  alerts: [],
  projects: [{ project: { id: "p1", code: "MSB-2026-012", name: "DHA Phase 6 · 10 Marla", status: "ACTIVE" }, client: { id: "c1", name: "Ahmed Raza" } }],
};
const MONEY: DashboardOverview = {
  ...BASE,
  seesFinancials: true,
  kpis: { ...BASE.kpis, activeProjects: { count: 3, atRisk: 2, delayed: 0 }, receivablesOutstandingPaisa: "287000000", collectedPercent: 91.3, overduePaisa: "155000000", supplierUdhaarPaisa: "247600000", supplierOldestDays: 35, supplierPaidPercent: 21.4, storeStockValuePaisa: "79890724", cashWithSiteStaffPaisa: "3080000", ownMoneyInvestedPaisa: "-290000000" },
  payments: { period: BASE.period, receivedPaisa: "150000000", byMethod: [{ method: "CHEQUE", amountPaisa: "150000000", count: 1 }], cheques: { clearedPaisa: "150000000", pendingPaisa: "0", bouncedPaisa: "110000000" } },
};
const SITE: SiteDashboard = {
  project: { id: "p1", code: "MSB-2026-012", name: "DHA Phase 6 · 10 Marla", status: "ACTIVE" },
  date: "2026-10-06",
  week: { weekStart: "2026-10-05", weekEnd: "2026-10-11" },
  hazriToday: { assigned: 8, marked: 0, full: 0, half: 0, absent: 0, unmarked: 8, present: { mistri: 0, mazdoor: 0, other: 0 } },
  incoming: [{ kind: "DISPATCH", id: "d1", number: "GP-0144", from: "Central Store", vehicleNo: "LES-4471", date: "2026-10-06T04:30:00.000Z", items: [{ material: { id: "m1", name: "Cement OPC", unit: "bag" }, quantity: 100 }], actionUrl: "/projects/p1/site/incoming/dispatch/d1" }],
  myCash: { accountId: "a1", balancePaisa: "930000", pendingAckPaisa: "0", pendingApprovalPaisa: "0", openTopup: null },
  todo: [{ type: "RECEIVE", label: "Receive GP-0144 from Central Store", actionUrl: "/projects/p1/site/incoming/dispatch/d1" }],
  recent: { usage: [], myKharcha: [] },
};

let overview: DashboardOverview = BASE;
const siteCall = vi.fn();
vi.mock("@/api/services/dashboard.api", () => ({
  useGetDashboardOverviewQuery: () => ({ data: overview, isLoading: false }),
  useGetSiteDashboardQuery: (id: string) => {
    siteCall(id);
    return { data: SITE, isLoading: false };
  },
}));
vi.mock("@/api/services/projects.api", () => ({
  useGetProjectsQuery: () => ({ data: { items: [{ id: "p1", name: "DHA Phase 6 · 10 Marla", code: "MSB-2026-012", status: "ACTIVE" }], meta: { total: 1 } }, isLoading: false }),
}));
vi.mock("@/api/services/team.api", () => ({ useGetUsersQuery: () => ({ data: undefined }) }));

const { DashboardView } = await import("@/features/dashboard/views/DashboardView");

describe("DashboardView", () => {
  it("PM without financials: the operational version — no money KPIs, columns or payment analysis", () => {
    overview = BASE;
    renderWithStore(<DashboardView />, { me: meFixture("PM") });
    expect(screen.getByText("Active projects")).toBeInTheDocument();
    expect(screen.getByText("Pending approvals")).toBeInTheDocument();
    for (const money of ["Receivables", "Supplier udhaar", "Store stock value", "Own money invested", "Payment analysis", "Contract"]) {
      expect(screen.queryByText(money)).not.toBeInTheDocument();
    }
    expect(screen.getByText("Site stats")).toBeInTheDocument();
  });

  it("owner: receivables ring, udhaar, stock value, payment analysis", () => {
    overview = MONEY;
    renderWithStore(<DashboardView />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("Receivables")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "91% collected" })).toBeInTheDocument();
    expect(screen.getByText("Oldest 35 days")).toBeInTheDocument();
    expect(screen.getByText("Payment analysis")).toBeInTheDocument();
    expect(screen.getByText("2 at risk")).toBeInTheDocument();
  });

  it("MUNSHI lands on the site dashboard: hazri, incoming, own cash — no company money", () => {
    overview = MONEY;
    renderWithStore(<DashboardView />, { me: meFixture("MUNSHI") });
    expect(screen.getByRole("heading", { level: 1, name: "Site dashboard" })).toBeInTheDocument();
    expect(siteCall).toHaveBeenCalledWith("p1");
    expect(screen.getByRole("link", { name: "Mark hazri" })).toHaveAttribute("href", "/projects/p1/labor/hazri");
    expect(screen.getAllByRole("link", { name: "Receive" })[0]).toHaveAttribute("href", "/projects/p1/site/incoming/dispatch/d1");
    expect(screen.getByText("Rs 9,300")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request top-up" })).toBeInTheDocument();
    expect(screen.queryByText("Receivables")).not.toBeInTheDocument();
    expect(screen.queryByText("Pending approvals")).not.toBeInTheDocument();
  });
});
