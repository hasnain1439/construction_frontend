import { adminBaseApi } from "@/api/adminBaseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST } from "@/api/tags";
import { cleanParams } from "@/api/transform";
import type { AdminRulebook, AdminRulebookDetail, CreateRulebookBody, RulebookRegion, UpdateRulebookParameterBody } from "@/api/types";

/** Platform console → Rulebook: estimation rulebook versions per region (Step 11). */
export const adminRulebooksApi = adminBaseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminRulebooks: build.query<AdminRulebook[], { region?: RulebookRegion } | void>({
      query: (params) => ({ url: ENDPOINTS.admin.rulebooks, params: cleanParams(params ?? undefined) }),
      providesTags: [{ type: "AdminRulebooks", id: LIST }],
    }),
    getAdminRulebook: build.query<AdminRulebookDetail, string>({
      query: (id) => ENDPOINTS.admin.rulebookById(id),
      providesTags: (_r, _e, id) => [{ type: "AdminRulebooks", id }],
    }),
    createAdminRulebook: build.mutation<AdminRulebookDetail, CreateRulebookBody>({
      query: (body) => ({ url: ENDPOINTS.admin.rulebooks, method: "POST", body }),
      invalidatesTags: [{ type: "AdminRulebooks", id: LIST }],
    }),
    updateAdminRulebook: build.mutation<AdminRulebookDetail, { id: string; notes: string | null }>({
      query: ({ id, notes }) => ({ url: ENDPOINTS.admin.rulebookById(id), method: "PATCH", body: { notes } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "AdminRulebooks", id }, { type: "AdminRulebooks", id: LIST }],
    }),
    deleteAdminRulebook: build.mutation<{ deleted: true }, string>({
      query: (id) => ({ url: ENDPOINTS.admin.rulebookById(id), method: "DELETE" }),
      invalidatesTags: [{ type: "AdminRulebooks", id: LIST }],
    }),
    updateAdminRulebookParameter: build.mutation<AdminRulebookDetail, { id: string; key: string; body: UpdateRulebookParameterBody }>({
      query: ({ id, key, body }) => ({ url: ENDPOINTS.admin.rulebookParameter(id, key), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "AdminRulebooks", id }, { type: "AdminRulebooks", id: LIST }],
    }),
    publishAdminRulebook: build.mutation<AdminRulebookDetail, string>({
      query: (id) => ({ url: ENDPOINTS.admin.rulebookPublish(id), method: "POST", body: {} }),
      invalidatesTags: (_r, _e, id) => [{ type: "AdminRulebooks", id }, { type: "AdminRulebooks", id: LIST }],
    }),
  }),
});

export const {
  useGetAdminRulebooksQuery,
  useGetAdminRulebookQuery,
  useCreateAdminRulebookMutation,
  useUpdateAdminRulebookMutation,
  useDeleteAdminRulebookMutation,
  useUpdateAdminRulebookParameterMutation,
  usePublishAdminRulebookMutation,
} = adminRulebooksApi;
