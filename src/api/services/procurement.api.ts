import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { STOCK_CHANGED } from "@/api/services/inventory.api";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  ChequeStatusBody,
  ComparisonRow,
  CorrectionBody,
  CreatePurchaseBody,
  CreatePurchaseOrderBody,
  CreateSupplierPaymentBody,
  LedgerQuery,
  Paginated,
  Purchase,
  PurchaseListRow,
  PurchaseOrder,
  PurchaseOrdersQuery,
  PurchaseReturn,
  PurchaseReturnBody,
  PurchaseReturnsQuery,
  PurchasesQuery,
  ReceivePurchaseBody,
  SetRatesBody,
  SupplierLedger,
  SupplierPayment,
  SupplierPaymentsQuery,
  UpdatePurchaseOrderBody,
} from "@/api/types";

/** A purchase changes stock, the supplier's balance, shortages and the order it fills. */
const purchaseChanged = (id?: string) => [
  { type: "Purchase" as const, id: LIST },
  ...(id ? [{ type: "Purchase" as const, id }] : []),
  { type: "PurchaseOrder" as const, id: LIST },
  { type: "SupplierLedger" as const, id: LIST },
  { type: "SupplierPayment" as const, id: LIST },
  { type: "Suppliers" as const, id: LIST },
  { type: "Shortage" as const, id: LIST },
  { type: "Incoming" as const, id: LIST },
  { type: "Stock" as const, id: "MOVEMENTS" },
  ...STOCK_CHANGED,
];

export const procurementApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ─── Purchase orders ───────────────────────────────────────────────────
    getPurchaseOrders: build.query<Paginated<PurchaseOrder>, PurchaseOrdersQuery | void>({
      query: (params) => ({ url: ENDPOINTS.procurement.purchaseOrders, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<PurchaseOrder>,
      providesTags: (page) => providesList(page?.items, "PurchaseOrder"),
    }),
    getPurchaseOrder: build.query<PurchaseOrder, string>({
      query: (id) => ENDPOINTS.procurement.purchaseOrderById(id),
      providesTags: (_r, _e, id) => [{ type: "PurchaseOrder", id }],
    }),
    createPurchaseOrder: build.mutation<PurchaseOrder, CreatePurchaseOrderBody>({
      query: (body) => ({ url: ENDPOINTS.procurement.purchaseOrders, method: "POST", body }),
      invalidatesTags: [{ type: "PurchaseOrder", id: LIST }],
    }),
    updatePurchaseOrder: build.mutation<PurchaseOrder, { id: string; body: UpdatePurchaseOrderBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.procurement.purchaseOrderById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "PurchaseOrder", id },
        { type: "PurchaseOrder", id: LIST },
      ],
    }),
    cancelPurchaseOrder: build.mutation<PurchaseOrder, string>({
      query: (id) => ({ url: ENDPOINTS.procurement.purchaseOrderCancel(id), method: "POST" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "PurchaseOrder", id },
        { type: "PurchaseOrder", id: LIST },
      ],
    }),

    // ─── Purchases ─────────────────────────────────────────────────────────
    getPurchases: build.query<Paginated<PurchaseListRow, { totalPaisa?: string; paidNowPaisa?: string }>, PurchasesQuery | void>({
      query: (params) => ({ url: ENDPOINTS.procurement.purchases, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<PurchaseListRow, { totalPaisa?: string; paidNowPaisa?: string }>,
      providesTags: (page) => providesList(page?.items, "Purchase"),
    }),
    getPurchase: build.query<Purchase, string>({
      query: (id) => ENDPOINTS.procurement.purchaseById(id),
      providesTags: (_r, _e, id) => [{ type: "Purchase", id }],
    }),
    createPurchase: build.mutation<Purchase, CreatePurchaseBody>({
      query: (body) => ({ url: ENDPOINTS.procurement.purchases, method: "POST", body }),
      invalidatesTags: () => purchaseChanged(),
    }),
    setPurchaseRates: build.mutation<Purchase, { id: string; body: SetRatesBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.procurement.purchaseRates(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => purchaseChanged(id),
    }),
    correctPurchase: build.mutation<Purchase, { id: string; body: CorrectionBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.procurement.purchaseCorrections(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => purchaseChanged(id),
    }),
    createPurchaseReturn: build.mutation<PurchaseReturn, { id: string; body: PurchaseReturnBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.procurement.purchaseReturns(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [...purchaseChanged(id), { type: "PurchaseReturn", id: LIST }],
    }),
    receivePurchase: build.mutation<{ purchase: Purchase; comparison: ComparisonRow[] }, { id: string; body: ReceivePurchaseBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.procurement.purchaseReceive(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => purchaseChanged(id),
    }),
    getPurchaseReturns: build.query<Paginated<PurchaseReturn>, PurchaseReturnsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.procurement.returns, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<PurchaseReturn>,
      providesTags: (page) => providesList(page?.items, "PurchaseReturn"),
    }),

    // ─── Supplier ledger + payments ───────────────────────────────────────
    getSupplierLedger: build.query<Paginated<SupplierLedger["entries"][number]> & { ledger: Omit<SupplierLedger, "entries"> }, { supplierId: string } & LedgerQuery>({
      query: ({ supplierId, ...params }) => ({ url: ENDPOINTS.procurement.supplierLedger(supplierId), params: cleanParams(params) }),
      transformResponse: (data: SupplierLedger, meta) => {
        const { entries, ...ledger } = data;
        return { ...toPage<SupplierLedger["entries"][number]>(entries, meta), ledger };
      },
      providesTags: (_r, _e, { supplierId }) => [
        { type: "SupplierLedger", id: supplierId },
        { type: "SupplierLedger", id: LIST },
      ],
    }),
    getSupplierPayments: build.query<Paginated<SupplierPayment, { totalPaidPaisa?: string }>, SupplierPaymentsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.procurement.supplierPayments, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<SupplierPayment, { totalPaidPaisa?: string }>,
      providesTags: (page) => providesList(page?.items, "SupplierPayment"),
    }),
    createSupplierPayment: build.mutation<SupplierPayment, CreateSupplierPaymentBody>({
      query: (body) => ({ url: ENDPOINTS.procurement.supplierPayments, method: "POST", body }),
      invalidatesTags: [
        { type: "SupplierPayment", id: LIST },
        { type: "SupplierLedger", id: LIST },
        { type: "Suppliers", id: LIST },
      ],
    }),
    setChequeStatus: build.mutation<SupplierPayment, { id: string; body: ChequeStatusBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.procurement.chequeStatus(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "SupplierPayment", id },
        { type: "SupplierPayment", id: LIST },
        { type: "SupplierLedger", id: LIST },
        { type: "Suppliers", id: LIST },
      ],
    }),
  }),
});

export const {
  useGetPurchaseOrdersQuery,
  useGetPurchaseOrderQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useCancelPurchaseOrderMutation,
  useGetPurchasesQuery,
  useGetPurchaseQuery,
  useCreatePurchaseMutation,
  useSetPurchaseRatesMutation,
  useCorrectPurchaseMutation,
  useCreatePurchaseReturnMutation,
  useReceivePurchaseMutation,
  useGetPurchaseReturnsQuery,
  useGetSupplierLedgerQuery,
  useGetSupplierPaymentsQuery,
  useCreateSupplierPaymentMutation,
  useSetChequeStatusMutation,
} = procurementApi;
