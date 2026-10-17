import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { IdleRentals, ShutteringDemand } from "@/api/types";
import { translate, translateEnum } from "@/i18n/useT";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

const dha = { id: "p-dha", code: "MSB-2026-012", name: "DHA Phase 6" };
const johar = { id: "p-johar", code: "MSB-2026-008", name: "Johar Town" };
const yard = { id: "loc-yard", type: "STORE" as const, name: "Central Store", projectId: null };
const joharSite = { id: "loc-johar", type: "SITE" as const, name: "Johar Town", projectId: johar.id };
const dhaSite = { id: "loc-dha", type: "SITE" as const, name: "DHA Phase 6", projectId: dha.id };
const plate = { id: "e-plate", name: "Steel plate 2×3", code: "SP-23", unit: "nos", kind: "BULK" as const, category: "SHUTTERING_PLATE" as const };
const prop = { id: "e-prop", name: "Steel prop", code: "PR-01", unit: "nos", kind: "BULK" as const, category: "PROP" as const };
const week = (weekStart: string, weekEnd: string, needed: number, ownedAvailable: number, onRent: number) => ({
  weekStart,
  weekEnd,
  needed,
  ownedAvailable,
  onRent,
  available: ownedAvailable + onRent,
  shortfall: Math.max(0, needed - ownedAvailable - onRent),
  surplus: Math.max(0, ownedAvailable + onRent - needed),
  demand: needed ? [{ projectId: dha.id, milestoneId: "m-f1", qty: needed }] : [],
});

const DEMAND: ShutteringDemand = {
  scope: "COMPANY",
  project: null,
  from: "2026-10-12",
  to: "2026-10-25",
  today: "2026-10-16",
  weeks: 2,
  parameters: { plateCoverageSqft: 6, plateCoverageSource: "EQUIPMENT", propsPerPlate: 0.75, sparePercent: 5, beamSidesPercent: 20, defaultStrikeDays: 14 },
  equipment: { plates: [plate], props: [prop] },
  milestones: [
    {
      project: dha,
      milestone: { id: "m-f1", key: "F1_STRUCTURE.SLAB", name: "First floor slab", stageKey: "F1_STRUCTURE", status: "IN_PROGRESS", plannedStart: "2026-10-14", plannedEnd: "2026-10-28", curingDays: 14 },
      holdFrom: "2026-10-14",
      holdUntil: "2026-11-11",
      area: { slabSqft: 1859.23, beamSqft: 371.85, totalSqft: 2231.08, source: "BOQ" },
      plates: 391,
      props: 294,
    },
  ],
  series: [
    { category: "SHUTTERING_PLATE", weeks: [week("2026-10-12", "2026-10-18", 391, 394, 0), week("2026-10-19", "2026-10-25", 500, 394, 0)] },
    { category: "PROP", weeks: [week("2026-10-12", "2026-10-18", 294, 100, 250), week("2026-10-19", "2026-10-25", 294, 100, 100)] },
  ],
  suggestions: [
    { type: "TRANSFER", category: "SHUTTERING_PLATE", equipment: plate, qty: 20, fromWeek: "2026-10-19", toWeek: "2026-10-19", from: yard, fromProject: null, idleAfterWeek: null, toProject: dha, toLocation: dhaSite, rental: null, supplier: null },
    { type: "TRANSFER", category: "SHUTTERING_PLATE", equipment: plate, qty: 86, fromWeek: "2026-10-19", toWeek: "2026-10-19", from: joharSite, fromProject: johar, idleAfterWeek: "2026-10-12", toProject: dha, toLocation: dhaSite, rental: null, supplier: null },
    { type: "RENT", category: "SHUTTERING_PLATE", equipment: plate, qty: 6, fromWeek: "2026-10-19", toWeek: "2026-10-19", from: null, fromProject: null, idleAfterWeek: null, toProject: dha, toLocation: dhaSite, rental: null, supplier: { id: "s-yard", name: "Punjab Shuttering Yard" } },
    { type: "EXTEND_RENTAL", category: "PROP", equipment: prop, qty: 150, fromWeek: "2026-10-19", toWeek: "2026-10-19", from: dhaSite, fromProject: dha, idleAfterWeek: null, toProject: dha, toLocation: dhaSite, rental: { id: "r1", number: "RNT-0001" }, supplier: null },
    { type: "RETURN_RENTAL", category: "PROP", equipment: prop, qty: 56, fromWeek: "2026-10-12", toWeek: "2026-10-12", from: joharSite, fromProject: johar, idleAfterWeek: null, toProject: null, toLocation: null, rental: { id: "r2", number: "RNT-0002" }, supplier: null },
  ],
  warnings: [{ code: "NO_SCHEDULE", project: johar }],
};

const idleRow = (rates: boolean): IdleRentals["items"][number] => ({
  rental: { id: "r2", number: "RNT-0002", status: "ACTIVE", startDate: "2026-10-04", expectedEndDate: "2026-11-03", supplier: { id: "s-yard", name: "Punjab Shuttering Yard" } },
  project: johar,
  location: joharSite,
  items: [{ equipment: prop, qty: 100, ...(rates ? { ratePaisaPerDay: "1500", dailyCostPaisa: "150000" } : {}) }],
  qty: 100,
  since: "2026-10-04",
  lastActivity: null,
  hasSchedule: false,
  idleDays: 12,
  thresholdDays: 5,
  idle: true,
  ...(rates ? { dailyCostPaisa: "150000", idleCostPaisa: "1800000" } : {}),
});

const state = vi.hoisted(() => ({ rates: true, check: vi.fn() }));
const mutation = () => [vi.fn(), { isLoading: false }];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/equipment/shuttering",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/api/services/equipment.api", () => ({
  useGetShutteringDemandQuery: () => ({ data: DEMAND, isLoading: false }),
  useGetEquipmentIdleQuery: () => ({
    data: {
      today: "2026-10-16",
      thresholdDays: 5,
      items: [idleRow(state.rates)],
      ...(state.rates ? { totalDailyCostPaisa: "150000" } : {}),
    } satisfies IdleRentals,
    isLoading: false,
  }),
  useRunEquipmentIdleCheckMutation: () => [state.check, { isLoading: false }],
  useGetEquipmentBalancesQuery: () => ({
    data: {
      locations: [
        { location: yard, project: null, items: [{ equipment: plate, ownedQty: 20, rentedQty: 0, totalQty: 20, rentals: [] }] },
        { location: joharSite, project: johar, items: [{ equipment: plate, ownedQty: 130, rentedQty: 0, totalQty: 130, rentals: [] }] },
      ],
      totals: [],
    },
    isLoading: false,
  }),
  useGetEquipmentListQuery: () => ({ data: { items: [], meta: { page: 1, limit: 100, total: 0, totalPages: 1 } }, isLoading: false }),
  useCreateRentalMutation: mutation,
  useCreateEquipmentTransferMutation: mutation,
}));
vi.mock("@/api/services/inventory.api", () => ({
  useGetStockLocationsQuery: () => ({ data: [yard, joharSite, dhaSite] }),
}));
vi.mock("@/features/procurement/options", () => ({
  useSiteProjectOptions: () => ({
    options: [
      { value: dha.id, label: dha.name, description: dha.code },
      { value: johar.id, label: johar.name, description: johar.code },
    ],
    loading: false,
  }),
  useSupplierOptions: () => ({ options: [{ value: "s-yard", label: "Punjab Shuttering Yard" }], loading: false }),
}));

const { ShutteringDemandView, chartRows } = await import("@/features/equipment/views/ShutteringDemandView");
const { IdleEquipmentPanel } = await import("@/features/equipment/views/IdleEquipmentPanel");

describe("Shuttering demand planner", () => {
  it("weekly table highlights the short week; suggestions in plain language; warnings and assumptions", () => {
    state.rates = true;
    renderWithStore(<ShutteringDemandView />, { me: meFixture("THEKEDAR") });
    // week 2: 500 needed − 394 owned = 106 short
    expect(screen.getByTestId("short-2026-10-19")).toHaveTextContent("106");
    expect(screen.queryByTestId("short-2026-10-12")).not.toBeInTheDocument();
    expect(screen.getByText("Biggest shortfall")).toBeInTheDocument();
    const list = screen.getByTestId("suggestions");
    expect(within(list).getByText(/Send 20 nos Steel plate 2×3 from the yard to DHA Phase 6/)).toBeInTheDocument();
    expect(within(list).getByText(/Move 86 nos Steel plate 2×3 from Johar Town to DHA Phase 6/)).toBeInTheDocument();
    expect(within(list).getByText(/Not needed at Johar Town after/)).toBeInTheDocument();
    expect(within(list).getByText(/From Punjab Shuttering Yard/)).toBeInTheDocument();
    expect(within(list).getAllByRole("button", { name: "Create transfer" })).toHaveLength(2);
    expect(within(list).getByRole("button", { name: "Create rental" })).toBeInTheDocument();
    // props tab is separate
    expect(within(list).queryByText(/RNT-0002/)).not.toBeInTheDocument();
    expect(screen.getByText(/Johar Town has no schedule/)).toBeInTheDocument();
    expect(screen.getByText(/6 sq ft per plate · 0.75 props per plate · 5 % spare plates/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Change in Alerts & Limits" })).toHaveAttribute("href", "/settings/alerts");
    expect(screen.getByText("First floor slab")).toBeInTheDocument();
    expect(screen.getByText("BoQ (detailed)")).toBeInTheDocument();
    // The planner never shows money.
    expect(screen.queryByText(/Rs /, { selector: "[data-testid=suggestions] *" })).not.toBeInTheDocument();
  });

  it("props: extend / return suggestions link to the rental", async () => {
    const user = userEvent.setup();
    renderWithStore(<ShutteringDemandView />, { me: meFixture("THEKEDAR") });
    await user.click(screen.getByRole("radio", { name: "Props" }));
    const list = screen.getByTestId("suggestions");
    expect(within(list).getByText(/Extend RNT-0001: keep 150 nos Steel prop at DHA Phase 6/)).toBeInTheDocument();
    expect(within(list).getByText(/Return 56 nos Steel prop of RNT-0002 from Johar Town/)).toBeInTheDocument();
    const links = within(list).getAllByRole("link", { name: "Open rental" });
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/equipment/rentals/r1", "/equipment/rentals/r2"]);
  });

  it("a transfer suggestion opens the transfer form pre-filled (from Johar to DHA, 86 plates)", { timeout: 30_000 }, async () => {
    const user = userEvent.setup();
    renderWithStore(<ShutteringDemandView />, { me: meFixture("THEKEDAR") });
    await user.click(within(screen.getByTestId("suggestions")).getAllByRole("button", { name: "Create transfer" })[1]!);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByDisplayValue("86")).toBeInTheDocument();
  });

  it("without equipment.transfer.create / rental.manage there are no action buttons (Munshi)", () => {
    renderWithStore(<ShutteringDemandView />, { me: meFixture("MUNSHI") });
    const list = screen.getByTestId("suggestions");
    expect(within(list).queryByRole("button", { name: "Create transfer" })).not.toBeInTheDocument();
    expect(within(list).queryByRole("button", { name: "Create rental" })).not.toBeInTheDocument();
  });

  it("chart rows stack owned + on rent + shortfall under the need", () => {
    expect(chartRows(DEMAND.series[0]!.weeks)).toEqual([
      { week: expect.stringContaining("12 Oct"), owned: 394, onRent: 0, shortfall: 0, needed: 391 },
      { week: expect.stringContaining("19 Oct"), owned: 394, onRent: 0, shortfall: 106, needed: 500 },
    ]);
  });
});

describe("Idle rented equipment panel", () => {
  it("days idle and the rent wasted (owner); Check now sends the alert", async () => {
    state.rates = true;
    state.check.mockReturnValue({ unwrap: () => Promise.resolve({ date: "2026-10-16", thresholdDays: 5, checked: 2, idle: 1, notified: [] }) });
    const user = userEvent.setup();
    renderWithStore(<IdleEquipmentPanel />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("RNT-0002")).toHaveAttribute("href", "/equipment/rentals/r2");
    expect(screen.getByText("12 days")).toBeInTheDocument();
    expect(screen.getByText("No schedule")).toBeInTheDocument();
    expect(screen.getAllByText("Rs 1,500").length).toBeGreaterThan(0);
    expect(screen.getByText("Rs 18,000")).toBeInTheDocument();
    expect(screen.getByTestId("idle-total")).toHaveTextContent("Rent wasted per day: Rs 1,500");
    await user.click(screen.getByRole("button", { name: /Check now/ }));
    expect(state.check).toHaveBeenCalled();
  });

  it("no money and no Check now for the Munshi", () => {
    state.rates = false;
    renderWithStore(<IdleEquipmentPanel />, { me: meFixture("MUNSHI") });
    expect(screen.getByText("12 days")).toBeInTheDocument();
    expect(screen.queryByText(/Rs /)).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Rent / day" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Check now/ })).not.toBeInTheDocument();
  });
});

describe("Shuttering demand — language", () => {
  it("has Roman Urdu and Urdu texts", () => {
    expect(translate("roman-ur", "equipment.shuttering.title")).toBe("Shuttering ki talab");
    expect(translate("ur", "equipment.shuttering.title")).toBe("شٹرنگ کی طلب");
    expect(translate("ur", "equipment.idle.days", { n: 12 })).toBe("12 دن");
    expect(translateEnum("ur", "shutteringAreaSource", "ESTIMATE_FOOTPRINT")).toBe("منزل کا رقبہ");
    expect(translateEnum("roman-ur", "notificationType", "EQUIPMENT_IDLE")).toBe("Kiraye ka saman bekaar khara hai");
  });
});
