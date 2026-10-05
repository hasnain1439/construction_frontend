import type { Id, IsoDateTime, QueryParams, RequestBody, ResponseData, Schemas } from "./common";
import type { Role } from "./auth";

// ─── Company ────────────────────────────────────────────────────────────────
export type Company = Schemas["Company"];
export type CompanySettings = Schemas["CompanySettings"];
export type Holiday = Schemas["Holiday"];
export type UpdateCompanyBody = RequestBody<"/api/v1/company", "patch">;
export type UpdateSettingsBody = RequestBody<"/api/v1/company/settings", "patch">;
export type CreateHolidayBody = RequestBody<"/api/v1/company/holidays", "post">;
export type HolidaysQuery = QueryParams<"/api/v1/company/holidays", "get">;

// ─── Attachments ────────────────────────────────────────────────────────────
export type Attachment = Schemas["Attachment"];
export type AttachmentKind = Attachment["kind"];

// ─── Team ───────────────────────────────────────────────────────────────────
export type TeamUser = Schemas["TeamUser"];
export type TeamUserDetail = Schemas["TeamUserDetail"];
export type UsersQuery = QueryParams<"/api/v1/users", "get">;
export type UpdateUserBody = RequestBody<"/api/v1/users/{id}", "patch">;
export type SetUserProjectsBody = RequestBody<"/api/v1/users/{id}/projects", "put">;
export interface UsersUsage {
  usage: { officeUsers: number; maxOfficeUsers: number | null };
}

export type Invitation = Schemas["Invitation"];
export type InvitationSent = Schemas["InvitationSent"];
export type InvitationStatus = Invitation["status"];
export type InvitationsQuery = QueryParams<"/api/v1/invitations", "get">;
export type CreateInvitationBody = RequestBody<"/api/v1/invitations", "post">;
export type CancelInvitationResult = ResponseData<"/api/v1/invitations/{id}", "delete">;

/**
 * Device list row. The OpenAPI document reuses the name `Device` for the login body,
 * so this shape is written from the live response (see README → backend notes).
 */
export interface DeviceRow {
  id: Id;
  user: { id: Id; name: string; role: Role };
  platform: "ANDROID" | "IOS" | "WEB";
  model: string | null;
  appVersion: string | null;
  lastActiveAt: IsoDateTime | null;
  lastSyncAt: IsoDateTime | null;
  pendingUploads: number;
  revokedAt: IsoDateTime | null;
  current: boolean;
}
export type RevokeDeviceResult = ResponseData<"/api/v1/devices/{id}", "delete">;

// ─── Subscription ───────────────────────────────────────────────────────────
export type SubscriptionDetail = Schemas["SubscriptionDetail"];
export type Plan = Schemas["Plan"];
export type PlanOption = Schemas["PlanOption"];
export type SubscriptionPayment = Schemas["SubscriptionPayment"];
export type PaymentMethod = SubscriptionPayment["method"];
export type PaymentStatus = SubscriptionPayment["status"];
export type PlanChange = Schemas["PlanChange"];
export type SubmitPaymentBody = RequestBody<"/api/v1/subscription/payments", "post">;
export type ChangePlanBody = RequestBody<"/api/v1/subscription/change-plan", "post">;
export type PaymentsQuery = QueryParams<"/api/v1/subscription/payments", "get">;
