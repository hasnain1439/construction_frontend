import { adminBaseApi } from "@/api/adminBaseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import type { AdminPaymentAccount, CreatePaymentAccountBody, UpdatePaymentAccountBody } from "@/api/types";

export const adminPaymentAccountsApi = adminBaseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminPaymentAccounts: build.query<AdminPaymentAccount[], void>({
      query: () => ENDPOINTS.admin.paymentAccounts,
      providesTags: (rows) => providesList(rows, "AdminPaymentAccounts"),
    }),
    createPaymentAccount: build.mutation<AdminPaymentAccount, CreatePaymentAccountBody>({
      query: (body) => ({ url: ENDPOINTS.admin.paymentAccounts, method: "POST", body }),
      invalidatesTags: [{ type: "AdminPaymentAccounts", id: LIST }],
    }),
    updatePaymentAccount: build.mutation<AdminPaymentAccount, { id: string; body: UpdatePaymentAccountBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.admin.paymentAccountById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "AdminPaymentAccounts", id }, { type: "AdminPaymentAccounts", id: LIST }],
    }),
  }),
});

export const { useGetAdminPaymentAccountsQuery, useCreatePaymentAccountMutation, useUpdatePaymentAccountMutation } = adminPaymentAccountsApi;
