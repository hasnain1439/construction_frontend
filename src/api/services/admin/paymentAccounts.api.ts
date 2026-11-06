import { adminBaseApi } from "@/api/adminBaseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import type { AdminPaymentAccount, AdminPaymentGroup, CreatePaymentAccountBody, UpdatePaymentAccountBody } from "@/api/types";

export const adminPaymentAccountsApi = adminBaseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminPaymentGroups: build.query<AdminPaymentGroup[], void>({
      query: () => ENDPOINTS.admin.paymentGroups,
      providesTags: (rows) => providesList(rows, "AdminPaymentGroups"),
    }),
    createPaymentGroup: build.mutation<AdminPaymentGroup, { name: string }>({
      query: (body) => ({ url: ENDPOINTS.admin.paymentGroups, method: "POST", body }),
      invalidatesTags: [{ type: "AdminPaymentGroups", id: LIST }],
    }),
    renamePaymentGroup: build.mutation<AdminPaymentGroup, { id: string; name: string }>({
      query: ({ id, name }) => ({ url: ENDPOINTS.admin.paymentGroupById(id), method: "PATCH", body: { name } }),
      invalidatesTags: [{ type: "AdminPaymentGroups", id: LIST }, { type: "AdminPaymentAccounts", id: LIST }],
    }),
    deletePaymentGroup: build.mutation<{ id: string; deleted: true }, string>({
      query: (id) => ({ url: ENDPOINTS.admin.paymentGroupById(id), method: "DELETE" }),
      invalidatesTags: [{ type: "AdminPaymentGroups", id: LIST }],
    }),
    getAdminPaymentAccounts: build.query<AdminPaymentAccount[], void>({
      query: () => ENDPOINTS.admin.paymentAccounts,
      providesTags: (rows) => providesList(rows, "AdminPaymentAccounts"),
    }),
    createPaymentAccount: build.mutation<AdminPaymentAccount, CreatePaymentAccountBody>({
      query: (body) => ({ url: ENDPOINTS.admin.paymentAccounts, method: "POST", body }),
      invalidatesTags: [{ type: "AdminPaymentAccounts", id: LIST }, { type: "AdminPaymentGroups", id: LIST }],
    }),
    updatePaymentAccount: build.mutation<AdminPaymentAccount, { id: string; body: UpdatePaymentAccountBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.admin.paymentAccountById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "AdminPaymentAccounts", id }, { type: "AdminPaymentAccounts", id: LIST }, { type: "AdminPaymentGroups", id: LIST }],
    }),
  }),
});

export const {
  useGetAdminPaymentGroupsQuery,
  useCreatePaymentGroupMutation,
  useRenamePaymentGroupMutation,
  useDeletePaymentGroupMutation,
  useGetAdminPaymentAccountsQuery,
  useCreatePaymentAccountMutation,
  useUpdatePaymentAccountMutation,
} = adminPaymentAccountsApi;
