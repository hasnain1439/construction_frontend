import { createApi } from "@reduxjs/toolkit/query/react";
import { createReauthBaseQuery } from "@/api/baseQuery";
import { API_BASE_URL, ENDPOINTS } from "@/api/endpoints";
import { COMPANY_TAGS } from "@/api/tags";
import { redirectToLogin } from "@/lib/session";
import { sessionExpired } from "@/store/sessionEvents";

/** Company API (THEKEDAR / PM / MUNSHI). Services add endpoints with `injectEndpoints`. */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: createReauthBaseQuery({
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
  }),
  tagTypes: COMPANY_TAGS,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
