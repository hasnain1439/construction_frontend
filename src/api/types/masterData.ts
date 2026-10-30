/**
 * Master data. The backend documents request bodies (generated) but not response
 * schemas for this module, so response shapes below follow the documented examples
 * and live responses. Request bodies come from the generated file.
 */
import type { Id, IsoDateTime, NamedRef, Paisa, QueryParams, RequestBody } from "./common";

export type MaterialSection = "CIVIL" | "FINISHING";
export type SupplyCategory = "GREY_STRUCTURE" | "FINISHING";
export type MaterialSource = "PLATFORM" | "COMPANY";

export interface MaterialGroup {
  id: Id;
  code: string;
  name: string;
  section: MaterialSection;
  sortOrder: number;
}

export interface AltUnit {
  unit: string;
  factor: number;
}

export interface Material {
  id: Id;
  name: string;
  group: Omit<MaterialGroup, "sortOrder">;
  unit: string;
  unitDetail: string | null;
  altUnits: AltUnit[];
  supplyCategory: SupplyCategory;
  source: MaterialSource;
  isHidden: boolean;
}

export type MaterialsQuery = QueryParams<"/api/v1/materials", "get">;
export type CreateMaterialBody = RequestBody<"/api/v1/materials", "post">;
export type UpdateMaterialBody = RequestBody<"/api/v1/materials/{id}", "patch">;

// ─── Quality categories & price list ────────────────────────────────────────

export interface QualityCategory {
  id: Id;
  name: string;
  code: string;
  description: string | null;
  isDefault: boolean;
  isArchived: boolean;
  sortOrder: number;
  ratedMaterials?: number;
  copiedRates?: number;
}

export type QualityCategoriesQuery = QueryParams<"/api/v1/quality-categories", "get">;
export type CreateQualityCategoryBody = RequestBody<"/api/v1/quality-categories", "post">;
export type UpdateQualityCategoryBody = RequestBody<"/api/v1/quality-categories/{id}", "patch">;
export type DuplicateQualityCategoryBody = RequestBody<"/api/v1/quality-categories/{id}/duplicate", "post">;

export interface PriceListItem {
  material: {
    id: Id;
    name: string;
    unit: string;
    unitDetail: string | null;
    group: Omit<MaterialGroup, "sortOrder">;
  };
  ratePaisa: Paisa | null;
  specification: string | null;
  lastUpdatedAt: IsoDateTime | null;
  lastUpdatedBy: NamedRef | null;
}

export interface PriceList {
  category: QualityCategory;
  items: PriceListItem[];
}

export type PriceListQuery = QueryParams<"/api/v1/price-list", "get">;
export type UpdatePriceListBody = RequestBody<"/api/v1/price-list", "put">;
export type BulkPercentBody = RequestBody<"/api/v1/price-list/bulk-percent", "post">;
export type PriceHistoryQuery = QueryParams<"/api/v1/price-list/history", "get">;

export interface PriceListUpdateResult {
  categoryId: Id;
  percent?: number;
  changed: number;
  unchanged: number;
}

// ─── Price list Excel import ("Excel se rates") ────────────────────────────

export type PriceImportErrorCode =
  | "UNKNOWN_CATEGORY_COLUMN"
  | "CATEGORY_ARCHIVED"
  | "DUPLICATE_COLUMN"
  | "MATERIAL_REQUIRED"
  | "UNKNOWN_MATERIAL"
  | "MATERIAL_HIDDEN"
  | "DUPLICATE_ROW"
  | "NOT_A_NUMBER"
  | "NEGATIVE_RATE"
  | "RATE_TOO_LARGE"
  | "RATE_REQUIRED"
  | "SPEC_TOO_LONG";

export interface PriceImportError {
  /** Excel row (null = a column problem). */
  rowNumber: number | null;
  /** Header text of the cell's column (null = the whole row). */
  column: string | null;
  code: PriceImportErrorCode;
  message: string;
  value?: string;
  materialName?: string;
  categoryId?: Id;
}

export interface PriceImportChange {
  rowNumber: number;
  material: { id: Id; name: string; unit: string; group: string };
  category: { id: Id; name: string; code: string };
  /** Old rate, difference and % need fields.rates. */
  oldRatePaisa?: Paisa | null;
  diffPaisa?: Paisa | null;
  diffPercent?: number | null;
  newRatePaisa: Paisa;
  oldSpecification: string | null;
  newSpecification: string | null;
  rateChanged: boolean;
  specChanged: boolean;
}

export interface PriceImportPreview {
  fileName: string;
  categories: Array<{ id: Id; name: string; code: string }>;
  totalRows: number;
  changedCount: number;
  unchangedCount: number;
  errorCount: number;
  changes: PriceImportChange[];
  errors: PriceImportError[];
}

export interface PriceImportResult {
  fileName: string;
  changed: number;
  unchanged: number;
  skipped: number;
  categories: Array<{ id: Id; name: string; code: string; changed: number }>;
}

export interface RateHistory {
  material: { id: Id; name: string; unit: string };
  history: Array<{
    id: Id;
    category: { id: Id; name: string; code: string };
    ratePaisa: Paisa;
    specification: string | null;
    effectiveFrom: IsoDateTime;
    changedBy: NamedRef | null;
  }>;
}

// ─── Labour rates & payment templates ───────────────────────────────────────

export type LaborRateKind = "DAILY" | "SUBCONTRACT";
export type LaborUnit = "DAY" | "SQFT" | "TON" | "BRICK" | "RFT" | "LUMPSUM";

export interface LaborRate {
  id: Id;
  kind: LaborRateKind;
  key: string;
  label: string;
  labelRoman?: string | null;
  labelUrdu?: string | null;
  unit: LaborUnit;
  /** Absent on DAILY rows without `fields.wages`. */
  ratePaisa?: Paisa;
  overtimeMultiplier: number | null;
  updatedAt: IsoDateTime;
}

export type UpdateLaborRatesBody = RequestBody<"/api/v1/labor-rates", "put">;

export type BillingModel = "STAGE_SCHEDULE" | "RUNNING_BILLS";

export interface TemplateStage {
  label: string;
  percent: number;
  isRetention?: boolean;
}

export interface PaymentTemplate {
  id: Id;
  name: string;
  billingModel: BillingModel;
  isDefault: boolean;
  /** The contract type this template is the default schedule for (QA B-35); null / absent = any type. */
  contractType?: "FULL" | "GREY_OWNER_FINISHING" | "LABOR_ONLY" | null;
  stages: TemplateStage[];
  updatedAt: IsoDateTime;
}

export type CreatePaymentTemplateBody = RequestBody<"/api/v1/payment-templates", "post">;
export type UpdatePaymentTemplateBody = RequestBody<"/api/v1/payment-templates/{id}", "patch">;

// ─── Suppliers, workers, sub-contractors ────────────────────────────────────

export interface Supplier {
  id: Id;
  name: string;
  category: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  ntn: string | null;
  notes: string | null;
  isActive: boolean;
  /** Sample supplier from "Try with demo data". */
  isDemo?: boolean;
  createdAt: IsoDateTime;
  /** Present with rates.view (THEKEDAR, PM). */
  udhaarBalancePaisa?: Paisa;
  oldestUnpaidDays?: number | null;
}

export interface SupplierCurrentRate {
  material: { id: Id; name: string; unit: string };
  ratePaisa: Paisa;
  effectiveFrom: IsoDateTime;
  updatedBy: string | null;
}

export interface SupplierDetail extends Supplier {
  rates: SupplierCurrentRate[];
}

export interface SupplierRates {
  supplier: NamedRef;
  current: SupplierCurrentRate[];
  history: Array<{
    id: Id;
    material: { id: Id; name: string; unit: string };
    ratePaisa: Paisa;
    effectiveFrom: IsoDateTime;
    changedBy: NamedRef | null;
  }>;
}

export type SuppliersQuery = QueryParams<"/api/v1/suppliers", "get">;
export type CreateSupplierBody = RequestBody<"/api/v1/suppliers", "post">;
export type UpdateSupplierBody = RequestBody<"/api/v1/suppliers/{id}", "patch">;
export type SetSupplierRatesBody = RequestBody<"/api/v1/suppliers/{id}/rates", "put">;

/** Names of a worker type in the three UI languages (Roman Urdu / Urdu may be missing). */
export interface WorkerTypeNames {
  label: string;
  labelRoman: string | null;
  labelUrdu: string | null;
}

/** A company-defined worker type (= a DAILY labour rate). `Worker.type` holds its `key`. */
export interface WorkerTypeRow extends WorkerTypeNames {
  id: Id;
  key: string;
  /** Absent without `fields.wages`. */
  ratePaisa?: Paisa;
  overtimeMultiplier: number | null;
  isActive: boolean;
  /** Workers (active or not) with this type. */
  workerCount: number;
}

export interface WorkerTypesQuery {
  includeInactive?: boolean;
}
export type CreateWorkerTypeBody = RequestBody<"/api/v1/worker-types", "post">;
export type UpdateWorkerTypeBody = RequestBody<"/api/v1/worker-types/{id}", "patch">;

/** A worker type `key` of the company (GET /worker-types), or "OTHER". */
export type WorkerType = string;

export interface Worker {
  id: Id;
  name: string;
  type: WorkerType;
  /** Names of the worker's type (English / Roman Urdu / Urdu). */
  typeLabel?: string;
  typeLabelRoman?: string | null;
  typeLabelUrdu?: string | null;
  phone: string | null;
  /** Absent without `fields.wages`. */
  dailyRatePaisa?: Paisa;
  isActive: boolean;
  /** Sample worker from "Try with demo data". */
  isDemo?: boolean;
  notes: string | null;
  createdAt: IsoDateTime;
}

export type WorkersQuery = QueryParams<"/api/v1/workers", "get">;
export type CreateWorkerBody = RequestBody<"/api/v1/workers", "post">;
export type UpdateWorkerBody = RequestBody<"/api/v1/workers/{id}", "patch">;

export type SubcontractTrade =
  | "SHUTTERING"
  | "STEEL_FIXING"
  | "BRICK_MASONRY"
  | "PLASTER"
  | "TILE_LAYING"
  | "ELECTRICAL_CONDUIT"
  | "PLUMBING_ROUGH_IN"
  | "WATERPROOFING"
  | "PAINT";

export interface Subcontractor {
  id: Id;
  name: string;
  trade: SubcontractTrade;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: IsoDateTime;
}

export type SubcontractorsQuery = QueryParams<"/api/v1/subcontractors", "get">;
export type CreateSubcontractorBody = RequestBody<"/api/v1/subcontractors", "post">;
export type UpdateSubcontractorBody = RequestBody<"/api/v1/subcontractors/{id}", "patch">;

/** Settings → Supplier categories: the choices in the supplier form and the suppliers filter. */
export interface SupplierCategory {
  id: Id;
  name: string;
  supplierCount: number;
  createdAt: string;
  /** null = made automatically (existing suppliers, starting list, import). */
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface SupplierCategoryActivity {
  id: Id;
  name: string;
  createdAt: string;
  items: Array<{
    id: Id;
    action: "supplier_category.create" | "supplier_category.rename" | "supplier_category.merge" | (string & {});
    at: string;
    by: string;
    details: Record<string, unknown> | null;
  }>;
}
