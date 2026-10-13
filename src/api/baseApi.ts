import { createApi } from "@reduxjs/toolkit/query/react";
import type { FetchArgs } from "@reduxjs/toolkit/query/react";
import { createReauthBaseQuery, type ApiBaseQuery } from "@/api/baseQuery";
import { API_BASE_URL, ENDPOINTS } from "@/api/endpoints";
import { COMPANY_TAGS } from "@/api/tags";
import {
  ACT_AS_HEADER,
  ACT_AS_SESSION_GONE,
  ACT_AS_SESSION_HEADER,
  actingSessionId,
  actingTenantId,
  clearActingTenant,
} from "@/lib/actingCompany";
import { redirectToLogin } from "@/lib/session";
import { sessionExpired } from "@/store/sessionEvents";

/** A company user's own session (THEKEDAR / PM / MUNSHI). */
const companyQuery = createReauthBaseQuery({
  baseUrl: API_BASE_URL,
  refreshUrl: ENDPOINTS.auth.refresh,
  noRefreshPaths: [
    ENDPOINTS.auth.login,
    ENDPOINTS.auth.signup,
    ENDPOINTS.auth.refresh,
    ENDPOINTS.auth.otpRequest,
    ENDPOINTS.auth.otpVerify,
    ENDPOINTS.auth.passwordForgot,
    ENDPOINTS.auth.passwordReset,
    ENDPOINTS.auth.logout,
  ],
  onSessionExpired: (api) => {
    api.dispatch(sessionExpired({ audience: "company" }));
    redirectToLogin("company");
  },
});

/** The platform super admin working inside a company (Company data): admin session + X-Act-As-Tenant + X-Act-As-Session. */
const actingQuery = createReauthBaseQuery({
  baseUrl: API_BASE_URL,
  refreshUrl: ENDPOINTS.adminAuth.refresh,
  noRefreshPaths: [ENDPOINTS.adminAuth.login, ENDPOINTS.adminAuth.refresh, ENDPOINTS.adminAuth.logout],
  onSessionExpired: (api) => {
    api.dispatch(sessionExpired({ audience: "platform" }));
    redirectToLogin("platform");
  },
});

const companyOrActing: ApiBaseQuery = async (args, api, extraOptions) => {
  const tenantId = actingTenantId();
  const sessionId = actingSessionId();
  if (!tenantId || !sessionId) return companyQuery(args, api, extraOptions);
  const request: FetchArgs = typeof args === "string" ? { url: args } : args;
  const headers = new Headers(request.headers as HeadersInit | undefined);
  headers.set(ACT_AS_HEADER, tenantId);
  headers.set(ACT_AS_SESSION_HEADER, sessionId);
  const result = await actingQuery({ ...request, headers }, api, extraOptions);
  // The support session expired or was ended (here or by another admin): leave the company.
  if (result.error && ACT_AS_SESSION_GONE.has(result.error.code) && actingSessionId() === sessionId) {
    clearActingTenant();
  }
  return result;
};

/** Company API (THEKEDAR / PM / MUNSHI). Services add endpoints with `injectEndpoints`. */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: companyOrActing,
  tagTypes: COMPANY_TAGS,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
