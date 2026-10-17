import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { cleanParams } from "@/api/transform";
import type {
  CompanyRulebook,
  EstimateCompare,
  EstimateDetail,
  EstimateSummary,
  LineOverrideBody,
  OwnerShoppingList,
  RulebookOverridesBody,
  SharedPdf,
} from "@/api/types";

/** Document language of a PDF: the UI language ("roman-ur" → "roman"). */
export type PdfLang = "en" | "roman" | "ur";

/**
 * Step 11 · Estimation: saved estimate revisions (BoQ), compare, owner shopping list and the
 * company rulebook. Every write returns the full estimate / rulebook; writes refetch the
 * revisions (approving supersedes the previous one), the shopping list and the live estimate.
 */
export const estimatesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getEstimates: build.query<EstimateSummary[], string>({
      query: (projectId) => ENDPOINTS.projects.estimates(projectId),
      providesTags: (_r, _e, projectId) => [{ type: "Estimates", id: `P-${projectId}` }],
    }),
    getEstimateRevision: build.query<EstimateDetail, string>({
      query: (id) => ENDPOINTS.estimates.byId(id),
      providesTags: (_r, _e, id) => [{ type: "Estimates", id }],
    }),
    generateEstimate: build.mutation<EstimateDetail, { projectId: string; note?: string }>({
      query: ({ projectId, note }) => ({ url: ENDPOINTS.projects.estimates(projectId), method: "POST", body: note ? { note } : {} }),
      invalidatesTags: ["Estimates", "OwnerShoppingList", "ProjectEstimate"],
    }),
    regenerateEstimate: build.mutation<EstimateDetail, string>({
      query: (id) => ({ url: ENDPOINTS.estimates.regenerate(id), method: "POST", body: {} }),
      invalidatesTags: ["Estimates", "OwnerShoppingList", "ProjectEstimate"],
    }),
    overrideEstimateLine: build.mutation<EstimateDetail, { id: string; lineId: string; body: LineOverrideBody }>({
      query: ({ id, lineId, body }) => ({ url: ENDPOINTS.estimates.line(id, lineId), method: "PATCH", body }),
      invalidatesTags: ["Estimates", "OwnerShoppingList", "ProjectEstimate"],
    }),
    approveEstimate: build.mutation<EstimateDetail, { id: string; confirmOutdatedRates?: boolean }>({
      query: ({ id, confirmOutdatedRates }) => ({
        url: ENDPOINTS.estimates.approve(id),
        method: "POST",
        body: confirmOutdatedRates ? { confirmOutdatedRates: true } : {},
      }),
      invalidatesTags: ["Estimates", "OwnerShoppingList", "ProjectEstimate"],
    }),
    compareEstimates: build.query<EstimateCompare, { a: string; b: string }>({
      query: ({ a, b }) => ENDPOINTS.estimates.compare(a, b),
      providesTags: ["Estimates"],
    }),
    /** Internal BoQ PDF — a fresh signed link every time. */
    getEstimatePdf: build.mutation<SharedPdf, { id: string; lang: PdfLang }>({
      query: ({ id, lang }) => ({ url: ENDPOINTS.estimates.pdf(id), params: { lang } }),
    }),
    getOwnerShoppingList: build.query<OwnerShoppingList, { projectId: string; estimateId?: string }>({
      query: ({ projectId, estimateId }) => ({ url: ENDPOINTS.projects.shoppingList(projectId), params: cleanParams({ estimateId }) }),
      providesTags: (_r, _e, { projectId }) => [{ type: "OwnerShoppingList", id: projectId }],
    }),
    getOwnerShoppingListPdf: build.mutation<SharedPdf, { projectId: string; lang: PdfLang; estimateId?: string }>({
      query: ({ projectId, lang, estimateId }) => ({ url: ENDPOINTS.projects.shoppingListPdf(projectId), params: cleanParams({ lang, estimateId }) }),
    }),

    // ─── Company rulebook ───────────────────────────────────────────────────
    getCompanyRulebook: build.query<CompanyRulebook, void>({
      query: () => ENDPOINTS.rulebook.resolved,
      providesTags: ["Rulebook"],
    }),
    setRulebookOverrides: build.mutation<CompanyRulebook, RulebookOverridesBody>({
      query: (body) => ({ url: ENDPOINTS.rulebook.overrides, method: "PUT", body }),
      invalidatesTags: ["Rulebook", "ProjectEstimate"],
    }),
    deleteRulebookOverride: build.mutation<CompanyRulebook, string>({
      query: (key) => ({ url: ENDPOINTS.rulebook.override(key), method: "DELETE" }),
      invalidatesTags: ["Rulebook", "ProjectEstimate"],
    }),
  }),
});

export const {
  useGetEstimatesQuery,
  useGetEstimateRevisionQuery,
  useGenerateEstimateMutation,
  useRegenerateEstimateMutation,
  useOverrideEstimateLineMutation,
  useApproveEstimateMutation,
  useCompareEstimatesQuery,
  useGetEstimatePdfMutation,
  useGetOwnerShoppingListQuery,
  useGetOwnerShoppingListPdfMutation,
  useGetCompanyRulebookQuery,
  useSetRulebookOverridesMutation,
  useDeleteRulebookOverrideMutation,
} = estimatesApi;
