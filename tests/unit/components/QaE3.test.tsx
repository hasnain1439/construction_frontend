import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { PaymentTemplate } from "@/api/types";
import { NumberInput } from "@/components/forms/NumberField";
import { fmt } from "@/features/estimates/labels";
import { rateSource, visibleLinesPaisa } from "@/features/projects/estimate/overrides";
import { defaultTemplateFor, fitStages, runningStages, withRetention } from "@/features/projects/wizard/contractStages";
import { boundaryLengthDefault, plotFit } from "@/features/projects/wizard/CoverageTab";
import { overwrittenWall, pairTarget, type PairRoom } from "@/features/projects/wizard/RoomWalls";
import { estimateColumnCount, foundationDefaultsFor, foundationToForm } from "@/features/projects/utils/foundation";
import { renderWithStore } from "../render";

const stage = (label: string, percent: number, isRetention = false) => ({ label, percent, isRetention });

describe("QA B-08 — the retention stage follows the retention %", () => {
  it("sets, adds and removes the retention row", () => {
    expect(withRetention([stage("A", 97), stage("R", 5, true)], 3, "Retention")).toEqual([stage("A", 97), stage("R", 3, true)]);
    expect(withRetention([stage("A", 97)], 3, "Retention")).toEqual([stage("A", 97), stage("Retention", 3, true)]);
    expect(withRetention([stage("A", 100), stage("R", 5, true)], 0, "Retention")).toEqual([stage("A", 100)]);
  });
  it("a template is fitted: the difference goes to its last non-retention stage", () => {
    expect(fitStages([stage("A", 50), stage("B", 45), stage("R", 5, true)], 2, "Retention")).toEqual([stage("A", 50), stage("B", 48), stage("R", 2, true)]);
  });
  it("running bills are one running stage + the retention", () => {
    expect(runningStages(5, "Running", "Retention")).toEqual([stage("Running", 95), stage("Retention", 5, true)]);
  });
});

describe("QA B-35 — default stages per contract type", () => {
  const tpl = (name: string, extra: Partial<PaymentTemplate>): PaymentTemplate =>
    ({ id: name, name, billingModel: "STAGE_SCHEDULE", isDefault: false, stages: [], updatedAt: "2026-10-01T00:00:00.000Z", ...extra }) as PaymentTemplate;
  const list = [tpl("Standard", { isDefault: true }), tpl("Grey", { contractType: "GREY_OWNER_FINISHING" })];
  it("uses the template made for the type, else the company default", () => {
    expect(defaultTemplateFor(list, "GREY_OWNER_FINISHING")?.name).toBe("Grey");
    expect(defaultTemplateFor(list, "FULL")?.name).toBe("Standard");
  });
});

describe("QA B-27 — number inputs never drop a minus silently", () => {
  function Harness({ min, max }: { min?: number; max?: number }) {
    const [v, setV] = useState<number | null>(15);
    return <NumberInput aria-label="Height" value={v} onChange={setV} unit="ft" min={min} max={max} />;
  }
  it("a typed minus stays and says negatives are not allowed", async () => {
    const user = userEvent.setup();
    renderWithStore(<Harness />);
    const input = screen.getByRole("textbox", { name: "Height" });
    await user.clear(input);
    await user.type(input, "-5");
    expect(input).toHaveValue("-5");
    expect(screen.getByTestId("number-input-message")).toHaveTextContent("Negative numbers are not allowed");
  });
  it("bounds show their own message with the unit", async () => {
    const user = userEvent.setup();
    renderWithStore(<Harness min={7} max={30} />);
    const input = screen.getByRole("textbox", { name: "Height" });
    await user.clear(input);
    await user.type(input, "5");
    expect(screen.getByTestId("number-input-message")).toHaveTextContent("Must be at least 7 ft");
    await user.clear(input);
    await user.type(input, "45");
    expect(screen.getByTestId("number-input-message")).toHaveTextContent("Must be at most 30 ft");
  });
});

describe("QA B-04 / B-22 — footings follow the structure", () => {
  it("FRAMED → isolated pads (one per column, L = W); LOAD_BEARING → strip", () => {
    const framed = foundationDefaultsFor("FRAMED", 12);
    expect(framed).toMatchObject({ type: "ISOLATED", footingCount: 12, footingLengthFt: 4, footingWidthFt: 4 });
    expect(foundationDefaultsFor("LOAD_BEARING", 12).type).toBe("STRIP");
    expect(foundationToForm(null, "FRAMED", 9).type).toBe("ISOLATED");
  });
  it("columns on a 15 ft grid over the footprint", () => {
    // 30 × 60 ft: (2 + 1) × (4 + 1) = 15
    expect(estimateColumnCount(1800, 30, 60)).toBe(15);
    expect(estimateColumnCount(null)).toBeNull();
  });
});

describe("QA B-24 / B-30 — coverage", () => {
  it("only the ground footprint + porch + open area has to fit on the plot", () => {
    // 2 floors × 1,000 sq ft on a 1,125 sq ft plot: fits
    expect(plotFit({ coveredSqft: 2000, semiSqft: 50, openSqft: 50, plotSqft: 1125, storeys: 2 })).toMatchObject({ footprint: 1000, onPlot: 1100, overflow: false });
    expect(plotFit({ coveredSqft: 2400, semiSqft: 0, openSqft: 0, plotSqft: 1125, storeys: 2 }).overflow).toBe(true);
  });
  it("boundary length = 2 × (front + depth) − 12 ft gate", () => {
    expect(boundaryLengthDefault(25, 45)).toBe(128);
    expect(boundaryLengthDefault(null, 45)).toBeNull();
  });
});

describe("QA B-23 — pairing asks before overwriting the other room's wall", () => {
  const partner = (walls: PairRoom["walls"]): PairRoom => ({ id: "r2", name: "Bed 2", lengthFt: 12, widthFt: 12, walls });
  const wall = (side: "TOP" | "BOTTOM" | "LEFT" | "RIGHT", type: string) =>
    ({ side, type, thicknessIn: 9, sharedWithRoomId: null, sharedWithSide: null, existing: false }) as unknown as NonNullable<PairRoom["walls"]>[number];
  it("targets the opposite side and reports a party / external wall there", () => {
    const p = partner([wall("LEFT", "PARTY")]);
    expect(pairTarget("r1", "RIGHT", 12, p)).toBe("LEFT");
    expect(overwrittenWall("r1", "RIGHT", 12, p)).toEqual({ side: "LEFT", type: "PARTY" });
    expect(overwrittenWall("r1", "RIGHT", 12, partner([]))).toBeNull();
  });
});

describe("QA B-05 / B-19 — BoQ rates and numbers", () => {
  it("lump sums edit a rulebook key; materials go to the price list; owner lines nowhere", () => {
    expect(rateSource({ kind: "LUMP_SUM", lineKey: "MEP_ROUGH_IN.PLASTER_MEP.electrical", suppliedBy: "CONTRACTOR" })).toEqual({ kind: "RULEBOOK", key: "mepElectricalRsPerSqft" });
    expect(rateSource({ kind: "LUMP_SUM", lineKey: "X.Y.z", suppliedBy: "CONTRACTOR", rateKey: "cartAwayRsPerCft" })).toEqual({ kind: "RULEBOOK", key: "cartAwayRsPerCft" });
    expect(rateSource({ kind: "MATERIAL", lineKey: "CONCRETE.F.cement", suppliedBy: "CONTRACTOR" })).toEqual({ kind: "PRICE_LIST" });
    expect(rateSource({ kind: "MATERIAL", lineKey: "CONCRETE.F.cement", suppliedBy: "OWNER" })).toBeNull();
  });
  it("Σ visible contractor lines, percent lines aside", () => {
    expect(
      visibleLinesPaisa([
        { kind: "MATERIAL", suppliedBy: "CONTRACTOR", amountPaisa: "1000" },
        { kind: "LUMP_SUM", suppliedBy: "CONTRACTOR", amountPaisa: "500" },
        { kind: "PERCENT", suppliedBy: "CONTRACTOR", amountPaisa: "75" },
        { kind: "MATERIAL", suppliedBy: "OWNER", amountPaisa: null },
      ] as never),
    ).toBe(BigInt(1500));
  });
  it("small rates keep their precision (termite 0.005)", () => {
    expect(fmt(0.005)).toBe("0.005");
    expect(fmt(1234.567)).toBe("1,234.57");
  });
});
