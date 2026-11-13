import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import type { MarkStructureProgressBody, StructureProgress } from "@/api/types";

/** Structure progress: the 3D parts marked done / in progress with the day's work. */
export const progressApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStructureProgress: build.query<StructureProgress, string>({
      query: (projectId) => ENDPOINTS.dailyLogs.structureProgress(projectId),
      providesTags: (_r, _e, projectId) => [{ type: "Projects", id: `progress:${projectId}` }],
    }),
    markStructureProgress: build.mutation<StructureProgress, { projectId: string; body: MarkStructureProgressBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.dailyLogs.structureProgress(projectId), method: "PUT", body }),
      invalidatesTags: (_r, _e, { projectId }) => [{ type: "Projects", id: `progress:${projectId}` }],
    }),
  }),
});

export const { useGetStructureProgressQuery, useMarkStructureProgressMutation } = progressApi;
