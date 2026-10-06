/**
 * Billing & receivables (Phase 1 · Step 8). Bodies / queries from the generated OpenAPI
 * file; response shapes written here (the backend documents them by example).
 */
import type { Id, IsoDate, IsoDateTime, NamedRef, Paisa, QueryParams, RequestBody } from "./common";
import type { ProjectRef } from "./inventory";

export type StageStatus = "UPCOMING" | "READY" | "INVOICED" | "PARTLY_PAID" | "PAID";
export type InvoiceType = "STAGE" | "RUNNING_BILL" | "RECOVERABLE" | "RETENTION" | "OTHER";
export type InvoiceStatus = "DRAFT" | "ISSUED" | "PARTLY_PAID" | "PAID" | "CANCELLED";
export type ClientPaymentMethod = "CASH" | "BANK_TRANSFER" | "CHEQUE" | "JAZZCASH" | "EASYPAISA" | "RAAST";
export type ClientPaymentStatus = "CLEARED" | "PENDING" | "BOUNCED";

export interface StageInvoiceRef {
  id: Id;
  number: string | null;
  status: InvoiceStatus;
  dueDate: IsoDate | null;
  totalPaisa: Paisa;
  balancePaisa: Paisa;
}

export interface ScheduleStage {
  id: Id;
  sortOrder: number;
  label: string;
  percent: number;
  isRetention: boolean;
  amountPaisa: Paisa;
  status: StageStatus;
  expectedDate: IsoDate | null;
  readyAt: IsoDateTime | null;
  readyById: Id | null;
  readyNote: string | null;
  proofAttachmentIds: Id[];
  invoice: StageInvoiceRef | null;
}

export interface UnpaidStageWarning {
  code: "PREVIOUS_STAGE_UNPAID";
  message: string;
  details: { stages: Array<{ stageId: Id; label: string; invoiceId: Id; invoiceNumber: string | null; dueDate: IsoDate | null; balancePaisa: Paisa; overdueDays: number }> };
}

export interface MarkReadyResult {
  stage: ScheduleStage;
  warning: UnpaidStageWarning | null;
}

export interface BillingProgress {
  id: Id;
  projectId: Id;
  date: IsoDate;
  quantity: number;
  unit: string;
  description: string;
  attachmentIds: Id[];
  valuePaisa: Paisa | null;
  billedInvoiceId: Id | null;
  draftInvoiceId: Id | null;
  billed: boolean;
  createdAt: IsoDateTime;
}

export interface BillingProgressList {
  items: BillingProgress[];
  ratePerSqftPaisa: Paisa | null;
  unbilledQuantity: number;
  unbilledValuePaisa: Paisa;
}

export interface InvoiceLine {
  id: Id;
  description: string;
  quantity: number | null;
  unit: string | null;
  ratePaisa: Paisa | null;
  amountPaisa: Paisa;
  sourceType: "BILLING_STAGE" | "BILLING_PROGRESS" | "CASH_ENTRY" | "RETENTION" | "MANUAL";
  sourceId: Id | null;
}

export interface InvoiceAllocation {
  id: Id;
  amountPaisa: Paisa;
  counts: boolean;
  payment: { id: Id; number: string; receivedOn: IsoDate; method: ClientPaymentMethod; status: ClientPaymentStatus; chequeNo: string | null };
}

export interface Invoice {
  id: Id;
  number: string | null;
  type: InvoiceType;
  status: InvoiceStatus;
  project: ProjectRef;
  client: (NamedRef & { phone: string | null; address: string | null }) | null;
  billingStage: { id: Id; label: string; percent: number } | null;
  issueDate: IsoDate | null;
  dueDate: IsoDate | null;
  overdue: boolean;
  overdueDays: number;
  subtotalPaisa: Paisa;
  taxPaisa: Paisa;
  taxLabel: string | null;
  taxRatePercent: number | null;
  totalPaisa: Paisa;
  paidPaisa: Paisa;
  pendingPaisa: Paisa;
  balancePaisa: Paisa;
  notes: string | null;
  forceNote: string | null;
  cancelReason: string | null;
  cancelledAt: IsoDateTime | null;
  pdfAttachmentId: Id | null;
  lines: InvoiceLine[];
  allocations: InvoiceAllocation[];
  createdAt: IsoDateTime;
  issuedAt: IsoDateTime | null;
}

export interface ClientPayment {
  id: Id;
  number: string;
  project: ProjectRef;
  client: NamedRef | null;
  receivedOn: IsoDate;
  amountPaisa: Paisa;
  whtDeductedPaisa: Paisa;
  method: ClientPaymentMethod;
  bankName: string | null;
  reference: string | null;
  chequeNo: string | null;
  chequeDate: IsoDate | null;
  status: ClientPaymentStatus;
  allocatedPaisa: Paisa;
  creditPaisa: Paisa;
  allocations: Array<{ id: Id; amountPaisa: Paisa; invoice: { id: Id; number: string | null; type: InvoiceType; status: InvoiceStatus } }>;
  attachmentId: Id | null;
  receiptAttachmentId: Id | null;
  note: string | null;
  bounceReason: string | null;
  clearedAt: IsoDateTime | null;
  bouncedAt: IsoDateTime | null;
  receivedById: Id | null;
  createdAt: IsoDateTime;
}

export interface ProjectReceivables {
  project: ProjectRef & { status: string; billingModel: string | null };
  originalContractPaisa: Paisa;
  approvedChangesPaisa: Paisa;
  revisedContractPaisa: Paisa;
  invoicedPaisa: Paisa;
  receivedPaisa: Paisa;
  pendingChequesPaisa: Paisa;
  outstandingPaisa: Paisa;
  overduePaisa: Paisa;
  oldestOverdueDays: number;
  creditPaisa: Paisa;
  retentionHeldPaisa: Paisa;
  unbilledRecoverablePaisa: Paisa;
  readyStagesCount: number;
  collectedPercent: number;
  spentToDatePaisa: Paisa;
  spent: Record<"materialPaisa" | "wagesPaisa" | "advancesPaisa" | "subcontractPaisa" | "kharchaPaisa" | "lossesPaisa" | "totalPaisa", Paisa>;
  ownMoneyInvestedPaisa: Paisa;
  nextBillableStage: ScheduleStage | null;
  stages: Array<{ id: Id; label: string; percent: number; amountPaisa: Paisa; status: StageStatus; isRetention: boolean; expectedDate: IsoDate | null; invoiceId: Id | null; invoiceNumber: string | null; dueDate: IsoDate | null }>;
}

export type AgeingBucket = "0-15" | "16-30" | "31-60" | "60+";
/** Outstanding by days since the invoice was issued (or the purchase, for suppliers). */
export interface AgeingAmount {
  bucket: AgeingBucket;
  amountPaisa: Paisa;
}

export interface CompanyReceivablesRow {
  project: ProjectRef & { status: string };
  client: (NamedRef & { phone: string | null }) | null;
  revisedContractPaisa: Paisa;
  invoicedPaisa: Paisa;
  receivedPaisa: Paisa;
  pendingChequesPaisa: Paisa;
  outstandingPaisa: Paisa;
  overduePaisa: Paisa;
  oldestOverdueDays: number;
  creditPaisa: Paisa;
  retentionHeldPaisa: Paisa;
  nextBillableStage: { id: Id; label: string; status: StageStatus; amountPaisa: Paisa } | null;
  ageing: AgeingAmount[];
}

export interface CompanyReceivables {
  asOf: IsoDate;
  items: CompanyReceivablesRow[];
  totals: {
    revisedContractPaisa: Paisa;
    invoicedPaisa: Paisa;
    receivedPaisa: Paisa;
    pendingChequesPaisa: Paisa;
    outstandingPaisa: Paisa;
    overduePaisa: Paisa;
    retentionHeldPaisa: Paisa;
    overdueProjects: number;
    ageing: AgeingAmount[];
  };
}

export interface OwnerStatement {
  project: ProjectRef;
  client: (NamedRef & { phone: string | null }) | null;
  from: IsoDate;
  to: IsoDate;
  openingPaisa: Paisa;
  rows: Array<{ date: IsoDate; kind: "INVOICE" | "PAYMENT"; id: Id; reference: string; description: string; debitPaisa: Paisa; creditPaisa: Paisa; balancePaisa: Paisa; status: ClientPaymentStatus | null }>;
  totals: { invoicedPaisa: Paisa; receivedPaisa: Paisa };
  closingPaisa: Paisa;
  creditPaisa: Paisa;
  pendingChequesPaisa: Paisa;
  unbilledRecoverables: Array<{ id: Id; date: IsoDate; description: string; amountPaisa: Paisa }>;
}

export interface SharedPdf {
  attachmentId: Id;
  url: string;
  expiresAt: IsoDateTime;
  whatsappText: string;
  clientPhone: string | null;
}

export interface BillingEvent {
  id: Id;
  type: "INVOICE_OVERDUE" | "CHEQUE_BOUNCED" | "STAGE_READY_UNBILLED" | "PREVIOUS_STAGE_UNPAID";
  project: ProjectRef;
  refType: string;
  refId: Id;
  details: Record<string, unknown> | null;
  occurredAt: IsoDateTime;
  resolvedAt: IsoDateTime | null;
  href: string;
}

export type MarkReadyBody = RequestBody<"/api/v1/billing-stages/{id}/mark-ready", "post">;
export type UpdateStageBody = RequestBody<"/api/v1/billing-stages/{id}", "patch">;
export type BillingProgressBody = RequestBody<"/api/v1/projects/{id}/billing-progress", "post">;
export type UpdateProgressBody = RequestBody<"/api/v1/billing-progress/{id}", "patch">;
export type CreateInvoiceBody = RequestBody<"/api/v1/projects/{id}/invoices", "post">;
export type UpdateInvoiceBody = RequestBody<"/api/v1/invoices/{id}", "patch">;
export type InvoicesQuery = QueryParams<"/api/v1/projects/{id}/invoices", "get">;
export type RecordPaymentBody = RequestBody<"/api/v1/projects/{id}/payments", "post">;
export type ClientChequeStatusBody = RequestBody<"/api/v1/payments/{id}/cheque-status", "patch">;
export type ClientPaymentsQuery = QueryParams<"/api/v1/projects/{id}/payments", "get">;
export type ReceivablesQuery = QueryParams<"/api/v1/receivables", "get">;
export type StatementQuery = QueryParams<"/api/v1/projects/{id}/owner-statement", "get">;
