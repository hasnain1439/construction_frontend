import { adminBaseApi } from "@/api/adminBaseApi";
import { ENDPOINTS } from "@/api/endpoints";
import type { AdminAuthResult, AdminLoginBody, LoggedOut, PlatformAdmin } from "@/api/types";

export const adminAuthApi = adminBaseApi.injectEndpoints({
  endpoints: (build) => ({
    adminLogin: build.mutation<AdminAuthResult, Omit<AdminLoginBody, "client">>({
      query: (body) => ({ url: ENDPOINTS.adminAuth.login, method: "POST", body: { ...body, client: "web" } }),
      invalidatesTags: ["AdminMe"],
    }),
    /** Silent session check used by the admin login page. */
    adminRefreshSession: build.mutation<{ accessTokenExpiresIn: number }, void>({
      query: () => ({ url: ENDPOINTS.adminAuth.refresh, method: "POST", body: { client: "web" } }),
    }),
    getAdminMe: build.query<PlatformAdmin, void>({
      query: () => ENDPOINTS.adminAuth.me,
      providesTags: ["AdminMe"],
    }),
    adminLogout: build.mutation<LoggedOut, void>({
      query: () => ({ url: ENDPOINTS.adminAuth.logout, method: "POST" }),
    }),
  }),
});

export const { useAdminLoginMutation, useAdminRefreshSessionMutation, useGetAdminMeQuery, useAdminLogoutMutation } =
  adminAuthApi;
