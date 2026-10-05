import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  BulkPercentBody,
  CreateMaterialBody,
  CreatePaymentTemplateBody,
  CreateQualityCategoryBody,
  CreateSubcontractorBody,
  CreateSupplierBody,
  CreateWorkerBody,
  DuplicateQualityCategoryBody,
  LaborRate,
  Material,
  MaterialGroup,
  MaterialsQuery,
  Paginated,
  PaymentTemplate,
  PriceHistoryQuery,
  PriceList,
  PriceListQuery,
  PriceListUpdateResult,
  QualityCategoriesQuery,
  QualityCategory,
  RateHistory,
  SetSupplierRatesBody,
  Subcontractor,
  SubcontractorsQuery,
  Supplier,
  SupplierDetail,
  SupplierRates,
  SuppliersQuery,
  UpdateLaborRatesBody,
  UpdateMaterialBody,
  UpdatePaymentTemplateBody,
  UpdatePriceListBody,
  UpdateQualityCategoryBody,
  UpdateSubcontractorBody,
  UpdateSupplierBody,
  UpdateWorkerBody,
  Worker,
  WorkersQuery,
} from "@/api/types";

const priceListChanged = [
  { type: "PriceList" as const, id: LIST },
  { type: "RateHistory" as const, id: LIST },
  { type: "QualityCategories" as const, id: LIST },
];

export const masterDataApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ─── Materials ─────────────────────────────────────────────────────────
    getMaterialGroups: build.query<MaterialGroup[], void>({
      query: () => ENDPOINTS.masterData.materialGroups,
      providesTags: ["MaterialGroups"],
      keepUnusedDataFor: 600,
    }),
    getMaterials: build.query<Material[], MaterialsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.masterData.materials, params: cleanParams(params ?? undefined) }),
      providesTags: (rows) => providesList(rows, "Materials"),
    }),
    createMaterial: build.mutation<Material, CreateMaterialBody>({
      query: (body) => ({ url: ENDPOINTS.masterData.materials, method: "POST", body }),
      invalidatesTags: [{ type: "Materials", id: LIST }, { type: "PriceList", id: LIST }],
    }),
    updateMaterial: build.mutation<Material, { id: string; body: UpdateMaterialBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.masterData.materialById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Materials", id },
        { type: "Materials", id: LIST },
        { type: "PriceList", id: LIST },
      ],
    }),
    hideMaterial: build.mutation<Material, string>({
      query: (id) => ({ url: ENDPOINTS.masterData.materialHide(id), method: "POST" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Materials", id },
        { type: "Materials", id: LIST },
        { type: "PriceList", id: LIST },
      ],
    }),
    showMaterial: build.mutation<Material, string>({
      query: (id) => ({ url: ENDPOINTS.masterData.materialShow(id), method: "POST" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Materials", id },
        { type: "Materials", id: LIST },
        { type: "PriceList", id: LIST },
      ],
    }),
    deleteMaterial: build.mutation<{ id: string; deleted: true }, string>({
      query: (id) => ({ url: ENDPOINTS.masterData.materialById(id), method: "DELETE" }),
      invalidatesTags: [{ type: "Materials", id: LIST }, { type: "PriceList", id: LIST }],
    }),

    // ─── Quality categories & price list ───────────────────────────────────
    getQualityCategories: build.query<QualityCategory[], QualityCategoriesQuery | void>({
      query: (params) => ({ url: ENDPOINTS.masterData.qualityCategories, params: cleanParams(params ?? undefined) }),
      providesTags: (rows) => providesList(rows, "QualityCategories"),
    }),
    createQualityCategory: build.mutation<QualityCategory, CreateQualityCategoryBody>({
      query: (body) => ({ url: ENDPOINTS.masterData.qualityCategories, method: "POST", body }),
      invalidatesTags: priceListChanged,
    }),
    updateQualityCategory: build.mutation<QualityCategory, { id: string; body: UpdateQualityCategoryBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.masterData.qualityCategoryById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "QualityCategories", id }, ...priceListChanged],
    }),
    duplicateQualityCategory: build.mutation<QualityCategory, { id: string; body: DuplicateQualityCategoryBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.masterData.qualityCategoryDuplicate(id), method: "POST", body }),
      invalidatesTags: priceListChanged,
    }),
    archiveQualityCategory: build.mutation<QualityCategory, string>({
      query: (id) => ({ url: ENDPOINTS.masterData.qualityCategoryArchive(id), method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "QualityCategories", id }, ...priceListChanged],
    }),
    getPriceList: build.query<PriceList, PriceListQuery | void>({
      query: (params) => ({ url: ENDPOINTS.masterData.priceList, params: cleanParams(params ?? undefined) }),
      providesTags: (result) =>
        result ? [{ type: "PriceList", id: LIST }, { type: "PriceList", id: result.category.id }] : [{ type: "PriceList", id: LIST }],
    }),
    updatePriceList: build.mutation<PriceListUpdateResult, UpdatePriceListBody>({
      query: (body) => ({ url: ENDPOINTS.masterData.priceList, method: "PUT", body }),
      invalidatesTags: priceListChanged,
    }),
    bulkPercent: build.mutation<PriceListUpdateResult, BulkPercentBody>({
      query: (body) => ({ url: ENDPOINTS.masterData.priceListBulkPercent, method: "POST", body }),
      invalidatesTags: priceListChanged,
    }),
    getRateHistory: build.query<RateHistory, PriceHistoryQuery>({
      query: (params) => ({ url: ENDPOINTS.masterData.priceListHistory, params: cleanParams(params) }),
      providesTags: [{ type: "RateHistory", id: LIST }],
    }),

    // ─── Labour rates & payment templates ──────────────────────────────────
    getLaborRates: build.query<LaborRate[], void>({
      query: () => ENDPOINTS.masterData.laborRates,
      providesTags: (rows) => providesList(rows, "LaborRates"),
    }),
    updateLaborRates: build.mutation<LaborRate[], UpdateLaborRatesBody>({
      query: (body) => ({ url: ENDPOINTS.masterData.laborRates, method: "PUT", body }),
      invalidatesTags: [{ type: "LaborRates", id: LIST }],
    }),
    getPaymentTemplates: build.query<PaymentTemplate[], void>({
      query: () => ENDPOINTS.masterData.paymentTemplates,
      providesTags: (rows) => providesList(rows, "PaymentTemplates"),
    }),
    createPaymentTemplate: build.mutation<PaymentTemplate, CreatePaymentTemplateBody>({
      query: (body) => ({ url: ENDPOINTS.masterData.paymentTemplates, method: "POST", body }),
      invalidatesTags: [{ type: "PaymentTemplates", id: LIST }],
    }),
    updatePaymentTemplate: build.mutation<PaymentTemplate, { id: string; body: UpdatePaymentTemplateBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.masterData.paymentTemplateById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "PaymentTemplates", id },
        { type: "PaymentTemplates", id: LIST },
      ],
    }),
    deletePaymentTemplate: build.mutation<unknown, string>({
      query: (id) => ({ url: ENDPOINTS.masterData.paymentTemplateById(id), method: "DELETE" }),
      invalidatesTags: [{ type: "PaymentTemplates", id: LIST }],
    }),

    // ─── Suppliers ─────────────────────────────────────────────────────────
    getSuppliers: build.query<Paginated<Supplier>, SuppliersQuery | void>({
      query: (params) => ({ url: ENDPOINTS.masterData.suppliers, params: cleanParams(params ?? undefined) }),
      transformResponse: (data, meta) => toPage<Supplier>(data, meta),
      providesTags: (page) => providesList(page?.items, "Suppliers"),
    }),
    getSupplier: build.query<SupplierDetail, string>({
      query: (id) => ENDPOINTS.masterData.supplierById(id),
      providesTags: (_r, _e, id) => [{ type: "Suppliers", id }],
    }),
    createSupplier: build.mutation<Supplier, CreateSupplierBody>({
      query: (body) => ({ url: ENDPOINTS.masterData.suppliers, method: "POST", body }),
      invalidatesTags: [{ type: "Suppliers", id: LIST }],
    }),
    updateSupplier: build.mutation<Supplier, { id: string; body: UpdateSupplierBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.masterData.supplierById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Suppliers", id }, { type: "Suppliers", id: LIST }],
    }),
    setSupplierActive: build.mutation<Supplier, { id: string; active: boolean }>({
      query: ({ id, active }) => ({
        url: active ? ENDPOINTS.masterData.supplierActivate(id) : ENDPOINTS.masterData.supplierDeactivate(id),
        method: "POST",
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Suppliers", id }, { type: "Suppliers", id: LIST }],
    }),
    getSupplierRates: build.query<SupplierRates, string>({
      query: (id) => ENDPOINTS.masterData.supplierRates(id),
      providesTags: (_r, _e, id) => [{ type: "SupplierRates", id }],
    }),
    setSupplierRates: build.mutation<unknown, { id: string; body: SetSupplierRatesBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.masterData.supplierRates(id), method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "SupplierRates", id },
        { type: "Suppliers", id },
      ],
    }),

    // ─── Workforce ─────────────────────────────────────────────────────────
    getWorkers: build.query<Paginated<Worker>, WorkersQuery | void>({
      query: (params) => ({ url: ENDPOINTS.masterData.workers, params: cleanParams(params ?? undefined) }),
      transformResponse: (data, meta) => toPage<Worker>(data, meta),
      providesTags: (page) => providesList(page?.items, "Workers"),
    }),
    createWorker: build.mutation<Worker, CreateWorkerBody>({
      query: (body) => ({ url: ENDPOINTS.masterData.workers, method: "POST", body }),
      invalidatesTags: [{ type: "Workers", id: LIST }],
    }),
    updateWorker: build.mutation<Worker, { id: string; body: UpdateWorkerBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.masterData.workerById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Workers", id }, { type: "Workers", id: LIST }],
    }),
    setWorkerActive: build.mutation<Worker, { id: string; active: boolean }>({
      query: ({ id, active }) => ({
        url: active ? ENDPOINTS.masterData.workerActivate(id) : ENDPOINTS.masterData.workerDeactivate(id),
        method: "POST",
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Workers", id }, { type: "Workers", id: LIST }],
    }),
    getSubcontractors: build.query<Paginated<Subcontractor>, SubcontractorsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.masterData.subcontractors, params: cleanParams(params ?? undefined) }),
      transformResponse: (data, meta) => toPage<Subcontractor>(data, meta),
      providesTags: (page) => providesList(page?.items, "Subcontractors"),
    }),
    createSubcontractor: build.mutation<Subcontractor, CreateSubcontractorBody>({
      query: (body) => ({ url: ENDPOINTS.masterData.subcontractors, method: "POST", body }),
      invalidatesTags: [{ type: "Subcontractors", id: LIST }],
    }),
    updateSubcontractor: build.mutation<Subcontractor, { id: string; body: UpdateSubcontractorBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.masterData.subcontractorById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Subcontractors", id },
        { type: "Subcontractors", id: LIST },
      ],
    }),
    setSubcontractorActive: build.mutation<Subcontractor, { id: string; active: boolean }>({
      query: ({ id, active }) => ({
        url: active
          ? ENDPOINTS.masterData.subcontractorActivate(id)
          : ENDPOINTS.masterData.subcontractorDeactivate(id),
        method: "POST",
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Subcontractors", id },
        { type: "Subcontractors", id: LIST },
      ],
    }),
  }),
});

export const {
  useGetMaterialGroupsQuery,
  useGetMaterialsQuery,
  useCreateMaterialMutation,
  useUpdateMaterialMutation,
  useHideMaterialMutation,
  useShowMaterialMutation,
  useDeleteMaterialMutation,
  useGetQualityCategoriesQuery,
  useCreateQualityCategoryMutation,
  useUpdateQualityCategoryMutation,
  useDuplicateQualityCategoryMutation,
  useArchiveQualityCategoryMutation,
  useGetPriceListQuery,
  useUpdatePriceListMutation,
  useBulkPercentMutation,
  useGetRateHistoryQuery,
  useGetLaborRatesQuery,
  useUpdateLaborRatesMutation,
  useGetPaymentTemplatesQuery,
  useCreatePaymentTemplateMutation,
  useUpdatePaymentTemplateMutation,
  useDeletePaymentTemplateMutation,
  useGetSuppliersQuery,
  useGetSupplierQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useSetSupplierActiveMutation,
  useGetSupplierRatesQuery,
  useSetSupplierRatesMutation,
  useGetWorkersQuery,
  useCreateWorkerMutation,
  useUpdateWorkerMutation,
  useSetWorkerActiveMutation,
  useGetSubcontractorsQuery,
  useCreateSubcontractorMutation,
  useUpdateSubcontractorMutation,
  useSetSubcontractorActiveMutation,
} = masterDataApi;
