import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams } from "@/api/transform";
import type {
  CompanyAccount,
  CompanyAccountBody,
  CompanyAccountGroup,
  CompanyAccountPatch,
  CompanyAccountsQuery,
  CompanyAccountType,
} from "@/api/types";

const ACCOUNTS_LIST = { type: "CompanyAccounts" as const, id: LIST };
const GROUPS_LIST = { type: "CompanyAccountGroups" as const, id: LIST };

/** Where the company receives money: its own payment groups and the accounts in them. */
export const companyAccountsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCompanyAccountGroups: build.query<CompanyAccountGroup[], void>({
      query: () => ENDPOINTS.companyAccounts.groups,
      providesTags: (rows) => providesList(rows, "CompanyAccountGroups"),
    }),
    createCompanyAccountGroup: build.mutation<
      CompanyAccountGroup,
      { name: string; type: CompanyAccountType }
    >({
      query: (body) => ({ url: ENDPOINTS.companyAccounts.groups, method: "POST", body }),
      invalidatesTags: [GROUPS_LIST],
    }),
    // Accounts show their group's name, so a rename refreshes them too.
    renameCompanyAccountGroup: build.mutation<CompanyAccountGroup, { id: string; name: string }>({
      query: ({ id, name }) => ({
        url: ENDPOINTS.companyAccounts.groupById(id),
        method: "PATCH",
        body: { name },
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "CompanyAccountGroups", id }, GROUPS_LIST, ACCOUNTS_LIST],
    }),
    deleteCompanyAccountGroup: build.mutation<{ deleted: true }, string>({
      query: (id) => ({ url: ENDPOINTS.companyAccounts.groupById(id), method: "DELETE" }),
      invalidatesTags: [GROUPS_LIST],
    }),

    // An account changes its group's account count too.
    getCompanyAccounts: build.query<CompanyAccount[], CompanyAccountsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.companyAccounts.list, params: cleanParams(params ?? undefined) }),
      providesTags: (rows) => providesList(rows, "CompanyAccounts"),
    }),
    createCompanyAccount: build.mutation<CompanyAccount, CompanyAccountBody>({
      query: (body) => ({ url: ENDPOINTS.companyAccounts.list, method: "POST", body }),
      invalidatesTags: [ACCOUNTS_LIST, GROUPS_LIST],
    }),
    updateCompanyAccount: build.mutation<CompanyAccount, { id: string; body: CompanyAccountPatch }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.companyAccounts.byId(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "CompanyAccounts", id }, ACCOUNTS_LIST],
    }),
    deleteCompanyAccount: build.mutation<{ deleted: true }, string>({
      query: (id) => ({ url: ENDPOINTS.companyAccounts.byId(id), method: "DELETE" }),
      invalidatesTags: [ACCOUNTS_LIST, GROUPS_LIST],
    }),
  }),
});

export const {
  useGetCompanyAccountGroupsQuery,
  useCreateCompanyAccountGroupMutation,
  useRenameCompanyAccountGroupMutation,
  useDeleteCompanyAccountGroupMutation,
  useGetCompanyAccountsQuery,
  useCreateCompanyAccountMutation,
  useUpdateCompanyAccountMutation,
  useDeleteCompanyAccountMutation,
} = companyAccountsApi;
