/**
 * Live area maths for the wizard — the SAME formulas as the backend
 * (`construction-platform/src/modules/projects/calc.ts`), so on-screen numbers match
 * what the server stores. Inputs are feet with up to 2 decimals; results are rounded to
 * 2 dp half-up. Integer arithmetic on hundredths avoids float drift.
 */

export const SQFT_PER_KANAL_MARLAS = 20;
/** Plot vs front × depth differ by more than this → warning. */
export const PLOT_MISMATCH_RATIO = 0.1;

type Num = number | null | undefined;

/** x → integer hundredths (12.34 → 1234). */
const h = (x: number) => Math.round(x * 100);
/** Rounds `value / divisor` half-up and returns a number with 2 dp. */
const out = (scaled: number, divisor: number) => Math.round(scaled / divisor) / 100;
const valid = (x: Num): x is number => typeof x === "number" && Number.isFinite(x);

export interface PlotInput {
  plotUnit: "MARLA" | "KANAL" | "SQFT" | null | undefined;
  plotSize: Num;
  marlaStandard: number;
  frontFt: Num;
  depthFt: Num;
}

export function plotCalc(p: PlotInput) {
  let plotAreaSqft: number | null = null;
  if (p.plotUnit && valid(p.plotSize)) {
    const size = h(p.plotSize);
    const std = h(p.marlaStandard);
    if (p.plotUnit === "SQFT") plotAreaSqft = size / 100;
    else if (p.plotUnit === "MARLA") plotAreaSqft = out(size * std, 100);
    else plotAreaSqft = out(size * SQFT_PER_KANAL_MARLAS * std, 100);
  }
  const frontageAreaSqft = valid(p.frontFt) && valid(p.depthFt) ? out(h(p.frontFt) * h(p.depthFt), 100) : null;
  const plotAreaMismatch =
    plotAreaSqft !== null && frontageAreaSqft !== null && plotAreaSqft > 0
      ? Math.abs(frontageAreaSqft - plotAreaSqft) / plotAreaSqft > PLOT_MISMATCH_RATIO
      : false;
  return { plotAreaSqft, frontageAreaSqft, plotAreaMismatch };
}

export interface OpeningInput {
  widthFt: Num;
  heightFt: Num;
  quantity: Num;
}

export interface RoomInput {
  lengthFt: Num;
  widthFt: Num;
  heightFt: Num;
  isWet?: boolean;
  openings: OpeningInput[];
}

export function openingsArea(openings: OpeningInput[]): number {
  let scaled = 0; // hundredths²
  for (const o of openings) {
    if (!valid(o.widthFt) || !valid(o.heightFt) || !valid(o.quantity)) continue;
    scaled += h(o.widthFt) * h(o.heightFt) * Math.round(o.quantity);
  }
  return out(scaled, 100);
}

export function roomCalc(r: RoomInput) {
  const L = valid(r.lengthFt) ? h(r.lengthFt) : 0;
  const W = valid(r.widthFt) ? h(r.widthFt) : 0;
  const H = valid(r.heightFt) ? h(r.heightFt) : 0;
  const floorAreaSqft = out(L * W, 100);
  // 2 × (L + W) × H — keep everything in hundredths² before rounding once.
  const grossWallAreaSqft = out(2 * (L + W) * H, 100);
  const openingsAreaSqft = openingsArea(r.openings);
  // Same order as the backend: gross (unrounded) − openings (rounded), then round.
  const netWallAreaSqft = out(2 * (L + W) * H - Math.round(openingsAreaSqft * 100) * 100, 100);
  return { floorAreaSqft, grossWallAreaSqft, openingsAreaSqft, netWallAreaSqft };
}

export function totalsCalc(rooms: RoomInput[]) {
  let floor = 0;
  let netWall = 0;
  let wetRooms = 0;
  for (const room of rooms) {
    const c = roomCalc(room);
    floor += Math.round(c.floorAreaSqft * 100);
    netWall += Math.round(c.netWallAreaSqft * 100);
    if (room.isWet) wetRooms += 1;
  }
  return { rooms: rooms.length, totalFloorAreaSqft: floor / 100, netWallAreaSqft: netWall / 100, wetRooms };
}

/** Rooms that are wet unless overridden (backend WET_ROOM_TYPES). */
export const WET_ROOM_TYPES = ["ATTACHED_BATH", "POWDER_ROOM", "KITCHEN"] as const;
export const isWetType = (type: string) => (WET_ROOM_TYPES as readonly string[]).includes(type);

/** 2,250 / 3,610.5 with grouping (sq ft figures). */
export function formatArea(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-PK", { maximumFractionDigits: 2 });
}
