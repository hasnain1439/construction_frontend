import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { STOCK_CHANGED } from "@/api/services/inventory.api";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  ComparisonRow,
  CreateDispatchBody,
  Dispatch,
  DispatchesQuery,
  Incoming,
  OwnerDelivery,
  OwnerDeliveryBody,
  Paginated,
  ReceiveDispatchBody,
  ResolveShortageBody,
  Shortage,
  ShortagesQuery,
} from "@/api/types";

const dispatchChanged = (id?: string) => [
  { type: "Dispatch" as const, id: LIST },
  ...(id ? [{ type: "Dispatch" as const, id }] : []),
  { type: "Incoming" as const, id: LIST },
  { type: "Shortage" as const, id: LIST },
  { type: "Stock" as const, id: "MOVEMENTS" },
  ...STOCK_CHANGED,
];

export const dispatchApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDispatches: build.query<Paginated<Dispatch>, DispatchesQuery | void>({
      query: (params) => ({ url: ENDPOINTS.dispatch.list, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<Dispatch>,
      providesTags: (page) => providesList(page?.items, "Dispatch"),
    }),
    getDispatch: build.query<Dispatch, string>({
      query: (id) => ENDPOINTS.dispatch.byId(id),
      providesTags: (_r, _e, id) => [{ type: "Dispatch", id }],
    }),
    createDispatch: build.mutation<Dispatch, CreateDispatchBody>({
      query: (body) => ({ url: ENDPOINTS.dispatch.list, method: "POST", body }),
      invalidatesTags: () => dispatchChanged(),
    }),
    cancelDispatch: build.mutation<Dispatch, string>({
      query: (id) => ({ url: ENDPOINTS.dispatch.cancel(id), method: "POST" }),
      invalidatesTags: (_r, _e, id) => dispatchChanged(id),
    }),
    receiveDispatch: build.mutation<{ dispatch: Dispatch; comparison: ComparisonRow[] }, { id: string; body: ReceiveDispatchBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.dispatch.receive(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => dispatchChanged(id),
    }),
    getIncoming: build.query<Incoming, string>({
      query: (projectId) => ENDPOINTS.dispatch.incoming(projectId),
      providesTags: (_r, _e, projectId) => [
        { type: "Incoming", id: projectId },
        { type: "Incoming", id: LIST },
      ],
    }),

    getShortages: build.query<Paginated<Shortage, { openCount: number; openValuePaisa?: string }>, ShortagesQuery | void>({
      query: (params) => ({ url: ENDPOINTS.dispatch.shortages, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<Shortage, { openCount: number; openValuePaisa?: string }>,
      providesTags: (page) => providesList(page?.items, "Shortage"),
    }),
    resolveShortage: build.mutation<Shortage, { id: string; body: ResolveShortageBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.dispatch.resolveShortage(id), method: "POST", body }),
      // SEND_REMAINING creates a dispatch; SUPPLIER_CREDIT moves the supplier ledger.
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Shortage", id },
        ...dispatchChanged(),
        { type: "SupplierLedger", id: LIST },
        { type: "Suppliers", id: LIST },
        { type: "Purchase", id: LIST },
      ],
    }),

    getOwnerDeliveries: build.query<Paginated<OwnerDelivery>, { projectId: string; page?: number; limit?: number }>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.dispatch.ownerDeliveries(projectId), params: cleanParams(params) }),
      transformResponse: toPage<OwnerDelivery>,
      providesTags: (_r, _e, { projectId }) => [{ type: "OwnerDelivery", id: projectId }],
    }),
    createOwnerDelivery: build.mutation<OwnerDelivery, { projectId: string; body: OwnerDeliveryBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.dispatch.ownerDeliveries(projectId), method: "POST", body }),
      invalidatesTags: (_r, _e, { projectId }) => [{ type: "OwnerDelivery", id: projectId }, ...STOCK_CHANGED, { type: "Stock", id: "MOVEMENTS" }],
    }),
  }),
});

export const {
  useGetDispatchesQuery,
  useGetDispatchQuery,
  useCreateDispatchMutation,
  useCancelDispatchMutation,
  useReceiveDispatchMutation,
  useGetIncomingQuery,
  useGetShortagesQuery,
  useResolveShortageMutation,
  useGetOwnerDeliveriesQuery,
  useCreateOwnerDeliveryMutation,
} = dispatchApi;
