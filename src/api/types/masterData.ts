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
  unit: LaborUnit;
  ratePaisa: Paisa;
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

export type WorkerType = "MISTRI" | "MISTRI_TILES" | "MAZDOOR" | "STEEL_FIXER_HELPER" | "CHOWKIDAR" | "OTHER";

export interface Worker {
  id: Id;
  name: string;
  type: WorkerType;
  phone: string | null;
  dailyRatePaisa: Paisa;
  isActive: boolean;
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
