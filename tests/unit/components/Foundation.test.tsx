import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import type { ProjectFoundation } from "@/api/types";
import { Form } from "@/components/forms/Form";
import { FoundationSummary } from "@/features/projects/components/FoundationSummary";
import {
  FOUNDATION_DEFAULTS,
  type FoundationFormValues,
  foundationToBody,
  foundationToForm,
} from "@/features/projects/utils/foundation";
import { FoundationCard } from "@/features/projects/wizard/FoundationCard";
import { foundationSchema } from "@/features/projects/wizard/schemas";
import { renderWithStore } from "../render";

function Harness({ foundation, disabled = false }: { foundation: Partial<FoundationFormValues>; disabled?: boolean }) {
  const form = useForm<{ foundation: FoundationFormValues }>({ defaultValues: { foundation: { ...FOUNDATION_DEFAULTS, ...foundation } } });
  return (
    <Form form={form} onSubmit={() => {}}>
      <FoundationCard disabled={disabled} />
    </Form>
  );
}

const field = (name: RegExp) => screen.queryByLabelText(name);

describe("FoundationCard (wizard tab 3)", () => {
  it("starts from the Pakistani defaults: brick strip footing 5 ft deep, 3 ft wide, 9 in thick, 2 ft plinth, 1.5 in DPC", () => {
    renderWithStore(<Harness foundation={{}} />);
    expect(screen.getByText("Foundation (Bunyaad)")).toBeInTheDocument();
    expect(field(/^Excavation depth/)).toHaveValue("5");
    expect(field(/^Footing width/)).toHaveValue("3");
    expect(field(/^Footing thickness/)).toHaveValue("9");
    expect(field(/^Plinth height above ground/)).toHaveValue("2");
    expect(field(/^DPC thickness/)).toHaveValue("1.5");
    expect(field(/^PCC thickness/)).toHaveValue("3");
    expect(screen.getByRole("switch", { name: /Termite \(deemak\) treatment/ })).toBeChecked();
    expect(screen.getByText("Patti under the walls — common for load-bearing brick houses.")).toBeInTheDocument();
    // Strip in brick: no pads, no piles, no RCC
    expect(field(/^Number of footings/)).toBeNull();
    expect(field(/^Number of piles/)).toBeNull();
    expect(screen.queryByText("RCC mix")).toBeNull();
    expect(field(/^Soil test note/)).toBeNull();
  });

  it("isolated / combined footings ask for count and L × W plus RCC mix and main steel", () => {
    renderWithStore(<Harness foundation={{ type: "ISOLATED", footingThicknessIn: 12 }} />);
    expect(field(/^Number of footings/)).toBeInTheDocument();
    expect(field(/^Footing size — length/)).toBeInTheDocument();
    expect(field(/^Footing size — width/)).toBeInTheDocument();
    expect(field(/^Footing width$/)).toBeNull();
    expect(screen.getByText("RCC mix")).toBeInTheDocument();
    expect(screen.getByText("Main steel bar")).toBeInTheDocument();
    expect(screen.getAllByText("#4 (12 mm)").length).toBeGreaterThan(0);
    expect(field(/^Number of piles/)).toBeNull();
  });

  it("raft has no footing width / pads / piles but RCC; pile asks for count, diameter and depth", () => {
    const { unmount } = renderWithStore(<Harness foundation={{ type: "RAFT", masonry: "RCC_ONLY", footingThicknessIn: 12 }} />);
    expect(field(/^Footing width/)).toBeNull();
    expect(field(/^Number of footings/)).toBeNull();
    expect(field(/^Number of piles/)).toBeNull();
    expect(screen.getByText("RCC mix")).toBeInTheDocument();
    unmount();

    renderWithStore(<Harness foundation={{ type: "PILE" }} />);
    expect(field(/^Number of piles/)).toBeInTheDocument();
    expect(field(/^Pile diameter/)).toBeInTheDocument();
    expect(field(/^Pile depth/)).toBeInTheDocument();
    expect(field(/^Footing width/)).toBeNull();
  });

  it("a strip footing in RCC only needs the RCC mix and steel", () => {
    renderWithStore(<Harness foundation={{ masonry: "RCC_ONLY" }} />);
    expect(screen.getByText("RCC mix")).toBeInTheDocument();
    expect(field(/^Footing width/)).toBeInTheDocument();
  });

  it("the soil test note appears once the soil test is ticked; locked projects are read-only", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithStore(<Harness foundation={{}} />);
    expect(field(/^Soil test note/)).toBeNull();
    await user.click(screen.getByRole("switch", { name: /Soil test done/ }));
    expect(field(/^Soil test note/)).toBeInTheDocument();
    unmount();

    renderWithStore(<Harness foundation={{}} disabled />);
    expect(field(/^Excavation depth/)).toBeDisabled();
    expect(screen.getByRole("switch", { name: /Termite/ })).toBeDisabled();
  });

  it("renders in Urdu and Roman Urdu", () => {
    const { unmount } = renderWithStore(<Harness foundation={{ type: "ISOLATED" }} />, { ui: { language: "ur" } });
    expect(screen.getByText("بنیاد")).toBeInTheDocument();
    expect(screen.getByText("کھدائی کی گہرائی", { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText("#4 (12 ملی میٹر)").length).toBeGreaterThan(0);
    unmount();
    renderWithStore(<Harness foundation={{}} />, { ui: { language: "roman-ur" } });
    expect(screen.getByText("Bunyaad (Foundation)")).toBeInTheDocument();
    expect(screen.getByText("Khudai ki gehrai", { exact: false })).toBeInTheDocument();
  });
});

describe("foundation schema and body", () => {
  const errorPaths = (v: Partial<FoundationFormValues>) => {
    const r = foundationSchema.safeParse({ ...FOUNDATION_DEFAULTS, ...v });
    return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
  };

  it("accepts the defaults and checks the realistic ranges", () => {
    expect(errorPaths({})).toEqual([]);
    expect(errorPaths({ excavationDepthFt: 31, plinthHeightFt: 7, footingThicknessIn: 2, dpcThicknessIn: null })).toEqual(
      expect.arrayContaining(["excavationDepthFt", "plinthHeightFt", "footingThicknessIn", "dpcThicknessIn"]),
    );
    expect(errorPaths({ excavationDepthFt: 1, footingThicknessIn: 12 })).toContain("excavationDepthFt");
  });

  it("requires the type-specific fields only for their type", () => {
    expect(errorPaths({ type: "ISOLATED" })).toEqual(expect.arrayContaining(["footingCount", "footingLengthFt"]));
    expect(errorPaths({ type: "PILE" })).toEqual(expect.arrayContaining(["pileCount", "pileDiameterIn", "pileDepthFt"]));
    expect(errorPaths({ type: "RAFT", footingWidthFt: null })).toEqual([]);
    expect(errorPaths({ type: "STRIP", footingWidthFt: null })).toContain("footingWidthFt");
    expect(errorPaths({ type: "ISOLATED", footingCount: 2.5, footingLengthFt: 5 })).toContain("footingCount");
  });

  it("sends only the fields that apply to the type", () => {
    const strip = foundationToBody({ ...FOUNDATION_DEFAULTS, pileCount: 5, footingCount: 3, soilTestNote: "x" });
    expect(strip).toMatchObject({ type: "STRIP", footingWidthFt: 3, footingThicknessIn: 9, pccMix: "1:4:8", termiteTreatment: true, dpcMaterial: "PCC_WATERPROOF", soilType: "MEDIUM" });
    expect(strip).not.toHaveProperty("pileCount");
    expect(strip).not.toHaveProperty("footingCount");
    expect(strip).not.toHaveProperty("rccMix");
    expect(strip).not.toHaveProperty("mainBarMm");
    expect(strip).not.toHaveProperty("soilTestNote");

    const isolated = foundationToBody({ ...FOUNDATION_DEFAULTS, type: "ISOLATED", footingCount: 12, footingLengthFt: 5, footingWidthFt: 5, mainBarMm: "16" });
    expect(isolated).toMatchObject({ footingCount: 12, footingLengthFt: 5, footingWidthFt: 5, rccMix: "1:2:4", mainBarMm: 16 });

    const raft = foundationToBody({ ...FOUNDATION_DEFAULTS, type: "RAFT", soilTestDone: true, soilTestNote: " SBC 1.2 tsf ", soilType: null });
    expect(raft).not.toHaveProperty("footingWidthFt");
    expect(raft).not.toHaveProperty("soilType");
    expect(raft).toMatchObject({ rccMix: "1:2:4", mainBarMm: 12, soilTestNote: "SBC 1.2 tsf" });
  });

  it("an older project without a foundation opens with the defaults", () => {
    expect(foundationToForm(null)).toEqual(FOUNDATION_DEFAULTS);
    expect(foundationToForm(undefined).type).toBe("STRIP");
  });
});

describe("FoundationSummary", () => {
  const saved: ProjectFoundation = {
    type: "ISOLATED",
    excavationDepthFt: 6,
    footingWidthFt: 5,
    footingThicknessIn: 12,
    plinthHeightFt: 2,
    dpcThicknessIn: 1.5,
    footingCount: 12,
    footingLengthFt: 5,
    pileCount: null,
    pileDiameterIn: null,
    pileDepthFt: null,
    masonry: "BRICK",
    pccMix: "1:4:8",
    pccThicknessIn: 3,
    rccMix: "1:2:4",
    mainBarMm: 12,
    termiteTreatment: true,
    dpcMaterial: "PCC_WATERPROOF",
    soilType: "MEDIUM",
    waterTableDepthFt: null,
    dewateringNeeded: false,
    soilTestDone: false,
    soilTestNote: null,
    notes: null,
  };

  it("lists the saved foundation, or says it is not entered yet", () => {
    const { unmount } = renderWithStore(<FoundationSummary foundation={saved} />);
    expect(screen.getByText("Isolated (column footing)")).toBeInTheDocument();
    expect(screen.getByText("12 × (5 × 5 ft)")).toBeInTheDocument();
    expect(screen.getByText("1:2:4 · #4 (12 mm)")).toBeInTheDocument();
    expect(screen.queryByText("Piles")).toBeNull();
    unmount();
    renderWithStore(<FoundationSummary foundation={null} />);
    expect(screen.getByText("Not entered yet")).toBeInTheDocument();
  });
});
