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
export type AcceptInvitationBody = RequestBody<"/api/v1/invitations/{token}/accept", "post">;
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
