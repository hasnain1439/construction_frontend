import { adminBaseApi } from "@/api/adminBaseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  AdminPaymentDetail,
  AdminPaymentRow,
  AdminPaymentsQuery,
  ApprovePaymentBody,
  ApprovePaymentResult,
  Paginated,
  RejectPaymentBody,
  RejectPaymentResult,
} from "@/api/types";

const paymentProcessed = (id: string) => [
  { type: "AdminPayments" as const, id },
  { type: "AdminPayments" as const, id: LIST },
  { type: "Tenants" as const, id: LIST },
  { type: "AuditLogs" as const, id: LIST },
  "AdminOverview" as const,
];

export const adminPaymentsApi = adminBaseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminPayments: build.query<Paginated<AdminPaymentRow>, AdminPaymentsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.admin.payments, params: cleanParams(params ?? undefined) }),
      transformResponse: (data, meta) => toPage<AdminPaymentRow>(data, meta),
      providesTags: (page) => providesList(page?.items, "AdminPayments"),
    }),
    getAdminPayment: build.query<AdminPaymentDetail, string>({
      query: (id) => ENDPOINTS.admin.paymentById(id),
      providesTags: (_r, _e, id) => [{ type: "AdminPayments", id }],
    }),
    approvePayment: build.mutation<ApprovePaymentResult, { id: string; body: ApprovePaymentBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.admin.paymentApprove(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => paymentProcessed(id),
    }),
    rejectPayment: build.mutation<RejectPaymentResult, { id: string; body: RejectPaymentBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.admin.paymentReject(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => paymentProcessed(id),
    }),
  }),
});

export const {
  useGetAdminPaymentsQuery,
  useGetAdminPaymentQuery,
  useApprovePaymentMutation,
  useRejectPaymentMutation,
} = adminPaymentsApi;
