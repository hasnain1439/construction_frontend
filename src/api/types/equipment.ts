/**
 * Equipment & shuttering (Phase 2 · Step 16). Request bodies and queries come from the generated
 * OpenAPI file; responses are documented by example only, so their shapes are written here once
 * (PHASE_2_3_CONTRACTS.md → Step 16). Rates, values and amounts are absent (undefined) without
 * `fields.rates` — never null — so `MoneyText` shows "Hidden for your role" (the Munshi never sees them).
 */
import type { Id, IsoDate, IsoDateTime, NamedRef, Paisa, QueryParams, RequestBody } from "./common";
import type { LocationRef, ProjectRef } from "./inventory";

export type EquipmentKind = "MACHINE" | "BULK";
export type EquipmentCategory =
  | "SHUTTERING_PLATE"
  | "PROP"
  | "SCAFFOLDING"
  | "MIXER"
  | "VIBRATOR"
  | "GENERATOR"
  | "PUMP"
  | "TOOL"
  | "OTHER";
export type EquipmentMovementType =
  | "OPENING_IN"
  | "PURCHASE_IN"
  | "TRANSFER_OUT"
  | "TRANSIT_IN"
  | "TRANSIT_OUT"
  | "RECEIPT_IN"
  | "RENTAL_IN"
  | "RENTAL_RETURN_OUT"
  | "LOSS_OUT"
  | "ADJUSTMENT";
export type EquipmentTransferKind = "DISPATCH" | "TRANSFER" | "RETURN";
export type EquipmentTransferStatus = "ON_THE_WAY" | "RECEIVED" | "RECEIVED_WITH_GAP" | "CANCELLED";
export type RentalStatus = "ACTIVE" | "RETURNED" | "CLOSED";
export type EquipmentLossKind = "MISSING" | "DAMAGED";
export type EquipmentLossStatus = "REPORTED" | "CHARGED";
export type EquipmentLossChargedTo = "PROJECT" | "SUBCONTRACTOR" | "WRITE_OFF";
export type EquipmentLossSource = "REPORT" | "TRANSFER_GAP";
export type EquipmentChargeKind = "INTERNAL_HIRE" | "RENTAL";

export interface EquipmentRef {
  id: Id;
  name: string;
  code: string | null;
  unit: string;
  kind: EquipmentKind;
  category: EquipmentCategory;
}

export interface NumberRef {
  id: Id;
  number: string;
}

// ─── Register ───────────────────────────────────────────────────────────────

export interface Equipment extends EquipmentRef {
  serialNo: string | null;
  coverageSqftPerUnit: number | null;
  isActive: boolean;
  notes: string | null;
  hireRatePaisaPerDay?: Paisa;
  replacementValuePaisa?: Paisa;
  ownedQty: number;
  rentedQty: number;
  atSitesQty: number;
  atYardQty: number;
  inTransitQty: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface EquipmentDetail extends Equipment {
  locations: Array<{ location: LocationRef; ownedQty: number; rentedQty: number }>;
}

export type EquipmentQuery = QueryParams<"/api/v1/equipment", "get">;
export type CreateEquipmentBody = RequestBody<"/api/v1/equipment", "post">;
export type UpdateEquipmentBody = RequestBody<"/api/v1/equipment/{id}", "patch">;
export type StockInBody = RequestBody<"/api/v1/equipment/{id}/stock-in", "post">;
export type AdjustEquipmentBody = RequestBody<"/api/v1/equipment/{id}/adjust", "post">;

// ─── Allocation map / movements ─────────────────────────────────────────────

export interface AllocationItem {
  equipment: EquipmentRef;
  ownedQty: number;
  rentedQty: number;
  totalQty: number;
  rentals: Array<{ id: Id; number: string; qty: number }>;
}

export interface AllocationLocation {
  location: LocationRef;
  project: ProjectRef | null;
  items: AllocationItem[];
}

export interface AllocationTotal {
  equipment: EquipmentRef;
  ownedQty: number;
  rentedQty: number;
  atYardQty: number;
  atSitesQty: number;
  inTransitQty: number;
}

export interface AllocationMap {
  locations: AllocationLocation[];
  totals: AllocationTotal[];
}

export type BalancesQuery = QueryParams<"/api/v1/equipment/balances", "get">;

export interface EquipmentMovement {
  id: Id;
  type: EquipmentMovementType;
  equipment: EquipmentRef;
  location: LocationRef;
  rental: NumberRef | null;
  /** Signed: + in, − out. */
  quantity: number;
  refType: string | null;
  refId: Id | null;
  occurredAt: IsoDateTime;
  note: string | null;
  createdBy: NamedRef | null;
}

export type EquipmentMovementsQuery = QueryParams<"/api/v1/equipment/movements", "get">;

// ─── Transfers ──────────────────────────────────────────────────────────────

export interface TransferItem {
  id: Id;
  equipment: EquipmentRef;
  rental: NumberRef | null;
  /** Left out while a blind-counting Munshi has not received it yet. */
  sentQty?: number;
  receivedQty: number | null;
  damagedQty: number | null;
  gapQty: number | null;
  note: string | null;
  photoUrl: string | null;
}

export interface TransferLossRef extends NumberRef {
  kind: EquipmentLossKind;
  qty: number;
}

export interface EquipmentTransfer {
  id: Id;
  number: string;
  kind: EquipmentTransferKind;
  status: EquipmentTransferStatus;
  from: LocationRef;
  to: LocationRef;
  vehicleNo: string | null;
  driverName: string | null;
  note: string | null;
  sentAt: IsoDateTime;
  blindCount: boolean;
  items: TransferItem[];
  losses: TransferLossRef[];
  receivedBy: NamedRef | null;
  receivedAt: IsoDateTime | null;
  receiveNote: string | null;
  cancelledAt: IsoDateTime | null;
  createdBy: NamedRef | null;
  createdAt: IsoDateTime;
}

export type EquipmentTransfersQuery = QueryParams<"/api/v1/equipment/transfers", "get">;
export type CreateEquipmentTransferBody = RequestBody<"/api/v1/equipment/transfers", "post">;
export type ReceiveEquipmentTransferBody = RequestBody<"/api/v1/equipment/transfers/{id}/receive", "post">;

// ─── Rentals ────────────────────────────────────────────────────────────────

export interface RentalItem {
  id: Id;
  equipment: EquipmentRef;
  qty: number;
  returnedQty: number;
  missingQty: number;
  outstandingQty: number;
  ratePaisaPerDay?: Paisa;
}

export interface RentalReturn {
  id: Id;
  returnDate: IsoDate;
  location: LocationRef;
  damageChargesPaisa?: Paisa;
  /** What the yard billed for pieces never handed back (QA-C-08). */
  missingChargesPaisa?: Paisa;
  note: string | null;
  items: Array<{ rentalItemId: Id; qty: number; damagedQty: number; missingQty: number }>;
}

export interface Rental {
  id: Id;
  number: string;
  status: RentalStatus;
  supplier: NamedRef & { phone: string | null };
  project: ProjectRef | null;
  location: LocationRef;
  startDate: IsoDate;
  expectedEndDate: IsoDate | null;
  returnedDate: IsoDate | null;
  closedAt: IsoDateTime | null;
  reference: string | null;
  note: string | null;
  items: RentalItem[];
  depositPaisa?: Paisa;
  depositRefundedPaisa?: Paisa;
  damageChargesPaisa?: Paisa;
  /** What the yard billed for pieces never handed back (QA-C-08). */
  missingChargesPaisa?: Paisa;
  rentChargedPaisa?: Paisa;
  accruedToDatePaisa?: Paisa;
  postedPaisa?: Paisa;
  daysOnRent: number;
  overdue: boolean;
  returns: RentalReturn[];
  createdBy: NamedRef | null;
  createdAt: IsoDateTime;
}

export type RentalsQuery = QueryParams<"/api/v1/equipment/rentals", "get">;
export type CreateRentalBody = RequestBody<"/api/v1/equipment/rentals", "post">;
export type ExtendRentalBody = RequestBody<"/api/v1/equipment/rentals/{id}/extend", "post">;
export type ReturnRentalBody = RequestBody<"/api/v1/equipment/rentals/{id}/return", "post">;
export type CloseRentalBody = RequestBody<"/api/v1/equipment/rentals/{id}/close", "post">;

// ─── Losses ─────────────────────────────────────────────────────────────────

export interface EquipmentLoss {
  id: Id;
  number: string;
  kind: EquipmentLossKind;
  status: EquipmentLossStatus;
  source: EquipmentLossSource;
  equipment: EquipmentRef;
  rental: NumberRef | null;
  location: LocationRef;
  project: ProjectRef | null;
  transfer: NumberRef | null;
  qty: number;
  valuePaisa?: Paisa;
  chargedTo: EquipmentLossChargedTo | null;
  subcontract: { id: Id; subcontractorId: Id; name: string } | null;
  note: string | null;
  photoUrl: string | null;
  reportedBy: NamedRef | null;
  reportedAt: IsoDateTime;
  chargedBy: NamedRef | null;
  chargedAt: IsoDateTime | null;
  chargeNote: string | null;
}

export type EquipmentLossesQuery = QueryParams<"/api/v1/equipment/losses", "get">;
export type ReportLossBody = RequestBody<"/api/v1/equipment/losses", "post">;
export type ChargeLossBody = RequestBody<"/api/v1/equipment/losses/{id}/charge", "post">;

// ─── Charges / project ──────────────────────────────────────────────────────

export interface EquipmentCharge {
  id: Id;
  date: IsoDate;
  kind: EquipmentChargeKind;
  project: ProjectRef | null;
  location: LocationRef | null;
  equipment: EquipmentRef;
  rental: NumberRef | null;
  qty: number;
  /** A correction row for a back-dated change. */
  correction?: boolean;
  ratePaisa?: Paisa;
  amountPaisa?: Paisa;
}

export type EquipmentChargesQuery = QueryParams<"/api/v1/equipment/charges", "get">;

export interface AccrualResult {
  through: IsoDate;
  internalHire: { rows: number; amountPaisa?: Paisa };
  rental: { rows: number; amountPaisa?: Paisa };
}

export interface ProjectEquipmentItem {
  equipment: EquipmentRef;
  ownedQty: number;
  rentedQty: number;
  hireRatePaisaPerDay?: Paisa;
  dailyHirePaisa?: Paisa;
}

export interface ProjectEquipment {
  site: LocationRef | null;
  items: ProjectEquipmentItem[];
  incoming: EquipmentTransfer[];
  rentals: Rental[];
  openLosses: EquipmentLoss[];
  hireToDatePaisa?: Paisa;
  rentalToDatePaisa?: Paisa;
}

// ─── Shuttering demand planner (Step 16 part 2) — no money ─────────────────

export type ShutteringCategory = "SHUTTERING_PLATE" | "PROP";
export type ShutteringAreaSource = "BOQ" | "ESTIMATE_FOOTPRINT" | "COVERED_AREA";
export type ShutteringSuggestionType = "EXTEND_RENTAL" | "TRANSFER" | "RENT" | "RETURN_RENTAL";
export type ShutteringWarningCode = "NO_PLATES" | "NO_COVERAGE" | "NO_SCHEDULE" | "AREA_FALLBACK";
export type MilestoneStatusValue = "PLANNED" | "IN_PROGRESS" | "CURING" | "DONE" | "BLOCKED";

export interface ShutteringParameters {
  plateCoverageSqft: number;
  plateCoverageSource: "EQUIPMENT" | "DEFAULT";
  propsPerPlate: number;
  sparePercent: number;
  beamSidesPercent: number;
  defaultStrikeDays: number;
}

export interface ShutteringMilestone {
  project: ProjectRef;
  milestone: {
    id: Id;
    key: string;
    name: string;
    stageKey: string;
    status: MilestoneStatusValue;
    plannedStart: IsoDate;
    plannedEnd: IsoDate;
    curingDays: number;
  };
  holdFrom: IsoDate;
  holdUntil: IsoDate;
  area: { slabSqft: number; beamSqft: number; totalSqft: number; source: ShutteringAreaSource };
  plates: number;
  props: number;
}

export interface ShutteringWeek {
  weekStart: IsoDate;
  weekEnd: IsoDate;
  needed: number;
  ownedAvailable: number;
  onRent: number;
  available: number;
  shortfall: number;
  surplus: number;
  demand: Array<{ projectId: Id; milestoneId: Id; qty: number }>;
}

export interface ShutteringSuggestion {
  type: ShutteringSuggestionType;
  category: ShutteringCategory;
  equipment: EquipmentRef | null;
  qty: number;
  fromWeek: IsoDate;
  toWeek: IsoDate;
  from: LocationRef | null;
  fromProject: ProjectRef | null;
  idleAfterWeek: IsoDate | null;
  toProject: ProjectRef | null;
  toLocation: LocationRef | null;
  rental: NumberRef | null;
  supplier: NamedRef | null;
}

export interface ShutteringDemand {
  scope: "COMPANY" | "PROJECT";
  project: ProjectRef | null;
  from: IsoDate;
  to: IsoDate;
  today: IsoDate;
  weeks: number;
  parameters: ShutteringParameters;
  equipment: { plates: EquipmentRef[]; props: EquipmentRef[] };
  milestones: ShutteringMilestone[];
  series: Array<{ category: ShutteringCategory; weeks: ShutteringWeek[] }>;
  suggestions: ShutteringSuggestion[];
  warnings: Array<{ code: ShutteringWarningCode; project?: ProjectRef }>;
}

export type ShutteringDemandQuery = QueryParams<"/api/v1/equipment/shuttering-demand", "get">;

// ─── Idle rented equipment ──────────────────────────────────────────────────

export interface IdleRental {
  rental: {
    id: Id;
    number: string;
    status: RentalStatus;
    startDate: IsoDate;
    expectedEndDate: IsoDate | null;
    supplier: NamedRef;
  };
  project: ProjectRef;
  location: LocationRef;
  items: Array<{ equipment: EquipmentRef; qty: number; ratePaisaPerDay?: Paisa; dailyCostPaisa?: Paisa }>;
  qty: number;
  since: IsoDate;
  lastActivity: { kind: "PROGRESS" | "USAGE" | "MILESTONE_ACTIVE"; date: IsoDate } | null;
  hasSchedule: boolean;
  idleDays: number;
  thresholdDays: number;
  idle: boolean;
  dailyCostPaisa?: Paisa;
  idleCostPaisa?: Paisa;
}

export interface IdleRentals {
  today: IsoDate;
  thresholdDays: number;
  items: IdleRental[];
  totalDailyCostPaisa?: Paisa;
}

export type IdleRentalsQuery = QueryParams<"/api/v1/equipment/idle", "get">;

export interface IdleCheckResult {
  date: IsoDate;
  thresholdDays: number;
  checked: number;
  idle: number;
  notified: Array<{ rentalId: Id; number: string; users: number }>;
}
