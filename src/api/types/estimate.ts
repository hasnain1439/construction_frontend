/**
 * Project estimate (BoQ) — GET /projects/:id/estimate, PUT /projects/:id/estimate/settings.
 * Response shapes follow the backend's `estimate.service.ts` (the OpenAPI document has an example
 * but no schema). Rates / amounts / cost are OMITTED without `fields.rates`, the contract value
 * without `fields.contract`, the margin without `fields.profit` — hence `?`.
 */
import type { Id, IsoDateTime, Paisa, RequestBody } from "./common";
import type { ContractType, FloorLevel, StructureType, SuppliedBy } from "./projects";
import type { BoqPreview } from "./boq";

export type EstimateStage = "FOUNDATION" | "WALLS" | "RCC" | "PLASTER";
export type EstimateMaterial =
  | "cement"
  | "bricks"
  | "sand"
  | "crush"
  | "steel"
  | "steel10"
  | "steel12"
  | "steel16"
  | "steel20"
  | "tIron"
  | "roofTile"
  | "precastPlank"
  | "steelDeck"
  | "waterproofing"
  | "bitumen"
  | "termite"
  | "stone";
/** DETAILED = from the walls / roof entered; ESTIMATED = the % / perimeter rules of thumb. */
export type EstimateMethod = "DETAILED" | "ESTIMATED";
export type EstimateElement =
  | "excavation"
  | "pcc"
  | "footing"
  | "foundationMasonry"
  | "dpc"
  | "termite"
  | "walls"
  | "parapet"
  | "slab"
  | "chajja"
  | "girders"
  | "roofInfill"
  | "screed"
  | "earthFill"
  | "planks"
  | "deck"
  | "topping"
  | "frame"
  | "beams"
  | "columns"
  | "lintels"
  | "plasterInternal"
  | "plasterCeiling"
  | "plasterExternal"
  | "plasterParapet";
export type EstimateMeasure = "VOLUME" | "AREA" | "SHUTTERING";
export type EstimateRateStatus = "OK" | "RATE_MISSING" | "UNIT_MISMATCH";
export type EstimateLabourItem = "BRICK_MASONRY" | "PLASTER" | "SHUTTERING" | "STEEL_FIXING" | "PER_SQFT";

export type MortarMix = "1:3" | "1:4" | "1:5" | "1:6" | "1:8";
export type PlasterMix = "1:3" | "1:4" | "1:5" | "1:6";

export interface EstimateSettings {
  externalWallThicknessIn: number;
  internalWallThicknessIn: number;
  parapetHeightFt: number;
  bricksPerCft: number;
  mortarPerCftBrickwork: number;
  masonryMortarMix: MortarMix;
  slabThicknessIn: number;
  rccMix: "1:1.5:3" | "1:2:4";
  frameConcretePercent: number;
  slabSteelPercent: number;
  frameSteelPercent: number;
  lintelSteelPercent: number;
  footingSteelPercent: number;
  lintelWidthIn: number;
  lintelDepthIn: number;
  lintelBearingFt: number;
  internalPlasterMix: PlasterMix;
  internalPlasterThicknessIn: number;
  externalPlasterMix: PlasterMix;
  externalPlasterThicknessIn: number;
  foundationWallLengthFt: number | null;
  waterproofingKgPerBag: number;
  bitumenKgPerSqft: number;
  termiteLitrePerSqft: number;
  wastagePercent: number;
  brickWastagePercent: number;
  concreteDryFactor: number;
  mortarDryFactor: number;
  cementBagCft: number;
  includeLabour: boolean;
  labourRatePerSqftPaisa: Paisa | null;
}

export interface EstimateFormula {
  key: string;
  params: Record<string, number | string>;
}

export interface EstimateLine {
  id: string;
  stage: EstimateStage;
  floor: { level: FloorLevel; name: string } | null;
  element: EstimateElement;
  kind: "WORK" | "MATERIAL";
  measure: EstimateMeasure | null;
  material: EstimateMaterial | null;
  netQuantity: number;
  wastagePercent: number;
  quantity: number;
  unit: string;
  formula: EstimateFormula;
  formulaText: string;
  /** Absent from an older API (= ESTIMATED). */
  method?: EstimateMethod;
  suppliedBy: SuppliedBy | null;
  ratePaisa?: Paisa | null;
  rateUnit?: string | null;
  rateQuantity?: number | null;
  amountPaisa?: Paisa | null;
  rateStatus?: EstimateRateStatus | null;
}

export interface EstimateStageBlock {
  stage: EstimateStage;
  lines: EstimateLine[];
  totals: Array<{ material: EstimateMaterial; quantity: number }>;
  materialsPaisa?: Paisa;
  ownerSuppliedPaisa?: Paisa;
  missingRates?: number;
}

export interface EstimateMaterialRow {
  material: EstimateMaterial;
  unit: string;
  netQuantity: number;
  quantity: number;
  suppliedBy: SuppliedBy;
  materialId: Id | null;
  materialName: string | null;
  qualityCategory?: { id: Id; name: string } | null;
  ratePaisa?: Paisa | null;
  rateUnit?: string | null;
  rateQuantity?: number | null;
  amountPaisa?: Paisa | null;
  rateStatus?: EstimateRateStatus;
  /** Priced at the general steel rate (no rate for this bar size). */
  rateFallback?: boolean;
}

export interface EstimateFloorBasis {
  level: FloorLevel;
  name: string;
  heightFt: number;
  rooms: number;
  roomAreaSqft: number;
  footprintSqft: number;
  roomPerimeterFt: number;
  externalWallFt: number;
  internalWallFt: number;
  doorsSqft: number;
  windowsSqft: number;
  wallsMethod?: EstimateMethod;
  roofMethod?: EstimateMethod;
  walls?: {
    partyWallFt: number;
    partyExistingFt: number;
    openFt: number;
    builtRunFt: number;
    byThickness: Array<{ thicknessIn: number; lengthFt: number; areaSqft: number; volumeCft: number; bricks: number }>;
  } | null;
  roof?: {
    type: string;
    thicknessIn: number | null;
    largestSpanFt: number | null;
    steelBySize: Array<{ bar: number; mm: number; kg: number }>;
    bars: Array<{ use: string; bar: number; mm: number; count: number; lengthFt: number; label: string }>;
    beamRunFt: number | null;
    columnCount: number | null;
    columnCountAuto: boolean;
  } | null;
}

export type EstimateWarningCode =
  | "NO_FLOORS"
  | "NO_ROOMS"
  | "FOUNDATION_MISSING"
  | "STRUCTURE_TYPE_ASSUMED"
  | "COVERED_AREA_ESTIMATED"
  | "FOUNDATION_LENGTH_UNKNOWN"
  | "ROOMS_BELOW_COVERED"
  | "RATES_MISSING"
  | "LABOUR_RATES_MISSING"
  | "CONTRACT_VALUE_MISSING"
  | "CONTRACT_INCLUDES_FINISHING"
  | "STEEL_RATE_GENERIC"
  | "WALLS_PARTIAL"
  | "WALLS_UNPAIRED"
  | "ROOF_TOO_THIN"
  | "ROOF_SPAN_NEEDS_BEAM"
  | "ROOF_MAIN_SPACING_WIDE"
  | "ROOF_DIST_SPACING_WIDE"
  // BoQ (Step 11)
  | "STEEL_NORM_DEVIATION"
  | "RCC_NORM_DEVIATION";

export interface EstimateWarning {
  code: EstimateWarningCode;
  message: string;
  tab?: number;
  params?: Record<string, number>;
  /** The floor it is about (roof / wall warnings). */
  floor?: { level: FloorLevel; name: string };
  materials?: EstimateMaterial[];
  /** Labour items (live estimate) or BoQ material / labour keys (the BoQ's RATES_MISSING / LABOUR_RATES_MISSING). */
  items?: string[];
}

export interface ProjectEstimate {
  projectId: Id;
  projectCode: string;
  projectName: string;
  contractType: ContractType | null;
  generatedAt: IsoDateTime;
  settings: EstimateSettings;
  defaults: EstimateSettings;
  /** Settings keys that differ from the defaults. */
  customised: Array<keyof EstimateSettings>;
  basis: {
    structureType: StructureType;
    structureTypeAssumed: boolean;
    coveredAreaSqft: number;
    coveredAreaSource: "PROJECT" | "ROOMS" | "NONE";
    plotAreaSqft: number | null;
    aspectRatio: number;
    foundationWallLengthFt: number;
    foundationWallLengthAuto: boolean;
    foundationWallLengthSource?: "SETTING" | "WALLS" | "ESTIMATED" | "PLOT";
    methods?: { walls: EstimateMethod | "MIXED"; roof: EstimateMethod | "MIXED" };
    floors: EstimateFloorBasis[];
  };
  stages: EstimateStageBlock[];
  materials: EstimateMaterialRow[];
  labour: {
    method: "PER_SQFT" | "PIECE_RATES" | "EXCLUDED";
    lines: Array<{
      item: EstimateLabourItem;
      quantity: number;
      unit: string;
      ratePaisa?: Paisa | null;
      amountPaisa?: Paisa | null;
      rateStatus?: EstimateRateStatus;
    }>;
    totalPaisa?: Paisa;
  };
  cost?: {
    materialsPaisa: Paisa;
    ownerSuppliedPaisa: Paisa;
    labourPaisa: Paisa;
    totalPaisa: Paisa;
    perSqftPaisa: Paisa | null;
    contractTotalPaisa?: Paisa | null;
    marginPaisa?: Paisa | null;
    marginPercent?: number | null;
  };
  /**
   * The BoQ cost (needs fields.rates): the full Step 11 BoQ total (direct + overheads + contingency,
   * contractor scope) of the revision the BoQ page opens by default, else of the live preview.
   * The wizard, the review and the contract suggestion all use this one number (QA-A-01).
   */
  boqCost?: BoqCost;
  /** Contract value (labour-only: rate) from this estimate — needs fields.contract + fields.rates; null before a contract type. */
  contractSuggestion?: ContractSuggestion | null;
  warnings: EstimateWarning[];
  /** BoQ preview = what POST /projects/:id/estimates would save (Step 11). Absent from an older API. */
  boq?: BoqPreview;
}

/** Where the BoQ cost comes from: a saved revision or the live BoQ preview. */
export type BoqCostSource = "REVISION" | "LIVE";

export interface BoqCost {
  source: BoqCostSource;
  estimateId: Id | null;
  revision: number | null;
  status: "DRAFT" | "APPROVED" | "SUPERSEDED" | null;
  directCostPaisa: Paisa;
  overheadPaisa: Paisa;
  contingencyPaisa: Paisa;
  totalPaisa: Paisa;
  perSqftPaisa: Paisa | null;
  coveredAreaSqft: number;
  contractTotalPaisa?: Paisa | null;
  marginPaisa?: Paisa | null;
  marginPercent?: number | null;
}

/** Where a margin / finishing percentage comes from: the company settings or this project. */
export type MarginSource = "COMPANY" | "PROJECT";

export interface ContractSuggestion {
  /** CONTRACT_VALUE for FULL / GREY; RATE_PER_SQFT for LABOR_ONLY (owner buys the material). */
  kind: "CONTRACT_VALUE" | "RATE_PER_SQFT";
  contractType: ContractType;
  /** The BoQ total (contractor scope) the suggestion starts from — same as `boqCost.totalPaisa`. */
  basisPaisa: Paisa;
  basisSource?: BoqCostSource;
  estimateId?: Id | null;
  estimateRevision?: number | null;
  estimateStatus?: "DRAFT" | "APPROVED" | "SUPERSEDED" | null;
  coveredAreaSqft: number;
  marginPercent: number;
  marginSource: MarginSource;
  finishingAllowancePercent: number;
  finishingSource: MarginSource;
  /** FULL only, and only when the BoQ prices no finishing (otherwise finishing would be counted twice). */
  finishingApplies: boolean;
  companyMarginPercent: number;
  companyFinishingAllowancePercent: number;
  /** null without a cost (or covered area for a rate). */
  suggestedPaisa: Paisa | null;
  /** Contract value (labour-only: rate) already on the project. */
  currentPaisa: Paisa | null;
}

export type EstimateSettingsBody = RequestBody<"/api/v1/projects/{id}/estimate/settings", "put">;
export type ContractFromEstimateBody = RequestBody<"/api/v1/projects/{id}/contract/from-estimate", "post">;
