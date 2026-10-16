import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { cleanParams } from "@/api/transform";
import type {
  ApproveChangeOrderBody,
  BillChangeOrderBody,
  BillChangeOrderResult,
  ChangeOrderDetail,
  ChangeOrderList,
  ChangeOrderRateOptions,
  ChangeOrderStatus,
  ConvertToChangeOrderBody,
  CreateChangeOrderBody,
  CreateSiteInstructionBody,
  DismissSiteInstructionBody,
  RejectChangeOrderBody,
  SharedPdf,
  SiteInstruction,
  SiteInstructionList,
  SiteInstructionStatus,
  UpdateChangeOrderBody,
} from "@/api/types";

const LIST = "LIST";
type Simple = "send" | "reopen" | "start" | "complete";

/** Step 15 · Change orders (builder, status flow, billing link, slip PDF) and site instructions. */
export const changeOrdersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getChangeOrders: build.query<ChangeOrderList, { projectId: string; status?: ChangeOrderStatus }>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.changeOrders.list(projectId), params: cleanParams(params) }),
      providesTags: (r) => [{ type: "ChangeOrders", id: LIST }, ...(r?.items ?? []).map((c) => ({ type: "ChangeOrders" as const, id: c.id }))],
    }),
    getChangeOrder: build.query<ChangeOrderDetail, string>({
      query: (id) => ENDPOINTS.changeOrders.byId(id),
      providesTags: (_r, _e, id) => [{ type: "ChangeOrders", id }],
    }),
    getChangeOrderRates: build.query<ChangeOrderRateOptions, string>({
      query: (projectId) => ENDPOINTS.changeOrders.rates(projectId),
    }),
    createChangeOrder: build.mutation<ChangeOrderDetail, { projectId: string; body: CreateChangeOrderBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.changeOrders.list(projectId), method: "POST", body }),
      invalidatesTags: [{ type: "ChangeOrders", id: LIST }],
    }),
    updateChangeOrder: build.mutation<ChangeOrderDetail, { id: string; body: UpdateChangeOrderBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.changeOrders.byId(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "ChangeOrders", id }, { type: "ChangeOrders", id: LIST }],
    }),
    deleteChangeOrder: build.mutation<{ id: string; deleted: true }, string>({
      query: (id) => ({ url: ENDPOINTS.changeOrders.byId(id), method: "DELETE" }),
      invalidatesTags: [{ type: "ChangeOrders", id: LIST }, "SiteInstructions"],
    }),
    /** send / reopen / start / complete (no body). */
    changeOrderStep: build.mutation<ChangeOrderDetail, { id: string; step: Simple }>({
      query: ({ id, step }) => ({ url: ENDPOINTS.changeOrders.action(id, step), method: "POST", body: {} }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "ChangeOrders", id }, { type: "ChangeOrders", id: LIST }],
    }),
    approveChangeOrder: build.mutation<ChangeOrderDetail, { id: string; body: ApproveChangeOrderBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.changeOrders.action(id, "approve"), method: "POST", body }),
      // Revised contract / end date change everywhere.
      invalidatesTags: (_r, _e, { id }) => [{ type: "ChangeOrders", id }, { type: "ChangeOrders", id: LIST }, "Projects", "Receivables", "Finance", "Dashboard"],
    }),
    rejectChangeOrder: build.mutation<ChangeOrderDetail, { id: string; body: RejectChangeOrderBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.changeOrders.action(id, "reject"), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "ChangeOrders", id }, { type: "ChangeOrders", id: LIST }],
    }),
    billChangeOrder: build.mutation<BillChangeOrderResult, { id: string; body: BillChangeOrderBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.changeOrders.action(id, "bill"), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "ChangeOrders", id }, { type: "ChangeOrders", id: LIST }, "Invoices", "Receivables"],
    }),
    /** Makes the slip PDF and answers a fresh signed link (+ WhatsApp text). */
    getChangeOrderPdf: build.mutation<SharedPdf, string>({
      query: (id) => ({ url: ENDPOINTS.changeOrders.pdf(id) }),
    }),

    // ─── Site instructions ──────────────────────────────────────────────────
    getSiteInstructions: build.query<SiteInstructionList, { projectId: string; status?: SiteInstructionStatus }>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.changeOrders.instructions(projectId), params: cleanParams(params) }),
      providesTags: ["SiteInstructions"],
    }),
    createSiteInstruction: build.mutation<SiteInstruction, { projectId: string; body: CreateSiteInstructionBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.changeOrders.instructions(projectId), method: "POST", body }),
      invalidatesTags: ["SiteInstructions", { type: "ChangeOrders", id: LIST }],
    }),
    convertSiteInstruction: build.mutation<ChangeOrderDetail, { id: string; body: ConvertToChangeOrderBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.changeOrders.convertInstruction(id), method: "POST", body }),
      invalidatesTags: ["SiteInstructions", { type: "ChangeOrders", id: LIST }],
    }),
    dismissSiteInstruction: build.mutation<SiteInstruction, { id: string; body: DismissSiteInstructionBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.changeOrders.dismissInstruction(id), method: "POST", body }),
      invalidatesTags: ["SiteInstructions", { type: "ChangeOrders", id: LIST }],
    }),
    snagToChangeOrder: build.mutation<ChangeOrderDetail, { snagId: string; body: ConvertToChangeOrderBody }>({
      query: ({ snagId, body }) => ({ url: ENDPOINTS.changeOrders.fromSnag(snagId), method: "POST", body }),
      invalidatesTags: [{ type: "ChangeOrders", id: LIST }, "Snags"],
    }),
  }),
});

export const {
  useGetChangeOrdersQuery,
  useGetChangeOrderQuery,
  useGetChangeOrderRatesQuery,
  useCreateChangeOrderMutation,
  useUpdateChangeOrderMutation,
  useDeleteChangeOrderMutation,
  useChangeOrderStepMutation,
  useApproveChangeOrderMutation,
  useRejectChangeOrderMutation,
  useBillChangeOrderMutation,
  useGetChangeOrderPdfMutation,
  useGetSiteInstructionsQuery,
  useCreateSiteInstructionMutation,
  useConvertSiteInstructionMutation,
  useDismissSiteInstructionMutation,
  useSnagToChangeOrderMutation,
} = changeOrdersApi;
