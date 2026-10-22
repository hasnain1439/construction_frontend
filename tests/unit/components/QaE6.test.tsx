/**
 * Estimate QA re-check (22 Oct 2026), web side (QE6): one column count everywhere (B-04), one ground
 * footprint rule (NEW-2), termite and per-material wastage in the Assumptions dialog, also while the
 * estimate is blocked (B-19 / B-20), sooter labels and inch hints (B-32), and the items the tester
 * could not re-test on a read-only company (B-18, B-25, B-27, B-29, B-31, B-34, B-35).
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { PaymentTemplate, ProjectDetail, ProjectEstimate, ProjectFootprints } from "@/api/types";
import { Form } from "@/components/forms/Form";
import { StageEditor, type StageRow } from "@/features/master-data/components/StageEditor";
import { EstimateSettingsModal } from "@/features/projects/estimate/EstimateSettingsModal";
import { rccSteelBySize } from "@/features/projects/estimate/EstimateView";
import { estimateColumnCount, FOUNDATION_DEFAULTS, type FoundationFormValues } from "@/features/projects/utils/foundation";
import { columnCountFor, floorFootprints, footprintFloors, groundFootprint } from "@/features/projects/utils/footprint";
import { plotCalc } from "@/features/projects/utils/calc";
import { defaultTemplateFor, fitStages, switchContract, templateStages, type StageValue } from "@/features/projects/wizard/contractStages";
import { plotFit } from "@/features/projects/wizard/CoverageTab";
import { EstimateTab } from "@/features/projects/wizard/EstimateTab";
import { FoundationCard } from "@/features/projects/wizard/FoundationCard";
import { PlotResult } from "@/features/projects/wizard/PlotStructureTab";
import { copyAction } from "@/features/projects/wizard/RoomsTab";
import { coverageSchema } from "@/features/projects/wizard/schemas";
import { WizardContext, type WizardContextValue } from "@/features/projects/wizard/WizardContext";
import { translate, type TranslationKey, type TranslationVars } from "@/i18n/useT";
import { ESTIMATE_DEFAULTS, estimateFixture } from "../estimateFixture";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/projects/p1/edit",
  useSearchParams: () => new URLSearchParams(),
}));

const api = vi.hoisted(() => ({ estimate: undefined as unknown, save: undefined as unknown }));
vi.mock("@/api/services/projects.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/projects.api")>()),
  useGetEstimateQuery: () => ({ data: api.estimate, isLoading: false, refetch: vi.fn() }),
  useUpdateEstimateSettingsMutation: () => [api.save, { isLoading: false }],
}));

const en = (key: TranslationKey, vars?: TranslationVars) => translate("en", key, vars);
const roman = (key: TranslationKey, vars?: TranslationVars) => translate("roman-ur", key, vars);
const ur = (key: TranslationKey, vars?: TranslationVars) => translate("ur", key, vars);

/** The tester's project: 35 × 65 ft, 3,400 sq ft over ground + first, rooms 392 : 231 sq ft. */
/** QE5 `GET /projects/:id` → `calculations.footprints` for that project. */
const FOOTPRINTS: ProjectFootprints = {
  rule: "SHARED_EQUALLY",
  floors: [
    { level: "GROUND", name: "Ground floor", footprintSqft: 1700, columns: 20 },
    { level: "FIRST", name: "First floor", footprintSqft: 1700, columns: 20 },
  ],
  groundFootprintSqft: 1700,
  columnCount: 20,
  columnGridFt: 15,
};
const QA_FLOORS = [
  { level: "GROUND" as const, roomAreaSqft: 392 },
  { level: "FIRST" as const, roomAreaSqft: 231 },
];

describe("QA NEW-2 — one ground footprint rule", () => {
  it("full storeys share the covered area equally, not by room area", () => {
    // was 2,139.33 (by room area 392 : 231) in the engine and 1,700 on the Coverage tab
    expect(floorFootprints(QA_FLOORS, 3400)).toEqual([1700, 1700]);
    expect(groundFootprint({ floors: QA_FLOORS, coveredAreaSqft: 3400 })).toBe(1700);
  });

  it("a mumty takes its rooms × 1.15, or 150 sq ft without rooms (capped); the storeys share the rest", () => {
    expect(floorFootprints([...QA_FLOORS, { level: "MUMTY", roomAreaSqft: 0 }], 3400)).toEqual([1625, 1625, 150]);
    expect(floorFootprints([...QA_FLOORS, { level: "MUMTY", roomAreaSqft: 100 }], 3400)).toEqual([1642.5, 1642.5, 115]);
    // tiny covered area: the mumty is at most 15 % of it
    expect(floorFootprints([{ level: "GROUND" }, { level: "MUMTY" }], 600)).toEqual([510, 90]);
  });

  it("the API's number wins when the estimate is loaded; the plot stands in without a covered area", () => {
    const e = estimateFixture();
    e.basis.floors = [{ level: "GROUND", footprintSqft: 1712.5 } as ProjectEstimate["basis"]["floors"][number]];
    expect(groundFootprint({ estimate: e, floors: QA_FLOORS, coveredAreaSqft: 3400 })).toBe(1712.5);
    // QE5 project.calculations.footprints wins over both
    expect(groundFootprint({ footprints: FOOTPRINTS, estimate: e, floors: QA_FLOORS, coveredAreaSqft: 3400 })).toBe(1700);
    expect(groundFootprint({ floors: [], coveredAreaSqft: null, frontFt: 35, depthFt: 65 })).toBe(2275);
    expect(groundFootprint({ floors: [], coveredAreaSqft: null })).toBeNull();
  });

  it("the Coverage tab's plot check uses that footprint", () => {
    const ground = groundFootprint({ floors: QA_FLOORS, coveredAreaSqft: 3400 });
    expect(plotFit({ coveredSqft: 3400, semiSqft: 250, openSqft: 0, plotSqft: 2250, storeys: 2, groundFootprintSqft: ground })).toEqual({ footprint: 1700, onPlot: 1950, overflow: false });
  });

  it("project floors → the rule's input (rooms from the floor totals; a new level counts with no rooms)", () => {
    const project = { floors: [{ level: "GROUND", calculations: { totalFloorAreaSqft: 392 } }] } as unknown as ProjectDetail;
    expect(footprintFloors(project)).toEqual([{ level: "GROUND", roomAreaSqft: 392 }]);
    expect(footprintFloors(project, ["GROUND", "FIRST"])).toEqual([
      { level: "GROUND", roomAreaSqft: 392 },
      { level: "FIRST", roomAreaSqft: 0 },
    ]);
  });
});

describe("QA B-04 — one column count for the plot hint, the footing default and the BoQ", () => {
  const p = { floors: QA_FLOORS, coveredAreaSqft: 3400, frontFt: 35, depthFt: 65 };

  it("15 ft grid over the shared footprint: 20 columns for the tester's house (24 came from the room-ratio footprint)", () => {
    expect(columnCountFor(p, "GROUND")).toBe(20);
    expect(estimateColumnCount(2139.33, 35, 65)).toBe(24);
  });

  it("the API's count wins (QE5 calculations.footprints, else the estimate's floors[].columns.derived)", () => {
    const e = estimateFixture();
    e.basis.floors = [{ level: "GROUND", footprintSqft: 1700, columns: { derived: 22, entered: null, used: 22 } } as ProjectEstimate["basis"]["floors"][number]];
    expect(columnCountFor({ ...p, estimate: e }, "GROUND")).toBe(22);
    expect(columnCountFor({ ...p, footprints: FOOTPRINTS, estimate: e }, "GROUND")).toBe(20);
    expect(columnCountFor({ ...p, footprints: { ...FOOTPRINTS, floors: [] }, estimate: e }, "GROUND")).toBe(20);
    e.basis.floors = [{ level: "GROUND", footprintSqft: 1700 } as ProjectEstimate["basis"]["floors"][number]];
    // only the floor's own footprint from the API: the grid over it
    expect(columnCountFor({ ...p, estimate: e }, "GROUND")).toBe(20);
  });

  function Harness({ foundation, columns, saved = false }: { foundation: Partial<FoundationFormValues>; columns: number | null; saved?: boolean }) {
    const form = useForm<{ foundation: FoundationFormValues; structureType: string }>({
      defaultValues: { structureType: "FRAMED", foundation: { ...FOUNDATION_DEFAULTS, type: "ISOLATED", footingThicknessIn: 12, footingLengthFt: 4, footingWidthFt: 4, ...foundation } },
    });
    return (
      <Form form={form} onSubmit={() => {}}>
        <FoundationCard disabled={false} saved={saved} columnEstimate={columns} />
      </Form>
    );
  }
  const count = () => screen.getByLabelText(/^Number of footings/);

  it("isolated pads with no typed count default to the column count, and follow it while untouched", async () => {
    const { rerender } = renderWithStore(<Harness foundation={{ footingCount: null }} columns={20} />);
    await waitFor(() => expect(count()).toHaveValue("20"));
    expect(screen.getByText("One per column: about 20 for this frame.")).toBeInTheDocument();
    expect(screen.queryByTestId("footing-count-mismatch")).toBeNull();
    // the API's number arrives later: an untouched count follows it
    rerender(<Harness foundation={{ footingCount: null }} columns={22} />);
    await waitFor(() => expect(count()).toHaveValue("22"));
  });

  it("a typed count wins but the difference is explained", async () => {
    renderWithStore(<Harness foundation={{ footingCount: 28 }} columns={20} saved />);
    expect(count()).toHaveValue("28");
    expect(screen.getByTestId("footing-count-mismatch")).toHaveTextContent("You entered 28 footings, but the frame has 20 columns. Your number is used");
    const user = userEvent.setup();
    await user.clear(count());
    await user.type(count(), "20");
    expect(screen.queryByTestId("footing-count-mismatch")).toBeNull();
  });

  it("FOOTINGS_COLUMNS_MISMATCH is worded in all three languages", () => {
    const vars = { footings: 28, columns: 20 };
    expect(en("projects.estimate.warn.FOOTINGS_COLUMNS_MISMATCH", vars)).toBe(
      "28 footings are entered, but the frame has 20 columns. The number you entered is used; check it (usually one footing under each column).",
    );
    expect(roman("projects.estimate.warn.FOOTINGS_COLUMNS_MISMATCH", vars)).toContain("28 footings likhi hain");
    expect(ur("projects.estimate.warn.FOOTINGS_COLUMNS_MISMATCH", vars)).toContain("20 کالم");
  });
});

describe("QA B-19 / B-20 — termite and per-material wastage in the Assumptions dialog", () => {
  const PER_MATERIAL = { cementWastagePercent: 2, sandWastagePercent: 5, steelWastagePercent: 4, steelLapPercent: 4 };
  const withWastage = (settings: Partial<ProjectEstimate["settings"]> = {}, customised: Array<keyof ProjectEstimate["settings"]> = []): ProjectEstimate => ({
    ...estimateFixture({ ...PER_MATERIAL, ...settings }, customised),
    defaults: { ...ESTIMATE_DEFAULTS, ...PER_MATERIAL },
  });

  beforeEach(() => {
    api.save = vi.fn(() => ({ unwrap: () => Promise.resolve(withWastage()) }));
  });

  it("termite prints the value used (0.005 litre / sq ft) in the field, the default and the hint; nothing counts as changed", async () => {
    renderWithStore(<EstimateSettingsModal projectId="p1" estimate={withWastage()} canManage locked={false} onClose={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("tab", { name: "Foundation" }));
    const termite = screen.getByLabelText(/^Termite chemical/);
    expect(termite).toHaveValue("0.005");
    expect(screen.getByText("Per sq ft of the lowest-floor footprint (1 litre for 200 sq ft) · Default 0.005 litre / sq ft")).toBeInTheDocument();
    expect(screen.getByText("0 changed from the defaults")).toBeInTheDocument();
  });

  it("a project termite value counts once; typing the default back counts zero", async () => {
    renderWithStore(<EstimateSettingsModal projectId="p1" estimate={withWastage({ termiteLitrePerSqft: 0.01 }, ["termiteLitrePerSqft"])} canManage locked={false} onClose={vi.fn()} />);
    expect(screen.getByText("1 changed from the defaults")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Foundation" }));
    const termite = screen.getByLabelText(/^Termite chemical/);
    await user.clear(termite);
    await user.type(termite, "0.005");
    expect(screen.getByText("0 changed from the defaults")).toBeInTheDocument();
  });

  it("wastage per material: cement 2 %, sand & crush 5 %, bricks 5 %, steel 4 % + laps 4 %, other materials 5 %", async () => {
    renderWithStore(<EstimateSettingsModal projectId="p1" estimate={withWastage()} canManage locked={false} onClose={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("tab", { name: "Factors & labour" }));
    expect(screen.getByLabelText(/^Cement wastage/)).toHaveValue("2");
    expect(screen.getByLabelText(/^Sand & crush wastage/)).toHaveValue("5");
    expect(screen.getByLabelText(/^Bricks \/ blocks wastage/)).toHaveValue("5");
    expect(screen.getByLabelText(/^Steel wastage/)).toHaveValue("4");
    expect(screen.getByLabelText(/^Steel laps and hooks/)).toHaveValue("4");
    expect(screen.getByLabelText(/^Other materials wastage/)).toHaveValue("5");
    expect(screen.getByText(/^Waterproofing, bitumen, termite chemical, stone, girders, roof tiles/)).toBeInTheDocument();
    // no "all except bricks" wording anywhere
    expect(screen.queryByText(/except bricks/)).toBeNull();
    expect(en("projects.estimate.how.wastage")).toContain("cement 2 %");
  });

  it("the dialog opens from the wizard Estimate tab while the estimate is blocked (ROOMS_TOO_FEW)", async () => {
    api.estimate = {
      ...withWastage(),
      blockedBy: "ROOMS_TOO_FEW",
      warnings: [{ code: "ROOMS_TOO_FEW", message: "Rooms cover only 18%", blocking: true, tab: 5, params: { percent: 18, roomsAreaSqft: 623, coveredAreaSqft: 3400 } }],
    } satisfies ProjectEstimate;
    const project = { id: "p1", code: "MSB-2026-086", name: "QA Audit 10 Marla", status: "DRAFT", team: { pm: null, munshis: [] } } as unknown as ProjectDetail;
    const ctx: WizardContextValue = { projectId: "p1", project, locked: false, onSaved: vi.fn(), setFormState: vi.fn(), goTo: vi.fn() };
    renderWithStore(
      <WizardContext.Provider value={ctx}>
        <EstimateTab />
      </WizardContext.Provider>,
      { me: meFixture("THEKEDAR") },
    );
    expect(screen.getByTestId("estimate-blocked")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Assumptions" }));
    const dialog = await screen.findByTestId("estimate-settings");
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});

describe("QA B-32 — bar names and site words", () => {
  const bar = { bar: "#4", n: "4", mm: 12 };
  it("Roman Urdu / Urdu name bars by sooter; English stays plain with the inch size in the hint", () => {
    expect(roman("projects.foundation.barValue", bar)).toBe("12 mm (4 sooter)");
    expect(ur("projects.foundation.barValue", bar)).toBe("12 ملی میٹر (4 سوتر)");
    expect(en("projects.foundation.barValue", bar)).toBe("12 mm (#4)");
    expect(en("projects.foundation.barInch", { mm: 12, n: "4", inch: "½" })).toBe("12 mm (#4, about ½ inch)");
    expect(roman("estimates.material.steel12" as TranslationKey)).toBe("Sariya 12 mm (4 sooter)");
  });

  function Harness() {
    const form = useForm<{ foundation: FoundationFormValues; structureType: string }>({
      defaultValues: { structureType: "FRAMED", foundation: { ...FOUNDATION_DEFAULTS, type: "ISOLATED", footingCount: 12, footingLengthFt: 4, footingWidthFt: 4, footingThicknessIn: 12 } },
    });
    return (
      <Form form={form} onSubmit={() => {}}>
        <FoundationCard disabled={false} />
      </Form>
    );
  }

  it("the main bar shows its inch size; Roman Urdu shows the DPC and awwal / doum hints", () => {
    const { unmount } = renderWithStore(<Harness />);
    expect(screen.getByText("12 mm (#4, about ½ inch)")).toBeInTheDocument();
    expect(screen.queryByTestId("term-hints")).toBeNull();
    unmount();
    renderWithStore(<Harness />, { ui: { language: "roman-ur" } });
    expect(screen.getByText("12 mm (4 sooter, taqreeban ½ inch)")).toBeInTheDocument();
    const hints = screen.getByTestId("term-hints");
    expect(within(hints).getByText("DPC")).toBeInTheDocument();
    expect(within(hints).getByText("Awwal / doum eent")).toBeInTheDocument();
  });

  it("the lenter and chajja hints exist in Roman Urdu and Urdu", () => {
    expect(roman("projects.glossary.lenter.term")).toBe("Lenter");
    expect(roman("projects.glossary.chajja.term")).toBe("Chajja");
    expect(ur("projects.glossary.lenter.term")).toBe("لینٹر");
    expect(ur("projects.glossary.chajja.term")).toBe("چھجا");
  });
});

// ─── Items the tester could not re-test (company read-only) ───────────────────

describe("QA B-18 — switching the contract type keeps the data", () => {
  const stagesFor = (type: string, retention: number): StageValue[] =>
    type === "GREY_OWNER_FINISHING"
      ? fitStages([{ label: "Grey structure", percent: 95, isRetention: false }], retention, "Retention")
      : fitStages([{ label: "Grey", percent: 60, isRetention: false }, { label: "Finishing", percent: 35, isRetention: false }], retention, "Retention");
  const ctx = { retention: 5, stagesFor, labels: { running: "Running bills", retention: "Retention" } };
  const fullStages: StageValue[] = [
    { label: "Grey", percent: 60, isRetention: false },
    { label: "Finishing", percent: 35, isRetention: false },
    { label: "Retention", percent: 5, isRetention: true },
  ];

  it("the contract value and rate stay; switching back restores the old type's billing and stages", () => {
    const first = switchContract(
      { contractType: "FULL", contractValuePaisa: "1500000000", ratePerSqftPaisa: null, billingModel: "STAGE_SCHEDULE", stages: fullStages },
      "GREY_OWNER_FINISHING",
      "STAGE_SCHEDULE",
      {},
      ctx,
    );
    expect(first.values.contractValuePaisa).toBe("1500000000");
    expect(first.values.stages.map((s) => s.label)).toEqual(["Grey structure", "Retention"]);
    // the user changes the grey value, then goes back to FULL
    const back = switchContract({ contractType: "GREY_OWNER_FINISHING", ...first.values, contractValuePaisa: "1100000000" }, "FULL", "STAGE_SCHEDULE", first.memory, ctx);
    expect(back.values).toEqual({ contractValuePaisa: "1500000000", ratePerSqftPaisa: null, billingModel: "STAGE_SCHEDULE", stages: fullStages });
    expect(back.memory.GREY_OWNER_FINISHING?.contractValuePaisa).toBe("1100000000");
  });

  it("labour-only on running bills: one running stage + retention, the rate kept", () => {
    const r = switchContract(
      { contractType: "FULL", contractValuePaisa: "1500000000", ratePerSqftPaisa: "45000", billingModel: "STAGE_SCHEDULE", stages: fullStages },
      "LABOR_ONLY",
      "RUNNING_BILLS",
      {},
      ctx,
    );
    expect(r.values).toMatchObject({ ratePerSqftPaisa: "45000", contractValuePaisa: "1500000000", billingModel: "RUNNING_BILLS" });
    expect(r.values.stages).toEqual([
      { label: "Running bills", percent: 95, isRetention: false },
      { label: "Retention", percent: 5, isRetention: true },
    ]);
  });
});

describe("QA B-27 — negative input is refused with a message", () => {
  it("the coverage form refuses a negative covered / porch / open area", () => {
    const base = { coveredAreaSqft: 3400, semiCoveredSqft: 0, openAreaSqft: 0, boundaryWall: false, boundaryLengthFt: null, boundaryHeightFt: null, boundaryThickness: null, boundaryPlasterSides: null };
    expect(coverageSchema.safeParse(base).success).toBe(true);
    for (const bad of [{ coveredAreaSqft: -3400 }, { semiCoveredSqft: -250 }, { openAreaSqft: -1 }]) {
      const r = coverageSchema.safeParse({ ...base, ...bad });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0]?.path).toEqual([Object.keys(bad)[0]]);
    }
  });

  it("a minus typed into a form field stays visible with its message (no silent '-5' → '5')", async () => {
    function Harness() {
      const form = useForm<{ foundation: FoundationFormValues; structureType: string }>({ defaultValues: { structureType: "LOAD_BEARING", foundation: { ...FOUNDATION_DEFAULTS } } });
      return (
        <Form form={form} onSubmit={() => {}}>
          <FoundationCard disabled={false} saved />
        </Form>
      );
    }
    renderWithStore(<Harness />);
    const depth = screen.getByLabelText(/^Excavation depth/);
    const user = userEvent.setup();
    await user.clear(depth);
    await user.type(depth, "-5");
    expect(depth).toHaveValue("-5");
    expect(screen.getByText("Negative numbers are not allowed")).toBeInTheDocument();
  });
});

describe("QA B-29 — a fixed stage total clears the stale error", () => {
  const schema = z.object({
    stages: z
      .array(z.object({ label: z.string(), percent: z.number().nullable(), isRetention: z.boolean() }))
      .refine((rows) => rows.reduce((a, r) => a + (r.percent ?? 0), 0) === 100, "Stages add up to more or less than 100%"),
  });
  function Harness() {
    const form = useForm<{ stages: StageRow[] }>({
      resolver: zodResolver(schema),
      defaultValues: {
        stages: [
          { label: "Advance", percent: 140, isRetention: false },
          { label: "Grey", percent: 95, isRetention: false },
          { label: "Retention", percent: 5, isRetention: true },
        ],
      },
    });
    return (
      <Form form={form} onSubmit={() => {}}>
        <StageEditor name="stages" />
        <button type="submit">Save</button>
      </Form>
    );
  }

  it("240 % shows the error; once the rows total 100 % it is gone without saving again", async () => {
    renderWithStore(<Harness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Stages add up to more or less than 100%")).toBeInTheDocument();
    const advance = screen.getByRole("textbox", { name: "Stage 1 percent" });
    await user.clear(advance);
    await user.type(advance, "0");
    await waitFor(() => expect(screen.queryByText("Stages add up to more or less than 100%")).toBeNull());
  });
});

describe("QA B-31 — an empty floor copies the ground floor", () => {
  const ground = { id: "g", rooms: [{}, {}] };
  it("offers 'Copy from ground floor' on an empty upper floor, 'Copy floor' on a floor with rooms", () => {
    expect(copyAction({ id: "f1", rooms: [] }, ground, 2)).toBe("FROM_GROUND");
    expect(copyAction({ id: "f1", rooms: [{}] }, ground, 2)).toBe("COPY");
    expect(copyAction(ground, ground, 2)).toBe("COPY");
    expect(copyAction({ id: "g", rooms: [] }, { id: "g", rooms: [] }, 1)).toBe("NONE");
    expect(copyAction({ id: "f1", rooms: [] }, { id: "g", rooms: [] }, 2)).toBe("NONE");
    expect(en("projects.rooms.copyFromGround")).toBe("Copy from ground floor");
  });
});

describe("QA B-34 — plot size vs front × depth", () => {
  function Harness({ plotSize, frontFt, depthFt }: { plotSize: number; frontFt: number; depthFt: number }) {
    const form = useForm({ defaultValues: { plotUnit: "MARLA", plotSize, marlaStandard: "225", frontFt, depthFt } });
    return (
      <Form form={form} onSubmit={() => {}}>
        <PlotResult />
      </Form>
    );
  }

  it("warns above 2 % and says the plot size drives the estimate", () => {
    // 10 marla × 225 = 2,250 sq ft vs 35 × 65 = 2,275 (1.1 %): no warning
    expect(plotCalc({ plotUnit: "MARLA", plotSize: 10, marlaStandard: 225, frontFt: 35, depthFt: 65 }).plotAreaMismatch).toBe(false);
    const { unmount } = renderWithStore(<Harness plotSize={10} frontFt={35} depthFt={65} />);
    expect(screen.getByTestId("plot-drives")).toHaveTextContent("2,250");
    expect(screen.queryByTestId("plot-mismatch")).toBeNull();
    unmount();
    // 35 × 70 = 2,450 (8.9 % more): warning
    renderWithStore(<Harness plotSize={10} frontFt={35} depthFt={70} />);
    expect(screen.getByTestId("plot-mismatch")).toHaveTextContent(en("projects.plot.plotDiffer"));
  });
});

describe("QA B-25 — RCC steel footer: every RCC bar of the floor, lintels included", () => {
  it("adds the lintel bars to the roof's slab / beam / column bars; the label says RCC steel", () => {
    const e = estimateFixture();
    e.basis.floors = [
      {
        level: "GROUND",
        roof: { steelBySize: [{ bar: 4, mm: 12, kg: 900 }, { bar: 3, mm: 10, kg: 300 }] },
      } as unknown as ProjectEstimate["basis"]["floors"][number],
    ];
    e.stages = [
      {
        stage: "RCC",
        totals: [],
        lines: [{ kind: "MATERIAL", element: "lintels", floor: { level: "GROUND", name: "Ground floor" }, material: "steel10", netQuantity: 40.5 }],
      } as unknown as ProjectEstimate["stages"][number],
    ];
    expect(rccSteelBySize(e, "GROUND")).toEqual([
      { bar: 3, mm: 10, kg: 340.5 },
      { bar: 4, mm: 12, kg: 900 },
    ]);
    expect(en("projects.estimate.basis.steelBySize")).toBe("RCC steel by bar size");
    expect(en("projects.estimate.basis.steelBySize")).not.toMatch(/slab/i);
  });
});

describe("QA B-35 — a grey-structure contract starts from its own stages", () => {
  const tpl = (name: string, extra: Partial<PaymentTemplate>): PaymentTemplate =>
    ({ id: name, name, billingModel: "STAGE_SCHEDULE", isDefault: false, stages: [], updatedAt: "2026-10-01T00:00:00.000Z", ...extra }) as PaymentTemplate;
  const residential = tpl("Residential", {
    isDefault: true,
    stages: [
      { label: "Grey structure", percent: 60 },
      { label: "Finishing", percent: 35 },
      { label: "Retention", percent: 5, isRetention: true },
    ] as PaymentTemplate["stages"],
  });
  const grey = tpl("Grey structure only", {
    contractType: "GREY_OWNER_FINISHING",
    stages: [
      { label: "Foundation", percent: 25 },
      { label: "Ground floor slab", percent: 35 },
      { label: "First floor slab", percent: 35 },
      { label: "Retention", percent: 5, isRetention: true },
    ] as PaymentTemplate["stages"],
  });

  it("GREY_OWNER_FINISHING gets the grey template (no finishing stage); FULL keeps the company default", () => {
    const greyStages = fitStages(templateStages(defaultTemplateFor([residential, grey], "GREY_OWNER_FINISHING")!), 5, "Retention");
    expect(greyStages.map((s) => s.label)).toEqual(["Foundation", "Ground floor slab", "First floor slab", "Retention"]);
    expect(greyStages.some((s) => /finish/i.test(s.label))).toBe(false);
    expect(defaultTemplateFor([residential, grey], "FULL")?.name).toBe("Residential");
    // fitted to a 3 % retention: the gap goes to the last non-retention stage
    expect(fitStages(templateStages(grey), 3, "Retention").map((s) => s.percent)).toEqual([25, 35, 37, 3]);
  });
});
