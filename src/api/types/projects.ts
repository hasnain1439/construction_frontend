/**
 * Clients + projects. Request bodies are generated; response shapes follow the
 * backend's `projects.dto.ts` (the OpenAPI document has examples but no schema).
 *
 * Financial fields are OMITTED (not null) for callers without `billing.view`, hence `?`.
 */
import type { Id, IsoDate, IsoDateTime, NamedRef, Paisa, QueryParams, RequestBody } from "./common";
import type { BillingModel } from "./masterData";
import type { ProjectChangeSummary } from "./changeOrders";

// ─── Clients ────────────────────────────────────────────────────────────────

export interface Client {
  id: Id;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  isDemo?: boolean;
  createdAt: IsoDateTime;
  projectsCount?: number;
}

export interface ClientDetail extends Client {
  projects: Array<{
    id: Id;
    code: string;
    name: string;
    status: ProjectStatus;
    city: string | null;
    startDate: IsoDate | null;
    endDate: IsoDate | null;
  }>;
}

export type ClientsQuery = QueryParams<"/api/v1/clients", "get">;
export type CreateClientBody = RequestBody<"/api/v1/clients", "post">;
export type UpdateClientBody = RequestBody<"/api/v1/clients/{id}", "patch">;

// ─── Vocabulary ─────────────────────────────────────────────────────────────

export type ProjectStatus = "DRAFT" | "ACTIVE" | "CLOSEOUT" | "HANDED_OVER" | "CLOSED" | "READ_ONLY";
export type ContractType = "FULL" | "GREY_OWNER_FINISHING" | "LABOR_ONLY";
export type PlotUnit = "MARLA" | "KANAL" | "SQFT";
export type StructureType = "FRAMED" | "LOAD_BEARING";
export type BoundaryThickness = "IN_4_5" | "IN_9";
export type SuppliedBy = "CONTRACTOR" | "OWNER";
export type BillingStageStatus = "UPCOMING" | "INVOICED" | "PAID";
export type FloorLevel = "BASEMENT" | "GROUND" | "FIRST" | "SECOND" | "THIRD" | "MUMTY";
export type RoomType =
  | "MASTER_BEDROOM"
  | "BEDROOM"
  | "ATTACHED_BATH"
  | "POWDER_ROOM"
  | "KITCHEN"
  | "TV_LOUNGE"
  | "DRAWING_ROOM"
  | "DINING"
  | "STORE"
  | "TERRACE"
  | "STAIR"
  | "GARAGE"
  | "OTHER";
export type OpeningType = "DOOR" | "WINDOW" | "VENTILATOR";
export type SupplyCategoryKey =
  | "CEMENT"
  | "BRICKS"
  | "STEEL"
  | "SAND_BAJRI"
  | "PIPES"
  | "WATERPROOFING"
  | "ELECTRICAL"
  | "TILES_FLOORING"
  | "SANITARY"
  | "WOODWORK"
  | "PAINT";

// ─── Projects ───────────────────────────────────────────────────────────────

export interface ProjectTeam {
  pm: NamedRef | null;
  munshis: NamedRef[];
}

export interface ProjectListItem {
  id: Id;
  code: string;
  name: string;
  client: NamedRef | null;
  siteAddress: string | null;
  city: string | null;
  status: ProjectStatus;
  contractType: ContractType | null;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  pm: NamedRef | null;
  munshi: NamedRef | null;
  coveredAreaSqft: number | null;
  contractValuePaisa?: Paisa | null;
  /** Sample project from "Try with demo data" (never counts against the plan). */
  isDemo?: boolean;
}

export type ProjectsQuery = QueryParams<"/api/v1/projects", "get">;

export interface ProjectContract {
  contractType: ContractType | null;
  billingModel: BillingModel | null;
  contractValuePaisa?: Paisa | null;
  ratePerSqftPaisa?: Paisa | null;
  contractTotalPaisa?: Paisa | null;
  retentionPercent: number;
  defectPeriodMonths: number;
}

export interface ProjectPlot {
  plotUnit: PlotUnit | null;
  plotSize: number | null;
  marlaStandard: number;
  frontFt: number | null;
  depthFt: number | null;
  cornerPlot: boolean;
}

export interface ProjectStructure {
  structureType: StructureType | null;
  hasBasement: boolean;
  basementHeightFt: number | null;
}

/** Foundation (bunyaad) request body of PATCH /projects/:id/plot-structure. */
export type FoundationInput = NonNullable<UpdatePlotStructureBody["foundation"]>;
export type FoundationType = FoundationInput["type"];
export type FoundationMasonry = FoundationInput["masonry"];
export type PccMix = FoundationInput["pccMix"];
export type RccMix = NonNullable<FoundationInput["rccMix"]>;
/** Main bar diameter in mm: 10 (#3), 12 (#4), 16 (#5), 20 (#6). */
export type BarSizeMm = NonNullable<FoundationInput["mainBarMm"]>;
export type DpcMaterial = NonNullable<FoundationInput["dpcMaterial"]>;
export type SoilType = NonNullable<FoundationInput["soilType"]>;

/** Saved foundation (backend foundation.ts): every key present, null where it does not apply to the type. */
export interface ProjectFoundation {
  type: FoundationType;
  excavationDepthFt: number;
  footingWidthFt: number | null;
  footingThicknessIn: number;
  plinthHeightFt: number;
  dpcThicknessIn: number;
  footingCount: number | null;
  footingLengthFt: number | null;
  pileCount: number | null;
  pileDiameterIn: number | null;
  pileDepthFt: number | null;
  masonry: FoundationMasonry;
  pccMix: PccMix;
  pccThicknessIn: number;
  rccMix: RccMix | null;
  mainBarMm: BarSizeMm | null;
  termiteTreatment: boolean;
  dpcMaterial: DpcMaterial;
  soilType: SoilType | null;
  waterTableDepthFt: number | null;
  dewateringNeeded: boolean;
  soilTestDone: boolean;
  soilTestNote: string | null;
  notes: string | null;
}

export interface ProjectCoverage {
  coveredAreaSqft: number | null;
  semiCoveredSqft: number;
  openAreaSqft: number;
  boundaryWall: boolean;
  boundaryLengthFt: number | null;
  boundaryHeightFt: number | null;
  boundaryThickness: BoundaryThickness | null;
  boundaryPlasterSides: number | null;
}

export interface SupplyRule {
  categoryKey: SupplyCategoryKey;
  label: string;
  suppliedBy: SuppliedBy;
  qualityCategory: { id: Id; name: string; code: string } | null;
  locked: boolean;
}

export interface BillingStage {
  id: Id;
  sortOrder: number;
  label: string;
  percent: number;
  isRetention: boolean;
  amountPaisa?: Paisa | null;
  status: BillingStageStatus;
}

export interface AreaTotals {
  rooms: number;
  totalFloorAreaSqft: number;
  netWallAreaSqft: number;
  wetRooms: number;
}

/** Roof / slab (lenter) request body: `floors[].roof` of PATCH /projects/:id/plot-structure. */
export type RoofInput = NonNullable<UpdatePlotStructureBody["floors"][number]["roof"]>;
export type RoofType = RoofInput["type"];
export type BarNo = NonNullable<RoofInput["mainBar"]>;
export type TIronSection = NonNullable<RoofInput["tIronSection"]>;
export type RoofInfill = NonNullable<RoofInput["infill"]>;
export type RoofMix = NonNullable<RoofInput["concreteMix"]>;
export type SteelGrade = NonNullable<RoofInput["steelGrade"]>;

/** Saved roof (backend roof.ts): every key present, null where it does not apply to the type. */
export interface FloorRoof {
  type: RoofType;
  thicknessIn: number | null;
  concreteMix: RoofMix;
  steelGrade: SteelGrade;
  mainBar: BarNo | null;
  mainSpacingIn: number | null;
  distBar: BarNo | null;
  distSpacingIn: number | null;
  topBars: boolean | null;
  coverIn: number | null;
  chajjaLengthFt: number | null;
  chajjaWidthFt: number | null;
  beamWidthIn: number;
  beamDepthIn: number;
  beamBars: number;
  beamBar: BarNo;
  stirrupBar: BarNo;
  stirrupSpacingIn: number;
  beamRunFt: number | null;
  columnCount: number | null;
  columnWidthIn: number;
  columnDepthIn: number;
  columnBars: number;
  columnBar: BarNo;
  tieBar: BarNo;
  tieSpacingIn: number;
  tIronSection: TIronSection | null;
  tIronSpacingFt: number | null;
  infill: RoofInfill | null;
  screedThicknessIn: number | null;
  earthFillIn: number | null;
  plankAreaSqft: number | null;
  deckAreaSqft: number | null;
  toppingIn: number | null;
  mesh: boolean | null;
  notes: string | null;
}

/** RCC slab thickness suggested by the floor's largest room short span. */
export interface SlabSuggestion {
  spanFt: number | null;
  suggestedIn: number;
  minIn: number;
  beamAdvised: boolean;
}

export interface FloorSummary {
  id: Id;
  level: FloorLevel;
  name: string;
  ceilingHeightFt: number;
  sortOrder: number;
  /** Absent from an older API; null = not entered. */
  roof?: FloorRoof | null;
  slabSuggestion?: SlabSuggestion;
  calculations: AreaTotals;
}

export interface ProjectCalculations extends AreaTotals {
  plotAreaSqft: number | null;
  frontageAreaSqft: number | null;
  plotAreaMismatch: boolean;
}

/** Fields every role (incl. MUNSHI) receives. */
export interface ProjectBasic {
  id: Id;
  code: string;
  name: string;
  status: ProjectStatus;
  /** Sample project from "Try with demo data". */
  isDemo?: boolean;
  client: { id: Id; name: string; phone?: string } | null;
  siteAddress: string | null;
  city: string | null;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  team: ProjectTeam;
}

/** THEKEDAR / PM view. MUNSHI gets only {@link ProjectBasic}. */
export interface ProjectDetail extends ProjectBasic {
  contract?: ProjectContract;
  plot?: ProjectPlot;
  structure?: ProjectStructure;
  /** null = not entered yet. */
  foundation?: ProjectFoundation | null;
  coverage?: ProjectCoverage;
  supplyRules?: SupplyRule[];
  billingStages?: BillingStage[];
  floors?: FloorSummary[];
  calculations?: ProjectCalculations;
  wizardCompletedSteps?: number[];
  createdFromQuoteId?: Id | null;
  activatedAt?: IsoDateTime | null;
  createdAt?: IsoDateTime;
  updatedAt?: IsoDateTime;
  nextStep?: "ESTIMATE";
  /** Step 15: approved change orders → revised contract (fields.contract) and revised end date. */
  changeOrders?: ProjectChangeSummary;
}

export type CreateProjectBody = RequestBody<"/api/v1/projects", "post">;
export type UpdateBasicBody = RequestBody<"/api/v1/projects/{id}/basic", "patch">;
export type SetTeamBody = RequestBody<"/api/v1/projects/{id}/team", "put">;
export type UpdateContractBody = RequestBody<"/api/v1/projects/{id}/contract", "patch">;
export type UpdatePlotStructureBody = RequestBody<"/api/v1/projects/{id}/plot-structure", "patch">;
export type UpdateCoverageBody = RequestBody<"/api/v1/projects/{id}/coverage", "patch">;
export type ChangeStatusBody = RequestBody<"/api/v1/projects/{id}/status", "patch">;

export interface ReviewIssue {
  tab: number;
  code: string;
  message: string;
}

export interface ProjectReview {
  ready: boolean;
  errors: ReviewIssue[];
  warnings: ReviewIssue[];
  summary: {
    client: { name: string; phone: string } | null;
    contract: {
      contractType: ContractType | null;
      billingModel: BillingModel | null;
      contractTotalPaisa?: Paisa | null;
      retentionPercent: number;
      defectPeriodMonths: number;
      billingStages: number;
    };
    plot: {
      plotUnit: PlotUnit | null;
      plotSize: number | null;
      plotAreaSqft: number | null;
      frontFt: number | null;
      depthFt: number | null;
      cornerPlot: boolean;
    };
    structure: { structureType: StructureType | null; hasBasement: boolean; floors: number };
    /** Absent from an older API; null = not entered. */
    foundation?: ProjectFoundation | null;
    coverage: {
      coveredAreaSqft: number | null;
      semiCoveredSqft: number;
      openAreaSqft: number;
      boundaryWall: boolean;
    };
    roomsPerFloor: Array<AreaTotals & { level: FloorLevel; name: string }>;
    supply: { contractor: number; owner: number };
  };
}

export interface SupplyPreset {
  contractType: ContractType;
  label: string;
  rules: Array<{ categoryKey: SupplyCategoryKey; suppliedBy: SuppliedBy; label: string }>;
}

// ─── Floors, rooms, openings ────────────────────────────────────────────────

export type WallSide = "TOP" | "RIGHT" | "BOTTOM" | "LEFT";
export type WallType = "EXTERNAL" | "SHARED" | "PARTY" | "DOUBLE" | "OPEN" | "PASSAGE";

export interface Opening {
  id: Id;
  type: OpeningType;
  widthFt: number;
  heightFt: number;
  quantity: number;
  /** Wall the opening is in; null = not placed. */
  side?: WallSide | null;
}

/** One side of a room (backend walls.ts). TOP / BOTTOM run along the length, LEFT / RIGHT along the width. */
export interface RoomWall {
  side: WallSide;
  type: WallType;
  thicknessIn: number | null;
  innerLeafIn: number | null;
  cavityIn: number | null;
  sharedWithRoomId: Id | null;
  sharedWithSide: WallSide | null;
  existing: boolean;
}

export interface RoomCalculations {
  floorAreaSqft: number;
  grossWallAreaSqft: number;
  openingsAreaSqft: number;
  netWallAreaSqft: number;
}

export interface Room {
  id: Id;
  floorId: Id;
  type: RoomType;
  name: string;
  lengthFt: number;
  widthFt: number;
  heightFt: number;
  isWet: boolean;
  isWetOverridden: boolean;
  sortOrder: number;
  openings: Opening[];
  /** null = not entered (absent from an older API). */
  walls?: RoomWall[] | null;
  calculations: RoomCalculations;
}

export interface FloorWithRooms extends FloorSummary {
  rooms: Room[];
}

export interface ProjectFloors {
  floors: FloorWithRooms[];
  totals: AreaTotals;
}

export type CreateRoomBody = RequestBody<"/api/v1/floors/{id}/rooms", "post">;
export type UpdateRoomBody = RequestBody<"/api/v1/rooms/{id}", "patch">;
export type CreateOpeningBody = RequestBody<"/api/v1/rooms/{id}/openings", "post">;
export type UpdateOpeningBody = RequestBody<"/api/v1/openings/{id}", "patch">;
export type CopyFloorBody = RequestBody<"/api/v1/floors/{id}/copy", "post">;
export type SetRoomWallsBody = RequestBody<"/api/v1/rooms/{id}/walls", "put">;
export type AutoWallsBody = RequestBody<"/api/v1/floors/{id}/walls/auto", "post">;

export interface Deleted {
  id: Id;
  deleted: true;
}
