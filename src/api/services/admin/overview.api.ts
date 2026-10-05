import { adminBaseApi } from "@/api/adminBaseApi";
import { ENDPOINTS } from "@/api/endpoints";
import type { AdminHealth, AdminOverview } from "@/api/types";

export const adminOverviewApi = adminBaseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminOverview: build.query<AdminOverview, void>({
      query: () => ENDPOINTS.admin.overview,
      providesTags: ["AdminOverview"],
    }),
    getAdminHealth: build.query<AdminHealth, void>({
      query: () => ENDPOINTS.admin.health,
      providesTags: ["AdminHealth"],
    }),
  }),
});

export const { useGetAdminOverviewQuery, useGetAdminHealthQuery } = adminOverviewApi;
