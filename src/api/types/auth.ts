import type { Id, RequestBody, ResponseData, Schemas } from "./common";

export type Role = Schemas["User"]["role"];
export type Language = Schemas["User"]["language"];
export type Region = Schemas["Tenant"]["region"];
export type TenantStatus = Schemas["Tenant"]["status"];
export type SubscriptionStatus = NonNullable<Schemas["Subscription"]>["status"];

export type AuthUser = Schemas["User"];
export type AuthTenant = Schemas["Tenant"];
export type AuthSubscription = Schemas["Subscription"];
export type AuthResult = Schemas["AuthResult"];
export type Me = Schemas["Me"];
export type Session = Schemas["Session"];
export type PlatformAdmin = Schemas["PlatformAdmin"];
export type AdminAuthResult = Schemas["AdminAuthResult"];

export type SignupBody = RequestBody<"/api/v1/auth/signup", "post">;
export type LoginBody = RequestBody<"/api/v1/auth/login", "post">;
export type OtpRequestBody = RequestBody<"/api/v1/auth/otp/request", "post">;
export type OtpVerifyBody = RequestBody<"/api/v1/auth/otp/verify", "post">;
export type ForgotPasswordBody = RequestBody<"/api/v1/auth/password/forgot", "post">;
export type ResetPasswordBody = RequestBody<"/api/v1/auth/password/reset", "post">;
export type UpdateMeBody = RequestBody<"/api/v1/auth/me", "patch">;

/**
 * Language codes of the preference API (hand-written until the API types are regenerated):
 * GET /auth/me → `language`, PATCH /auth/me/preferences { language }. Older APIs only send
 * `user.language` ("ENGLISH" | "ROMAN_URDU" | "URDU").
 */
export type PreferenceLanguage = "en" | "roman" | "ur";
export interface UpdatePreferencesBody {
  language: PreferenceLanguage;
}
/** /auth/me with the new top-level `language` (optional: absent on older APIs). */
export type MeWithPreferences = Me & { language?: PreferenceLanguage | null };
export type AcceptInvitationBody = RequestBody<"/api/v1/invitations/{token}/accept", "post">;
/** GET /invitations/:token — the invite page header: company and role (QA-C-16). */
export type InvitationPreview = Schemas["InvitationPreview"];
export type AdminLoginBody = RequestBody<"/api/v1/admin/auth/login", "post">;

/** `details` of 409 MULTIPLE_COMPANIES. */
export interface CompanyChoice {
  tenantId: Id;
  name: string;
  role: Role;
}

export type OtpRequestResult = ResponseData<"/api/v1/auth/otp/request", "post">;
export type ForgotPasswordResult = ResponseData<"/api/v1/auth/password/forgot", "post">;
export type ResetPasswordResult = ResponseData<"/api/v1/auth/password/reset", "post">;
export type LogoutAllResult = ResponseData<"/api/v1/auth/logout-all", "post">;
export type RefreshResult = ResponseData<"/api/v1/auth/refresh", "post">;

export interface LoggedOut {
  loggedOut: true;
}

/** `details` of 423 ACCOUNT_LOCKED. */
export interface LockedDetails {
  retryAfterSeconds?: number;
}
