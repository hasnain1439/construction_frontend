import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { nextMark, PartsPicker } from "@/features/site/StructureProgress";
import { buildHouse, trackedParts } from "@/lib/house3d/layout";
import { renderWithStore } from "../render";

const room = (name: string, type: string, l: number, w: number) => ({ id: name, name, type, lengthFt: l, widthFt: w, heightFt: 10, isWet: false, sortOrder: 0, walls: null, openings: [] });
const model = buildHouse({
  frontFt: 35,
  depthFt: 65,
  structureType: "FRAMED",
  foundation: { type: "ISOLATED", excavationDepthFt: 5, footingWidthFt: 4, footingThicknessIn: 15, plinthHeightFt: 2, dpcThicknessIn: 1.5, footingCount: 12, footingLengthFt: 4, pileCount: null, pileDiameterIn: null, pileDepthFt: null, masonry: "BRICK", pccMix: "1:4:8", pccThicknessIn: 3 },
  coverage: { coveredAreaSqft: 1800 },
  floors: [
    { id: "g", level: "GROUND", name: "Ground floor", ceilingHeightFt: 11, sortOrder: 0, roof: { type: "RCC_SLAB", columnCount: 12 }, rooms: [room("Drawing", "DRAWING_ROOM", 16, 14), room("Lounge", "TV_LOUNGE", 18, 16), room("Kitchen", "KITCHEN", 12, 10)] },
  ],
} as never);

describe("structure progress", () => {
  it("the 3D model names every part to track: footings, columns, beams, walls, slab, foundation layers", () => {
    const ids = trackedParts(model).map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(["F-1", "F-12", "G-C1", "G-W", "G-S", "F-PCC"]));
    expect(ids.some((id) => /^G-B\d+$/.test(id))).toBe(true);
    // each part once, the foundation first
    expect(new Set(ids).size).toBe(ids.length);
    expect(trackedParts(model)[0]!.group).toBe("foundation");
  });

  it("a click moves a part along: not started → in progress → done → not started", () => {
    expect(nextMark("NOT_STARTED")).toBe("IN_PROGRESS");
    expect(nextMark("IN_PROGRESS")).toBe("DONE");
    expect(nextMark("DONE")).toBe("NOT_STARTED");
    const onToggle = vi.fn();
    renderWithStore(<PartsPicker model={model} marks={{ "F-1": "DONE", "G-C1": "IN_PROGRESS" }} onToggle={onToggle} />);
    expect(screen.getByRole("button", { name: "F-1" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "F-2" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "F-2" }));
    expect(onToggle).toHaveBeenCalledWith("F-2");
  });
});
