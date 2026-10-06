import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST } from "@/api/tags";
import type { Approvals, BulkApprovalBody, BulkApprovalResult } from "@/api/types";

export const approvalsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getApprovals: build.query<Approvals, void>({
      query: () => ENDPOINTS.approvals.list,
      providesTags: [{ type: "Approvals", id: LIST }],
    }),
    bulkApprove: build.mutation<BulkApprovalResult, BulkApprovalBody>({
      query: (body) => ({ url: ENDPOINTS.approvals.bulk, method: "POST", body }),
      // Each item ran through its own module — refresh everything those modules show.
      invalidatesTags: [
        { type: "Approvals", id: LIST },
        { type: "Dashboard", id: LIST },
        { type: "Notifications", id: "COUNT" },
        { type: "Settlements", id: LIST },
        { type: "CashEntries", id: LIST },
        { type: "CashAccounts", id: LIST },
        { type: "Topups", id: LIST },
        { type: "Measurements", id: LIST },
        { type: "SubcontractAccounts", id: LIST },
        { type: "Invoices", id: LIST },
        { type: "ClientPayments", id: LIST },
        { type: "Receivables", id: LIST },
        { type: "BillingEvents", id: LIST },
        { type: "Finance", id: LIST },
      ],
    }),
  }),
});

export const { useGetApprovalsQuery, useBulkApproveMutation } = approvalsApi;
