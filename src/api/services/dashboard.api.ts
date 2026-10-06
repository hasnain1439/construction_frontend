import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST } from "@/api/tags";
import { cleanParams } from "@/api/transform";
import type { DashboardOverview, OverviewQuery, SiteDashboard } from "@/api/types";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDashboardOverview: build.query<DashboardOverview, OverviewQuery | void>({
      query: (params) => ({ url: ENDPOINTS.dashboard.overview, params: cleanParams(params ?? undefined) }),
      providesTags: [{ type: "Dashboard", id: LIST }],
    }),
    getSiteDashboard: build.query<SiteDashboard, string>({
      query: (projectId) => ENDPOINTS.dashboard.site(projectId),
      providesTags: (_r, _e, projectId) => [{ type: "Dashboard", id: projectId }],
    }),
  }),
});

export const { useGetDashboardOverviewQuery, useGetSiteDashboardQuery } = dashboardApi;
