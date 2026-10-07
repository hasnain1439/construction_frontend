import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type { DailyLog, DailyLogDetail, DailyLogsQuery, Paginated, SyncDeviceStatus } from "@/api/types";

/** Daily logs (written on the phone) and the phones' sync health. Read-only on the web. */
export const dailyLogsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDailyLogs: build.query<Paginated<DailyLog>, DailyLogsQuery>({
      query: ({ projectId, ...params }) => ({
        url: ENDPOINTS.dailyLogs.list(projectId),
        params: cleanParams(params),
      }),
      transformResponse: (data, meta) => toPage<DailyLog>(data, meta),
      providesTags: (page) => providesList(page?.items, "DailyLogs"),
    }),
    getDailyLog: build.query<DailyLogDetail, string>({
      query: (id) => ENDPOINTS.dailyLogs.byId(id),
      providesTags: (_r, _e, id) => [{ type: "DailyLogs", id }],
    }),
    getSyncStatus: build.query<SyncDeviceStatus[], void>({
      query: () => ENDPOINTS.sync.status,
      providesTags: ["SyncStatus"],
    }),
  }),
});

export const { useGetDailyLogsQuery, useGetDailyLogQuery, useGetSyncStatusQuery } = dailyLogsApi;
