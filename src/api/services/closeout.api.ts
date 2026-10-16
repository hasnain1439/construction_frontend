import { baseApi } from "@/api/baseApi";
import type { ApiMeta } from "@/api/baseQuery";
import { ENDPOINTS } from "@/api/endpoints";
import { cleanParams } from "@/api/transform";
import type {
  AddRevisionBody,
  CompleteHandoverBody,
  CreateDrawingBody,
  CreateSnagBody,
  DrawingDetail,
  DrawingList,
  DrawingsQuery,
  FixSnagBody,
  Handover,
  HandoverItemBody,
  HandoverItemKey,
  ReopenSnagBody,
  Retention,
  RetentionSettingsBody,
  SharedPdf,
  SignOffBody,
  Snag,
  SnagCostBody,
  SnagPage,
  SnagsQuery,
  UpdateDrawingBody,
  UpdateRevisionBody,
  UpdateSnagBody,
  VerifySnagBody,
} from "@/api/types";

const LIST = "LIST";

/** Step 17 · Closeout: drawings, snag list, handover and retention of a project. */
export const closeoutApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ─── Drawings ───────────────────────────────────────────────────────────
    getDrawings: build.query<DrawingList, DrawingsQuery>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.closeout.drawings(projectId), params: cleanParams(params) }),
      providesTags: (r) => [{ type: "Drawings", id: LIST }, ...(r?.items ?? []).map((d) => ({ type: "Drawings" as const, id: d.id }))],
    }),
    getDrawing: build.query<DrawingDetail, string>({
      query: (id) => ENDPOINTS.closeout.drawingById(id),
      providesTags: (_r, _e, id) => [{ type: "Drawings", id }],
    }),
    createDrawing: build.mutation<DrawingDetail, { projectId: string; body: CreateDrawingBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.closeout.drawings(projectId), method: "POST", body }),
      invalidatesTags: [{ type: "Drawings", id: LIST }],
    }),
    updateDrawing: build.mutation<DrawingDetail, { id: string; body: UpdateDrawingBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.closeout.drawingById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Drawings", id }, { type: "Drawings", id: LIST }],
    }),
    deleteDrawing: build.mutation<{ id: string; deleted: true }, string>({
      query: (id) => ({ url: ENDPOINTS.closeout.drawingById(id), method: "DELETE" }),
      invalidatesTags: [{ type: "Drawings", id: LIST }],
    }),
    addRevision: build.mutation<DrawingDetail, { id: string; body: AddRevisionBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.closeout.drawingRevisions(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Drawings", id }, { type: "Drawings", id: LIST }],
    }),
    updateRevision: build.mutation<DrawingDetail, { revisionId: string; body: UpdateRevisionBody }>({
      query: ({ revisionId, body }) => ({ url: ENDPOINTS.closeout.revisionById(revisionId), method: "PATCH", body }),
      invalidatesTags: (r) => [{ type: "Drawings", id: LIST }, ...(r ? [{ type: "Drawings" as const, id: r.id }] : [])],
    }),

    // ─── Snags ──────────────────────────────────────────────────────────────
    getSnags: build.query<SnagPage, SnagsQuery>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.closeout.snags(projectId), params: cleanParams(params) }),
      transformResponse: (data: Omit<SnagPage, "meta">, meta: ApiMeta | undefined) => ({
        ...data,
        meta: { page: 1, limit: 25, total: data.items.length, totalPages: 1, ...(meta?.page ?? {}) },
      }),
      providesTags: (r) => [{ type: "Snags", id: LIST }, ...(r?.items ?? []).map((s) => ({ type: "Snags" as const, id: s.id }))],
    }),
    getSnag: build.query<Snag, string>({
      query: (id) => ENDPOINTS.closeout.snagById(id),
      providesTags: (_r, _e, id) => [{ type: "Snags", id }],
    }),
    createSnag: build.mutation<Snag, { projectId: string; body: CreateSnagBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.closeout.snags(projectId), method: "POST", body }),
      invalidatesTags: [{ type: "Snags", id: LIST }, "Handover", "Retention"],
    }),
    updateSnag: build.mutation<Snag, { id: string; body: UpdateSnagBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.closeout.snagById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Snags", id }, { type: "Snags", id: LIST }],
    }),
    deleteSnag: build.mutation<{ id: string; deleted: true }, string>({
      query: (id) => ({ url: ENDPOINTS.closeout.snagById(id), method: "DELETE" }),
      invalidatesTags: [{ type: "Snags", id: LIST }, "Handover", "Retention"],
    }),
    fixSnag: build.mutation<Snag, { id: string; body: FixSnagBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.closeout.snagFix(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Snags", id }, { type: "Snags", id: LIST }],
    }),
    verifySnag: build.mutation<Snag, { id: string; body: VerifySnagBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.closeout.snagVerify(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Snags", id }, { type: "Snags", id: LIST }, "Handover", "Retention"],
    }),
    reopenSnag: build.mutation<Snag, { id: string; body: ReopenSnagBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.closeout.snagReopen(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Snags", id }, { type: "Snags", id: LIST }, "Handover", "Retention"],
    }),
    setSnagCost: build.mutation<Snag, { id: string; body: SnagCostBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.closeout.snagCost(id), method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Snags", id }, { type: "Snags", id: LIST }, "SubcontractAccounts", "Finance"],
    }),

    // ─── Handover ───────────────────────────────────────────────────────────
    getHandover: build.query<Handover, string>({
      query: (projectId) => ENDPOINTS.closeout.handover(projectId),
      providesTags: ["Handover"],
    }),
    setHandoverItem: build.mutation<Handover, { projectId: string; key: HandoverItemKey; body: HandoverItemBody }>({
      query: ({ projectId, key, body }) => ({ url: ENDPOINTS.closeout.handoverItem(projectId, key), method: "PUT", body }),
      invalidatesTags: ["Handover"],
    }),
    signOffHandover: build.mutation<Handover, { projectId: string; body: SignOffBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.closeout.handoverSignOff(projectId), method: "POST", body }),
      invalidatesTags: ["Handover"],
    }),
    completeHandover: build.mutation<Handover, { projectId: string; body: CompleteHandoverBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.closeout.handoverComplete(projectId), method: "POST", body }),
      invalidatesTags: (_r, _e, { projectId }) => ["Handover", "Retention", { type: "Projects", id: projectId }, { type: "Projects", id: LIST }],
    }),
    /** Makes the certificate PDF and answers a fresh signed link (+ WhatsApp text). */
    getHandoverCertificate: build.mutation<SharedPdf, string>({
      query: (projectId) => ({ url: ENDPOINTS.closeout.handoverCertificate(projectId) }),
      invalidatesTags: ["Handover"],
    }),

    // ─── Retention ──────────────────────────────────────────────────────────
    getRetention: build.query<Retention, string>({
      query: (projectId) => ENDPOINTS.closeout.retention(projectId),
      providesTags: ["Retention"],
    }),
    updateRetentionSettings: build.mutation<Retention, { projectId: string; body: RetentionSettingsBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.closeout.retention(projectId), method: "PATCH", body }),
      invalidatesTags: ["Retention"],
    }),
  }),
});

export const {
  useGetDrawingsQuery,
  useGetDrawingQuery,
  useCreateDrawingMutation,
  useUpdateDrawingMutation,
  useDeleteDrawingMutation,
  useAddRevisionMutation,
  useUpdateRevisionMutation,
  useGetSnagsQuery,
  useGetSnagQuery,
  useCreateSnagMutation,
  useUpdateSnagMutation,
  useDeleteSnagMutation,
  useFixSnagMutation,
  useVerifySnagMutation,
  useReopenSnagMutation,
  useSetSnagCostMutation,
  useGetHandoverQuery,
  useSetHandoverItemMutation,
  useSignOffHandoverMutation,
  useCompleteHandoverMutation,
  useGetHandoverCertificateMutation,
  useGetRetentionQuery,
  useUpdateRetentionSettingsMutation,
} = closeoutApi;
