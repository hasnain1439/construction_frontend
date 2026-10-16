import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BurnRate, ControlAlert, CostVariance, DelayAnalysis, MaterialVariance } from "@/api/types";
import { AlertsList } from "@/features/dashboard/components/OverviewSections";
import { ControlAlertList } from "@/features/control/components/ControlShared";
import { BurnRateBoard } from "@/features/control/views/BurnRateView";
import { CostVarianceBoard } from "@/features/control/views/CostVarianceView";
import { DelayAnalysisBoard } from "@/features/control/views/DelayAnalysisView";
import { MaterialVarianceBoard } from "@/features/control/views/MaterialVarianceView";
import { PROJECT_NAV, visibleItemIds } from "@/lib/navigation";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));

const PROJECT = { id: "p1", code: "MSB-2026-012", name: "DHA Phase 6 · 10 Marla", status: "ACTIVE" };
const CEMENT = {
  materialId: "m-cement",
  material: { id: "m-cement", name: "Cement OPC", unit: "bag" },
  estimateKey: "cement",
  description: "Cement OPC",
  unit: "bag",
  ownerSupplied: false,
  estimatedTotalQty: 767.68,
  estimatedToDateQty: 366.148,
  deliveredQty: 568.016,
  usedQty: 431.016,
  lossQty: 0,
  inStockQty: 137,
  consumedQty: 431.016,
  varianceQty: 64.868,
  variancePercent: 17.7,
  status: "OVER" as const,
};
const MONEY = { estimateRatePaisa: "145000", actualAvgCostPaisa: "147031", quantityImpactPaisa: "9405860", priceImpactPaisa: "875382", impactPaisa: "10281242" };

const variance = (money: boolean): MaterialVariance => ({
  project: PROJECT,
  milestone: null,
  asOf: "2026-10-16",
  estimate: { id: "e1", revision: 1 },
  hasSchedule: true,
  progress: { percent: 60.4, basis: "ESTIMATE_VALUE" },
  thresholdPercent: 10,
  items: [money ? { ...CEMENT, ...MONEY } : CEMENT],
  counts: { over: 1, under: 0, onTrack: 4, unplanned: 0, notStarted: 4 },
  ...(money ? { totals: { quantityImpactPaisa: "9405860", priceImpactPaisa: "875382", impactPaisa: "10281242" } } : {}),
  milestones: [{ id: "ms1", key: "GF_STRUCTURE.SLAB", name: "Ground floor — roof slab", stageKey: "GF_STRUCTURE", status: "DONE", progressPercent: 100 }],
});

describe("Control — material variance", () => {
  it("shows estimated (prorated) vs delivered vs used vs stock, the variance and the rupee impact", () => {
    renderWithStore(<MaterialVarianceBoard data={variance(true)} milestoneId="ALL" onMilestone={() => {}} />, { me: meFixture("THEKEDAR") });
    const row = screen.getByText("Cement OPC").closest("tr")!;
    expect(within(row).getByText("Over")).toBeInTheDocument();
    expect(within(row).getByText("+17.7%")).toBeInTheDocument();
    expect(row.textContent).toMatch(/568/);
    expect(row.textContent).toMatch(/Rs/);
    expect(screen.getByText("Total rupee impact")).toBeInTheDocument();
  });

  it("without fields.rates: no rupee column, a note instead", () => {
    renderWithStore(<MaterialVarianceBoard data={variance(false)} milestoneId="ALL" onMilestone={() => {}} />, { me: meFixture("PM", { deny: ["fields.rates"] }) });
    expect(screen.queryByText("Rupee impact")).not.toBeInTheDocument();
    expect(screen.queryByText(/Rs\s?\d/)).not.toBeInTheDocument();
    expect(screen.getByText("Rupee amounts are hidden for your account.")).toBeInTheDocument();
  });
});

const COST = (money: boolean): CostVariance => ({
  project: PROJECT,
  asOf: "2026-10-16",
  estimate: { id: "e1", revision: 1 },
  hasSchedule: true,
  progress: { percent: 60.4, basis: "ESTIMATE_VALUE" },
  thresholdPercent: 10,
  buckets: [
    { bucket: "MATERIALS", status: "ON_TRACK", ...(money ? { estimateTotalPaisa: "496010358", estimateToDatePaisa: "355367391", actualPaisa: "348883107", variancePaisa: "-6484284", variancePercent: -1.8 } : {}) },
    { bucket: "SUBCONTRACT", status: "OVER", ...(money ? { estimateTotalPaisa: "87750000", estimateToDatePaisa: "0", actualPaisa: "55500000", variancePaisa: "55500000", variancePercent: null } : {}) },
  ],
  ...(money
    ? {
        totals: { estimateTotalPaisa: "793952633", estimateToDatePaisa: "479182064", actualPaisa: "413708107", variancePaisa: "-65473957", variancePercent: -13.7 },
        labourCombined: { estimateToDatePaisa: "64004329", actualPaisa: "63890000", variancePaisa: "-114329", variancePercent: -0.2 },
        projection: {
          contractPaisa: "1850000000",
          approvedChangesPaisa: "0",
          revisedContractPaisa: "1850000000",
          budgetAtCompletionPaisa: "793952633",
          actualToDatePaisa: "413708107",
          earnedValuePaisa: "479182064",
          costPerformanceIndex: 1.158,
          estimateAtCompletionPaisa: "685530705",
          remainingCostPaisa: "271822598",
          projectedMarginPaisa: "1164469295",
          projectedMarginPercent: 62.9,
          basis: "EARNED_VALUE" as const,
          note: "Cost to date + the rest of the approved estimate.",
        },
      }
    : {}),
  stages: [{ stageKey: "GF_STRUCTURE", progressPercent: 100, ...(money ? { estimatePaisa: "245008018", estimateToDatePaisa: "245008018" } : {}) }],
});

describe("Control — cost variance", () => {
  it("buckets with money, labour + sub-contract together and the projected margin", () => {
    renderWithStore(<CostVarianceBoard data={COST(true)} />, { me: meFixture("THEKEDAR") });
    expect(screen.getAllByText("Materials").length).toBeGreaterThan(0);
    expect(screen.getByText("Labour + sub-contract together")).toBeInTheDocument();
    expect(screen.getByTestId("projection")).toHaveTextContent("62.9%");
  });
  it("without the money permissions: statuses only, no amounts, no projected margin", () => {
    renderWithStore(<CostVarianceBoard data={COST(false)} />, { me: meFixture("PM") });
    expect(screen.queryByTestId("projection")).not.toBeInTheDocument();
    expect(screen.queryByText(/Rs\s?\d/)).not.toBeInTheDocument();
    expect(screen.getByText("Over")).toBeInTheDocument();
  });
});

const BURN = (money: boolean): BurnRate => ({
  project: PROJECT,
  asOf: "2026-10-16",
  thresholdPoints: 10,
  progressBasis: "ESTIMATE_VALUE",
  hasSchedule: true,
  ...(money ? { contractPaisa: "1850000000" } : {}),
  months: [
    { month: "2026-09", progressPercent: 36.6, ...(money ? { costPaisa: "87478960", cumulativeCostPaisa: "306057045", spentPercent: 16.5, gapPoints: -20.1, ahead: false } : {}) },
    { month: "2026-10", progressPercent: 30, ...(money ? { costPaisa: "507651062", cumulativeCostPaisa: "813708107", spentPercent: 44, gapPoints: 14, ahead: true } : {}) },
  ],
  current: { progressPercent: 30, plannedProgressPercent: 45, ...(money ? { spentPercent: 44, gapPoints: 14, ahead: true } : {}) },
});

describe("Control — burn rate vs progress", () => {
  it("highlights the months where spending runs ahead of progress", () => {
    renderWithStore(<BurnRateBoard data={BURN(true)} />, { me: meFixture("THEKEDAR") });
    expect(screen.getAllByText("Spend ahead").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+14 pts").length).toBeGreaterThan(0);
  });
  it("progress only without financial access", () => {
    renderWithStore(<BurnRateBoard data={BURN(false)} />, { me: meFixture("PM") });
    expect(screen.queryByText("Spend ahead")).not.toBeInTheDocument();
    expect(screen.getAllByText("Spending is hidden for your account — only progress is shown.").length).toBeGreaterThan(0);
  });
});

const DELAY: DelayAnalysis = {
  project: PROJECT,
  asOf: "2026-10-16",
  thresholdPoints: 15,
  graceDays: 3,
  hasSchedule: true,
  delays: {
    originalEnd: "2027-02-15",
    baselineEnd: "2026-10-28",
    plannedEnd: "2027-02-17",
    revisedEnd: "2027-02-17",
    projectedEnd: "2027-03-03",
    pace: 0.99,
    progressPercent: 39.6,
    days: { owner: 0, excusable: 2, contractor: 12, changeOrders: 0, total: 14 },
    aheadDays: 0,
    calendarDaysLate: 16,
    categories: [
      { category: "OWNER", days: 0, reasons: [] },
      { category: "EXCUSABLE", days: 2, reasons: [{ stoppageId: "s1", reason: "RAIN", dates: ["2026-10-07", "2026-10-08"], days: 2, note: null }] },
      { category: "CONTRACTOR", days: 12, reasons: [] },
    ],
    pending: [],
    changeOrders: { days: 0, items: [] },
  },
  milestones: [
    {
      id: "m-slab",
      key: "F1_STRUCTURE.SLAB",
      name: "First floor — roof slab",
      stageKey: "F1_STRUCTURE",
      status: "IN_PROGRESS",
      plannedStart: "2026-10-14",
      plannedEnd: "2026-10-19",
      baselineStart: null,
      baselineEnd: null,
      varianceDays: 0,
      actualStart: "2026-10-14",
      actualEnd: null,
      progressPercent: 20,
      plannedProgressPercent: 60,
      behindPoints: 40,
      late: false,
      lateDays: 0,
      behind: true,
    },
  ],
  timeline: [
    { date: "2026-10-16", kind: "PLAN_VERSION", title: "MILESTONE_EDITED", detail: "Lenter promised", category: null, status: "v3", days: null, refId: "v3", plannedEnd: "2027-02-17", progressPercent: null },
    { date: "2026-10-07", kind: "STOPPAGE", title: "RAIN", detail: null, category: "EXCUSABLE", status: "APPROVED", days: 2, refId: "s1", plannedEnd: null, progressPercent: null },
  ],
  summary: { behind: 1, late: 0, finished: 6, total: 13 },
};

describe("Control — delay analysis", () => {
  it("reuses the Step 13 delay cards and marks milestones behind plan, with a timeline", () => {
    renderWithStore(<DelayAnalysisBoard data={DELAY} />, { me: meFixture("PM") });
    expect(screen.getByTestId("delay-cards")).toBeInTheDocument();
    const row = screen.getByText("First floor — roof slab").closest("tr")!;
    expect(within(row).getByText("Behind plan")).toBeInTheDocument();
    expect(within(row).getByText("40 pts")).toBeInTheDocument();
    expect(screen.getByText(/Plan v3/)).toBeInTheDocument();
    expect(screen.getByText("Rain · 2 days (Excusable)")).toBeInTheDocument();
  });
});

const ALERT: ControlAlert = {
  id: "a1",
  rule: "MATERIAL_OVERUSE",
  severity: "WARNING",
  status: "OPEN",
  project: { id: "p1", code: "MSB-2026-012", name: "DHA Phase 6 · 10 Marla" },
  title: "DHA Phase 6 · 10 Marla: Cement OPC 17.7% over the estimate",
  body: "431 bags used against 366 bags due.",
  refType: "MATERIAL",
  refId: "m-cement",
  details: {},
  actionUrl: "/projects/p1/control/material-variance",
  openedAt: "2026-10-14T01:30:00.000Z",
  lastSeenAt: "2026-10-16T01:30:00.000Z",
  resolvedAt: null,
  notifiedAt: null,
  occurrences: 2,
};

describe("Control — alerts", () => {
  it("lists open alerts with the rule name and a link", () => {
    renderWithStore(<ControlAlertList alerts={[ALERT]} />, { me: meFixture("THEKEDAR") });
    const item = screen.getByTestId("control-alert-MATERIAL_OVERUSE");
    expect(within(item).getByText("Material overuse")).toBeInTheDocument();
    expect(within(item).getByRole("link")).toHaveAttribute("href", "/projects/p1/control/material-variance");
    expect(within(item).getByText(/Seen 2 times/)).toBeInTheDocument();
  });
  it("dashboard alerts name control rules", () => {
    renderWithStore(
      <AlertsList alerts={[{ source: "CONTROL_ALERT", id: "a1", type: "MILESTONE_BEHIND_PLAN", severity: "CRITICAL", title: "Slab behind plan", project: { id: "p1", code: "MSB-2026-012", name: "DHA" }, at: "2026-10-16T01:30:00.000Z", actionUrl: "/projects/p1/control/delay" }]} />,
      { me: meFixture("THEKEDAR") },
    );
    expect(screen.getByText("Behind plan")).toBeInTheDocument();
  });
});

describe("Control — navigation", () => {
  it("Project → Control pages are live for control.view (PM, Accountant, owner), hidden for the Munshi", () => {
    const ids = ["p.control.material", "p.control.cost", "p.control.burn", "p.control.delay"];
    expect(visibleItemIds(meFixture("THEKEDAR"), PROJECT_NAV)).toEqual(expect.arrayContaining(ids));
    expect(visibleItemIds(meFixture("PM"), PROJECT_NAV)).toEqual(expect.arrayContaining(ids));
    expect(visibleItemIds(meFixture("MUNSHI"), PROJECT_NAV).filter((id) => id.startsWith("p.control."))).toEqual([]);
    expect(PROJECT_NAV.find((s) => s.id === "p.control")!.items.every((i) => i.available)).toBe(true);
  });
});
