import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EstimateLine, FloorWithRooms, ProjectEstimate, Room, StructureType } from "@/api/types";
import { Form } from "@/components/forms/Form";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EstimateBasis, EstimateKpis, EstimateStageSection } from "@/features/projects/estimate/EstimateView";
import { ROOF_DEFAULTS, roofToBody, roofToForm, roofWarnings, suggestSlab, type RoofFormValues } from "@/features/projects/utils/roof";
import { RoofCard } from "@/features/projects/wizard/RoofCard";
import { RoomCard } from "@/features/projects/wizard/RoomCard";
import { externalRows, rowsToBody } from "@/features/projects/wizard/RoomWalls";
import { roofSchema } from "@/features/projects/wizard/schemas";
import { estimateFixture } from "../estimateFixture";
import { renderWithStore } from "../render";

const api = vi.hoisted(() => ({
  setWalls: vi.fn(),
  updateRoom: vi.fn(),
  createRoom: vi.fn(),
  other: vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
}));
vi.mock("@/api/services/projects.api", () => ({
  useSetRoomWallsMutation: () => [api.setWalls, { isLoading: false }],
  useUpdateRoomMutation: () => [api.updateRoom, { isLoading: false }],
  useCreateRoomMutation: () => [api.createRoom, { isLoading: false }],
  useDeleteRoomMutation: () => [api.other, { isLoading: false }],
  useCreateOpeningMutation: () => [api.other, { isLoading: false }],
  useUpdateOpeningMutation: () => [api.other, { isLoading: false }],
  useDeleteOpeningMutation: () => [api.other, { isLoading: false }],
  useGetEstimateQuery: () => ({ data: undefined, isLoading: true }),
}));

// ─── Roof card ──────────────────────────────────────────────────────────────

function RoofHarness({ roof, structure = "LOAD_BEARING", span = 12 }: { roof: Partial<RoofFormValues>; structure?: StructureType; span?: number | null }) {
  const form = useForm<{ floors: Array<{ level: "GROUND"; ceilingHeightFt: number; roof: RoofFormValues }> }>({
    defaultValues: { floors: [{ level: "GROUND", ceilingHeightFt: 10, roof: { ...ROOF_DEFAULTS, ...roof } }] },
  });
  return (
    <Form form={form} onSubmit={() => {}}>
      <RoofCard index={0} level="GROUND" suggestion={suggestSlab(span)} structure={structure} disabled={false} />
    </Form>
  );
}
const field = (name: RegExp) => screen.queryByLabelText(name);

describe("RoofCard (wizard tab 3)", () => {
  it("is off until switched on; then shows the RCC lenter defaults (5″, #4 @ 6″, #3 @ 9″) and the span suggestion", async () => {
    renderWithStore(<RoofHarness roof={{}} />);
    expect(screen.getByText("Roof / Lenter — Ground floor")).toBeInTheDocument();
    expect(field(/^Slab thickness/)).toBeNull();
    await userEvent.setup().click(screen.getByRole("switch", { name: /Enter roof details/ }));
    expect(field(/^Slab thickness/)).toHaveValue("5");
    expect(field(/^Main bar spacing/)).toHaveValue("6");
    expect(field(/^Distribution bar spacing/)).toHaveValue("9");
    expect(screen.getAllByText("#4 (12 mm)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("#3 (10 mm)").length).toBeGreaterThan(0);
    expect(screen.getByTestId("roof-suggestion")).toHaveTextContent("Suggested: 4.5–5″ for the largest room span of 12 ft");
    expect(screen.queryByTestId("roof-warnings")).toBeNull();
    // Load-bearing: no beams / columns
    expect(screen.queryByTestId("roof-frame")).toBeNull();
  });

  it("warns when the slab is too thin for the span and the bars are too far apart", async () => {
    renderWithStore(<RoofHarness roof={{ enabled: true, thicknessIn: 4.5, mainSpacingIn: 10 }} span={16} />);
    const warnings = screen.getByTestId("roof-warnings");
    expect(within(warnings).getByText("4.5″ is thin for a 16 ft span — 6″ suggested.")).toBeInTheDocument();
    expect(within(warnings).getByText(/Main bars are too far apart — keep them at most 9″ apart/)).toBeInTheDocument();
    expect(screen.getByTestId("roof-suggestion")).toHaveTextContent("Suggested: 6″ for the largest room span of 16 ft");
  });

  it("shows the fields of the roof type: garders for T-iron, topping for a deck; beams and columns for an RCC frame", () => {
    const { unmount } = renderWithStore(<RoofHarness roof={{ enabled: true, type: "T_IRON_TILE" }} />);
    expect(field(/^Garder spacing/)).toHaveValue("3");
    expect(field(/^Earth filling/)).toHaveValue("4");
    expect(field(/^Slab thickness/)).toBeNull();
    expect(field(/^Main bar spacing/)).toBeNull();
    unmount();
    const deck = renderWithStore(<RoofHarness roof={{ enabled: true, type: "STEEL_DECK" }} />);
    expect(field(/^Deck sheet area/)).toBeInTheDocument();
    expect(field(/^Concrete topping/)).toBeInTheDocument();
    deck.unmount();
    renderWithStore(<RoofHarness roof={{ enabled: true }} structure="FRAMED" />);
    expect(screen.getByTestId("roof-frame")).toBeInTheDocument();
    expect(field(/^Beam width/)).toHaveValue("9");
    expect(field(/^Beam depth/)).toHaveValue("15");
    expect(field(/^Column width/)).toHaveValue("12");
  });

  it("renders in Urdu", () => {
    renderWithStore(<RoofHarness roof={{ enabled: true }} />, { ui: { language: "ur" } });
    expect(screen.getByText("چھت / لینٹر — گراؤنڈ فلور", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("سلیب کی موٹائی", { exact: false })).toBeInTheDocument();
  });
});

describe("roof form rules", () => {
  it("body: null when off; only the type's fields; frame fields only for an RCC frame", () => {
    expect(roofToBody(ROOF_DEFAULTS, "FRAMED")).toBeNull();
    const rcc = roofToBody({ ...ROOF_DEFAULTS, enabled: true }, "LOAD_BEARING")!;
    expect(rcc).toEqual({ type: "RCC_SLAB", concreteMix: "1:2:4", steelGrade: "G60", thicknessIn: 5, mainBar: 4, mainSpacingIn: 6, distBar: 3, distSpacingIn: 9, topBars: true, coverIn: 0.75, chajjaLengthFt: null, chajjaWidthFt: null });
    const tIron = roofToBody({ ...ROOF_DEFAULTS, enabled: true, type: "T_IRON_TILE" }, "FRAMED")!;
    expect(tIron).toMatchObject({ type: "T_IRON_TILE", tIronSection: "G5X3", tIronSpacingFt: 3, infill: "BRICK", beamWidthIn: 9, columnBars: 6, columnBar: 5 });
    expect(tIron).not.toHaveProperty("mainBar");
    expect(roofToForm(null)).toEqual(ROOF_DEFAULTS);
  });

  it("schema: ranges only while on; soft warnings mirror the API", () => {
    const paths = (v: Partial<RoofFormValues>) => {
      const r = roofSchema.safeParse({ ...ROOF_DEFAULTS, ...v });
      return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
    };
    expect(paths({ mainSpacingIn: 2 })).toEqual([]);
    expect(paths({ enabled: true })).toEqual([]);
    expect(paths({ enabled: true, mainSpacingIn: 2, thicknessIn: 13 })).toEqual(expect.arrayContaining(["mainSpacingIn", "thicknessIn"]));
    expect(paths({ enabled: true, thicknessIn: 8, beamDepthIn: 9, beamWidthIn: 9 })).toEqual([]);
    expect(roofWarnings({ type: "RCC_SLAB", thicknessIn: 5, mainSpacingIn: 6, distSpacingIn: 9 }, suggestSlab(20)).map((w) => w.code)).toEqual(["TOO_THIN", "NEEDS_BEAM"]);
  });
});

// ─── Walls in the room card ─────────────────────────────────────────────────

const room = (id: string, name: string, over: Partial<Room> = {}): Room => ({
  id,
  floorId: "f1",
  type: "BEDROOM",
  name,
  lengthFt: 12,
  widthFt: 10,
  heightFt: 10,
  isWet: false,
  isWetOverridden: false,
  sortOrder: 1,
  openings: [],
  walls: null,
  calculations: { floorAreaSqft: 120, grossWallAreaSqft: 440, openingsAreaSqft: 0, netWallAreaSqft: 440 },
  ...over,
});
const sharedA: Room["walls"] = [
  { side: "TOP", type: "EXTERNAL", thicknessIn: 9, innerLeafIn: null, cavityIn: null, sharedWithRoomId: null, sharedWithSide: null, existing: false },
  { side: "RIGHT", type: "SHARED", thicknessIn: 4.5, innerLeafIn: null, cavityIn: null, sharedWithRoomId: "b", sharedWithSide: "LEFT", existing: false },
  { side: "BOTTOM", type: "EXTERNAL", thicknessIn: 9, innerLeafIn: null, cavityIn: null, sharedWithRoomId: null, sharedWithSide: null, existing: false },
  { side: "LEFT", type: "PARTY", thicknessIn: 9, innerLeafIn: null, cavityIn: null, sharedWithRoomId: null, sharedWithSide: null, existing: false },
];
const floorWith = (rooms: Room[]): FloorWithRooms => ({
  id: "f1",
  level: "GROUND",
  name: "Ground floor",
  ceilingHeightFt: 10,
  sortOrder: 2,
  calculations: { rooms: rooms.length, totalFloorAreaSqft: 240, netWallAreaSqft: 880, wetRooms: 0 },
  rooms,
});

describe("walls section of the room card", () => {
  beforeEach(() => {
    api.setWalls.mockReset();
    api.setWalls.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }));
  });

  it("not entered → 'Set walls' gives four external 9″ sides with lengths and a diagram", async () => {
    const a = room("a", "Bedroom");
    renderWithStore(<RoomCard projectId="p1" floor={floorWith([a, room("b", "Bedroom 2")])} room={a} structure="FRAMED" disabled={false} />);
    expect(screen.getByText("Walls not entered — the estimate works them out from the room sizes.")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Set walls" }));
    const section = screen.getByTestId("walls-section");
    expect(within(section).getAllByRole("combobox", { name: /wall type$/ })).toHaveLength(4);
    expect(within(section).getByText("Top")).toBeInTheDocument();
    expect(within(section).getAllByText("12 ft")).toHaveLength(2); // TOP / BOTTOM = length
    expect(within(section).getAllByText("10 ft")).toHaveLength(2); // LEFT / RIGHT = width
    const diagram = screen.getByTestId("walls-diagram");
    expect(diagram.querySelectorAll('line[data-type="EXTERNAL"]')).toHaveLength(4);
  });

  it("a shared side shows the room it is shared with; a party side the 'already built' switch; save sends the four sides", async () => {
    const a = room("a", "Bedroom", { walls: sharedA });
    const b = room("b", "Bedroom 2");
    renderWithStore(<RoomCard projectId="p1" floor={floorWith([a, b])} room={a} structure="FRAMED" disabled={false} />);
    const shared = screen.getByRole("combobox", { name: "Right wall shared with" });
    expect(shared).toHaveTextContent("Bedroom 2");
    expect(screen.getByTestId("walls-diagram").querySelector('line[data-side="RIGHT"]')).toHaveAttribute("data-type", "SHARED");
    expect(screen.getByText(/the other room's matching wall is set to shared too/)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("switch", { name: "Left party wall already built" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.setWalls).toHaveBeenCalledTimes(1));
    expect(api.setWalls.mock.calls[0]![0]).toEqual({
      projectId: "p1",
      roomId: "a",
      body: {
        walls: [
          { side: "TOP", type: "EXTERNAL", thicknessIn: 9 },
          { side: "RIGHT", type: "SHARED", thicknessIn: 4.5, sharedWithRoomId: "b" },
          { side: "BOTTOM", type: "EXTERNAL", thicknessIn: 9 },
          { side: "LEFT", type: "PARTY", thicknessIn: 9, existing: true },
        ],
      },
    });
  });

  it("choosing SHARED lists the other rooms of the floor", async () => {
    const a = room("a", "Bedroom", { walls: sharedA.map((w) => (w.side === "RIGHT" ? { ...w, type: "EXTERNAL" as const, thicknessIn: 9, sharedWithRoomId: null, sharedWithSide: null } : w)) });
    renderWithStore(<RoomCard projectId="p1" floor={floorWith([a, room("b", "Kitchen")])} room={a} structure="FRAMED" disabled={false} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: "Right wall type" }));
    await user.click(await screen.findByRole("option", { name: "Shared with a room" }));
    // Frame → shared walls default to 4.5″
    expect(screen.getByRole("combobox", { name: "Right wall thickness" })).toHaveTextContent("4.5″");
    await user.click(screen.getByRole("combobox", { name: "Right wall shared with" }));
    expect(await screen.findByRole("option", { name: "Kitchen" })).toBeInTheDocument();
  });

  it("rows → body helpers", () => {
    expect(rowsToBody(externalRows())).toEqual([
      { side: "TOP", type: "EXTERNAL", thicknessIn: 9 },
      { side: "RIGHT", type: "EXTERNAL", thicknessIn: 9 },
      { side: "BOTTOM", type: "EXTERNAL", thicknessIn: 9 },
      { side: "LEFT", type: "EXTERNAL", thicknessIn: 9 },
    ]);
    expect(rowsToBody([{ side: "TOP", type: "DOUBLE", thicknessIn: 9, innerLeafIn: null, cavityIn: null, sharedWithRoomId: null, existing: false }])).toEqual([
      { side: "TOP", type: "DOUBLE", thicknessIn: 9, innerLeafIn: 4.5, cavityIn: 2 },
    ]);
  });
});

// ─── Estimate: steel by size + method ───────────────────────────────────────

const steel12: EstimateLine = {
  id: "RCC.GROUND.slab.steel12",
  stage: "RCC",
  floor: { level: "GROUND", name: "Ground floor" },
  element: "slab",
  kind: "MATERIAL",
  measure: null,
  material: "steel12",
  netQuantity: 139.53,
  wastagePercent: 5,
  quantity: 146.51,
  unit: "kg",
  formula: { key: "bars", params: { bar: 4, mm: 12, count: 63, length: 515, kgPerFt: 0.2709 } },
  formulaText: "#4 (12 mm): 63 bars, 515 ft × 0.2709 kg/ft",
  method: "DETAILED",
  suppliedBy: "CONTRACTOR",
};
const slabWork: EstimateLine = {
  ...steel12,
  id: "RCC.GROUND.slab.volume",
  kind: "WORK",
  measure: "VOLUME",
  material: null,
  netQuantity: 75,
  wastagePercent: 0,
  quantity: 75,
  unit: "cft",
  formula: { key: "slabDetailed", params: { area: 180, thicknessIn: 5, spanFt: 12 } },
  formulaText: "",
};
const detailed = (): ProjectEstimate => {
  const e = estimateFixture();
  return {
    ...e,
    basis: {
      ...e.basis,
      methods: { walls: "ESTIMATED", roof: "DETAILED" },
      floors: [
        {
          level: "GROUND",
          name: "Ground floor",
          heightFt: 10,
          rooms: 1,
          roomAreaSqft: 180,
          footprintSqft: 180,
          roomPerimeterFt: 54,
          externalWallFt: 54,
          internalWallFt: 0,
          doorsSqft: 0,
          windowsSqft: 0,
          wallsMethod: "ESTIMATED",
          roofMethod: "DETAILED",
          walls: {
            partyWallFt: 0,
            partyExistingFt: 10,
            openFt: 0,
            builtRunFt: 78,
            byThickness: [
              { thicknessIn: 4.5, lengthFt: 10, areaSqft: 100, volumeCft: 37.5, bricks: 506.25 },
              { thicknessIn: 9, lengthFt: 68, areaSqft: 680, volumeCft: 510, bricks: 6885 },
            ],
          },
          roof: {
            type: "RCC_SLAB",
            thicknessIn: 5,
            largestSpanFt: 12,
            steelBySize: [
              { bar: 3, mm: 10, kg: 51.18 },
              { bar: 4, mm: 12, kg: 139.53 },
            ],
            bars: [],
            beamRunFt: null,
            columnCount: null,
            columnCountAuto: false,
          },
        },
      ],
    },
    stages: [{ stage: "RCC", lines: [slabWork, steel12], totals: [{ material: "steel12", quantity: 146.51 }] }],
    materials: [
      { material: "steel10", unit: "kg", netQuantity: 51.18, quantity: 53.74, suppliedBy: "CONTRACTOR", materialId: null, materialName: "Steel Grade-60 #3" },
      { material: "steel12", unit: "kg", netQuantity: 139.53, quantity: 146.51, suppliedBy: "CONTRACTOR", materialId: null, materialName: "Steel Grade-60 #4" },
    ],
  };
};

describe("estimate with roof / wall data", () => {
  it("steel KPI adds every bar size and lists them; materials and stage totals name the size", () => {
    const e = detailed();
    const { unmount } = renderWithStore(<EstimateKpis estimate={e} />);
    // 53.74 + 146.51 = 200.25 kg → 0.2 tons
    expect(screen.getByText("0.2 tons")).toBeInTheDocument();
    expect(screen.getByText("#3: 54 kg · #4: 147 kg")).toBeInTheDocument();
    unmount();
    renderWithStore(
      <TooltipProvider>
        <EstimateStageSection stage={e.stages[0]!} money={false} hasFoundation />
      </TooltipProvider>,
    );
    expect(screen.getAllByText("Steel #4 (12 mm)").length).toBeGreaterThan(0);
    const badge = screen.getByText("Detailed");
    expect(badge.closest("[data-method]")).toHaveAttribute("data-method", "DETAILED");
  });

  it("basis shows the method per floor, brickwork by thickness and slab steel by size (en + ur)", async () => {
    const { unmount } = renderWithStore(<EstimateBasis estimate={detailed()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /What the estimate is based on/ }));
    expect(screen.getByTestId("steel-by-size")).toHaveTextContent("#3 (10 mm): 51.18 kg");
    expect(screen.getByTestId("steel-by-size")).toHaveTextContent("#4 (12 mm): 139.53 kg");
    expect(screen.getByText("4.5″ walls: 37.5 cft · 507 bricks")).toBeInTheDocument();
    expect(screen.getAllByText("Estimated").length).toBeGreaterThan(0);
    unmount();
    renderWithStore(<EstimateBasis estimate={detailed()} />, { ui: { language: "ur" } });
    await userEvent.setup().click(screen.getAllByRole("button")[0]!);
    expect(screen.getByTestId("steel-by-size")).toHaveTextContent("#4 (12 ملی میٹر): 139.53 کلو");
    expect(screen.getAllByText("تفصیلی").length).toBeGreaterThan(0);
  });
});
