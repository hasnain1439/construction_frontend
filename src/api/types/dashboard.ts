/**
 * Notifications, approvals, dashboard, finance and reports (Phase 1 · Step 9). Bodies / queries
 * from the generated OpenAPI file; response shapes written here (documented by example).
 */
import type { Id, IsoDate, IsoDateTime, NamedRef, Paisa, QueryParams, RequestBody } from "./common";
import type { ClientPaymentMethod } from "./billing";

export interface ProjectCodeRef {
  id: Id;
  code: string;
  name: string;
}
export interface ProjectStatusRef extends ProjectCodeRef {
  status: string;
}

// ─── Notifications ──────────────────────────────────────────────────────────

export type NotificationSeverity = "INFO" | "WARNING" | "CRITICAL";
export type NotificationType =
  | "DISPATCH_CREATED"
  | "SHORTAGE_CREATED"
  | "LOW_STOCK"
  | "PURCHASE_PENDING_RATE"
  | "SETTLEMENT_SUBMITTED"
  | "SETTLEMENT_RETURNED"
  | "EXPENSE_PENDING_APPROVAL"
  | "TOPUP_REQUESTED"
  | "FLOAT_SENT"
  | "MEASUREMENT_RECORDED"
  | "SUBCONTRACTOR_OVERPAID"
  | "INVOICE_OVERDUE"
  | "CHEQUE_BOUNCED"
  | "STAGE_READY_UNBILLED"
  | "PREVIOUS_STAGE_UNPAID"
  | "SUBSCRIPTION_RENEWAL"
  | "SUBSCRIPTION_PAYMENT_APPROVED"
  | "SUBSCRIPTION_PAYMENT_REJECTED"
  | "INVITE_ACCEPTED";

export interface AppNotification {
  id: Id;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  project: ProjectCodeRef | null;
  refType: string;
  refId: Id;
  actionUrl: string | null;
  read: boolean;
  readAt: IsoDateTime | null;
  smsSent: boolean;
  createdAt: IsoDateTime;
}

export interface UnreadCount {
  count: number;
  critical: number;
  warning: number;
}

export type NotificationsQuery = QueryParams<"/api/v1/notifications", "get">;

// ─── Approvals ──────────────────────────────────────────────────────────────

export type ApprovalType =
  | "SETTLEMENT_SUBMITTED"
  | "EXPENSE_PENDING_APPROVAL"
  | "TOPUP_PENDING"
  | "MEASUREMENT_TO_VERIFY"
  | "SHORTAGE_OPEN"
  | "PURCHASE_PENDING_RATE"
  | "STAGE_READY_UNBILLED"
  | "INVOICE_DRAFT"
  | "CHEQUE_PENDING";
export type ApprovalAction = "approve" | "reject" | "return" | "verify" | "issue" | "clear" | "bounce";

export interface QuickAction {
  action: ApprovalAction;
  label: string;
  needsNote: boolean;
  needsMethod: boolean;
}

export interface ApprovalItem {
  type: ApprovalType;
  id: Id;
  title: string;
  subtitle: string | null;
  project: ProjectCodeRef | null;
  amountPaisa: Paisa | null;
  createdAt: IsoDateTime;
  ageDays: number;
  actionUrl: string;
  quickActions: QuickAction[];
}

export interface ApprovalGroup {
  type: ApprovalType;
  label: string;
  count: number;
  totalPaisa: Paisa | null;
  items: ApprovalItem[];
}

export interface Approvals {
  total: number;
  groups: ApprovalGroup[];
}

export type BulkApprovalBody = RequestBody<"/api/v1/approvals/bulk", "post">;
export type BulkApprovalItem = BulkApprovalBody["items"][number];
export interface BulkApprovalResult {
  succeeded: number;
  failed: number;
  results: Array<{ type: ApprovalType; id: Id; action: ApprovalAction; ok: boolean; error: { code: string; message: string } | null }>;
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export type OverviewQuery = QueryParams<"/api/v1/dashboard/overview", "get">;
export interface Period {
  from: IsoDate;
  to: IsoDate;
}

export interface DashboardAlert {
  source: "BILLING_EVENT" | "NOTIFICATION";
  id: Id;
  type: string;
  severity: NotificationSeverity;
  title: string;
  project: ProjectCodeRef | null;
  at: IsoDateTime;
  actionUrl: string | null;
}

export interface OverviewProjectRow {
  project: ProjectStatusRef;
  client: NamedRef | null;
  /** The money columns are absent without billing.view. */
  contractPaisa?: Paisa;
  invoicedPaisa?: Paisa;
  receivedPaisa?: Paisa;
  outstandingPaisa?: Paisa;
  overduePaisa?: Paisa;
  spentToDatePaisa?: Paisa;
  ownMoneyInvestedPaisa?: Paisa;
  percentBilled?: number;
  percentSpentOfContract?: number;
  atRisk?: boolean;
  nextBillableStage?: { id: Id; label: string; status: string; amountPaisa: Paisa } | null;
}

export interface DashboardOverview {
  period: Period;
  asOf: IsoDate;
  seesFinancials: boolean;
  kpis: {
    activeProjects: { count: number; atRisk: number; delayed: number };
    pendingApprovals: number;
    openShortages: number;
    dispatchesOnTheWay: number;
    receivablesOutstandingPaisa?: Paisa;
    collectedPercent?: number;
    invoicedPaisa?: Paisa;
    receivedPaisa?: Paisa;
    overduePaisa?: Paisa;
    supplierUdhaarPaisa?: Paisa;
    supplierOldestDays?: number;
    supplierPaidPercent?: number;
    storeStockValuePaisa?: Paisa;
    inTransitValuePaisa?: Paisa;
    cashWithSiteStaffPaisa?: Paisa;
    ownMoneyInvestedPaisa?: Paisa;
  };
  site: {
    hazriToday: { mistri: number; mazdoor: number; other: number; total: number };
    assignedWorkers: number;
    peshgiThisWeekPaisa: Paisa;
    siteKharchaThisWeekPaisa: Paisa;
    week: { weekStart: IsoDate; weekEnd: IsoDate };
    deliveriesToday: number;
    openShortages: number;
  };
  labor: {
    period: Period;
    wagesPaisa: Paisa;
    byWorkerType: Array<{ type: string; days: number; wagesPaisa: Paisa }>;
    subcontractorsOverpaid: number;
  };
  alerts: DashboardAlert[];
  projects: OverviewProjectRow[];
  payments?: {
    period: Period;
    receivedPaisa: Paisa;
    byMethod: Array<{ method: ClientPaymentMethod; amountPaisa: Paisa; count: number }>;
    cheques: { clearedPaisa: Paisa; pendingPaisa: Paisa; bouncedPaisa: Paisa };
  };
}

export interface SiteMaterialLine {
  material: { id: Id; name: string; unit: string };
  quantity: number;
}

export interface SiteDashboard {
  project: ProjectStatusRef;
  date: IsoDate;
  week: { weekStart: IsoDate; weekEnd: IsoDate };
  hazriToday: { assigned: number; marked: number; full: number; half: number; absent: number; unmarked: number; present: { mistri: number; mazdoor: number; other: number } };
  incoming: Array<{ kind: "DISPATCH" | "PURCHASE"; id: Id; number: string; from: string; vehicleNo: string | null; date: IsoDateTime; items: SiteMaterialLine[]; actionUrl: string }>;
  myCash: { accountId: Id; balancePaisa: Paisa; pendingAckPaisa: Paisa; pendingApprovalPaisa: Paisa; openTopup: { id: Id; amountPaisa: Paisa; requestedAt: IsoDateTime } | null } | null;
  todo: Array<{ type: string; label: string; actionUrl: string }>;
  recent: {
    usage: Array<{ id: Id; date: IsoDate; items: SiteMaterialLine[] }>;
    myKharcha: Array<{ id: Id; date: IsoDate | null; description: string; category: string | null; amountPaisa: Paisa; status: string }>;
  };
}

// ─── Finance ────────────────────────────────────────────────────────────────

export type CashFlowQuery = QueryParams<"/api/v1/finance/cash-flow", "get">;
export interface CashFlowMonth {
  month: string;
  days: number;
  expectedReceipts: { invoicesPaisa: Paisa; stagesPaisa: Paisa; totalPaisa: Paisa };
  plannedOutflows: { suppliersPaisa: Paisa; wagesPaisa: Paisa; subcontractPaisa: Paisa; expensesPaisa: Paisa; totalPaisa: Paisa };
  netPaisa: Paisa;
  ownMoneyInvestedAfterPaisa: Paisa;
}
export interface CashFlowOutlook {
  estimate: true;
  asOf: IsoDate;
  months: CashFlowMonth[];
  openingOwnMoneyInvestedPaisa: Paisa;
  closingOwnMoneyInvestedPaisa: Paisa;
  beyondHorizonReceiptsPaisa: Paisa;
  weeklyRunRate: { wagesPaisa: Paisa; subcontractPaisa: Paisa; expensesPaisa: Paisa };
  assumptions: string[];
}

export type PnlBucket = "MATERIALS" | "LABOR_WAGES" | "SUBCONTRACT" | "SITE_OVERHEAD" | "EQUIPMENT" | "LOSSES";
export type CostBuckets = Record<PnlBucket, Paisa>;
export type PnlQuery = QueryParams<"/api/v1/finance/pnl", "get">;
export interface PnlProject {
  project: ProjectStatusRef;
  client: NamedRef | null;
  revisedContractPaisa: Paisa;
  billedToDatePaisa: Paisa;
  receivedToDatePaisa: Paisa;
  costToDatePaisa: Paisa;
  cost: CostBuckets;
  grossProfitToDatePaisa: Paisa;
  marginToDatePercent: number | null;
  percentBilled: number;
  percentCostOfContract: number;
  projectedMarginPercent: number | null;
  projectedMarginNote: string;
}
export interface ProfitAndLoss {
  period: { from: IsoDate | null; to: IsoDate };
  buckets: Array<keyof CostBuckets>;
  projects: PnlProject[];
  totals: {
    revisedContractPaisa: Paisa;
    billedToDatePaisa: Paisa;
    receivedToDatePaisa: Paisa;
    costToDatePaisa: Paisa;
    cost: CostBuckets;
    grossProfitToDatePaisa: Paisa;
    marginToDatePercent: number | null;
  };
  trend: Array<{ month: string; billedPaisa: Paisa; costPaisa: Paisa; grossProfitPaisa: Paisa }>;
  projectedMarginNote: string;
}

export interface CashFloatItem {
  id: Id;
  name: string;
  holder: { id: Id; name: string; role: string; phone: string };
  isActive: boolean;
  balancePaisa: Paisa;
  pendingAckPaisa: Paisa;
  pendingApprovalPaisa: Paisa;
  recoverablePaisa: Paisa;
  lastCountAt: IsoDateTime | null;
  lastEntryAt: IsoDateTime | null;
  projects: ProjectStatusRef[];
  totalFloatedPaisa: Paisa;
  spentThisWeekPaisa: Paisa;
  lastCount: { countedAt: IsoDateTime; differencePaisa: Paisa } | null;
  pendingTopup: { id: Id; amountPaisa: Paisa; note: string | null; requestedAt: IsoDateTime } | null;
}
export interface CashFloatsOverview {
  week: { weekStart: IsoDate; weekEnd: IsoDate };
  items: CashFloatItem[];
  totals: {
    balancePaisa: Paisa;
    pendingAckPaisa: Paisa;
    pendingApprovalPaisa: Paisa;
    recoverablePaisa: Paisa;
    holders: number;
    spentThisWeekPaisa: Paisa;
    pendingTopupsPaisa: Paisa;
    pendingTopups: number;
  };
}

// ─── Reports ────────────────────────────────────────────────────────────────

export type ReportName = "project-summary" | "material-audit" | "labor-peshgi" | "cash-book" | "supplier-ageing" | "receivables-ageing" | "stock-valuation";
export type ReportFormat = "json" | "csv" | "xlsx" | "pdf";
export type ReportQuery = QueryParams<"/api/v1/reports/project-summary", "get">;
export type ReportColumnType = "text" | "money" | "qty" | "int" | "percent" | "date";
export type ReportCell = string | number | null;
export interface ReportTable {
  name: ReportName;
  title: string;
  subtitle: string;
  generatedAt: IsoDateTime;
  filters: { projectId: Id | null; from: IsoDate | null; to: IsoDate | null };
  columns: Array<{ key: string; label: string; type: ReportColumnType }>;
  rows: Array<Record<string, ReportCell>>;
  totals: Record<string, ReportCell> | null;
  notes?: string[];
}
export interface ReportFile {
  attachmentId: Id;
  fileName: string;
  format: Exclude<ReportFormat, "json">;
  mimeType: string;
  sizeBytes: number;
  url: string;
  expiresAt: IsoDateTime;
}
