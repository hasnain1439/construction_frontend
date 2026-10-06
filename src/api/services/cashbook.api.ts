import type { ApiMeta } from "@/api/baseQuery";
import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { CASH_CHANGED } from "@/api/services/labor.api";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  ApproveTopupBody,
  CashAccount,
  CashAccounts,
  CashbookQuery,
  CashCount,
  CashCountBody,
  CashCountsQuery,
  CashEntriesQuery,
  CashEntry,
  ExpenseBody,
  ExpensesQuery,
  FloatBody,
  HandoverBody,
  PageMeta,
  Paginated,
  ProjectCashbook,
  TopupBody,
  TopupRequest,
  TopupsQuery,
} from "@/api/types";

const expenseChanged = [...CASH_CHANGED, { type: "CashEntries" as const, id: "EXPENSES" }];

export const cashbookApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCashAccounts: build.query<CashAccounts, { includeInactive?: boolean } | void>({
      query: (params) => ({ url: ENDPOINTS.cashbook.accounts, params: cleanParams(params ?? undefined) }),
      providesTags: (r) => providesList(r?.items, "CashAccounts"),
    }),
    getCashAccount: build.query<CashAccount, string>({
      query: (id) => ENDPOINTS.cashbook.accountById(id),
      providesTags: (_r, _e, id) => [{ type: "CashAccounts", id }, { type: "CashAccounts", id: LIST }],
    }),
    getCashEntries: build.query<Paginated<CashEntry, { balancePaisa: string }>, { accountId: string } & CashEntriesQuery>({
      query: ({ accountId, ...params }) => ({ url: ENDPOINTS.cashbook.accountEntries(accountId), params: cleanParams(params) }),
      transformResponse: toPage<CashEntry, { balancePaisa: string }>,
      providesTags: [{ type: "CashEntries", id: LIST }],
    }),

    sendFloat: build.mutation<CashEntry, FloatBody>({
      query: (body) => ({ url: ENDPOINTS.cashbook.floats, method: "POST", body }),
      invalidatesTags: CASH_CHANGED,
    }),
    acknowledgeFloat: build.mutation<CashEntry, string>({
      query: (entryId) => ({ url: ENDPOINTS.cashbook.floatAcknowledge(entryId), method: "POST" }),
      invalidatesTags: CASH_CHANGED,
    }),

    getExpenses: build.query<Paginated<CashEntry, { totalPaisa: string }>, ExpensesQuery | void>({
      query: (params) => ({ url: ENDPOINTS.cashbook.expenses, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<CashEntry, { totalPaisa: string }>,
      providesTags: [{ type: "CashEntries", id: "EXPENSES" }, { type: "CashEntries", id: LIST }],
    }),
    createExpense: build.mutation<CashEntry, ExpenseBody>({
      query: (body) => ({ url: ENDPOINTS.cashbook.expenses, method: "POST", body }),
      // URGENT_MATERIAL with items also creates a site purchase (stock).
      invalidatesTags: [...expenseChanged, { type: "Purchase", id: LIST }, { type: "Stock", id: LIST }],
    }),
    approveExpense: build.mutation<CashEntry, { id: string; note?: string }>({
      query: ({ id, note }) => ({ url: ENDPOINTS.cashbook.expenseApprove(id), method: "POST", body: note ? { note } : {} }),
      invalidatesTags: expenseChanged,
    }),
    rejectExpense: build.mutation<CashEntry, { id: string; note: string }>({
      query: ({ id, note }) => ({ url: ENDPOINTS.cashbook.expenseReject(id), method: "POST", body: { note } }),
      invalidatesTags: expenseChanged,
    }),

    getTopups: build.query<Paginated<TopupRequest>, TopupsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.cashbook.topups, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<TopupRequest>,
      providesTags: (page) => providesList(page?.items, "Topups"),
    }),
    requestTopup: build.mutation<TopupRequest, TopupBody>({
      query: (body) => ({ url: ENDPOINTS.cashbook.topups, method: "POST", body }),
      invalidatesTags: [{ type: "Topups", id: LIST }],
    }),
    approveTopup: build.mutation<TopupRequest, { id: string; body: ApproveTopupBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.cashbook.topupApprove(id), method: "POST", body }),
      invalidatesTags: [{ type: "Topups", id: LIST }, ...CASH_CHANGED],
    }),
    rejectTopup: build.mutation<TopupRequest, { id: string; note: string }>({
      query: ({ id, note }) => ({ url: ENDPOINTS.cashbook.topupReject(id), method: "POST", body: { note } }),
      invalidatesTags: [{ type: "Topups", id: LIST }],
    }),

    getCashCounts: build.query<Paginated<CashCount>, CashCountsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.cashbook.counts, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<CashCount>,
      providesTags: (page) => providesList(page?.items, "CashCounts"),
    }),
    createCashCount: build.mutation<CashCount, CashCountBody>({
      query: (body) => ({ url: ENDPOINTS.cashbook.counts, method: "POST", body }),
      invalidatesTags: [{ type: "CashCounts", id: LIST }, ...CASH_CHANGED],
    }),
    handoverCash: build.mutation<{ out: CashEntry; in: CashEntry }, HandoverBody>({
      query: (body) => ({ url: ENDPOINTS.cashbook.handovers, method: "POST", body }),
      invalidatesTags: CASH_CHANGED,
    }),

    getProjectCashbook: build.query<ProjectCashbook & { meta: PageMeta }, { projectId: string } & CashbookQuery>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.cashbook.projectCashbook(projectId), params: cleanParams(params) }),
      transformResponse: (data: ProjectCashbook, meta: ApiMeta | undefined) => ({
        ...data,
        meta: { page: 1, limit: 25, total: data.entries.length, totalPages: 1, ...(meta?.page ?? {}) },
      }),
      providesTags: [{ type: "CashEntries", id: LIST }, { type: "CashAccounts", id: LIST }],
    }),
  }),
});

export const {
  useGetCashAccountsQuery,
  useGetCashAccountQuery,
  useGetCashEntriesQuery,
  useSendFloatMutation,
  useAcknowledgeFloatMutation,
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useApproveExpenseMutation,
  useRejectExpenseMutation,
  useGetTopupsQuery,
  useRequestTopupMutation,
  useApproveTopupMutation,
  useRejectTopupMutation,
  useGetCashCountsQuery,
  useCreateCashCountMutation,
  useHandoverCashMutation,
  useGetProjectCashbookQuery,
} = cashbookApi;
