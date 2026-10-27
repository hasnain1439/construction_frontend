/**
 * Roof / slab (lenter) and wall rules shared by the wizard (plot & structure roof card, room walls).
 * Mirrors the backend (src/modules/projects/roof.ts, walls.ts): which fields apply to which roof
 * type, the Pakistani defaults, the thickness suggestion and the soft warnings.
 */
import type {
  BarNo,
  FloorRoof,
  GarderSection,
  RoofInput,
  RoofMix,
  RoofTopFinish,
  RoofType,
  RoofWaterproofing,
  SlabSuggestion,
  SteelGrade,
  StructureType,
  TIronSection,
  TIronSystem,
  WallSide,
  WallType,
} from "@/api/types";

export const ROOF_TYPES: RoofType[] = ["RCC_SLAB", "T_IRON_TILE", "PRECAST", "STEEL_DECK"];
export const ROOF_MIXES: RoofMix[] = ["1:2:4", "1:1.5:3"];
export const STEEL_GRADES: SteelGrade[] = ["G60", "G40"];
/** T-iron + tiles roof (bottom to top): structure, T-iron, bottom tiles, waterproof layer, earth, top finish. */
export const T_IRON_SYSTEMS: TIronSystem[] = ["T_ONLY", "GARDER_T"];
export const T_IRON_SECTIONS: TIronSection[] = ["T3X3", "T4X4"];
/** Garders offered in the wizard (G4X3 / G5X3 only appear on roofs saved before). */
export const GARDER_SECTIONS: GarderSection[] = ["G6X3", "G8X4"];
export const TILE_LAYERS = ["1", "2"] as const;
export type TileLayers = (typeof TILE_LAYERS)[number];
export const ROOF_WATERPROOFINGS: RoofWaterproofing[] = ["POLYTHENE", "BITUMEN", "NONE"];
export const ROOF_TOP_FINISHES: RoofTopFinish[] = ["TILE", "LEEP", "CONC"];
/** Top finish thickness default: 1″ mud plaster / tiles in mortar, 2″ concrete screed. */
export const topFinishDefault = (finish: RoofTopFinish) => (finish === "CONC" ? 2 : 1);
/** Same limits as the API warnings: T-irons alone up to 12 ft, T-irons ≤ 14″ apart, garders ≤ 10 ft apart. */
export const T_ONLY_MAX_SPAN_FT = 12;
export const T_IRON_MAX_SPACING_IN = 14;
export const GARDER_MAX_SPACING_FT = 10;
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
  tIronSystem: TIronSystem;
  garderSection: GarderSection;
  garderSpacingFt: number | null;
  tIronSection: TIronSection;
  tIronSpacingFt: number | null;
  bottomTileLayers: TileLayers;
  waterproofing: RoofWaterproofing;
  earthFillIn: number | null;
  topFinish: RoofTopFinish;
  topFinishIn: number | null;
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
  tIronSystem: "T_ONLY",
  garderSection: "G6X3",
  garderSpacingFt: 8,
  tIronSection: "T3X3",
  tIronSpacingFt: 1.1,
  bottomTileLayers: "1",
  waterproofing: "POLYTHENE",
  earthFillIn: 5,
  topFinish: "TILE",
  topFinishIn: 1,
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
    tIronSystem: r.tIronSystem ?? d.tIronSystem,
    garderSection: r.garderSection ?? d.garderSection,
    garderSpacingFt: r.garderSpacingFt ?? d.garderSpacingFt,
    tIronSection: r.tIronSection ?? d.tIronSection,
    tIronSpacingFt: r.tIronSpacingFt ?? d.tIronSpacingFt,
    bottomTileLayers: r.bottomTileLayers === 2 ? "2" : "1",
    waterproofing: r.waterproofing ?? d.waterproofing,
    earthFillIn: r.earthFillIn ?? d.earthFillIn,
    topFinish: r.topFinish ?? d.topFinish,
    topFinishIn: r.topFinishIn ?? topFinishDefault(r.topFinish ?? d.topFinish),
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
      tIronSystem: v.tIronSystem,
      ...(v.tIronSystem === "GARDER_T" ? { garderSection: v.garderSection, garderSpacingFt: num(v.garderSpacingFt) } : {}),
      tIronSection: v.tIronSection,
      tIronSpacingFt: num(v.tIronSpacingFt),
      bottomTileLayers: v.bottomTileLayers === "2" ? 2 : 1,
      waterproofing: v.waterproofing,
      earthFillIn: num(v.earthFillIn),
      topFinish: v.topFinish,
      topFinishIn: v.topFinishIn ?? topFinishDefault(v.topFinish),
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
  | { code: "DIST_SPACING"; maxIn: number }
  | { code: "TIRON_SPAN"; spanFt: number }
  | { code: "TIRON_SPACING"; spacingIn: number }
  | { code: "GARDER_SPACING"; spacingFt: number }
  | { code: "NO_WATERPROOFING" };

type WarningInput = Pick<RoofFormValues, "type" | "thicknessIn" | "mainSpacingIn" | "distSpacingIn"> &
  Partial<Pick<RoofFormValues, "tIronSystem" | "tIronSpacingFt" | "garderSpacingFt" | "waterproofing">>;

/** T-iron roof checks (as on the owner's page; same as the API): span, T-iron / garder spacing, no waterproof layer. */
function tIronWarnings(v: WarningInput, s: SlabSuggestion): RoofWarning[] {
  const out: RoofWarning[] = [];
  if (v.tIronSystem === "T_ONLY" && s.spanFt !== null && s.spanFt > T_ONLY_MAX_SPAN_FT) out.push({ code: "TIRON_SPAN", spanFt: s.spanFt });
  if (v.tIronSpacingFt != null && v.tIronSpacingFt * 12 > T_IRON_MAX_SPACING_IN + 1e-9) out.push({ code: "TIRON_SPACING", spacingIn: Math.round(v.tIronSpacingFt * 120) / 10 });
  if (v.tIronSystem === "GARDER_T" && v.garderSpacingFt != null && v.garderSpacingFt > GARDER_MAX_SPACING_FT) out.push({ code: "GARDER_SPACING", spacingFt: v.garderSpacingFt });
  if (v.waterproofing === "NONE") out.push({ code: "NO_WATERPROOFING" });
  return out;
}

/** Soft checks shown under the RCC / T-iron fields (the API saves anyway and repeats them in the estimate). */
export function roofWarnings(v: WarningInput, s: SlabSuggestion): RoofWarning[] {
  if (v.type === "T_IRON_TILE") return tIronWarnings(v, s);
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
export const WALL_TYPES: WallType[] = ["EXTERNAL", "SHARED", "PARTY", "DOUBLE", "OPEN", "PASSAGE", "BOUNDARY"];
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
