import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { saveBlob } from "@/api/services/onboarding.api";
import { cleanParams, toPage } from "@/api/transform";
import type {
  ApiError,
  BulkPercentBody,
  CreateMaterialBody,
  CreatePaymentTemplateBody,
  CreateQualityCategoryBody,
  CreateSubcontractorBody,
  CreateSupplierBody,
  CreateWorkerBody,
  CreateTradeBody,
  CreateWorkerTypeBody,
  DuplicateQualityCategoryBody,
  LaborRate,
  Material,
  MaterialGroup,
  MaterialSection,
  MaterialsQuery,
  Paginated,
  PaymentTemplate,
  PriceHistoryQuery,
  PriceImportPreview,
  PriceImportResult,
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
  Brand,
  MeasureUnit,
  BrandActivity,
  SupplierCategory,
  SupplierCategoryActivity,
  SupplierProducts,
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
  UpdateWorkerTypeBody,
  Worker,
  WorkersQuery,
  TradeRow,
  WorkerTypeRow,
  WorkerTypesQuery,
} from "@/api/types";

/** A worker type is a DAILY labour rate; workers, the dashboard and team lists show its names. */
const workerTypesChanged = [
  { type: "WorkerTypes" as const, id: LIST },
  { type: "LaborRates" as const, id: LIST },
  "Workers" as const,
  "Dashboard" as const,
];

/** The multipart body of an import upload. */
function fileForm(file: File) {
  const form = new FormData();
  form.append("file", file);
  return form;
}

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
    createMaterialGroup: build.mutation<MaterialGroup, { name: string; section: MaterialSection }>({
      query: (body) => ({ url: ENDPOINTS.masterData.materialGroups, method: "POST", body }),
      invalidatesTags: ["MaterialGroups"],
    }),
    updateMaterialGroup: build.mutation<MaterialGroup, { id: string; name?: string; section?: MaterialSection }>({
      query: ({ id, ...body }) => ({ url: ENDPOINTS.masterData.materialGroupById(id), method: "PATCH", body }),
      invalidatesTags: ["MaterialGroups", "Materials"],
    }),
    deleteMaterialGroup: build.mutation<{ id: string; deleted: true }, string>({
      query: (id) => ({ url: ENDPOINTS.masterData.materialGroupById(id), method: "DELETE" }),
      invalidatesTags: ["MaterialGroups"],
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
    /** Downloads the whole price list as .xlsx (every material × every active category, today's rates). */
    downloadPriceList: build.mutation<null, void>({
      async queryFn(_arg, _api, _extra, baseQuery) {
        const result = await baseQuery({
          url: ENDPOINTS.masterData.priceListExport,
          responseHandler: async (response) => (response.ok ? response.blob() : response.json()),
        });
        if (result.error) return { error: result.error as ApiError };
        const disposition = result.meta?.response?.headers.get("content-disposition") ?? "";
        saveBlob(result.data as Blob, /filename="([^"]+)"/.exec(disposition)?.[1] ?? "price-list.xlsx");
        return { data: null };
      },
    }),
    /** Checks an edited price list file; writes nothing. */
    previewPriceImport: build.mutation<PriceImportPreview, File>({
      query: (file) => ({ url: ENDPOINTS.masterData.priceListImportPreview, method: "POST", body: fileForm(file) }),
    }),
    /** Saves the same file again (all-or-nothing unless skipInvalid). */
    commitPriceImport: build.mutation<PriceImportResult, { file: File; skipInvalid?: boolean }>({
      query: ({ file, skipInvalid }) => ({
        url: ENDPOINTS.masterData.priceListImportCommit,
        method: "POST",
        body: fileForm(file),
        ...(skipInvalid ? { params: { skipInvalid: "true" } } : {}),
      }),
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
      invalidatesTags: [{ type: "LaborRates", id: LIST }, { type: "WorkerTypes", id: LIST }, { type: "Trades", id: LIST }],
    }),
    getTrades: build.query<TradeRow[], { includeInactive?: boolean } | void>({
      query: (params) => ({ url: ENDPOINTS.masterData.trades, params: params?.includeInactive ? { includeInactive: "true" } : undefined }),
      providesTags: (rows) => providesList(rows, "Trades"),
    }),
    createTrade: build.mutation<TradeRow, CreateTradeBody>({
      query: (body) => ({ url: ENDPOINTS.masterData.trades, method: "POST", body }),
      invalidatesTags: [{ type: "Trades", id: LIST }, { type: "LaborRates", id: LIST }],
    }),
    getWorkerTypes: build.query<WorkerTypeRow[], WorkerTypesQuery | void>({
      query: (params) => ({
        url: ENDPOINTS.masterData.workerTypes,
        params: params?.includeInactive ? { includeInactive: "true" } : undefined,
      }),
      providesTags: (rows) => providesList(rows, "WorkerTypes"),
    }),
    createWorkerType: build.mutation<WorkerTypeRow, CreateWorkerTypeBody>({
      query: (body) => ({ url: ENDPOINTS.masterData.workerTypes, method: "POST", body }),
      invalidatesTags: workerTypesChanged,
    }),
    updateWorkerType: build.mutation<WorkerTypeRow, { id: string; body: UpdateWorkerTypeBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.masterData.workerTypeById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "WorkerTypes", id }, ...workerTypesChanged],
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
    /** The list; { deleted: true } = the deleted ones. */
    getSupplierCategories: build.query<SupplierCategory[], { deleted?: boolean } | void>({
      query: (q) => ({ url: ENDPOINTS.masterData.supplierCategories, params: q?.deleted ? { deleted: true } : undefined }),
      providesTags: [{ type: "Suppliers", id: "CATEGORIES" }],
    }),
    getSupplierCategoryActivity: build.query<SupplierCategoryActivity, string>({
      query: (id) => ENDPOINTS.masterData.supplierCategoryActivity(id),
      providesTags: [{ type: "Suppliers", id: "CATEGORIES" }],
    }),
    /** Exactly these materials become the category's products. */
    setSupplierCategoryMaterials: build.mutation<{ id: string; name: string; materials: SupplierCategory["materials"] }, { id: string; materialIds: string[] }>({
      query: ({ id, materialIds }) => ({ url: ENDPOINTS.masterData.supplierCategoryMaterials(id), method: "PUT", body: { materialIds } }),
      invalidatesTags: ["Suppliers"],
    }),
    getSupplierProducts: build.query<SupplierProducts, string>({
      query: (id) => ENDPOINTS.masterData.supplierProducts(id),
      providesTags: (_r, _e, id) => [{ type: "Suppliers", id }, { type: "Suppliers", id: "CATEGORIES" }],
    }),
    /** Products screen: which supplier categories sell this material. */
    setMaterialSupplierCategories: build.mutation<unknown, { id: string; categoryIds: string[] }>({
      query: ({ id, categoryIds }) => ({ url: ENDPOINTS.masterData.materialSupplierCategories(id), method: "PUT", body: { categoryIds } }),
      invalidatesTags: ["Suppliers"],
    }),
    getUnits: build.query<MeasureUnit[], void>({
      query: () => ENDPOINTS.masterData.units,
      providesTags: [{ type: "Materials", id: "UNITS" }],
    }),
    createUnit: build.mutation<MeasureUnit, { name: string }>({
      query: (body) => ({ url: ENDPOINTS.masterData.units, method: "POST", body }),
      invalidatesTags: [{ type: "Materials", id: "UNITS" }],
    }),
    /** Products using it follow the new name. */
    updateUnit: build.mutation<MeasureUnit, { id: string; name: string }>({
      query: ({ id, name }) => ({ url: ENDPOINTS.masterData.unitById(id), method: "PATCH", body: { name } }),
      invalidatesTags: ["Materials"],
    }),
    deleteUnit: build.mutation<{ id: string; deleted: true }, string>({
      query: (id) => ({ url: ENDPOINTS.masterData.unitById(id), method: "DELETE" }),
      invalidatesTags: [{ type: "Materials", id: "UNITS" }],
    }),
    getBrands: build.query<Brand[], { deleted?: boolean } | void>({
      query: (q) => ({ url: ENDPOINTS.masterData.brands, params: q?.deleted ? { deleted: true } : undefined }),
      providesTags: [{ type: "Materials", id: "BRANDS" }],
    }),
    getBrandActivity: build.query<BrandActivity, string>({
      query: (id) => ENDPOINTS.masterData.brandActivity(id),
      providesTags: [{ type: "Materials", id: "BRANDS" }],
    }),
    createBrand: build.mutation<Brand, { name: string; groupIds?: string[] }>({
      query: (body) => ({ url: ENDPOINTS.masterData.brands, method: "POST", body }),
      invalidatesTags: [{ type: "Materials", id: "BRANDS" }, "MaterialGroups"],
    }),
    updateBrand: build.mutation<Brand & { mergedFromId?: string }, { id: string; name?: string; groupIds?: string[] }>({
      query: ({ id, ...body }) => ({ url: ENDPOINTS.masterData.brandById(id), method: "PATCH", body }),
      invalidatesTags: ["Materials"],
    }),
    /** A brand on products needs moveTo (another brand) or clear. */
    deleteBrand: build.mutation<{ id: string; deleted: true; productsMoved: number; movedTo: string | null }, { id: string; moveTo?: string; clear?: boolean }>({
      query: ({ id, moveTo, clear }) => ({ url: ENDPOINTS.masterData.brandById(id), method: "DELETE", params: moveTo ? { moveTo } : clear ? { clear: true } : undefined }),
      invalidatesTags: ["Materials"],
    }),
    createSupplierCategory: build.mutation<SupplierCategory, { name: string }>({
      query: (body) => ({ url: ENDPOINTS.masterData.supplierCategories, method: "POST", body }),
      invalidatesTags: [{ type: "Suppliers", id: "CATEGORIES" }],
    }),
    /** Rename or merge: the suppliers' category changes too. */
    updateSupplierCategory: build.mutation<SupplierCategory & { mergedFromId?: string }, { id: string; name: string }>({
      query: ({ id, name }) => ({ url: ENDPOINTS.masterData.supplierCategoryById(id), method: "PATCH", body: { name } }),
      invalidatesTags: ["Suppliers"],
    }),
    /** A category in use needs moveTo: the category its suppliers go to. */
    deleteSupplierCategory: build.mutation<{ id: string; deleted: true; suppliersMoved: number; movedTo: string | null }, { id: string; moveTo?: string }>({
      query: ({ id, moveTo }) => ({ url: ENDPOINTS.masterData.supplierCategoryById(id), method: "DELETE", params: moveTo ? { moveTo } : undefined }),
      invalidatesTags: ["Suppliers"],
    }),
    getSupplier: build.query<SupplierDetail, string>({
      query: (id) => ENDPOINTS.masterData.supplierById(id),
      providesTags: (_r, _e, id) => [{ type: "Suppliers", id }],
    }),
    createSupplier: build.mutation<Supplier, CreateSupplierBody>({
      query: (body) => ({ url: ENDPOINTS.masterData.suppliers, method: "POST", body }),
      invalidatesTags: [{ type: "Suppliers", id: LIST }, { type: "Suppliers", id: "CATEGORIES" }],
    }),
    updateSupplier: build.mutation<Supplier, { id: string; body: UpdateSupplierBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.masterData.supplierById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Suppliers", id }, { type: "Suppliers", id: LIST }, { type: "Suppliers", id: "CATEGORIES" }],
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
  useDownloadPriceListMutation,
  usePreviewPriceImportMutation,
  useCommitPriceImportMutation,
  useGetRateHistoryQuery,
  useGetLaborRatesQuery,
  useUpdateLaborRatesMutation,
  useGetTradesQuery,
  useCreateTradeMutation,
  useGetWorkerTypesQuery,
  useCreateWorkerTypeMutation,
  useUpdateWorkerTypeMutation,
  useGetPaymentTemplatesQuery,
  useCreatePaymentTemplateMutation,
  useUpdatePaymentTemplateMutation,
  useDeletePaymentTemplateMutation,
  useGetSuppliersQuery,
  useGetSupplierCategoriesQuery,
  useGetSupplierCategoryActivityQuery,
  useSetSupplierCategoryMaterialsMutation,
  useGetSupplierProductsQuery,
  useSetMaterialSupplierCategoriesMutation,
  useGetBrandsQuery,
  useGetUnitsQuery,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useDeleteUnitMutation,
  useCreateMaterialGroupMutation,
  useUpdateMaterialGroupMutation,
  useDeleteMaterialGroupMutation,
  useGetBrandActivityQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
  useCreateSupplierCategoryMutation,
  useUpdateSupplierCategoryMutation,
  useDeleteSupplierCategoryMutation,
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
