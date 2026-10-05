import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  LowStockLevel,
  LowStockLevelsBody,
  MaterialUsage,
  MovementsQuery,
  Paginated,
  SiteStock,
  StockCount,
  StockCountBody,
  StockCountsQuery,
  StockLocation,
  StockMovement,
  StoreStock,
  StoreStockQuery,
  UsageBody,
  UsageQuery,
} from "@/api/types";

/** Anything that moves stock refreshes these. */
export const STOCK_CHANGED = [
  { type: "Stock" as const, id: LIST },
  { type: "StockLocations" as const, id: LIST },
];

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStockLocations: build.query<StockLocation[], void>({
      query: () => ENDPOINTS.inventory.locations,
      providesTags: (rows) => providesList(rows, "StockLocations"),
    }),
    getStoreStock: build.query<StoreStock, { locationId: string } & StoreStockQuery>({
      query: ({ locationId, ...params }) => ({ url: ENDPOINTS.inventory.storeStock(locationId), params: cleanParams(params) }),
      providesTags: [{ type: "Stock", id: LIST }],
    }),
    setLowStockLevels: build.mutation<LowStockLevel[], { locationId: string; body: LowStockLevelsBody }>({
      query: ({ locationId, body }) => ({ url: ENDPOINTS.inventory.lowStockLevels(locationId), method: "PUT", body }),
      invalidatesTags: [{ type: "Stock", id: LIST }],
    }),
    getStockMovements: build.query<Paginated<StockMovement>, MovementsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.inventory.movements, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<StockMovement>,
      providesTags: [{ type: "Stock", id: "MOVEMENTS" }],
    }),
    getProjectStock: build.query<SiteStock, string>({
      query: (projectId) => ENDPOINTS.inventory.projectStock(projectId),
      providesTags: (_r, _e, projectId) => [
        { type: "Stock", id: projectId },
        { type: "Stock", id: LIST },
      ],
    }),

    getUsage: build.query<Paginated<MaterialUsage>, { projectId: string } & UsageQuery>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.inventory.projectUsage(projectId), params: cleanParams(params) }),
      transformResponse: toPage<MaterialUsage>,
      providesTags: (_r, _e, { projectId }) => [{ type: "Usage", id: projectId }],
    }),
    recordUsage: build.mutation<MaterialUsage, { projectId: string; body: UsageBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.inventory.projectUsage(projectId), method: "POST", body }),
      invalidatesTags: (_r, _e, { projectId }) => [{ type: "Usage", id: projectId }, ...STOCK_CHANGED, { type: "Stock", id: "MOVEMENTS" }],
    }),

    getStockCounts: build.query<Paginated<StockCount>, StockCountsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.inventory.stockCounts, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<StockCount>,
      providesTags: (page) => providesList(page?.items, "StockCount"),
    }),
    createStockCount: build.mutation<StockCount, StockCountBody>({
      query: (body) => ({ url: ENDPOINTS.inventory.stockCounts, method: "POST", body }),
      invalidatesTags: [{ type: "StockCount", id: LIST }, ...STOCK_CHANGED, { type: "Stock", id: "MOVEMENTS" }],
    }),
  }),
});

export const {
  useGetStockLocationsQuery,
  useGetStoreStockQuery,
  useSetLowStockLevelsMutation,
  useGetStockMovementsQuery,
  useGetProjectStockQuery,
  useGetUsageQuery,
  useRecordUsageMutation,
  useGetStockCountsQuery,
  useCreateStockCountMutation,
} = inventoryApi;
