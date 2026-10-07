/**
 * Procurement & inventory (Phase 1 · Step 6). Request bodies and queries come from the
 * generated OpenAPI file; the backend documents responses by example only, so response
 * shapes are written here once. Money fields are absent (undefined) for callers without
 * rates.view — never null — so `MoneyText` shows "Hidden for your role".
 */
import type { Id, IsoDate, IsoDateTime, NamedRef, Paisa, QueryParams, RequestBody } from "./common";

export interface MaterialRef {
  id: Id;
  name: string;
  unit: string;
}

export type StockLocationType = "STORE" | "SITE" | "TRANSIT";

export interface LocationRef {
  id: Id;
  type: StockLocationType;
  name: string;
  projectId: Id | null;
}

export interface ProjectRef {
  id: Id;
  code: string;
  name: string;
}

export interface StockLocation extends LocationRef {
  isActive: boolean;
  project: (ProjectRef & { status: string }) | null;
}

// ─── Store stock / movements / site stock ───────────────────────────────────

export interface StoreStockRow {
  material: MaterialRef & { group: { code: string; name: string } };
  inStore: number;
  inTransit: number;
  avgRatePaisa: Paisa | null;
  valuePaisa: Paisa | null;
  lastPurchaseAt: IsoDateTime | null;
  minQty: number | null;
  lowStock: boolean;
}

export interface StoreStock {
  location: LocationRef;
  summary: { totalValuePaisa: Paisa; materials: number; lowStockCount: number; dispatchesOnTheWay: number };
  items: StoreStockRow[];
}

export type StoreStockQuery = QueryParams<"/api/v1/stores/{locationId}/stock", "get">;
export type LowStockLevelsBody = RequestBody<"/api/v1/stores/{locationId}/low-stock-levels", "put">;
export interface LowStockLevel {
  material: MaterialRef;
  minQty: number;
}

export type MovementType =
  | "PURCHASE_IN"
  | "PURCHASE_RETURN_OUT"
  | "DISPATCH_OUT"
  | "TRANSIT_IN"
  | "TRANSIT_OUT"
  | "RECEIPT_IN"
  | "OWNER_DELIVERY_IN"
  | "USAGE_OUT"
  | "COUNT_ADJUSTMENT"
  | "CORRECTION";

export interface StockMovement {
  id: Id;
  type: MovementType;
  location: LocationRef;
  material: MaterialRef;
  quantity: number;
  ownerSupplied: boolean;
  unitCostPaisa?: Paisa;
  valuePaisa?: Paisa;
  refType: string;
  refId: Id;
  note: string | null;
  occurredAt: IsoDateTime;
  createdBy: NamedRef | null;
}

export type MovementsQuery = QueryParams<"/api/v1/stock/movements", "get">;

export interface SiteStockRow {
  material: MaterialRef;
  receivedContractor: number;
  receivedOwner: number;
  used: number;
  transferredOut: number;
  adjustments: number;
  inStock: number;
  inStockContractor: number;
  inStockOwner: number;
  lastCountAt: IsoDateTime | null;
  avgRatePaisa?: Paisa | null;
  valuePaisa?: Paisa;
}

export interface SiteStock {
  project: ProjectRef;
  location: LocationRef | null;
  summary: { materials: number; lastCountAt: IsoDateTime | null; totalValuePaisa?: Paisa };
  items: SiteStockRow[];
}

// ─── Usage / counts ─────────────────────────────────────────────────────────

export interface MaterialUsage {
  id: Id;
  projectId: Id;
  usageDate: IsoDate;
  note: string | null;
  milestoneId: Id | null;
  items: Array<{ material: MaterialRef; qty: number; ownerSupplied: boolean; valuePaisa?: Paisa }>;
  totalValuePaisa?: Paisa;
  deviceCreatedAt: IsoDateTime | null;
  createdBy: NamedRef | null;
  createdAt: IsoDateTime;
}

export type UsageBody = RequestBody<"/api/v1/projects/{id}/material-usage", "post">;
export type UsageQuery = QueryParams<"/api/v1/projects/{id}/material-usage", "get">;

export type CountReason = "HARDENED_IN_RAIN" | "BREAKAGE" | "THEFT_SUSPECTED" | "MEASUREMENT" | "OTHER";

export interface StockCount {
  id: Id;
  number: string;
  location: LocationRef;
  countedAt: IsoDateTime;
  note: string | null;
  items: Array<{
    material: MaterialRef;
    ownerSupplied: boolean;
    systemQty: number;
    countedQty: number;
    difference: number;
    reason: CountReason | null;
    note: string | null;
    valuePaisa?: Paisa;
  }>;
  summary: { materials: number; withDifference: number; differenceValuePaisa?: Paisa };
  createdBy: NamedRef | null;
  createdAt: IsoDateTime;
}

export type StockCountBody = RequestBody<"/api/v1/stock-counts", "post">;
export type StockCountsQuery = QueryParams<"/api/v1/stock-counts", "get">;

// ─── Purchase orders ────────────────────────────────────────────────────────

export type DeliverTo = "STORE" | "SITE";
export type PurchaseOrderStatus = "OPEN" | "PARTLY_RECEIVED" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrder {
  id: Id;
  number: string;
  supplier: NamedRef & { phone?: string | null };
  deliverTo: DeliverTo;
  location: LocationRef;
  project: ProjectRef | null;
  expectedDate: IsoDate | null;
  status: PurchaseOrderStatus;
  note: string | null;
  items: Array<{ id: Id; material: MaterialRef; orderedQty: number; receivedQty: number; pendingQty: number; ratePaisa: Paisa; amountPaisa: Paisa }>;
  totalPaisa: Paisa;
  purchases: Array<{ id: Id; number: string; challanNo: string; purchaseDate: IsoDate; status: PurchaseStatus }>;
  cancelledAt: IsoDateTime | null;
  createdBy: NamedRef | null;
  createdAt: IsoDateTime;
}

export type PurchaseOrdersQuery = QueryParams<"/api/v1/purchase-orders", "get">;
export type CreatePurchaseOrderBody = RequestBody<"/api/v1/purchase-orders", "post">;
export type UpdatePurchaseOrderBody = RequestBody<"/api/v1/purchase-orders/{id}", "patch">;

// ─── Purchases ──────────────────────────────────────────────────────────────

export type PurchaseStatus = "SAVED" | "PENDING_RATE" | "PENDING_RECEIPT" | "RECEIVED" | "RECEIVED_WITH_SHORTAGE";
export type PaymentMode = "UDHAAR" | "CASH" | "PARTIAL";
export type PaidFrom = "OFFICE_CASH" | "BANK" | "CHEQUE" | "JAZZCASH" | "EASYPAISA" | "SITE_CASH";
export type ShortageKind = "DISPATCH_SHORT" | "DAMAGED" | "EXCESS" | "SUPPLIER_SHORT";
export type Resolution = "SEND_REMAINING" | "RETURN_TO_STORE" | "ACCEPT_LOSS" | "RECOVER_FROM_DRIVER" | "SUPPLIER_CREDIT";

export interface ShortageRef {
  id: Id;
  kind: ShortageKind;
  material: MaterialRef;
  qty: number;
  status: "OPEN" | "RESOLVED";
  resolution: Resolution | null;
  valuePaisa?: Paisa;
}

export interface PurchaseListRow {
  id: Id;
  number: string;
  supplier: NamedRef;
  deliverTo: DeliverTo;
  location: LocationRef;
  project: ProjectRef | null;
  challanNo: string;
  purchaseDate: IsoDate;
  paymentMode: PaymentMode;
  status: PurchaseStatus;
  materials: string[];
  openShortages: number;
  /** Received / entered on a phone and synced more than 48 h later. */
  lateSync?: boolean;
  totalPaisa?: Paisa;
  paidNowPaisa?: Paisa;
  createdAt: IsoDateTime;
}

export interface PurchaseItem {
  id: Id;
  material: MaterialRef;
  /** Absent while a munshi blind-counts the delivery. */
  challanQty?: number;
  countedQty: number | null;
  damagedQty: number;
  goodQty: number | null;
  shortQty: number | null;
  note: string | null;
  ratePaisa?: Paisa | null;
  amountPaisa?: Paisa;
  correctedQty?: number | null;
  correctedRatePaisa?: Paisa | null;
}

export interface CorrectionLine {
  purchaseItemId: Id;
  materialId: Id;
  fromQty: number;
  toQty: number;
  fromRatePaisa?: Paisa;
  toRatePaisa?: Paisa;
}

export interface Purchase {
  id: Id;
  number: string;
  supplier: NamedRef & { phone: string | null };
  deliverTo: DeliverTo;
  location: LocationRef;
  project: ProjectRef | null;
  purchaseOrder: { id: Id; number: string } | null;
  challanNo: string;
  vehicleNo: string | null;
  purchaseDate: IsoDate;
  paymentMode: PaymentMode;
  status: PurchaseStatus;
  locked: boolean;
  blindCount: boolean;
  note: string | null;
  items: PurchaseItem[];
  totalPaisa?: Paisa;
  correctedTotalPaisa?: Paisa;
  paidNowPaisa?: Paisa;
  paidFrom?: PaidFrom | null;
  udhaarAddedPaisa?: Paisa;
  ledgerEffect?: Array<{ type: LedgerType; amountPaisa: Paisa; occurredAt: IsoDateTime; note: string | null }>;
  payments?: Array<{ id: Id; amountPaisa: Paisa; method: SupplierPaymentMethod; status: SupplierPaymentStatus; paidOn: IsoDate }>;
  challan: { id: Id; fileName: string; url: string | null };
  bill: { id: Id; fileName: string; url: string | null } | null;
  corrections: Array<{ id: Id; reason: string; items: CorrectionLine[]; deltaPaisa?: Paisa; createdBy: NamedRef | null; createdAt: IsoDateTime }>;
  returns: Array<{ id: Id; number: string; reason: string; totalPaisa?: Paisa; createdAt: IsoDateTime }>;
  shortages: ShortageRef[];
  receivedBy: NamedRef | null;
  receivedAt: IsoDateTime | null;
  lateSync?: boolean;
  createdBy: NamedRef | null;
  createdAt: IsoDateTime;
}

export type PurchasesQuery = QueryParams<"/api/v1/purchases", "get">;
export type CreatePurchaseBody = RequestBody<"/api/v1/purchases", "post">;
export type SetRatesBody = RequestBody<"/api/v1/purchases/{id}/rates", "patch">;
export type CorrectionBody = RequestBody<"/api/v1/purchases/{id}/corrections", "post">;
export type PurchaseReturnBody = RequestBody<"/api/v1/purchases/{id}/returns", "post">;
export type ReceivePurchaseBody = RequestBody<"/api/v1/purchases/{id}/receive", "post">;
export type PurchaseReturnsQuery = QueryParams<"/api/v1/purchase-returns", "get">;

export interface PurchaseReturn {
  id: Id;
  number: string;
  purchase: { id: Id; number: string; challanNo: string };
  supplier: NamedRef;
  location: LocationRef;
  reason: string;
  note: string | null;
  attachmentId: Id | null;
  items: Array<{ material: MaterialRef; qty: number; ratePaisa: Paisa; amountPaisa: Paisa }>;
  totalPaisa: Paisa;
  createdBy: NamedRef | null;
  createdAt: IsoDateTime;
}

export type ComparisonResult = "COMPLETE" | "SHORT" | "DAMAGED" | "SHORT_AND_DAMAGED" | "EXCESS";

/** Sent / challan vs counted, revealed after a blind count. */
export interface ComparisonRow {
  material: MaterialRef;
  expectedQty: number;
  countedQty: number;
  damagedQty: number;
  goodQty: number;
  differenceQty: number;
  result: ComparisonResult;
}

// ─── Supplier ledger + payments ─────────────────────────────────────────────

export type LedgerType = "OPENING" | "PURCHASE" | "RETURN" | "PAYMENT" | "PAYMENT_REVERSAL" | "ADJUSTMENT";
export type SupplierPaymentMethod = "CASH" | "BANK" | "CHEQUE" | "JAZZCASH" | "EASYPAISA";
export type SupplierPaymentStatus = "CLEARED" | "PENDING" | "BOUNCED";

export interface LedgerEntry {
  id: Id;
  type: LedgerType;
  amountPaisa: Paisa;
  runningBalancePaisa: Paisa;
  refType: string | null;
  refId: Id | null;
  project: ProjectRef | null;
  occurredAt: IsoDateTime;
  note: string | null;
  createdBy: NamedRef | null;
}

export interface SupplierLedger {
  supplier: NamedRef & { phone: string | null };
  udhaarBalancePaisa: Paisa;
  oldestUnpaidDays: number | null;
  openingBalancePaisa: Paisa;
  totals: { debitPaisa: Paisa; creditPaisa: Paisa };
  entries: LedgerEntry[];
}

export type LedgerQuery = QueryParams<"/api/v1/suppliers/{id}/ledger", "get">;

export interface SupplierPayment {
  id: Id;
  supplier: NamedRef;
  amountPaisa: Paisa;
  method: SupplierPaymentMethod;
  reference: string | null;
  chequeNo: string | null;
  chequeDate: IsoDate | null;
  status: SupplierPaymentStatus;
  paidOn: IsoDate;
  note: string | null;
  project: ProjectRef | null;
  purchase: { id: Id; number: string } | null;
  statusChangedAt: IsoDateTime | null;
  createdBy: NamedRef | null;
  createdAt: IsoDateTime;
}

export type SupplierPaymentsQuery = QueryParams<"/api/v1/supplier-payments", "get">;
export type CreateSupplierPaymentBody = RequestBody<"/api/v1/supplier-payments", "post">;
export type ChequeStatusBody = RequestBody<"/api/v1/supplier-payments/{id}/cheque-status", "patch">;

// ─── Dispatch / receiving / shortages / owner deliveries ────────────────────

export type DispatchStatus = "ON_THE_WAY" | "RECEIVED" | "RECEIVED_WITH_SHORTAGE" | "RECEIVED_WITH_EXCESS" | "CANCELLED";

export interface DispatchItem {
  id: Id;
  material: MaterialRef;
  /** Absent while a munshi blind-counts it. */
  sentQty?: number;
  receivedQty: number | null;
  damagedQty: number | null;
  goodQty: number | null;
  differenceQty: number | null;
  note: string | null;
  photoUrl: string | null;
  unitCostPaisa?: Paisa;
  valuePaisa?: Paisa;
}

export interface Dispatch {
  id: Id;
  number: string;
  from: LocationRef;
  to: LocationRef;
  vehicleNo: string | null;
  driverName: string | null;
  driverPhone: string | null;
  dispatchedAt: IsoDateTime;
  status: DispatchStatus;
  note: string | null;
  blindCount: boolean;
  loadPhotoUrl: string | null;
  items: DispatchItem[];
  totalValuePaisa?: Paisa;
  shortages: ShortageRef[];
  receivedBy: NamedRef | null;
  receivedAt: IsoDateTime | null;
  /** Received on a phone and synced more than 48 h later. */
  lateSync?: boolean;
  receiveNote: string | null;
  cancelledAt: IsoDateTime | null;
  createdBy: NamedRef | null;
  createdAt: IsoDateTime;
}

export type DispatchesQuery = QueryParams<"/api/v1/dispatches", "get">;
export type CreateDispatchBody = RequestBody<"/api/v1/dispatches", "post">;
export type ReceiveDispatchBody = RequestBody<"/api/v1/dispatches/{id}/receive", "post">;

export interface IncomingDispatch {
  type: "DISPATCH";
  id: Id;
  number: string;
  from: LocationRef;
  vehicleNo: string | null;
  driverName: string | null;
  driverPhone: string | null;
  dispatchedAt: IsoDateTime;
  items: Array<{ material: MaterialRef; sentQty?: number }>;
}

export interface IncomingPurchase {
  type: "PURCHASE";
  id: Id;
  number: string;
  supplier: NamedRef & { phone: string | null };
  challanNo: string;
  vehicleNo: string | null;
  purchaseDate: IsoDate;
  items: Array<{ material: MaterialRef; challanQty?: number }>;
}

export interface Incoming {
  blindCount: boolean;
  count: number;
  dispatches: IncomingDispatch[];
  purchases: IncomingPurchase[];
}

export interface Shortage extends ShortageRef {
  source: "DISPATCH" | "PURCHASE";
  location: LocationRef;
  project: ProjectRef | null;
  dispatch: { id: Id; number: string; vehicleNo: string | null; driverName: string | null; driverPhone: string | null } | null;
  purchase: { id: Id; number: string; challanNo: string; supplier: NamedRef } | null;
  note: string | null;
  allowedResolutions: Resolution[];
  resolutionNote: string | null;
  recoveredAmountPaisa?: Paisa | null;
  newDispatch: { id: Id; number: string } | null;
  resolvedBy: NamedRef | null;
  resolvedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
}

export type ShortagesQuery = QueryParams<"/api/v1/shortages", "get">;
export type ResolveShortageBody = RequestBody<"/api/v1/shortages/{id}/resolve", "post">;

export interface OwnerDelivery {
  id: Id;
  projectId: Id;
  deliveryDate: IsoDate;
  note: string | null;
  items: Array<{ material: MaterialRef; qty: number }>;
  photos: Array<{ id: Id; url: string | null }>;
  createdBy: NamedRef | null;
  createdAt: IsoDateTime;
}

export type OwnerDeliveryBody = RequestBody<"/api/v1/projects/{id}/owner-deliveries", "post">;
