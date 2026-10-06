import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { cleanParams } from "@/api/transform";
import type { ReportFile, ReportFormat, ReportName, ReportQuery, ReportTable } from "@/api/types";

type Filters = Omit<NonNullable<ReportQuery>, "format">;

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getReport: build.query<ReportTable, { name: ReportName } & Filters>({
      query: ({ name, ...params }) => ({ url: ENDPOINTS.reports.byName(name), params: cleanParams({ ...params, format: "json" }) }),
      providesTags: (_r, _e, { name }) => [{ type: "Reports", id: name }],
    }),
    /** csv / xlsx / pdf → a signed link to the stored file (a mutation: it creates a file each time). */
    exportReport: build.mutation<ReportFile, { name: ReportName; format: Exclude<ReportFormat, "json"> } & Filters>({
      query: ({ name, ...params }) => ({ url: ENDPOINTS.reports.byName(name), params: cleanParams(params) }),
    }),
  }),
});

export const { useGetReportQuery, useExportReportMutation } = reportsApi;
