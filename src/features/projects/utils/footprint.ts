/**
 * Ground footprint and columns per floor (QA NEW-2 / B-04): ONE rule for the Coverage tab, the
 * plot-tab column hint and the footing count, the same one the API engine uses.
 *
 * The API's numbers win: the project's `calculations.footprints` (QE5), else the loaded estimate
 * (`basis.floors[].footprintSqft`, `basis.floors[].columns.derived`); without them the web works them
 * out with the same rule:
 *   - the mumty (stair room) takes its rooms × 1.15 (at most 25 % of the covered area), or 150 sq ft
 *     without rooms (at most 15 %);
 *   - every other storey gets an EQUAL share of the rest. Not a share by room area: when few rooms
 *     are entered that ratio is distorted (QA NEW-2: 392 : 231 sq ft of rooms gave 2,139 sq ft
 *     instead of 1,700 for the ground floor).
 * Without a covered area the plot (front × depth) stands in for the ground footprint.
 */
import type { FloorLevel, ProjectEstimate, ProjectFootprints } from "@/api/types";
import { estimateColumnCount } from "./foundation";

/** Rooms × this = the floor's footprint (walls); the API's FOOTPRINT_ALLOWANCE. */
export const FOOTPRINT_ALLOWANCE = 1.15;
/** A mumty with no rooms: assumed area (sq ft), at most 15 % of the covered area (API MUMTY_DEFAULT_SQFT). */
export const MUMTY_DEFAULT_SQFT = 150;

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface FootprintFloor {
  level: FloorLevel;
  /** Room area entered on the floor (sq ft); 0 / absent = none yet. */
  roomAreaSqft?: number | null;
}

/**
 * The project's floors for the rule (level + rooms entered). `levels` = the floors as the form has them
 * now (tab 3 before saving); a level the project does not have yet counts with no rooms.
 */
export function footprintFloors(
  project: { floors?: ReadonlyArray<{ level: FloorLevel; calculations?: { totalFloorAreaSqft?: number } | null }> } | null | undefined,
  levels?: readonly FloorLevel[],
): FootprintFloor[] {
  const saved = (project?.floors ?? []).map((f) => ({ level: f.level, roomAreaSqft: f.calculations?.totalFloorAreaSqft ?? 0 }));
  if (!levels) return saved;
  return levels.map((level) => saved.find((f) => f.level === level) ?? { level, roomAreaSqft: 0 });
}

/** Footprint of each floor (sq ft), in the order given. Zeros without a covered area. */
export function floorFootprints(floors: readonly FootprintFloor[], coveredAreaSqft: number | null | undefined): number[] {
  const C = coveredAreaSqft ?? 0;
  if (!(C > 0) || floors.length === 0) return floors.map(() => 0);
  const main = floors.filter((f) => f.level !== "MUMTY").length;
  if (main === 0) return floors.map(() => r2(C / floors.length));
  const mumty = floors.map((f) =>
    f.level !== "MUMTY" ? 0 : (f.roomAreaSqft ?? 0) > 0 ? Math.min((f.roomAreaSqft ?? 0) * FOOTPRINT_ALLOWANCE, 0.25 * C) : Math.min(MUMTY_DEFAULT_SQFT, 0.15 * C),
  );
  const rest = C - mumty.reduce((a, b) => a + b, 0);
  return floors.map((f, i) => r2(f.level === "MUMTY" ? mumty[i]! : rest / main));
}

/** The engine's ground footprint when the estimate is loaded (the GROUND floor's `footprintSqft`). */
export function apiGroundFootprint(estimate: Pick<ProjectEstimate, "basis"> | null | undefined): number | null {
  if (!estimate) return null;
  const v = estimate.basis.floors.find((f) => f.level === "GROUND")?.footprintSqft ?? null;
  return v && v > 0 ? v : null;
}

/** Ground-floor footprint: the API's, else the shared rule, else the plot (front × depth); null when nothing is known. */
export function groundFootprint(p: {
  /** QE5 `project.calculations.footprints` (only while the covered area on screen is the saved one). */
  footprints?: ProjectFootprints | null;
  estimate?: Pick<ProjectEstimate, "basis"> | null;
  floors: readonly FootprintFloor[];
  coveredAreaSqft: number | null | undefined;
  frontFt?: number | null;
  depthFt?: number | null;
}): number | null {
  if (p.footprints?.groundFootprintSqft) return p.footprints.groundFootprintSqft;
  const api = apiGroundFootprint(p.estimate);
  if (api !== null) return api;
  return levelFootprint(p, "GROUND");
}

/** Footprint of one floor by the shared rule (no API), else the plot for the ground floor. */
function levelFootprint(
  p: { floors: readonly FootprintFloor[]; coveredAreaSqft: number | null | undefined; frontFt?: number | null; depthFt?: number | null },
  level: FloorLevel,
): number | null {
  const floors = p.floors.some((f) => f.level === level) ? p.floors : [...p.floors, { level }];
  const i = floors.findIndex((f) => f.level === level);
  const fp = floorFootprints(floors, p.coveredAreaSqft)[i] ?? 0;
  if (fp > 0) return fp;
  return level !== "MUMTY" && p.frontFt && p.depthFt ? r2(p.frontFt * p.depthFt) : null;
}

/**
 * Columns of the RCC frame on a floor (QA B-04 / B-22): the API's count (QE5 `calculations.footprints`,
 * else the estimate's `floors[].columns.derived`), else the 15 ft grid over the floor's footprint
 * by the shared rule. This is the number the plot-tab hint, the footing-count default and the BoQ use.
 */
export function columnCountFor(
  p: {
    footprints?: ProjectFootprints | null;
    estimate?: Pick<ProjectEstimate, "basis"> | null;
    floors: readonly FootprintFloor[];
    coveredAreaSqft: number | null | undefined;
    frontFt?: number | null;
    depthFt?: number | null;
  },
  level: FloorLevel,
): number | null {
  const fromProject = p.footprints?.floors.find((x) => x.level === level)?.columns ?? (level === "GROUND" ? p.footprints?.columnCount : null);
  if (fromProject) return fromProject;
  const f = p.estimate?.basis.floors.find((x) => x.level === level);
  const fromApi = f?.columns?.derived ?? (f?.roof?.columnCountAuto ? f.roof.columnCount : null);
  if (fromApi) return fromApi;
  const fp = f?.footprintSqft && f.footprintSqft > 0 ? f.footprintSqft : levelFootprint(p, level);
  return estimateColumnCount(fp, p.frontFt, p.depthFt);
}
