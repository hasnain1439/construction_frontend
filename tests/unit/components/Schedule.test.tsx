import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Milestone, ScheduleDelays, ScheduleDetail, Stoppage, StoppageList } from "@/api/types";
import { translate, translateEnum } from "@/i18n/useT";
import { PROJECT_NAV, visibleItemIds } from "@/lib/navigation";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

const base: Omit<
  Milestone,
  "id" | "key" | "name" | "sortOrder" | "stageId" | "stageKey" | "plannedStart" | "plannedEnd" | "status"
> = {
  projectId: "p1",
  scheduleId: "s1",
  workDays: 6,
  durationDays: 6,
  baselineStart: null,
  baselineEnd: null,
  varianceDays: 0,
  curingDays: 0,
  curingUntil: null,
  startNoEarlierThan: null,
  progressPercent: 0,
  actualStart: null,
  actualEnd: null,
  late: false,
  dependsOn: [],
  billingStage: null,
  quotas: [],
  basis: [],
  lastUpdate: null,
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const WALLS: Milestone = {
  ...base,
  id: "m-walls",
  key: "F1_STRUCTURE.WALLS",
  name: "First floor — columns & brickwork",
  sortOrder: 1,
  stageId: "st-f1",
  stageKey: "F1_STRUCTURE",
  plannedStart: "2026-09-08",
  plannedEnd: "2026-10-12",
  baselineStart: "2026-06-05",
  baselineEnd: "2026-06-20",
  varianceDays: 114,
  curingDays: 7,
  curingUntil: "2026-10-19",
  status: "CURING",
  progressPercent: 100,
  actualStart: "2026-09-08",
  actualEnd: "2026-10-12",
  quotas: [
    {
      id: "q1",
      materialId: "mat-cement",
      material: "cement",
      description: "Cement OPC",
      unit: "bag",
      ownerSupplied: false,
      plannedQty: 65.29,
      usedQty: 53,
      remainingQty: 12.29,
      usedPercent: 81.2,
      over: false,
    },
  ],
};
const SLAB: Milestone = {
  ...base,
  id: "m-slab",
  key: "F1_STRUCTURE.SLAB",
  name: "First floor — roof slab",
  sortOrder: 2,
  stageId: "st-f1",
  stageKey: "F1_STRUCTURE",
  plannedStart: "2026-10-14",
  plannedEnd: "2026-10-15",
  status: "IN_PROGRESS",
  progressPercent: 20,
  actualStart: "2026-10-14",
  late: true,
  dependsOn: [{ milestoneId: "m-walls", key: "F1_STRUCTURE.WALLS", type: "FS", lagDays: 7 }],
};
const MUMTY: Milestone = {
  ...base,
  id: "m-mumty",
  key: "MUMTY_ROOF.STRUCTURE",
  name: "Mumty walls & roof slab",
  sortOrder: 3,
  stageId: "st-mumty",
  stageKey: "MUMTY_ROOF",
  plannedStart: "2026-11-11",
  plannedEnd: "2026-11-17",
  status: "PLANNED",
  dependsOn: [{ milestoneId: "m-slab", key: "F1_STRUCTURE.SLAB", type: "FS", lagDays: 14 }],
};

const stoppage = (over: Partial<Stoppage>): Stoppage => ({
  id: "stp",
  projectId: "p1",
  dates: ["2026-10-07", "2026-10-08"],
  from: "2026-10-07",
  to: "2026-10-08",
  days: 2,
  reason: "RAIN",
  category: "EXCUSABLE",
  status: "APPROVED",
  note: "Heavy rain",
  photos: [{ id: "ph1", url: "https://example.test/p.jpg", thumbUrl: null }],
  clientId: null,
  reportedBy: { id: "u3", name: "Rafaqat Ali" },
  reportedAt: "2026-10-07T10:00:00.000Z",
  decidedBy: null,
  decidedAt: null,
  decisionNote: null,
  ...over,
});
const APPROVED = stoppage({ id: "stp-a" });
const PENDING = stoppage({
  id: "stp-p",
  dates: ["2026-10-14"],
  from: "2026-10-14",
  to: "2026-10-14",
  days: 1,
  reason: "SMOG_BAN",
  status: "PENDING",
});

const DETAIL: ScheduleDetail = {
  schedule: {
    id: "s1",
    version: 2,
    startDate: "2026-09-07",
    teams: 2,
    note: null,
    changeOrderDays: 0,
    estimate: { id: "e1", revision: 1 },
    generatedAt: "2026-09-01T05:00:00.000Z",
    generatedBy: { id: "u1", name: "Khalid Malik" },
    replannedAt: null,
    planFloor: null,
  },
  project: {
    id: "p1",
    code: "MSB-2026-012",
    name: "DHA Phase 6",
    status: "ACTIVE",
    startDate: "2026-09-07",
    endDate: "2027-02-15",
  },
  approvedEstimate: { id: "e1", revision: 1, approvedAt: "2026-09-01T05:00:00.000Z" },
  canGenerate: false,
  today: "2026-10-16",
  plannedEnd: "2026-11-17",
  baselineEnd: "2026-08-11",
  projectedEnd: "2026-11-20",
  calendar: {
    workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "SATURDAY"],
    ramadanDayFactor: 0.75,
    ramadanPeriods: [{ start: "2027-02-09", end: "2027-03-09" }],
    holidays: [{ date: "2026-11-09", name: "Iqbal Day", type: "NON_WORKING", source: "PLATFORM" }],
  },
  stages: [
    {
      id: "st-f1",
      stageKey: "F1_STRUCTURE",
      name: "First floor structure",
      sortOrder: 1,
      plannedStart: "2026-09-08",
      plannedEnd: "2026-10-15",
      baselineStart: null,
      baselineEnd: null,
      progressPercent: 60,
      status: "IN_PROGRESS",
    },
    {
      id: "st-mumty",
      stageKey: "MUMTY_ROOF",
      name: "Mumty & roof",
      sortOrder: 2,
      plannedStart: "2026-11-11",
      plannedEnd: "2026-11-17",
      baselineStart: null,
      baselineEnd: null,
      progressPercent: 0,
      status: "PLANNED",
    },
  ],
  milestones: [WALLS, SLAB, MUMTY],
  stoppages: [APPROVED, PENDING],
  baseline: {
    id: "b1",
    createdAt: "2026-09-01T05:00:00.000Z",
    startDate: "2026-06-01",
    plannedEnd: "2026-08-11",
  },
};

const DELAYS: ScheduleDelays = {
  originalEnd: "2027-02-15",
  baselineEnd: "2026-10-28",
  plannedEnd: "2027-02-26",
  revisedEnd: "2027-02-17",
  projectedEnd: "2027-03-03",
  pace: 0.99,
  progressPercent: 39.6,
  days: { owner: 0, excusable: 2, contractor: 12, changeOrders: 0, total: 14 },
  aheadDays: 0,
  categories: [
    { category: "OWNER", days: 0, reasons: [] },
    {
      category: "EXCUSABLE",
      days: 2,
      reasons: [
        {
          stoppageId: "stp-a",
          reason: "RAIN",
          dates: ["2026-10-07", "2026-10-08"],
          days: 2,
          note: "Heavy rain",
        },
      ],
    },
    {
      category: "CONTRACTOR",
      days: 12,
      reasons: [
        {
          stoppageId: null,
          reason: "SLOW_PROGRESS",
          dates: [],
          days: 12,
          note: "Progress 39.6% at 99% of the planned pace",
        },
      ],
    },
  ],
  pending: [
    { stoppageId: "stp-p", reason: "SMOG_BAN", category: "EXCUSABLE", dates: ["2026-10-14"], days: 1 },
  ],
  changeOrders: { days: 0, items: [] },
};

const api = vi.hoisted(() => ({
  update: vi.fn(),
  progress: vi.fn(),
}));
const unwrapping = (fn: (arg: unknown) => unknown) => (arg: unknown) => ({ unwrap: () => fn(arg) });

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/projects/p1/schedule/gantt",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/api/services/schedule.api", () => ({
  useGetMilestoneQuery: () => ({ data: undefined }),
  useUpdateMilestoneMutation: () => [unwrapping(api.update), { isLoading: false }],
  useUpdateMilestoneProgressMutation: () => [unwrapping(api.progress), { isLoading: false }],
  useApproveStoppageMutation: () => [vi.fn(), { isLoading: false }],
  useRejectStoppageMutation: () => [vi.fn(), { isLoading: false }],
  useCreateStoppageMutation: () => [vi.fn(), { isLoading: false }],
  useGenerateScheduleMutation: () => [vi.fn(), { isLoading: false }],
  useReplanScheduleMutation: () => [vi.fn(), { isLoading: false }],
}));

const { buildGanttModel, DAY_PX, diffDays } = await import("@/features/schedule/gantt/ganttModel");
const { GanttBoard } = await import("@/features/schedule/views/GanttView");
const { ProgressForm } = await import("@/features/schedule/components/ProgressForm");
const { DelayBreakdown } = await import("@/features/schedule/components/DelayCards");
const { StoppagesBoard } = await import("@/features/schedule/views/StoppagesView");
const { ScheduleEmpty } = await import("@/features/schedule/components/PlanDialogs");
const { progressSchema, stoppageSchema, nextStatuses } = await import("@/features/schedule/schemas");

describe("Schedule — Gantt model", () => {
  const model = buildGanttModel(DETAIL)!;

  it("lays out weeks from a Monday, stage rows and milestone bars", () => {
    expect(model.start).toBe("2026-06-01"); // Monday on / before the earliest date (baseline 5 Jun) − 3 days
    expect(model.rows.map((r) => r.kind)).toEqual(["stage", "milestone", "milestone", "stage", "milestone"]);
    const slab = model.rows.find((r) => r.id === "m-slab")!;
    expect(slab.kind === "milestone" && slab.bar).toEqual({
      x: diffDays(model.start, "2026-10-14") * DAY_PX,
      width: 2 * DAY_PX,
    });
    expect(slab.kind === "milestone" && slab.progressWidth).toBe(Math.round(2 * DAY_PX * 0.2));
    expect(model.todayX).toBe(diffDays(model.start, "2026-10-16") * DAY_PX + DAY_PX / 2);
  });

  it("curing from the day after the work ends till curingUntil; baseline ghost; movable only when not started", () => {
    const walls = model.rows.find((r) => r.id === "m-walls");
    if (walls?.kind !== "milestone") throw new Error("no walls row");
    expect(walls.curing).toEqual({ x: diffDays(model.start, "2026-10-13") * DAY_PX, width: 7 * DAY_PX });
    expect(walls.baseline?.x).toBe(diffDays(model.start, "2026-06-05") * DAY_PX);
    expect(walls.movable).toBe(false);
    expect(model.rows.find((r) => r.id === "m-mumty")).toMatchObject({ movable: true });
  });

  it("stoppage bands (approved / pending), holidays, weekly off days and dependency arrows", () => {
    expect(model.stoppageBands.map((b) => [b.status, b.width / DAY_PX])).toEqual([
      ["APPROVED", 2],
      ["PENDING", 1],
    ]);
    expect(model.shades.find((s) => s.date === "2026-11-09")?.kind).toBe("HOLIDAY");
    // Friday is off in this company (not in workingDays).
    expect(model.shades.find((s) => s.date === "2026-10-16")?.kind).toBe("OFF");
    expect(model.arrows.map((a) => `${a.fromId}>${a.toId}`)).toEqual(["m-walls>m-slab", "m-slab>m-mumty"]);
  });
});

describe("Schedule — Gantt chart", () => {
  it("draws bars, baseline, curing, stoppage bands, today line, arrows and the late marker", () => {
    renderWithStore(
      <GanttBoard detail={DETAIL} projectId="p1" canManage={false} canProgress={false} seesBilling={false} />,
      { me: meFixture("MUNSHI") },
    );
    expect(screen.getByTestId("bar-m-walls")).toHaveAttribute("data-status", "CURING");
    expect(screen.getByTestId("bar-m-mumty")).toBeInTheDocument();
    expect(screen.getByTestId("baseline-m-walls")).toBeInTheDocument();
    expect(screen.getByTestId("curing-m-walls")).toBeInTheDocument();
    expect(screen.getByTestId("stoppage-band-APPROVED")).toBeInTheDocument();
    expect(screen.getByTestId("stoppage-band-PENDING")).toBeInTheDocument();
    expect(screen.getByTestId("today-line")).toBeInTheDocument();
    expect(screen.getAllByTestId("dep-arrow")).toHaveLength(2);
    expect(screen.getByTestId("late-m-slab")).toBeInTheDocument();
    expect(screen.getAllByTestId("shade-HOLIDAY")).toHaveLength(1);
    // Read-only users get the "click to see" hint, not the drag hint.
    expect(screen.getByText(/Click a milestone/)).toBeInTheDocument();
  });

  it(
    "dragging a planned bar previews the shift (dryRun) and saves after confirming",
    { timeout: 30_000 },
    async () => {
      api.update.mockReset();
      api.update.mockImplementation(async ({ body }: { body: { dryRun?: boolean } }) => ({
        milestone: MUMTY,
        dryRun: Boolean(body.dryRun),
        shifted: [
          {
            id: "m-mumty",
            key: MUMTY.key,
            name: MUMTY.name,
            plannedStart: { from: "2026-11-11", to: "2026-11-18" },
            plannedEnd: { from: "2026-11-17", to: "2026-11-24" },
          },
          {
            id: "m-paint",
            key: "FINISHING.PAINT",
            name: "Paint",
            plannedStart: { from: "2027-01-01", to: "2027-01-08" },
            plannedEnd: { from: "2027-01-10", to: "2027-01-17" },
          },
        ],
        plannedEnd: { from: "2027-01-10", to: "2027-01-17" },
      }));
      renderWithStore(
        <GanttBoard detail={DETAIL} projectId="p1" canManage canProgress seesBilling={false} />,
        { me: meFixture("THEKEDAR") },
      );
      const bar = screen.getByTestId("bar-m-mumty");
      fireEvent.pointerDown(bar, { clientX: 100, button: 0, pointerId: 1 });
      fireEvent.pointerMove(bar, { clientX: 100 + 7 * DAY_PX, pointerId: 1 });
      fireEvent.pointerUp(bar, { clientX: 100 + 7 * DAY_PX, pointerId: 1 });
      await waitFor(() =>
        expect(api.update).toHaveBeenCalledWith({
          id: "m-mumty",
          projectId: "p1",
          body: { startNoEarlierThan: "2026-11-18", dryRun: true },
        }),
      );
      const preview = await screen.findByTestId("shift-preview");
      expect(within(preview).getByText("Paint")).toBeInTheDocument();
      expect(within(preview).getByText(/Planned end:/)).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Save new dates" }));
      await waitFor(() =>
        expect(api.update).toHaveBeenLastCalledWith({
          id: "m-mumty",
          projectId: "p1",
          body: { startNoEarlierThan: "2026-11-18" },
        }),
      );
    },
  );

  it("started work can't be dragged", () => {
    api.update.mockReset();
    renderWithStore(<GanttBoard detail={DETAIL} projectId="p1" canManage canProgress seesBilling={false} />, {
      me: meFixture("THEKEDAR"),
    });
    const bar = screen.getByTestId("bar-m-slab");
    fireEvent.pointerDown(bar, { clientX: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(bar, { clientX: 160, pointerId: 1 });
    fireEvent.pointerUp(bar, { clientX: 160, pointerId: 1 });
    expect(api.update).not.toHaveBeenCalled();
  });

  it("keyboard alternative: the panel's date field previews the move too", { timeout: 30_000 }, async () => {
    api.update.mockReset();
    api.update.mockResolvedValue({
      milestone: MUMTY,
      dryRun: true,
      shifted: [],
      plannedEnd: { from: "2026-11-17", to: "2026-11-17" },
    });
    const user = userEvent.setup();
    renderWithStore(<GanttBoard detail={DETAIL} projectId="p1" canManage canProgress seesBilling={false} />, {
      me: meFixture("THEKEDAR"),
    });
    await user.click(screen.getByTestId("bar-m-mumty"));
    const field = await screen.findByLabelText("Start no earlier than");
    fireEvent.change(field, { target: { value: "2026-11-20" } });
    await user.click(screen.getByRole("button", { name: "Preview move" }));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith({
        id: "m-mumty",
        projectId: "p1",
        body: { startNoEarlierThan: "2026-11-20", dryRun: true },
      }),
    );
    expect(await screen.findByText("No other milestone moves.")).toBeInTheDocument();
  });

  it(
    "the panel shows dates, dependencies and quota; no move section without schedule.plan.manage",
    { timeout: 30_000 },
    async () => {
      const user = userEvent.setup();
      renderWithStore(
        <GanttBoard detail={DETAIL} projectId="p1" canManage={false} canProgress seesBilling={false} />,
        { me: meFixture("MUNSHI") },
      );
      await user.click(screen.getByTestId("bar-m-walls"));
      expect(await screen.findByText("Material quota")).toBeInTheDocument();
      expect(screen.getByTestId("quota-cement")).toHaveTextContent("Cement OPC");
      expect(screen.queryByText("Move the start")).not.toBeInTheDocument();
      expect(screen.getByText("Update progress")).toBeInTheDocument();
    },
  );
});

describe("Schedule — empty state", () => {
  const empty: ScheduleDetail = {
    ...DETAIL,
    schedule: null,
    stages: [],
    milestones: [],
    stoppages: [],
    baseline: null,
  };

  it("without an approved estimate: link to Planning → Estimate instead of Generate", () => {
    renderWithStore(<ScheduleEmpty detail={{ ...empty, canGenerate: false }} projectId="p1" canGenerate />, {
      me: meFixture("THEKEDAR"),
    });
    expect(screen.getByText("Approve an estimate first")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Planning → Estimate/ })).toHaveAttribute(
      "href",
      "/projects/p1/planning/estimate",
    );
    expect(screen.queryByRole("button", { name: "Generate schedule" })).not.toBeInTheDocument();
  });

  it("with an approved estimate: Generate schedule (plan managers only)", () => {
    const { unmount } = renderWithStore(
      <ScheduleEmpty detail={{ ...empty, canGenerate: true }} projectId="p1" canGenerate />,
      { me: meFixture("THEKEDAR") },
    );
    expect(screen.getByRole("button", { name: /Generate schedule/ })).toBeInTheDocument();
    unmount();
    renderWithStore(
      <ScheduleEmpty detail={{ ...empty, canGenerate: true }} projectId="p1" canGenerate={false} />,
      { me: meFixture("MUNSHI") },
    );
    expect(screen.queryByRole("button", { name: /Generate schedule/ })).not.toBeInTheDocument();
  });
});

describe("Schedule — progress update", () => {
  it("schema: BLOCKED needs a note, something must change, no future date", () => {
    const schema = progressSchema({ progressPercent: 20 }, "2026-10-16");
    expect(
      schema.safeParse({ progressPercent: 20, status: "BLOCKED", date: "2026-10-16", note: "" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        progressPercent: 20,
        status: "BLOCKED",
        date: "2026-10-16",
        note: "No steel on site",
      }).success,
    ).toBe(true);
    expect(schema.safeParse({ progressPercent: 20, status: "", date: "2026-10-16", note: "" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ progressPercent: 40, status: "", date: "2026-10-17", note: "" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ progressPercent: 40, status: "", date: "2026-10-16", note: "" }).success).toBe(
      true,
    );
    expect(nextStatuses(SLAB)).toEqual(["DONE", "BLOCKED"]);
    expect(nextStatuses(WALLS)).toEqual(["DONE"]);
  });

  it("choosing Blocked without a note shows the error and sends nothing", { timeout: 30_000 }, async () => {
    api.progress.mockReset();
    const user = userEvent.setup();
    renderWithStore(<ProgressForm milestone={SLAB} projectId="p1" />, { me: meFixture("MUNSHI") });
    await user.click(screen.getByRole("radio", { name: "Blocked" }));
    expect(screen.getByLabelText(/Why is the work blocked/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save progress" }));
    expect(await screen.findByText("Write why the work is blocked.")).toBeInTheDocument();
    expect(api.progress).not.toHaveBeenCalled();
  });
});

describe("Schedule — stoppage days", () => {
  const schema = stoppageSchema("2026-10-16");
  const valid = {
    mode: "range" as const,
    from: "2026-10-14",
    to: "2026-10-15",
    dates: [],
    reason: "RAIN" as const,
    photo: { id: "a1", url: null, fileName: "p.jpg", mimeType: "image/jpeg" },
    note: "",
  };
  const paths = (v: unknown) => {
    const r = schema.safeParse(v);
    return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
  };

  it("photo is required except for a holiday; a note is required for Other", () => {
    expect(paths(valid)).toEqual([]);
    expect(paths({ ...valid, photo: null })).toEqual(["photo"]);
    expect(paths({ ...valid, reason: "HOLIDAY", photo: null })).toEqual([]);
    expect(paths({ ...valid, reason: "OTHER", note: "" })).toEqual(["note"]);
  });

  it("dates: to ≥ from, at most 31 days, at most 60 days ahead; separate days need one", () => {
    expect(paths({ ...valid, to: "2026-10-10" })).toEqual(["to"]);
    expect(paths({ ...valid, from: "2026-09-01", to: "2026-10-15" })).toEqual(["to"]);
    expect(paths({ ...valid, from: "2026-12-20", to: "2026-12-21" })).toEqual(["to"]);
    expect(paths({ ...valid, mode: "list", dates: [] })).toEqual(["dates"]);
    expect(paths({ ...valid, mode: "list", dates: ["2026-10-14", "2026-10-16"] })).toEqual([]);
  });

  it("list with status chips; approve / reject only with schedule.stoppage.approve", async () => {
    const data: StoppageList = {
      items: [PENDING, APPROVED],
      summary: { pending: 1, approvedDays: { OWNER: 0, EXCUSABLE: 2, CONTRACTOR: 0 } },
    };
    const { unmount } = renderWithStore(<StoppagesBoard projectId="p1" data={data} canApprove />, {
      me: meFixture("THEKEDAR"),
    });
    expect(screen.getAllByText("Smog ban").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Actions for/ })).toHaveLength(1); // only the PENDING row
    unmount();
    renderWithStore(<StoppagesBoard projectId="p1" data={data} canApprove={false} />, {
      me: meFixture("MUNSHI"),
    });
    expect(screen.queryByRole("button", { name: /Actions for/ })).not.toBeInTheDocument();
  });
});

describe("Schedule — delay cards", () => {
  it("shows original / revised / projected end and slippage by cause with reasons", () => {
    renderWithStore(<DelayBreakdown delays={DELAYS} />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("15 Feb 2027")).toBeInTheDocument();
    expect(screen.getByText("17 Feb 2027")).toBeInTheDocument();
    expect(screen.getByText("3 Mar 2027")).toBeInTheDocument();
    expect(screen.getByText("12 working days past revised end")).toBeInTheDocument();
    expect(within(screen.getByTestId("delay-EXCUSABLE")).getByText("Rain · 2 days")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("delay-CONTRACTOR")).getByText("Slow progress · 12 days"),
    ).toBeInTheDocument();
    expect(within(screen.getByTestId("delay-OWNER")).getByText("No days")).toBeInTheDocument();
    expect(screen.getByText(/1 stoppage day waiting for approval is/)).toBeInTheDocument();
  });
});

describe("Schedule — navigation and language", () => {
  it("menu items follow schedule.plan.view (no more Coming soon)", () => {
    const ids = ["p.schedule.gantt", "p.schedule.milestones", "p.schedule.stoppages", "p.schedule.versions"];
    expect(visibleItemIds(meFixture("THEKEDAR"), PROJECT_NAV)).toEqual(expect.arrayContaining(ids));
    expect(visibleItemIds(meFixture("MUNSHI"), PROJECT_NAV)).toEqual(expect.arrayContaining(ids));
    const noSchedule = meFixture("PM", { permissions: ["projects.project.view"] });
    expect(visibleItemIds(noSchedule, PROJECT_NAV).filter((id) => id.startsWith("p.schedule."))).toEqual([]);
    const items = PROJECT_NAV.find((s) => s.id === "p.schedule")!.items;
    expect(items.every((i) => i.available)).toBe(true);
  });

  it("has Roman Urdu and Urdu texts", () => {
    expect(translate("en", "schedule.crumb.stoppages")).toBe("Stoppage Days");
    expect(translate("roman-ur", "schedule.crumb.stoppages")).toBe("Kaam band din");
    expect(translate("ur", "schedule.crumb.stoppages")).toBe("کام بند دن");
    expect(translateEnum("ur", "stoppageReason", "RAIN")).toBe("بارش");
    expect(translate("ur", "status.milestone.CURING")).toBe("ترائی جاری");
  });
});
