import { createApi } from "@reduxjs/toolkit/query/react";
import { createReauthBaseQuery } from "@/api/baseQuery";
import { API_BASE_URL, ENDPOINTS } from "@/api/endpoints";
import { ADMIN_TAGS } from "@/api/tags";
import { redirectToLogin } from "@/lib/session";
import { sessionExpired } from "@/store/sessionEvents";

/** Platform admin API — separate cookies (`admin_*`), separate refresh, separate cache. */
export const adminBaseApi = createApi({
  reducerPath: "adminApi",
  baseQuery: createReauthBaseQuery({
    baseUrl: API_BASE_URL,
    refreshUrl: ENDPOINTS.adminAuth.refresh,
    noRefreshPaths: [ENDPOINTS.adminAuth.login, ENDPOINTS.adminAuth.refresh, ENDPOINTS.adminAuth.logout],
    onSessionExpired: (api) => {
      api.dispatch(sessionExpired({ audience: "platform" }));
      redirectToLogin("platform");
    },
  }),
  tagTypes: ADMIN_TAGS,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
