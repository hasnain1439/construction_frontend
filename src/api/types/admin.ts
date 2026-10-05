/**
 * Platform admin console. Request bodies are generated; response shapes follow the
 * live API / platform-admin services (the OpenAPI document has no response schema).
 */
import type { Id, IsoDate, IsoDateTime, NamedRef, Paisa, QueryParams, RequestBody } from "./common";
import type { Region, SubscriptionStatus, TenantStatus } from "./auth";
import type { AltUnit, MaterialSection, SupplyCategory } from "./masterData";
import type { PaymentMethod, PaymentStatus } from "./company";

export interface AdminOverview {
  activeCompanies: number;
  trialCompanies: number;
  graceCompanies: number;
  readOnlyCompanies: number;
  suspendedCompanies: number;
  mrrPaisa: Paisa;
  paymentsAwaitingReview: number;
  trialsEndingThisWeek: number;
  planDistribution: Array<{ planCode: string; count: number }>;
  revenueByMonth: Array<{ month: string; amountPaisa: Paisa }>;
}

export interface AdminHealth {
  api: { ok: boolean };
  database: { ok: boolean; latencyMs?: number; error?: string };
  smsProvider: string;
  mailProvider: string;
  storageProvider: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  jobs: {
    subscriptionLifecycle: {
      lastRunAt: IsoDateTime | null;
      lastFinishedAt: IsoDateTime | null;
      lastStatus: string | null;
      lastError: string | null;
    } | null;
  };
}

export interface UsageCount {
  used: number;
  limit: number | null;
}

export interface TenantUsage {
  activeProjects: UsageCount;
  officeUsers: UsageCount;
}

export interface TenantRow {
  id: Id;
  name: string;
  slug: string;
  owner: { name: string; phone: string } | null;
  region: Region;
  plan: { id: Id; code: string; name: string } | null;
  subscriptionStatus: SubscriptionStatus | null;
  tenantStatus: TenantStatus;
  usage: TenantUsage;
  renewsOn: IsoDateTime | null;
  createdAt: IsoDateTime;
}

export type TenantsQuery = QueryParams<"/api/v1/admin/tenants", "get">;

export interface AdminPaymentSummary {
  id: Id;
  plan: { code: string; name: string };
  amountPaisa: Paisa;
  method: PaymentMethod;
  transactionId: string;
  paidOn: IsoDate;
  status: PaymentStatus;
  receiptNo: string | null;
  rejectReason: string | null;
  createdAt: IsoDateTime;
}

export interface TenantDetail {
  id: Id;
  name: string;
  slug: string;
  status: TenantStatus;
  region: Region;
  ntn: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  createdAt: IsoDateTime;
  owner: {
    id: Id;
    name: string;
    phone: string;
    email: string | null;
    status: string;
    lastLoginAt: IsoDateTime | null;
  } | null;
  settings: {
    marlaStandard: number;
    timezone: string;
    defaultLanguage: string;
    kharchaApprovalLimitPaisa: Paisa;
    taxEnabled: boolean;
  } | null;
  subscription: {
    id: Id;
    status: SubscriptionStatus;
    plan: { id: Id; code: string; name: string; pricePaisa: Paisa };
    trialEndsAt: IsoDateTime | null;
    currentPeriodStart: IsoDateTime | null;
    currentPeriodEnd: IsoDateTime | null;
    graceEndsAt: IsoDateTime | null;
    pendingPlan: { id?: Id; code: string; name?: string } | null;
    pendingEffectiveOn: IsoDateTime | null;
    keepActiveProjectIds: Id[];
    lastReminderSentAt: IsoDateTime | null;
    cancelledAt: IsoDateTime | null;
  } | null;
  usage: TenantUsage;
  payments: AdminPaymentSummary[];
  auditEvents: Array<{
    id: Id;
    action: string;
    actorType: string;
    actorId: Id | null;
    entityType: string | null;
    entityId: Id | null;
    createdAt: IsoDateTime;
  }>;
}

export type CreateTenantBody = RequestBody<"/api/v1/admin/tenants", "post">;
export type TenantStatusBody = RequestBody<"/api/v1/admin/tenants/{id}/status", "patch">;
export type TenantPlanBody = RequestBody<"/api/v1/admin/tenants/{id}/plan", "patch">;

export interface CreateTenantResult {
  tenant: { id: Id; name: string; slug: string; status: TenantStatus };
  subscription: {
    status: SubscriptionStatus;
    plan: { code: string; name: string };
    trialEndsAt: IsoDateTime | null;
    currentPeriodEnd: IsoDateTime | null;
    receiptNo: string | null;
  };
  owner: {
    name: string;
    phone: string;
    invitation: { id: Id; status: string; expiresAt: IsoDateTime; devInviteUrl?: string };
  };
}

export interface TenantStatusResult {
  id: Id;
  tenantStatus: TenantStatus;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: IsoDateTime | null;
}

export interface TenantPlanResult {
  tenantId: Id;
  effective: "IMMEDIATE" | "NEXT_RENEWAL";
  plan: { code: string };
  pendingPlan: { code: string; effectiveOn: IsoDateTime | null } | null;
  projectsReadOnly: unknown;
}

// ─── Payments ───────────────────────────────────────────────────────────────

export interface AdminPaymentRow {
  id: Id;
  tenant: NamedRef;
  plan: { code: string; name: string };
  expectedAmountPaisa: Paisa;
  amountPaisa: Paisa;
  method: PaymentMethod;
  transactionId: string;
  paidOn: IsoDate;
  submittedAt: IsoDateTime;
  status: PaymentStatus;
  duplicateWarning: boolean;
}

export type AdminPaymentsQuery = QueryParams<"/api/v1/admin/payments", "get">;

export interface AdminPaymentDetail {
  id: Id;
  tenant: { id: Id; name: string; slug: string; status: TenantStatus };
  plan: { id: Id; code: string; name: string };
  expectedAmountPaisa: Paisa;
  amountPaisa: Paisa;
  method: PaymentMethod;
  transactionId: string;
  paidOn: IsoDate;
  status: PaymentStatus;
  rejectReason: string | null;
  reviewNote: string | null;
  receiptNo: string | null;
  periodStart: IsoDateTime | null;
  periodEnd: IsoDateTime | null;
  submittedAt: IsoDateTime;
  submittedBy: NamedRef | null;
  reviewedAt: IsoDateTime | null;
  reviewedBy: { id: Id; name: string; email: string } | null;
  slip: { id: Id; fileName: string; mimeType: string; url: string | null } | null;
  subscription: {
    status: SubscriptionStatus;
    currentPeriodEnd: IsoDateTime | null;
    trialEndsAt: IsoDateTime | null;
    isForPendingPlan: boolean;
  } | null;
  duplicateOf: Array<{ tenantName: string; paidOn: IsoDate; status: PaymentStatus }>;
}

export type ApprovePaymentBody = RequestBody<"/api/v1/admin/payments/{id}/approve", "post">;
export type RejectPaymentBody = RequestBody<"/api/v1/admin/payments/{id}/reject", "post">;

export interface ApprovePaymentResult {
  id: Id;
  status: "APPROVED";
  receiptNo: string;
  periodStart: IsoDateTime;
  periodEnd: IsoDateTime;
}

export interface RejectPaymentResult {
  id: Id;
  status: "REJECTED";
  rejectReason: string;
}

// ─── Plans, holidays, audit log ─────────────────────────────────────────────

export interface AdminPlan {
  id: Id;
  code: string;
  name: string;
  pricePaisa: Paisa;
  maxActiveProjects: number | null;
  maxOfficeUsers: number | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  companies: number;
  updatedAt: IsoDateTime;
}

export type CreatePlanBody = RequestBody<"/api/v1/admin/plans", "post">;
export type UpdatePlanBody = RequestBody<"/api/v1/admin/plans/{id}", "patch">;

export interface PlatformHoliday {
  id: Id;
  name: string;
  startDate: IsoDate;
  endDate: IsoDate;
  type: "NON_WORKING" | "PARTIAL";
  region: Region | null;
}

export type AdminHolidaysQuery = QueryParams<"/api/v1/admin/holidays", "get">;
export type CreatePlatformHolidayBody = RequestBody<"/api/v1/admin/holidays", "post">;
export type UpdatePlatformHolidayBody = RequestBody<"/api/v1/admin/holidays/{id}", "patch">;

export interface AuditLogRow {
  id: Id;
  tenant: NamedRef | null;
  actorType: "USER" | "PLATFORM_ADMIN" | "SYSTEM";
  actorId: Id | null;
  action: string;
  entityType: string | null;
  entityId: Id | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: IsoDateTime;
}

export type AuditLogsQuery = QueryParams<"/api/v1/admin/audit-logs", "get">;

// ─── Platform material catalog ──────────────────────────────────────────────

export interface CatalogGroup {
  id: Id;
  code: string;
  name: string;
  section: MaterialSection;
  sortOrder: number;
  materials: number;
}

export interface CatalogMaterial {
  id: Id;
  group: { id: Id; code: string; name: string };
  name: string;
  unit: string;
  unitDetail: string | null;
  altUnits: AltUnit[];
  supplyCategory: SupplyCategory;
  usedByRulebook: boolean;
  rulebookKey: string | null;
  isActive: boolean;
  sortOrder: number;
  companies?: number;
  pushedTo?: number;
  propagatedTo?: number;
}

export type CatalogMaterialsQuery = QueryParams<"/api/v1/admin/materials", "get">;
export type CreateCatalogMaterialBody = RequestBody<"/api/v1/admin/materials", "post">;
export type UpdateCatalogMaterialBody = RequestBody<"/api/v1/admin/materials/{id}", "patch">;
