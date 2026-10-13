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
/** One row of the company's own audit log (owner only); platform support rows carry `platformSupport`. */
export type CompanyAuditEntry = Schemas["CompanyAuditEntry"];
export type CompanyAuditQuery = QueryParams<"/api/v1/company/audit-logs", "get">;

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
// ─── Roles & permissions (PERMISSIONS_API.md) ───────────────────────────────
export type PermissionCatalog = Schemas["PermissionCatalog"];
export type CatalogPermission = PermissionCatalog["permissions"][number];
export type CatalogModule = PermissionCatalog["modules"][number];
export type CatalogTemplate = PermissionCatalog["templates"][number];
/** `{ en, roman, urdu }` label from the catalogue. */
export type CatalogLabel = CatalogPermission["label"];
export type PermissionRole = Schemas["Role"];
export type RoleBaseRole = PermissionRole["baseRole"];
export type RoleGrant = PermissionRole["permissions"][number];
export type PermissionScope = NonNullable<RoleGrant["scope"]>;
export type UserPermissions = Schemas["UserPermissions"];
export type EffectivePermission = UserPermissions["effective"][number];
export type PermissionOverride = UserPermissions["overrides"][number];
export type CreateRoleBody = RequestBody<"/api/v1/roles", "post">;
export type UpdateRoleBody = RequestBody<"/api/v1/roles/{id}", "patch">;
export type DuplicateRoleBody = RequestBody<"/api/v1/roles/{id}/duplicate", "post">;
export type SetRolePermissionsBody = RequestBody<"/api/v1/roles/{id}/permissions", "put">;
export type SetOverridesBody = RequestBody<"/api/v1/users/{id}/permission-overrides", "put">;
export type SetUserRoleBody = RequestBody<"/api/v1/users/{id}/role", "patch">;

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
