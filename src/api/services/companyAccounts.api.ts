import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams } from "@/api/transform";
import type {
  CompanyAccount,
  CompanyAccountBody,
  CompanyAccountPatch,
  CompanyAccountsQuery,
} from "@/api/types";

const ACCOUNTS_LIST = { type: "CompanyAccounts" as const, id: LIST };

/** Where the company receives money: Cash, Online wallet and Bank accounts. */
export const companyAccountsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCompanyAccounts: build.query<CompanyAccount[], CompanyAccountsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.companyAccounts.list, params: cleanParams(params ?? undefined) }),
      providesTags: (rows) => providesList(rows, "CompanyAccounts"),
    }),
    createCompanyAccount: build.mutation<CompanyAccount, CompanyAccountBody>({
      query: (body) => ({ url: ENDPOINTS.companyAccounts.list, method: "POST", body }),
      invalidatesTags: [ACCOUNTS_LIST],
    }),
    updateCompanyAccount: build.mutation<CompanyAccount, { id: string; body: CompanyAccountPatch }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.companyAccounts.byId(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "CompanyAccounts", id }, ACCOUNTS_LIST],
    }),
    deleteCompanyAccount: build.mutation<{ deleted: true }, string>({
      query: (id) => ({ url: ENDPOINTS.companyAccounts.byId(id), method: "DELETE" }),
      invalidatesTags: [ACCOUNTS_LIST],
    }),
  }),
});

export const {
  useGetCompanyAccountsQuery,
  useCreateCompanyAccountMutation,
  useUpdateCompanyAccountMutation,
  useDeleteCompanyAccountMutation,
} = companyAccountsApi;
