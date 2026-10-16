/**
 * Roof / slab (lenter) and wall rules shared by the wizard (plot & structure roof card, room walls).
 * Mirrors the backend (src/modules/projects/roof.ts, walls.ts): which fields apply to which roof
 * type, the Pakistani defaults, the thickness suggestion and the soft warnings.
 */
import type {
  BarNo,
  FloorRoof,
  RoofInfill,
  RoofInput,
  RoofMix,
  RoofType,
  SlabSuggestion,
  SteelGrade,
  StructureType,
  TIronSection,
  WallSide,
  WallType,
} from "@/api/types";

export const ROOF_TYPES: RoofType[] = ["RCC_SLAB", "T_IRON_TILE", "PRECAST", "STEEL_DECK"];
export const ROOF_MIXES: RoofMix[] = ["1:2:4", "1:1.5:3"];
export const STEEL_GRADES: SteelGrade[] = ["G60", "G40"];
export const T_IRON_SECTIONS: TIronSection[] = ["T3X3", "T4X4", "G4X3", "G5X3", "G6X3"];
export const ROOF_INFILLS: RoofInfill[] = ["BRICK", "TILE"];
/** Pakistani bar numbers → mm. */
export const BAR_MM: Record<BarNo, number> = { 3: 10, 4: 12, 5: 16, 6: 20 };
export const BAR_NUMBERS: BarNo[] = [3, 4, 5, 6];
/** Bar as the select stores it ("4" = #4). */
export type BarValue = "3" | "4" | "5" | "6";

/** Form values of one floor's roof card (numbers nullable while typing; bars as select strings). */
export interface RoofFormValues {
  /** Off = not entered: the estimate uses the slab % from the assumptions. */
  enabled: boolean;
  type: RoofType;
  thicknessIn: number | null;
  concreteMix: RoofMix;
  steelGrade: SteelGrade;
  mainBar: BarValue;
  mainSpacingIn: number | null;
  distBar: BarValue;
  distSpacingIn: number | null;
  topBars: boolean;
  coverIn: number | null;
  chajjaLengthFt: number | null;
  chajjaWidthFt: number | null;
  beamWidthIn: number | null;
  beamDepthIn: number | null;
  beamBars: number | null;
  beamBar: BarValue;
  stirrupBar: BarValue;
  stirrupSpacingIn: number | null;
  beamRunFt: number | null;
  columnCount: number | null;
  columnWidthIn: number | null;
  columnDepthIn: number | null;
  columnBars: number | null;
  columnBar: BarValue;
  tieBar: BarValue;
  tieSpacingIn: number | null;
  tIronSection: TIronSection;
  tIronSpacingFt: number | null;
  infill: RoofInfill;
  screedThicknessIn: number | null;
  earthFillIn: number | null;
  plankAreaSqft: number | null;
  deckAreaSqft: number | null;
  toppingIn: number | null;
  mesh: boolean;
}

/** 5″ lenter, 1:2:4, G60, #4 @ 6″ main, #3 @ 9″ distribution; beams 9 × 15″ 4 #5; columns 12 × 12″ 6 #5. */
export const ROOF_DEFAULTS: RoofFormValues = {
  enabled: false,
  type: "RCC_SLAB",
  thicknessIn: 5,
  concreteMix: "1:2:4",
  steelGrade: "G60",
  mainBar: "4",
  mainSpacingIn: 6,
  distBar: "3",
  distSpacingIn: 9,
  topBars: true,
  coverIn: 0.75,
  chajjaLengthFt: null,
  chajjaWidthFt: 2,
  beamWidthIn: 9,
  beamDepthIn: 15,
  beamBars: 4,
  beamBar: "5",
  stirrupBar: "3",
  stirrupSpacingIn: 6,
  beamRunFt: null,
  columnCount: null,
  columnWidthIn: 12,
  columnDepthIn: 12,
  columnBars: 6,
  columnBar: "5",
  tieBar: "3",
  tieSpacingIn: 6,
  tIronSection: "G5X3",
  tIronSpacingFt: 3,
  infill: "BRICK",
  screedThicknessIn: 3,
  earthFillIn: 4,
  plankAreaSqft: null,
  deckAreaSqft: null,
  toppingIn: null,
  mesh: true,
};

/** Topping default by type: 2″ precast, 4″ steel deck. */
export const toppingDefault = (type: RoofType) => (type === "PRECAST" ? 2 : 4);

const bar = (b: BarNo | null | undefined, fallback: BarValue): BarValue => (b ? (String(b) as BarValue) : fallback);

/** Saved roof → form values (defaults, card off, when none is saved yet). */
export function roofToForm(r: FloorRoof | null | undefined): RoofFormValues {
  if (!r) return { ...ROOF_DEFAULTS };
  const d = ROOF_DEFAULTS;
  return {
    enabled: true,
    type: r.type,
    thicknessIn: r.thicknessIn ?? d.thicknessIn,
    concreteMix: r.concreteMix,
    steelGrade: r.steelGrade,
    mainBar: bar(r.mainBar, d.mainBar),
    mainSpacingIn: r.mainSpacingIn ?? d.mainSpacingIn,
    distBar: bar(r.distBar, d.distBar),
    distSpacingIn: r.distSpacingIn ?? d.distSpacingIn,
    topBars: r.topBars ?? d.topBars,
    coverIn: r.coverIn ?? d.coverIn,
    chajjaLengthFt: r.chajjaLengthFt,
    chajjaWidthFt: r.chajjaWidthFt ?? d.chajjaWidthFt,
    beamWidthIn: r.beamWidthIn,
    beamDepthIn: r.beamDepthIn,
    beamBars: r.beamBars,
    beamBar: bar(r.beamBar, d.beamBar),
    stirrupBar: bar(r.stirrupBar, d.stirrupBar),
    stirrupSpacingIn: r.stirrupSpacingIn,
    beamRunFt: r.beamRunFt,
    columnCount: r.columnCount,
    columnWidthIn: r.columnWidthIn,
    columnDepthIn: r.columnDepthIn,
    columnBars: r.columnBars,
    columnBar: bar(r.columnBar, d.columnBar),
    tieBar: bar(r.tieBar, d.tieBar),
    tieSpacingIn: r.tieSpacingIn,
    tIronSection: r.tIronSection ?? d.tIronSection,
    tIronSpacingFt: r.tIronSpacingFt ?? d.tIronSpacingFt,
    infill: r.infill ?? d.infill,
    screedThicknessIn: r.screedThicknessIn ?? d.screedThicknessIn,
    earthFillIn: r.earthFillIn ?? d.earthFillIn,
    plankAreaSqft: r.plankAreaSqft,
    deckAreaSqft: r.deckAreaSqft,
    toppingIn: r.toppingIn,
    mesh: r.mesh ?? d.mesh,
  };
}

const num = (v: number | null) => (v === null ? undefined : v);
const barNo = (v: BarValue) => Number(v) as BarNo;

/** Form → `floors[].roof`: null when the card is off; only the fields of the chosen type; frame fields for an RCC frame. */
export function roofToBody(v: RoofFormValues, structure: StructureType | null): RoofInput | null {
  if (!v.enabled) return null;
  const body: RoofInput = { type: v.type, concreteMix: v.concreteMix, steelGrade: v.steelGrade };
  if (v.type === "RCC_SLAB") {
    Object.assign(body, {
      thicknessIn: num(v.thicknessIn),
      mainBar: barNo(v.mainBar),
      mainSpacingIn: num(v.mainSpacingIn),
      distBar: barNo(v.distBar),
      distSpacingIn: num(v.distSpacingIn),
      topBars: v.topBars,
      coverIn: num(v.coverIn),
      chajjaLengthFt: v.chajjaLengthFt || null,
      chajjaWidthFt: v.chajjaLengthFt ? (v.chajjaWidthFt ?? null) : null,
    });
  }
  if (v.type === "T_IRON_TILE") {
    Object.assign(body, {
      tIronSection: v.tIronSection,
      tIronSpacingFt: num(v.tIronSpacingFt),
      infill: v.infill,
      screedThicknessIn: num(v.screedThicknessIn),
      earthFillIn: num(v.earthFillIn),
    });
  }
  if (v.type === "PRECAST" || v.type === "STEEL_DECK") {
    Object.assign(body, {
      ...(v.type === "PRECAST" ? { plankAreaSqft: v.plankAreaSqft } : { deckAreaSqft: v.deckAreaSqft }),
      toppingIn: v.toppingIn ?? toppingDefault(v.type),
      mesh: v.mesh,
    });
  }
  if (structure === "FRAMED") {
    Object.assign(body, {
      beamWidthIn: num(v.beamWidthIn),
      beamDepthIn: num(v.beamDepthIn),
      beamBars: num(v.beamBars),
      beamBar: barNo(v.beamBar),
      stirrupBar: barNo(v.stirrupBar),
      stirrupSpacingIn: num(v.stirrupSpacingIn),
      beamRunFt: v.beamRunFt,
      columnCount: v.columnCount,
      columnWidthIn: num(v.columnWidthIn),
      columnDepthIn: num(v.columnDepthIn),
      columnBars: num(v.columnBars),
      columnBar: barNo(v.columnBar),
      tieBar: barNo(v.tieBar),
      tieSpacingIn: num(v.tieSpacingIn),
    });
  }
  return Object.fromEntries(Object.entries(body).filter(([, x]) => x !== undefined)) as RoofInput;
}

/** Same rule as the API: ≤ 12 ft → 4.5–5″, 12–15 → 5″, 15–18 → 6″, > 18 → 6–7″ or a beam. */
export function suggestSlab(spanFt: number | null): SlabSuggestion {
  if (spanFt === null || spanFt <= 12) return { spanFt, suggestedIn: 5, minIn: 4.5, beamAdvised: false };
  if (spanFt <= 15) return { spanFt, suggestedIn: 5, minIn: 5, beamAdvised: false };
  if (spanFt <= 18) return { spanFt, suggestedIn: 6, minIn: 6, beamAdvised: false };
  return { spanFt, suggestedIn: 7, minIn: 6, beamAdvised: true };
}

/** Max bar spacing: min(12″, 2 × slab thickness). */
export const maxSpacingIn = (thicknessIn: number) => Math.min(12, 2 * thicknessIn);

export type RoofWarning =
  | { code: "TOO_THIN"; suggestedIn: number; spanFt: number }
  | { code: "NEEDS_BEAM"; spanFt: number }
  | { code: "MAIN_SPACING"; maxIn: number }
  | { code: "DIST_SPACING"; maxIn: number };

/** Soft checks shown under the RCC fields (the API saves anyway and repeats them in the estimate). */
export function roofWarnings(v: Pick<RoofFormValues, "type" | "thicknessIn" | "mainSpacingIn" | "distSpacingIn">, s: SlabSuggestion): RoofWarning[] {
  if (v.type !== "RCC_SLAB" || v.thicknessIn === null) return [];
  const out: RoofWarning[] = [];
  if (s.spanFt !== null && v.thicknessIn < s.minIn) out.push({ code: "TOO_THIN", suggestedIn: s.suggestedIn, spanFt: s.spanFt });
  if (s.beamAdvised && s.spanFt !== null) out.push({ code: "NEEDS_BEAM", spanFt: s.spanFt });
  const max = maxSpacingIn(v.thicknessIn);
  if (v.mainSpacingIn !== null && v.mainSpacingIn > max) out.push({ code: "MAIN_SPACING", maxIn: max });
  if (v.distSpacingIn !== null && v.distSpacingIn > max) out.push({ code: "DIST_SPACING", maxIn: max });
  return out;
}

// ─── Walls ──────────────────────────────────────────────────────────────────

export const WALL_SIDES: WallSide[] = ["TOP", "RIGHT", "BOTTOM", "LEFT"];
export const WALL_TYPES: WallType[] = ["EXTERNAL", "SHARED", "PARTY", "DOUBLE", "OPEN", "PASSAGE"];
/** Thickness choices (brick multiples). */
export const WALL_THICKNESSES = [4.5, 9, 13.5] as const;

/** TOP / BOTTOM = the room's length, LEFT / RIGHT = its width. */
export const sideLength = (side: WallSide, room: { lengthFt: number | null; widthFt: number | null }) =>
  side === "TOP" || side === "BOTTOM" ? room.lengthFt : room.widthFt;

/** Default thickness by type (API walls.ts): 9″; SHARED 4.5″ frame / 9″ load-bearing; PASSAGE 4.5″; OPEN none. */
export function defaultWallThickness(type: WallType, structure: StructureType | null | undefined): number | null {
  if (type === "OPEN") return null;
  if (type === "SHARED") return structure === "LOAD_BEARING" ? 9 : 4.5;
  if (type === "PASSAGE") return 4.5;
  return 9;
}
