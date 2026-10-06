import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST } from "@/api/tags";
import { cleanParams } from "@/api/transform";
import type { CashFloatsOverview, CashFlowOutlook, CashFlowQuery, CompanyReceivables, PnlQuery, ProfitAndLoss, ReceivablesQuery } from "@/api/types";

export const financeApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getFinanceReceivables: build.query<CompanyReceivables, ReceivablesQuery | void>({
      query: (params) => ({ url: ENDPOINTS.finance.receivables, params: cleanParams(params ?? undefined) }),
      providesTags: [{ type: "Receivables", id: LIST }],
    }),
    getCashFlow: build.query<CashFlowOutlook, CashFlowQuery | void>({
      query: (params) => ({ url: ENDPOINTS.finance.cashFlow, params: cleanParams(params ?? undefined) }),
      providesTags: [{ type: "Finance", id: LIST }],
    }),
    getProfitAndLoss: build.query<ProfitAndLoss, PnlQuery | void>({
      query: (params) => ({ url: ENDPOINTS.finance.pnl, params: cleanParams(params ?? undefined) }),
      providesTags: [{ type: "Finance", id: LIST }],
    }),
    getCashFloats: build.query<CashFloatsOverview, void>({
      query: () => ENDPOINTS.finance.cashFloats,
      providesTags: [{ type: "CashAccounts", id: LIST }],
    }),
  }),
});

export const { useGetFinanceReceivablesQuery, useGetCashFlowQuery, useGetProfitAndLossQuery, useGetCashFloatsQuery } = financeApi;
