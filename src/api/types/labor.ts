/**
 * Labour & cash book (Phase 1 · Step 7). Request bodies and queries come from the generated
 * OpenAPI file; responses are documented by example only, so their shapes are written here.
 * Sub-contract money (rates, contract value, retention) is absent for MUNSHI — never null.
 */
import type { Id, IsoDate, IsoDateTime, NamedRef, Paisa, QueryParams, RequestBody } from "./common";
import type { ProjectRef } from "./inventory";

export type AttendanceStatus = "FULL" | "HALF" | "ABSENT";
export type RateType = "PER_SQFT" | "PER_TON" | "PER_BRICK" | "PER_RFT" | "PER_CFT" | "LUMPSUM";
export type LaborPaidFrom = "SITE_CASH" | "OFFICE_CASH" | "BANK" | "JAZZCASH" | "EASYPAISA";
export type SettlementStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "RETURNED";
export type MeasurementStatus = "RECORDED" | "VERIFIED" | "REJECTED";
export type AdvanceStatus = "OUTSTANDING" | "PARTLY_ADJUSTED" | "ADJUSTED";
export type WeekDay = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export interface WorkerRef {
  id: Id;
  name: string;
  type: string;
}

// ─── Team on site ───────────────────────────────────────────────────────────

export interface ProjectWorker {
  id: Id;
  projectId: Id;
  worker: WorkerRef & { phone: string | null };
  dailyRatePaisa: Paisa;
  defaultRatePaisa: Paisa;
  rateOverridden: boolean;
  startDate: IsoDate;
  endDate: IsoDate | null;
  isActive: boolean;
}

export interface SubcontractAssignment {
  id: Id;
  projectId: Id;
  subcontractor: { id: Id; name: string; trade: string; phone: string | null };
  scope: string;
  rateType: RateType;
  unit: string;
  ratePaisa?: Paisa | null;
  contractValuePaisa?: Paisa | null;
  retentionPercent?: number;
  progressPercent: number;
  startDate: IsoDate;
  isActive: boolean;
}

export type AssignWorkerBody = RequestBody<"/api/v1/projects/{id}/labor/workers", "post">;
export type UpdateProjectWorkerBody = RequestBody<"/api/v1/project-workers/{id}", "patch">;
export type AssignSubcontractBody = RequestBody<"/api/v1/projects/{id}/labor/subcontracts", "post">;
export type UpdateSubcontractBody = RequestBody<"/api/v1/subcontract-assignments/{id}", "patch">;

// ─── Hazri ──────────────────────────────────────────────────────────────────

export interface AttendanceMark {
  status: AttendanceStatus;
  overtimeHours: number;
  note: string | null;
  /** Entered on a phone, reached the server more than 48 h later. */
  lateSync?: boolean;
}

export interface AttendanceDay {
  date: IsoDate;
  weekday: WeekDay;
  assigned: number;
  marked: number;
  full: number;
  half: number;
  absent: number;
  unmarked: number;
  overtimeHours: number;
  workers: Array<{ worker: WorkerRef; status: AttendanceStatus | null; overtimeHours: number; note: string | null; lateSync?: boolean }>;
}

export interface TodayAttendance extends AttendanceDay {
  workingDay: boolean;
  locked: boolean;
}

export interface AttendanceGridRow {
  projectWorkerId: Id;
  worker: WorkerRef;
  dailyRatePaisa: Paisa;
  isActive: boolean;
  days: Record<IsoDate, AttendanceMark>;
  totals: { full: number; half: number; absent: number; daysWorked: number; overtimeHours: number };
}

export interface AttendanceGrid {
  from: IsoDate;
  to: IsoDate;
  dates: IsoDate[];
  weekStart: WeekDay;
  workers: AttendanceGridRow[];
  dayTotals: Array<{ date: IsoDate; weekday: WeekDay; workingDay: boolean; full: number; half: number; absent: number; unmarked: number }>;
  totals: { daysWorked: number; overtimeHours: number };
  weeks: Array<{ settlementId: Id; weekStart: IsoDate; status: SettlementStatus; locked: boolean }>;
}

export type AttendanceBody = RequestBody<"/api/v1/projects/{id}/attendance", "post">;
export type AttendanceQuery = QueryParams<"/api/v1/projects/{id}/attendance", "get">;
export interface AttendanceResult {
  date: IsoDate;
  created: number;
  updated: number;
  day: AttendanceDay;
}

// ─── Measurements and peshgi ────────────────────────────────────────────────

export interface WorkMeasurement {
  id: Id;
  projectId: Id;
  assignment: { id: Id; scope: string; rateType: RateType; subcontractor: { id: Id; name: string; trade: string } };
  date: IsoDate;
  description: string;
  quantity: number;
  unit: string;
  attachmentIds: Id[];
  status: MeasurementStatus;
  ratePaisa?: Paisa | null;
  valuePaisa?: Paisa;
  verifiedById: Id | null;
  verifiedAt: IsoDateTime | null;
  note: string | null;
  createdById: Id | null;
  createdAt: IsoDateTime;
}

export type MeasurementBody = RequestBody<"/api/v1/projects/{id}/work-measurements", "post">;
export type MeasurementsQuery = QueryParams<"/api/v1/projects/{id}/work-measurements", "get">;

export interface Advance {
  id: Id;
  projectId: Id;
  payeeType: "WORKER" | "SUBCONTRACTOR";
  worker: WorkerRef | null;
  assignment: { id: Id; scope: string; subcontractor: NamedRef } | null;
  amountPaisa: Paisa;
  adjustedPaisa: Paisa;
  outstandingPaisa: Paisa;
  status: AdvanceStatus;
  settlements: Array<{ settlementId: Id; weekStart: IsoDate; status: SettlementStatus; amountPaisa: Paisa }>;
  date: IsoDate;
  paidFrom: LaborPaidFrom;
  cashAccountId: Id | null;
  reference: string | null;
  note: string | null;
  createdById: Id | null;
  createdAt: IsoDateTime;
}

export type AdvanceBody = RequestBody<"/api/v1/projects/{id}/advances", "post">;
export type AdvancesQuery = QueryParams<"/api/v1/projects/{id}/advances", "get">;

// ─── Settlements ────────────────────────────────────────────────────────────

export interface SettlementLine {
  id: Id;
  worker: WorkerRef;
  fullDays: number;
  halfDays: number;
  daysWorked: number;
  dailyRatePaisa: Paisa;
  overtimeHours: number;
  overtimePaisa: Paisa;
  grossPaisa: Paisa;
  advanceAdjustedPaisa: Paisa;
  advanceOverride: boolean;
  overrideNote: string | null;
  netPaisa: Paisa;
  paymentStatus: "UNPAID" | "PAID";
  paidFrom: LaborPaidFrom | null;
  paidAt: IsoDateTime | null;
  cashEntryId: Id | null;
  advances: Array<{ advanceId: Id; date: IsoDate; amountPaisa: Paisa }>;
}

export interface Settlement {
  id: Id;
  project: ProjectRef;
  weekStart: IsoDate;
  weekEnd: IsoDate;
  status: SettlementStatus;
  workers: number;
  daysWorked: number;
  grossPaisa: Paisa;
  advancePaisa: Paisa;
  netPaisa: Paisa;
  paidPaisa: Paisa;
  unpaidPaisa: Paisa;
  fullyPaid: boolean;
  createdBy: NamedRef | null;
  createdAt: IsoDateTime;
  submittedBy: NamedRef | null;
  submittedAt: IsoDateTime | null;
  approvedBy: NamedRef | null;
  approvedAt: IsoDateTime | null;
  returnComment: string | null;
  lines?: SettlementLine[];
}

export type SettlementsQuery = QueryParams<"/api/v1/projects/{id}/settlements", "get">;
export type LineBody = RequestBody<"/api/v1/settlements/{id}/lines/{lineId}", "patch">;
export type PayWagesBody = RequestBody<"/api/v1/settlements/{id}/pay", "post">;

// ─── Sub-contractor accounts ────────────────────────────────────────────────

export interface SubAccount {
  valuePaisa: Paisa;
  retentionPaisa: Paisa;
  retentionReleasedPaisa: Paisa;
  retentionHeldPaisa: Paisa;
  advancesPaisa: Paisa;
  paidPaisa: Paisa;
  deductionsPaisa: Paisa;
  balanceDuePaisa: Paisa;
  overpaid: boolean;
  overpaidPaisa: Paisa;
}

export interface SubcontractAccountRow extends SubcontractAssignment {
  verifiedQty: number | null;
  pendingMeasurements: number;
  account: SubAccount;
}

export interface SubcontractAccounts {
  items: SubcontractAccountRow[];
  totals: { valuePaisa: Paisa; paidPaisa: Paisa; retentionHeldPaisa: Paisa; balanceDuePaisa: Paisa; overpaidCount: number };
}

export interface SubLedgerEntry {
  id: Id;
  type: "WORK_VALUE" | "ADVANCE" | "RUNNING_PAYMENT" | "DEDUCTION" | "RETENTION_RELEASE" | "ADJUSTMENT";
  amountPaisa: Paisa;
  runningPaisa: Paisa;
  refType: string | null;
  refId: Id | null;
  occurredAt: IsoDateTime;
  note: string | null;
  createdById: Id | null;
}

export interface SubcontractLedger {
  assignment: SubcontractAssignment;
  account: SubAccount;
  entries?: SubLedgerEntry[];
}

export type ProgressBody = RequestBody<"/api/v1/subcontract-assignments/{id}/progress", "post">;
export type SubcontractPaymentBody = RequestBody<"/api/v1/subcontract-assignments/{id}/payments", "post">;
export type DeductionBody = RequestBody<"/api/v1/subcontract-assignments/{id}/deductions", "post">;

// ─── Cash book ──────────────────────────────────────────────────────────────

export type CashEntryType =
  | "FLOAT_IN"
  | "EXPENSE"
  | "PESHGI"
  | "WAGE_PAYMENT"
  | "SUBCONTRACT_PAYMENT"
  | "PURCHASE"
  | "HANDOVER_OUT"
  | "HANDOVER_IN"
  | "COUNT_ADJUSTMENT"
  | "REFUND_IN";
export type CashEntryStatus = "PENDING_ACK" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "POSTED";
export type ExpenseCategory =
  | "TEA_WATER"
  | "TRANSPORT"
  | "UNLOADING"
  | "FUEL"
  | "SMALL_TOOLS"
  | "URGENT_MATERIAL"
  | "OWNER_PURCHASE"
  | "REPAIRS"
  | "OTHER";
export type FloatMethod = "CASH" | "BANK" | "JAZZCASH" | "EASYPAISA";

export interface CashAccount {
  id: Id;
  name: string;
  holder: { id: Id; name: string; role: string };
  isActive: boolean;
  balancePaisa: Paisa;
  pendingAckPaisa: Paisa;
  pendingApprovalPaisa: Paisa;
  recoverablePaisa: Paisa;
  lastCountAt: IsoDateTime | null;
  lastEntryAt: IsoDateTime | null;
}

export interface CashAccounts {
  items: CashAccount[];
  totals: { balancePaisa: Paisa; pendingAckPaisa: Paisa; pendingApprovalPaisa: Paisa; recoverablePaisa: Paisa };
}

export interface CashEntry {
  id: Id;
  accountId: Id;
  project: (ProjectRef | { id: Id }) | null;
  type: CashEntryType;
  amountPaisa: Paisa;
  runningBalancePaisa?: Paisa;
  category: ExpenseCategory | null;
  costBucket: string | null;
  description: string;
  attachmentId: Id | null;
  status: CashEntryStatus;
  method: FloatMethod | null;
  reference: string | null;
  approvedById: Id | null;
  approvedAt: IsoDateTime | null;
  reviewNote: string | null;
  recoverableFromHolder: boolean;
  refType: string | null;
  refId: Id | null;
  /** Entered on a phone, reached the server more than 48 h later. */
  lateSync?: boolean;
  occurredAt: IsoDateTime;
  createdById: Id | null;
  createdAt: IsoDateTime;
  holder?: NamedRef;
}

export interface TopupRequest {
  id: Id;
  account: { id: Id; name: string };
  holder: NamedRef;
  amountPaisa: Paisa;
  note: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  balancePaisa?: Paisa;
  decidedById: Id | null;
  decidedAt: IsoDateTime | null;
  decisionNote: string | null;
  floatEntryId: Id | null;
  createdAt: IsoDateTime;
}

export interface CashCount {
  id: Id;
  accountId: Id;
  systemPaisa: Paisa;
  countedPaisa: Paisa;
  differencePaisa: Paisa;
  note: string | null;
  adjustmentEntryId: Id | null;
  countedById: Id | null;
  countedAt: IsoDateTime;
}

export interface ProjectCashbook {
  entries: CashEntry[];
  summary: {
    spentByCategory: Array<{ category: ExpenseCategory | null; amountPaisa: Paisa }>;
    spentByType: Array<{ type: CashEntryType; amountPaisa: Paisa }>;
    kharchaThisWeekPaisa: Paisa;
    week: { weekStart: IsoDate; weekEnd: IsoDate };
  };
  accounts: CashAccount[];
}

export type FloatBody = RequestBody<"/api/v1/cash-floats", "post">;
export type ExpenseBody = RequestBody<"/api/v1/cash-expenses", "post">;
export type ExpensesQuery = QueryParams<"/api/v1/cash-expenses", "get">;
export type TopupBody = RequestBody<"/api/v1/topup-requests", "post">;
export type TopupsQuery = QueryParams<"/api/v1/topup-requests", "get">;
export type ApproveTopupBody = RequestBody<"/api/v1/topup-requests/{id}/approve", "post">;
export type CashCountBody = RequestBody<"/api/v1/cash-counts", "post">;
export type CashCountsQuery = QueryParams<"/api/v1/cash-counts", "get">;
export type HandoverBody = RequestBody<"/api/v1/cash-handovers", "post">;
export type CashEntriesQuery = QueryParams<"/api/v1/cash-accounts/{id}/entries", "get">;
export type CashbookQuery = QueryParams<"/api/v1/projects/{id}/cashbook", "get">;

// ─── Office overview ────────────────────────────────────────────────────────

export interface LaborOverview {
  date: IsoDate;
  week: { weekStart: IsoDate; weekEnd: IsoDate };
  hazriToday: { assigned: number; full: number; half: number; absent: number; unmarked: number };
  peshgiThisWeekPaisa: Paisa;
  kharchaThisWeekPaisa: Paisa;
  cashWithSiteStaffPaisa: Paisa;
  pending: { settlements: number; kharcha: number; topups: number; measurements: number };
  lastWeekStart: IsoDate;
}

type ProjectStatusRef = ProjectRef & { status: string };

export interface WorkerLaborSummary {
  worker: WorkerRef & { phone: string | null; dailyRatePaisa: Paisa; isActive: boolean };
  projects: Array<{ projectWorkerId: Id; project: ProjectStatusRef; dailyRatePaisa: Paisa; startDate: IsoDate; endDate: IsoDate | null; isActive: boolean }>;
  thisWeek: { weekStart: IsoDate; daysWorked: number };
  outstandingAdvancePaisa: Paisa;
  advances: Array<{ id: Id; project: ProjectStatusRef; date: IsoDate; amountPaisa: Paisa; paidFrom: LaborPaidFrom; note: string | null }>;
  settlements: Array<{
    settlementId: Id;
    project: ProjectStatusRef;
    weekStart: IsoDate;
    status: SettlementStatus;
    daysWorked: number;
    grossPaisa: Paisa;
    advanceAdjustedPaisa: Paisa;
    netPaisa: Paisa;
    paymentStatus: "UNPAID" | "PAID";
  }>;
}

export interface SubcontractorLaborSummary {
  subcontractor: { id: Id; name: string; trade: string; phone: string | null; isActive: boolean };
  assignments: Array<SubcontractAssignment & { project: ProjectStatusRef; account: SubAccount }>;
  totals: { valuePaisa: Paisa; paidPaisa: Paisa; retentionHeldPaisa: Paisa; balanceDuePaisa: Paisa };
}
