import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  BillingEvent,
  BillingProgress,
  BillingProgressBody,
  BillingProgressList,
  ClientChequeStatusBody,
  ClientPayment,
  ClientPaymentsQuery,
  CompanyReceivables,
  CreateInvoiceBody,
  Invoice,
  InvoicesQuery,
  MarkReadyBody,
  MarkReadyResult,
  OwnerStatement,
  Paginated,
  ProjectReceivables,
  ReceivablesQuery,
  RecordPaymentBody,
  ScheduleStage,
  SharedPdf,
  StatementQuery,
  UpdateInvoiceBody,
  UpdateProgressBody,
  UpdateStageBody,
} from "@/api/types";

type InvoiceMeta = { invoicedPaisa: string; paidPaisa: string; balancePaisa: string };
type PaymentMeta = { clearedPaisa: string; pendingPaisa: string; bouncedPaisa: string };

/** Anything that moves money refreshes these. */
const MONEY_CHANGED = [
  { type: "Invoices" as const, id: LIST },
  { type: "ClientPayments" as const, id: LIST },
  { type: "Receivables" as const, id: LIST },
  { type: "BillingStages" as const, id: LIST },
  { type: "BillingEvents" as const, id: LIST },
];

export const billingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ─── Stages and progress ──────────────────────────────────────────────
    getBillingStages: build.query<ScheduleStage[], string>({
      query: (projectId) => ENDPOINTS.billing.stages(projectId),
      providesTags: (rows) => providesList(rows, "BillingStages"),
    }),
    markStageReady: build.mutation<MarkReadyResult, { id: string; body: MarkReadyBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.billing.stageMarkReady(id), method: "POST", body }),
      invalidatesTags: [{ type: "BillingStages", id: LIST }, { type: "Receivables", id: LIST }, { type: "BillingEvents", id: LIST }],
    }),
    updateStage: build.mutation<ScheduleStage, { id: string; body: UpdateStageBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.billing.stageById(id), method: "PATCH", body }),
      invalidatesTags: [{ type: "BillingStages", id: LIST }, { type: "Receivables", id: LIST }],
    }),
    getBillingProgress: build.query<BillingProgressList, { projectId: string; billed?: "true" | "false" }>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.billing.progress(projectId), params: cleanParams(params) }),
      providesTags: (r) => providesList(r?.items, "BillingProgress"),
    }),
    addBillingProgress: build.mutation<BillingProgress, { projectId: string; body: BillingProgressBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.billing.progress(projectId), method: "POST", body }),
      invalidatesTags: [{ type: "BillingProgress", id: LIST }],
    }),
    updateBillingProgress: build.mutation<BillingProgress, { id: string; body: UpdateProgressBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.billing.progressById(id), method: "PATCH", body }),
      invalidatesTags: [{ type: "BillingProgress", id: LIST }],
    }),
    deleteBillingProgress: build.mutation<{ deleted: boolean }, string>({
      query: (id) => ({ url: ENDPOINTS.billing.progressById(id), method: "DELETE" }),
      invalidatesTags: [{ type: "BillingProgress", id: LIST }],
    }),

    // ─── Invoices ─────────────────────────────────────────────────────────
    getInvoices: build.query<Paginated<Invoice, InvoiceMeta>, { projectId: string } & InvoicesQuery>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.billing.invoices(projectId), params: cleanParams(params) }),
      transformResponse: toPage<Invoice, InvoiceMeta>,
      providesTags: (page) => providesList(page?.items, "Invoices"),
    }),
    getInvoice: build.query<Invoice, string>({
      query: (id) => ENDPOINTS.billing.invoiceById(id),
      providesTags: (_r, _e, id) => [{ type: "Invoices", id }],
    }),
    createInvoice: build.mutation<Invoice, { projectId: string; body: CreateInvoiceBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.billing.invoices(projectId), method: "POST", body }),
      invalidatesTags: [{ type: "Invoices", id: LIST }, { type: "BillingProgress", id: LIST }],
    }),
    updateInvoice: build.mutation<Invoice, { id: string; body: UpdateInvoiceBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.billing.invoiceById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Invoices", id }, { type: "Invoices", id: LIST }],
    }),
    deleteInvoice: build.mutation<{ deleted: boolean }, string>({
      query: (id) => ({ url: ENDPOINTS.billing.invoiceById(id), method: "DELETE" }),
      invalidatesTags: [{ type: "Invoices", id: LIST }, { type: "BillingProgress", id: LIST }],
    }),
    issueInvoice: build.mutation<Invoice, { id: string; issueDate?: string }>({
      query: ({ id, issueDate }) => ({ url: ENDPOINTS.billing.invoiceIssue(id), method: "POST", body: issueDate ? { issueDate } : {} }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Invoices", id }, ...MONEY_CHANGED, { type: "BillingProgress", id: LIST }, { type: "CashEntries", id: LIST }],
    }),
    cancelInvoice: build.mutation<Invoice, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ url: ENDPOINTS.billing.invoiceCancel(id), method: "POST", body: { reason } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Invoices", id }, ...MONEY_CHANGED, { type: "BillingProgress", id: LIST }, { type: "CashEntries", id: LIST }],
    }),
    getInvoicePdf: build.mutation<SharedPdf, string>({
      query: (id) => ({ url: ENDPOINTS.billing.invoicePdf(id) }),
    }),

    // ─── Payments ─────────────────────────────────────────────────────────
    getClientPayments: build.query<Paginated<ClientPayment, PaymentMeta>, { projectId: string } & ClientPaymentsQuery>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.billing.payments(projectId), params: cleanParams(params) }),
      transformResponse: toPage<ClientPayment, PaymentMeta>,
      providesTags: (page) => providesList(page?.items, "ClientPayments"),
    }),
    getClientPayment: build.query<ClientPayment, string>({
      query: (id) => ENDPOINTS.billing.paymentById(id),
      providesTags: (_r, _e, id) => [{ type: "ClientPayments", id }],
    }),
    recordPayment: build.mutation<ClientPayment, { projectId: string; body: RecordPaymentBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.billing.payments(projectId), method: "POST", body }),
      invalidatesTags: MONEY_CHANGED,
    }),
    setClientChequeStatus: build.mutation<ClientPayment, { id: string; body: ClientChequeStatusBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.billing.chequeStatus(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "ClientPayments", id }, ...MONEY_CHANGED],
    }),
    getReceiptPdf: build.mutation<SharedPdf, string>({
      query: (id) => ({ url: ENDPOINTS.billing.receiptPdf(id) }),
    }),

    // ─── Receivables, statement, alerts ───────────────────────────────────
    getProjectReceivables: build.query<ProjectReceivables, string>({
      query: (projectId) => ENDPOINTS.billing.projectReceivables(projectId),
      providesTags: (_r, _e, projectId) => [{ type: "Receivables", id: projectId }, { type: "Receivables", id: LIST }],
    }),
    getReceivables: build.query<CompanyReceivables, ReceivablesQuery | void>({
      query: (params) => ({ url: ENDPOINTS.billing.receivables, params: cleanParams(params ?? undefined) }),
      providesTags: [{ type: "Receivables", id: LIST }],
    }),
    getOwnerStatement: build.query<OwnerStatement, { projectId: string } & StatementQuery>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.billing.statement(projectId), params: cleanParams(params) }),
      providesTags: [{ type: "Invoices", id: LIST }, { type: "ClientPayments", id: LIST }],
    }),
    getOwnerStatementPdf: build.mutation<SharedPdf, { projectId: string } & StatementQuery>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.billing.statementPdf(projectId), params: cleanParams(params) }),
    }),
    getBillingEvents: build.query<BillingEvent[], { openOnly?: "true" | "false" } | void>({
      query: (params) => ({ url: ENDPOINTS.billing.events, params: cleanParams(params ?? undefined) }),
      providesTags: [{ type: "BillingEvents", id: LIST }],
    }),
  }),
});

export const {
  useGetBillingStagesQuery,
  useMarkStageReadyMutation,
  useUpdateStageMutation,
  useGetBillingProgressQuery,
  useAddBillingProgressMutation,
  useUpdateBillingProgressMutation,
  useDeleteBillingProgressMutation,
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useIssueInvoiceMutation,
  useCancelInvoiceMutation,
  useGetInvoicePdfMutation,
  useGetClientPaymentsQuery,
  useGetClientPaymentQuery,
  useRecordPaymentMutation,
  useSetClientChequeStatusMutation,
  useGetReceiptPdfMutation,
  useGetProjectReceivablesQuery,
  useGetReceivablesQuery,
  useGetOwnerStatementQuery,
  useGetOwnerStatementPdfMutation,
  useGetBillingEventsQuery,
} = billingApi;
