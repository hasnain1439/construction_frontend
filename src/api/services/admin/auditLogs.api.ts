import { adminBaseApi } from "@/api/adminBaseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type { AuditLogRow, AuditLogsQuery, Paginated } from "@/api/types";

export const adminAuditLogsApi = adminBaseApi.injectEndpoints({
  endpoints: (build) => ({
    getAuditLogs: build.query<Paginated<AuditLogRow>, AuditLogsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.admin.auditLogs, params: cleanParams(params ?? undefined) }),
      transformResponse: (data, meta) => toPage<AuditLogRow>(data, meta),
      providesTags: (page) => providesList(page?.items, "AuditLogs"),
    }),
  }),
});

export const { useGetAuditLogsQuery } = adminAuditLogsApi;
