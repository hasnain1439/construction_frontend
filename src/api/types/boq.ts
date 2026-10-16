/**
 * Step 11 — estimate revisions (BoQ), owner shopping list and the estimation rulebook.
 * Shapes follow PHASE_2_3_CONTRACTS.md "Step 11" (the OpenAPI document has examples, no schema).
 * Money keys are ABSENT (not null) without `fields.rates`; `contractTotalPaisa` needs
 * `fields.contract`; the margin needs `fields.contract` + `fields.profit` — hence `?`.
 */
import type { Id, IsoDateTime, Paisa } from "./common";
import type { EstimateWarning } from "./estimate";
import type { ContractType, FloorLevel, StructureType } from "./projects";

export const BOQ_SECTIONS = [
  "EXCAVATION_EARTHWORK",
  "CONCRETE",
  "STEEL",
  "MASONRY",
  "PLASTER",
  "ROOF_WATERPROOFING",
  "FLOORING_TILES",
  "PAINT",
  "MEP_ROUGH_IN",
  "GREY_LABOUR",
  "FINISHING_LABOUR",
  "EQUIPMENT_SHUTTERING",
  "SITE_OVERHEADS",
  "CONTINGENCY",
] as const;
export type BoqSection = (typeof BOQ_SECTIONS)[number];

export const BUILD_STAGES = [
  "FOUNDATION_PLINTH",
  "GF_STRUCTURE",
  "F1_STRUCTURE",
  "F2_STRUCTURE",
  "F3_STRUCTURE",
  "MUMTY_ROOF",
  "PLASTER_MEP",
  "FINISHING",
] as const;
export type BuildStageKey = (typeof BUILD_STAGES)[number];

export type BoqLineKind = "MATERIAL" | "LABOUR" | "LUMP_SUM" | "PERCENT";
export type BoqSuppliedBy = "CONTRACTOR" | "OWNER";
export type BoqRateStatus = "OK" | "RATE_MISSING" | "UNIT_MISMATCH" | "OWNER_SUPPLIED";
export type EstimateRevisionStatus = "DRAFT" | "APPROVED" | "SUPERSEDED";
export type RulebookRegion = "PUNJAB_KP" | "KARACHI_SINDH";
export type ParameterSource = "RULEBOOK" | "COMPANY" | "PROJECT";
export type ReviewStatus = "PENDING_ENGINEER_REVIEW" | "REVIEWED";
export type RulebookGroup =
  | "WALLS"
  | "MASONRY"
  | "CONCRETE"
  | "STEEL"
  | "PLASTER"
  | "FACTORS"
  | "WASTAGE"
  | "WATERPROOFING"
  | "FINISHES"
  | "MEP"
  | "EARTHWORK"
  | "OVERHEADS"
  | "NORMS"
  | "PRODUCTIVITY";

type Person = { id: Id; name: string };

export interface BoqLineOverride {
  quantity: number | null;
  ratePaisa?: Paisa | null;
  note: string;
  by: Person | null;
  at: IsoDateTime;
}

export interface BoqLine {
  /** Saved revision: the line id; live preview: the `lineKey`. */
  id: string;
  lineKey: string;
  section: BoqSection;
  stageKey: BuildStageKey | null;
  kind: BoqLineKind;
  description: string;
  material: string | null;
  materialId: Id | null;
  unit: string;
  /** Net quantity (PERCENT lines: the %). */
  quantity: number;
  wastagePercent: number;
  quantityWithWastage: number;
  suppliedBy: BoqSuppliedBy;
  formula: string;
  trace: string[];
  override: BoqLineOverride | null;
  effectiveQuantity: number;
  // fields.rates only ↓
  ratePaisa?: Paisa | null;
  effectiveRatePaisa?: Paisa | null;
  rateUnit?: string | null;
  /** PERCENT lines: the base amount in paisa. */
  rateQuantity?: number | null;
  amountPaisa?: Paisa | null;
  rateStatus?: BoqRateStatus | null;
}

export interface BoqSectionBlock {
  section: BoqSection;
  lines: BoqLine[];
  amountPaisa?: Paisa;
}

export interface BoqStageTotal {
  stageKey: BuildStageKey;
  amountPaisa?: Paisa;
}

export type RulebookRef = { id: Id; region: RulebookRegion; version: number } | null;

/** Money of an estimate / preview (each key absent without its field permission). */
export interface BoqMoney {
  directCostPaisa?: Paisa;
  overheadPaisa?: Paisa;
  contingencyPaisa?: Paisa;
  totalPaisa?: Paisa;
  perSqftPaisa?: Paisa | null;
  contractTotalPaisa?: Paisa | null;
  marginPaisa?: Paisa | null;
  marginPercent?: number | null;
}

export interface EstimateSummary extends BoqMoney {
  id: Id;
  projectId: Id;
  revision: number;
  status: EstimateRevisionStatus;
  ratesOutdated: boolean;
  note: string | null;
  region: RulebookRegion;
  rulebook: RulebookRef;
  generatedAt: IsoDateTime;
  generatedBy: Person | null;
  approvedAt: IsoDateTime | null;
  approvedBy: Person | null;
  supersededAt: IsoDateTime | null;
  coveredAreaSqft: number;
  lineCount: number;
  ownerSuppliedLines: number;
}

export type ParameterValues = Record<string, { value: number; source: ParameterSource }>;

export interface EstimateDetail extends EstimateSummary {
  project: { id: Id; code: string; name: string; contractType: ContractType | null };
  sections: BoqSectionBlock[];
  stages: BoqStageTotal[];
  parameters: ParameterValues;
  warnings: EstimateWarning[];
  basis: {
    structureType: StructureType;
    coveredAreaSqft: number;
    floors: Array<{ level: FloorLevel; name: string; rooms: number; footprintSqft?: number; roomAreaSqft?: number }>;
  } & Record<string, unknown>;
}

/** `boq` of GET /projects/:id/estimate — exactly what Generate would save. */
export interface BoqPreview extends BoqMoney {
  rulebook: RulebookRef;
  region: RulebookRegion;
  coveredAreaSqft: number;
  parameters: ParameterValues;
  sections: BoqSectionBlock[];
  stages: BoqStageTotal[];
  warnings: EstimateWarning[];
}

export type CompareChange = "ADDED" | "REMOVED" | "CHANGED" | "UNCHANGED";

export interface EstimateCompareLine {
  lineKey: string;
  section: BoqSection;
  stageKey: BuildStageKey | null;
  description: string;
  unit: string;
  change: CompareChange;
  quantityA: number | null;
  quantityB: number | null;
  quantityDelta: number;
  ratePaisaA?: Paisa | null;
  ratePaisaB?: Paisa | null;
  amountPaisaA?: Paisa | null;
  amountPaisaB?: Paisa | null;
  amountDeltaPaisa?: Paisa | null;
}

export interface EstimateCompare {
  a: EstimateSummary;
  b: EstimateSummary;
  lines: EstimateCompareLine[];
  sections: Array<{ section: BoqSection; amountPaisaA?: Paisa; amountPaisaB?: Paisa; deltaPaisa?: Paisa }>;
  totals?: { totalPaisaA: Paisa; totalPaisaB: Paisa; deltaPaisa: Paisa; deltaPercent: number | null };
}

export type ShoppingListSource = "APPROVED" | "DRAFT" | "PREVIEW" | "ESTIMATE";

export interface OwnerShoppingItem {
  material: string;
  materialId: Id | null;
  description: string;
  unit: string;
  quantity: number;
  neededBy: BuildStageKey;
  stages: Array<{ stageKey: BuildStageKey; quantity: number }>;
}

export interface OwnerShoppingList {
  source: ShoppingListSource;
  estimateId: Id | null;
  revision: number | null;
  items: OwnerShoppingItem[];
}

export interface LineOverrideBody {
  quantity?: number | null;
  ratePaisa?: Paisa | null;
  note?: string;
}

// ─── Company rulebook ───────────────────────────────────────────────────────

export interface LocalizedLabel {
  en: string;
  roman: string;
  ur: string;
}

export interface CompanyRulebookParameter {
  key: string;
  group: RulebookGroup;
  label: LocalizedLabel;
  unit: string;
  description: string;
  platformValue: number;
  companyValue: number | null;
  companyNote: string | null;
  value: number;
  source: "RULEBOOK" | "COMPANY";
  safeMin: number;
  safeMax: number;
  reviewStatus: ReviewStatus;
  projectOverridable: boolean;
}

export interface CompanyRulebook {
  region: RulebookRegion;
  /** null = the built-in v1 defaults (no published version yet). */
  rulebook: { id: Id; version: number; status: "DRAFT" | "PUBLISHED"; publishedAt: IsoDateTime | null; notes: string | null } | null;
  parameters: CompanyRulebookParameter[];
}

export interface RulebookOverridesBody {
  overrides: Array<{ key: string; value: number; note?: string }>;
}

// ─── Platform admin rulebook ────────────────────────────────────────────────

export interface AdminRulebook {
  id: Id;
  region: RulebookRegion;
  version: number;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: IsoDateTime | null;
  notes: string | null;
  parameterCount: number;
  pendingReview: number;
  createdAt: IsoDateTime;
}

export interface AdminRulebookParameter {
  id: Id;
  key: string;
  group: RulebookGroup;
  label: LocalizedLabel;
  unit: string;
  description: string;
  value: number;
  safeMin: number;
  safeMax: number;
  reviewStatus: ReviewStatus;
  sortOrder: number;
}

export interface AdminRulebookDetail extends Omit<AdminRulebook, "parameterCount" | "pendingReview"> {
  parameters: AdminRulebookParameter[];
}

export interface CreateRulebookBody {
  region: RulebookRegion;
  notes?: string;
  copyFromId?: Id;
}

export interface UpdateRulebookParameterBody {
  value?: number;
  safeMin?: number;
  safeMax?: number;
  reviewStatus?: ReviewStatus;
  label?: Partial<LocalizedLabel>;
  description?: string;
}
