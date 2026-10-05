import { describe, expect, it } from "vitest";
import { formatArea, isWetType, openingsArea, plotCalc, roomCalc, totalsCalc } from "@/features/projects/utils/calc";

describe("project calculations (same as the backend)", () => {
  it("matches the backend's worked room example: 16 × 14 × 11, door 3.5 × 7, window 5 × 4", () => {
    const room = {
      lengthFt: 16,
      widthFt: 14,
      heightFt: 11,
      openings: [
        { widthFt: 3.5, heightFt: 7, quantity: 1 },
        { widthFt: 5, heightFt: 4, quantity: 1 },
      ],
    };
    expect(roomCalc(room)).toEqual({ floorAreaSqft: 224, grossWallAreaSqft: 660, openingsAreaSqft: 44.5, netWallAreaSqft: 615.5 });
  });

  it("handles decimals without float drift", () => {
    const c = roomCalc({ lengthFt: 12.25, widthFt: 10.5, heightFt: 10.75, openings: [{ widthFt: 2.75, heightFt: 6.5, quantity: 2 }] });
    expect(c.floorAreaSqft).toBe(128.63); // 128.625 → half-up
    expect(c.grossWallAreaSqft).toBe(489.13); // 2 × 22.75 × 10.75 = 489.125
    expect(c.openingsAreaSqft).toBe(35.75);
    expect(c.netWallAreaSqft).toBe(453.38); // 489.125 − 35.75 = 453.375
  });

  it("multiplies openings by quantity and skips incomplete rows", () => {
    expect(openingsArea([{ widthFt: 4, heightFt: 4, quantity: 3 }, { widthFt: null, heightFt: 4, quantity: 1 }])).toBe(48);
  });

  it("computes plot area for marla, kanal and sq ft", () => {
    expect(plotCalc({ plotUnit: "MARLA", plotSize: 10, marlaStandard: 225, frontFt: 35, depthFt: 65 })).toEqual({
      plotAreaSqft: 2250,
      frontageAreaSqft: 2275,
      plotAreaMismatch: false,
    });
    expect(plotCalc({ plotUnit: "KANAL", plotSize: 1, marlaStandard: 272.25, frontFt: null, depthFt: null }).plotAreaSqft).toBe(5445);
    expect(plotCalc({ plotUnit: "SQFT", plotSize: 1800, marlaStandard: 225, frontFt: 30, depthFt: 60 }).plotAreaSqft).toBe(1800);
  });

  it("flags a plot whose front × depth differs by more than 10 %", () => {
    expect(plotCalc({ plotUnit: "MARLA", plotSize: 5, marlaStandard: 225, frontFt: 30, depthFt: 45 }).plotAreaMismatch).toBe(true);
    expect(plotCalc({ plotUnit: "MARLA", plotSize: 5, marlaStandard: 225, frontFt: 25, depthFt: 45 }).plotAreaMismatch).toBe(false);
  });

  it("totals a floor", () => {
    const totals = totalsCalc([
      { lengthFt: 16, widthFt: 14, heightFt: 11, isWet: false, openings: [] },
      { lengthFt: 8, widthFt: 6, heightFt: 11, isWet: true, openings: [{ widthFt: 2.5, heightFt: 7, quantity: 1 }] },
    ]);
    expect(totals).toEqual({ rooms: 2, totalFloorAreaSqft: 272, netWallAreaSqft: 660 + 308 - 17.5, wetRooms: 1 });
  });

  it("knows wet room types and formats areas", () => {
    expect(isWetType("KITCHEN")).toBe(true);
    expect(isWetType("BEDROOM")).toBe(false);
    expect(formatArea(3610.5)).toBe("3,610.5");
    expect(formatArea(null)).toBe("—");
  });
});
