import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  AddQuoteRevisionBody,
  CreateQuoteBody,
  Paginated,
  QuoteAssumption,
  QuoteComputed,
  QuoteDetail,
  QuoteInputsBody,
  QuoteInsights,
  QuoteLostBody,
  QuoteRevision,
  QuoteTemplateBody,
  QuoteTemplateList,
  QuoteWorkRate,
  QuoteWorkRates,
  QuotesQuery,
  QuoteSummary,
  QuoteWonBody,
  QuoteWonResult,
  SendQuoteBody,
  SharedPdf,
  UpdateQuoteBody,
} from "@/api/types";

const detailTags = (id: string) => [
  { type: "Quotes" as const, id },
  { type: "Quotes" as const, id: LIST },
];

/** Step 12 · Quotes: pipeline, quick estimate (live preview), revisions, send / negotiation / lost / won, PDFs, insights. */
export const salesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getQuotes: build.query<Paginated<QuoteSummary>, QuotesQuery | void>({
      query: (params) => ({ url: ENDPOINTS.quotes.list, params: cleanParams(params ?? undefined) }),
      transformResponse: (data, meta) => toPage<QuoteSummary>(data, meta),
      providesTags: (page) => providesList(page?.items, "Quotes"),
    }),
    getQuote: build.query<QuoteDetail, string>({
      query: (id) => ENDPOINTS.quotes.byId(id),
      providesTags: (_r, _e, id) => [{ type: "Quotes", id }],
    }),
    getQuoteRevisions: build.query<QuoteRevision[], string>({
      query: (id) => ENDPOINTS.quotes.revisions(id),
      providesTags: (_r, _e, id) => [{ type: "Quotes", id }],
    }),
    getQuoteAssumptions: build.query<QuoteAssumption[], void>({
      query: () => ENDPOINTS.quotes.assumptions,
    }),
    getQuoteInsights: build.query<QuoteInsights, { months?: number } | void>({
      query: (params) => ({ url: ENDPOINTS.quotes.insights, params: cleanParams(params ?? undefined) }),
      providesTags: [{ type: "Quotes", id: LIST }],
    }),
    /** Work rates: the price of each work line, by name. */
    getQuoteWorkRates: build.query<QuoteWorkRates, void>({
      query: () => ENDPOINTS.quotes.workRates,
      providesTags: [{ type: "Quotes", id: "WORK_RATES" }],
    }),
    saveQuoteWorkRates: build.mutation<QuoteWorkRates, QuoteWorkRate[]>({
      query: (rates) => ({ url: ENDPOINTS.quotes.workRates, method: "PUT", body: { rates } }),
      invalidatesTags: [{ type: "Quotes", id: "WORK_RATES" }],
    }),
    resetQuoteWorkRates: build.mutation<QuoteWorkRates, void>({
      query: () => ({ url: ENDPOINTS.quotes.workRates, method: "DELETE" }),
      invalidatesTags: [{ type: "Quotes", id: "WORK_RATES" }],
    }),
    /** Quotation templates (work list, rate parts, base rates, notes). */
    getQuoteTemplates: build.query<QuoteTemplateList, void>({
      query: () => ENDPOINTS.quotes.scopeTemplates,
      providesTags: [{ type: "Quotes", id: "TEMPLATES" }],
    }),
    createQuoteTemplate: build.mutation<QuoteTemplateList, QuoteTemplateBody>({
      query: (body) => ({ url: ENDPOINTS.quotes.scopeTemplates, method: "POST", body }),
      invalidatesTags: [{ type: "Quotes", id: "TEMPLATES" }],
    }),
    updateQuoteTemplate: build.mutation<QuoteTemplateList, { id: string; body: QuoteTemplateBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.quotes.scopeTemplate(id), method: "PUT", body }),
      invalidatesTags: [{ type: "Quotes", id: "TEMPLATES" }],
    }),
    deleteQuoteTemplate: build.mutation<QuoteTemplateList, string>({
      query: (id) => ({ url: ENDPOINTS.quotes.scopeTemplate(id), method: "DELETE" }),
      invalidatesTags: [{ type: "Quotes", id: "TEMPLATES" }],
    }),
    resetQuoteTemplates: build.mutation<QuoteTemplateList, void>({
      query: () => ({ url: ENDPOINTS.quotes.scopeTemplatesReset, method: "POST" }),
      invalidatesTags: [{ type: "Quotes", id: "TEMPLATES" }],
    }),
    /** Live quick estimate — a mutation so typing never caches stale previews. */
    previewQuote: build.mutation<QuoteComputed, QuoteInputsBody>({
      query: (inputs) => ({ url: ENDPOINTS.quotes.preview, method: "POST", body: { inputs } }),
    }),
    createQuote: build.mutation<QuoteDetail, CreateQuoteBody>({
      query: (body) => ({ url: ENDPOINTS.quotes.list, method: "POST", body }),
      invalidatesTags: [{ type: "Quotes", id: LIST }, { type: "Clients", id: LIST }],
    }),
    updateQuote: build.mutation<QuoteDetail, { id: string; body: UpdateQuoteBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.quotes.byId(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => detailTags(id),
    }),
    deleteQuote: build.mutation<{ id: string; deleted: true }, string>({
      query: (id) => ({ url: ENDPOINTS.quotes.byId(id), method: "DELETE" }),
      invalidatesTags: [{ type: "Quotes", id: LIST }],
    }),
    addQuoteRevision: build.mutation<QuoteDetail, { id: string; body: AddQuoteRevisionBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.quotes.revisions(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => detailTags(id),
    }),
    sendQuote: build.mutation<{ quote: QuoteDetail; share: SharedPdf }, { id: string; body: SendQuoteBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.quotes.send(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => detailTags(id),
    }),
    recordNegotiation: build.mutation<QuoteDetail, { id: string; note: string }>({
      query: ({ id, note }) => ({ url: ENDPOINTS.quotes.negotiation(id), method: "POST", body: { note } }),
      invalidatesTags: (_r, _e, { id }) => detailTags(id),
    }),
    markQuoteLost: build.mutation<QuoteDetail, { id: string; body: QuoteLostBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.quotes.lost(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => detailTags(id),
    }),
    markQuoteWon: build.mutation<QuoteWonResult, { id: string; body: QuoteWonBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.quotes.won(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [...detailTags(id), { type: "Projects", id: LIST }],
    }),
    getQuotePdf: build.mutation<SharedPdf, { id: string; variant: "customer" | "internal" }>({
      query: ({ id, variant }) => ({ url: ENDPOINTS.quotes.pdf(id), params: { variant } }),
    }),
  }),
});

export const {
  useGetQuotesQuery,
  useGetQuoteQuery,
  useGetQuoteRevisionsQuery,
  useGetQuoteAssumptionsQuery,
  useGetQuoteInsightsQuery,
  usePreviewQuoteMutation,
  useCreateQuoteMutation,
  useUpdateQuoteMutation,
  useDeleteQuoteMutation,
  useAddQuoteRevisionMutation,
  useSendQuoteMutation,
  useRecordNegotiationMutation,
  useMarkQuoteLostMutation,
  useMarkQuoteWonMutation,
  useGetQuotePdfMutation,
  useGetQuoteTemplatesQuery,
  useCreateQuoteTemplateMutation,
  useUpdateQuoteTemplateMutation,
  useDeleteQuoteTemplateMutation,
  useResetQuoteTemplatesMutation,
  useGetQuoteWorkRatesQuery,
  useSaveQuoteWorkRatesMutation,
  useResetQuoteWorkRatesMutation,
} = salesApi;
