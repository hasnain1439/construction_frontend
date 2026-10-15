/**
 * Foundation (bunyaad) rules shared by the wizard card, the review and the project overview.
 * Mirrors the backend (src/modules/projects/foundation.ts): which fields apply to which type,
 * and the Pakistani defaults the form starts from.
 */
import type {
  BarSizeMm,
  DpcMaterial,
  FoundationInput,
  FoundationMasonry,
  FoundationType,
  PccMix,
  ProjectFoundation,
  RccMix,
  SoilType,
} from "@/api/types";

export const FOUNDATION_TYPES: FoundationType[] = ["STRIP", "ISOLATED", "COMBINED", "RAFT", "PILE"];
export const FOUNDATION_MASONRY: FoundationMasonry[] = ["BRICK", "STONE", "RCC_ONLY"];
export const PCC_MIXES: PccMix[] = ["1:4:8", "1:3:6", "1:2:4"];
export const RCC_MIXES: RccMix[] = ["1:2:4", "1:1.5:3"];
export const DPC_MATERIALS: DpcMaterial[] = ["PCC_WATERPROOF", "BITUMEN"];
export const SOIL_TYPES: SoilType[] = ["HARD", "MEDIUM", "SOFT", "SANDY", "FILLED", "CLAY"];
/** Main bars as the market names them: "#4" = 12 mm. */
export const BAR_SIZES: Array<{ mm: BarSizeMm; bar: string }> = [
  { mm: 10, bar: "#3" },
  { mm: 12, bar: "#4" },
  { mm: 16, bar: "#5" },
  { mm: 20, bar: "#6" },
];
export const barName = (mm: number | null | undefined) => BAR_SIZES.find((b) => b.mm === mm)?.bar ?? "";

/** Footing thickness the form suggests per type (inches): 9" strip, 12" pads / raft / pile cap. */
export const FOOTING_THICKNESS_DEFAULT: Record<FoundationType, number> = { STRIP: 9, ISOLATED: 12, COMBINED: 12, RAFT: 12, PILE: 12 };

/** Pad footings: a count and an L × W size. */
export const hasPads = (type: FoundationType) => type === "ISOLATED" || type === "COMBINED";
/** Footing width: the strip width, or a pad's W. */
export const hasFootingWidth = (type: FoundationType) => type === "STRIP" || hasPads(type);
export const isPile = (type: FoundationType) => type === "PILE";
/** RCC mix + main steel apply everywhere except a brick / stone strip footing. */
export const rccApplies = (type: FoundationType, masonry: FoundationMasonry) => type !== "STRIP" || masonry === "RCC_ONLY";

/** Bar size as the select stores it ("12" = 12 mm). */
export type BarSizeValue = "10" | "12" | "16" | "20";

/** Form values of the foundation card (numbers nullable while typing; bar size as a select string). */
export interface FoundationFormValues {
  type: FoundationType;
  excavationDepthFt: number | null;
  footingWidthFt: number | null;
  footingThicknessIn: number | null;
  plinthHeightFt: number | null;
  dpcThicknessIn: number | null;
  footingCount: number | null;
  footingLengthFt: number | null;
  pileCount: number | null;
  pileDiameterIn: number | null;
  pileDepthFt: number | null;
  masonry: FoundationMasonry;
  pccMix: PccMix;
  pccThicknessIn: number | null;
  rccMix: RccMix;
  mainBarMm: BarSizeValue;
  termiteTreatment: boolean;
  dpcMaterial: DpcMaterial;
  soilType: SoilType | null;
  waterTableDepthFt: number | null;
  dewateringNeeded: boolean;
  soilTestDone: boolean;
  soilTestNote: string;
  notes: string;
}

/** A typical Pakistani house: brick strip footing 5 ft deep, 3 ft wide, 9" thick, 2 ft plinth, 1.5" DPC, PCC 1:4:8 × 3". */
export const FOUNDATION_DEFAULTS: FoundationFormValues = {
  type: "STRIP",
  excavationDepthFt: 5,
  footingWidthFt: 3,
  footingThicknessIn: FOOTING_THICKNESS_DEFAULT.STRIP,
  plinthHeightFt: 2,
  dpcThicknessIn: 1.5,
  footingCount: null,
  footingLengthFt: null,
  pileCount: null,
  pileDiameterIn: null,
  pileDepthFt: null,
  masonry: "BRICK",
  pccMix: "1:4:8",
  pccThicknessIn: 3,
  rccMix: "1:2:4",
  mainBarMm: "12",
  termiteTreatment: true,
  dpcMaterial: "PCC_WATERPROOF",
  soilType: "MEDIUM",
  waterTableDepthFt: null,
  dewateringNeeded: false,
  soilTestDone: false,
  soilTestNote: "",
  notes: "",
};

/** Saved foundation → form values (defaults when none is saved yet). */
export function foundationToForm(f: ProjectFoundation | null | undefined): FoundationFormValues {
  if (!f) return { ...FOUNDATION_DEFAULTS };
  return {
    type: f.type,
    excavationDepthFt: f.excavationDepthFt,
    footingWidthFt: f.footingWidthFt ?? FOUNDATION_DEFAULTS.footingWidthFt,
    footingThicknessIn: f.footingThicknessIn,
    plinthHeightFt: f.plinthHeightFt,
    dpcThicknessIn: f.dpcThicknessIn,
    footingCount: f.footingCount,
    footingLengthFt: f.footingLengthFt,
    pileCount: f.pileCount,
    pileDiameterIn: f.pileDiameterIn,
    pileDepthFt: f.pileDepthFt,
    masonry: f.masonry,
    pccMix: f.pccMix,
    pccThicknessIn: f.pccThicknessIn,
    rccMix: f.rccMix ?? FOUNDATION_DEFAULTS.rccMix,
    mainBarMm: f.mainBarMm ? (String(f.mainBarMm) as BarSizeValue) : FOUNDATION_DEFAULTS.mainBarMm,
    termiteTreatment: f.termiteTreatment,
    dpcMaterial: f.dpcMaterial,
    soilType: f.soilType,
    waterTableDepthFt: f.waterTableDepthFt,
    dewateringNeeded: f.dewateringNeeded,
    soilTestDone: f.soilTestDone,
    soilTestNote: f.soilTestNote ?? "",
    notes: f.notes ?? "",
  };
}

const n = (v: number | null) => v as number;

/** Validated form values → request body: only the fields that apply to the type are sent. */
export function foundationToBody(v: FoundationFormValues): FoundationInput {
  const rcc = rccApplies(v.type, v.masonry);
  return {
    type: v.type,
    excavationDepthFt: n(v.excavationDepthFt),
    footingThicknessIn: n(v.footingThicknessIn),
    plinthHeightFt: n(v.plinthHeightFt),
    dpcThicknessIn: n(v.dpcThicknessIn),
    ...(hasFootingWidth(v.type) ? { footingWidthFt: n(v.footingWidthFt) } : {}),
    ...(hasPads(v.type) ? { footingCount: n(v.footingCount), footingLengthFt: n(v.footingLengthFt) } : {}),
    ...(isPile(v.type) ? { pileCount: n(v.pileCount), pileDiameterIn: n(v.pileDiameterIn), pileDepthFt: n(v.pileDepthFt) } : {}),
    masonry: v.masonry,
    pccMix: v.pccMix,
    pccThicknessIn: n(v.pccThicknessIn),
    ...(rcc ? { rccMix: v.rccMix, mainBarMm: Number(v.mainBarMm) as BarSizeMm } : {}),
    termiteTreatment: v.termiteTreatment,
    dpcMaterial: v.dpcMaterial,
    ...(v.soilType ? { soilType: v.soilType } : {}),
    waterTableDepthFt: v.waterTableDepthFt,
    dewateringNeeded: v.dewateringNeeded,
    soilTestDone: v.soilTestDone,
    ...(v.soilTestDone && v.soilTestNote.trim() ? { soilTestNote: v.soilTestNote.trim() } : {}),
    ...(v.notes.trim() ? { notes: v.notes.trim() } : {}),
  };
}
