import { adminBaseApi } from "@/api/adminBaseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type { ActAsModeBody, ActAsSession, ActAsSessionsQuery, Paginated, StartActAsBody } from "@/api/types";

const changed = (id: string) => [
  { type: "ActAsSessions" as const, id },
  { type: "ActAsSessions" as const, id: LIST },
  { type: "AuditLogs" as const, id: LIST },
];

/**
 * Support sessions (act-as): the super admin opens a company with a reason (read-only), may
 * switch to write mode with a second reason, and ends it (or it expires after 60 minutes).
 */
export const adminActAsApi = adminBaseApi.injectEndpoints({
  endpoints: (build) => ({
    getActAsSessions: build.query<Paginated<ActAsSession>, ActAsSessionsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.admin.actAsSessions, params: cleanParams(params ?? undefined) }),
      transformResponse: (data, meta) => toPage<ActAsSession>(data, meta),
      providesTags: (page) => providesList(page?.items, "ActAsSessions"),
    }),
    getActAsSession: build.query<ActAsSession, string>({
      query: (id) => ENDPOINTS.admin.actAsSessionById(id),
      providesTags: (_r, _e, id) => [{ type: "ActAsSessions", id }],
    }),
    startActAsSession: build.mutation<ActAsSession, StartActAsBody>({
      query: (body) => ({ url: ENDPOINTS.admin.actAsSessions, method: "POST", body }),
      // Starting ends the admin's other live session.
      invalidatesTags: ["ActAsSessions", { type: "AuditLogs", id: LIST }],
    }),
    changeActAsMode: build.mutation<ActAsSession, { id: string; body: ActAsModeBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.admin.actAsSessionMode(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => changed(id),
    }),
    endActAsSession: build.mutation<ActAsSession, string>({
      query: (id) => ({ url: ENDPOINTS.admin.actAsSessionEnd(id), method: "POST" }),
      invalidatesTags: (_r, _e, id) => changed(id),
    }),
  }),
});

export const {
  useGetActAsSessionsQuery,
  useGetActAsSessionQuery,
  useStartActAsSessionMutation,
  useChangeActAsModeMutation,
  useEndActAsSessionMutation,
} = adminActAsApi;
