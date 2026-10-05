import { adminBaseApi } from "@/api/adminBaseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams } from "@/api/transform";
import type {
  CatalogGroup,
  CatalogMaterial,
  CatalogMaterialsQuery,
  CreateCatalogMaterialBody,
  UpdateCatalogMaterialBody,
} from "@/api/types";

export const adminCatalogApi = adminBaseApi.injectEndpoints({
  endpoints: (build) => ({
    getCatalogGroups: build.query<CatalogGroup[], void>({
      query: () => ENDPOINTS.admin.materialGroups,
      providesTags: (rows) => providesList(rows, "CatalogGroups"),
    }),
    getCatalogMaterials: build.query<CatalogMaterial[], CatalogMaterialsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.admin.materials, params: cleanParams(params ?? undefined) }),
      providesTags: (rows) => providesList(rows, "CatalogMaterials"),
    }),
    createCatalogMaterial: build.mutation<CatalogMaterial, CreateCatalogMaterialBody>({
      query: (body) => ({ url: ENDPOINTS.admin.materials, method: "POST", body }),
      invalidatesTags: [
        { type: "CatalogMaterials", id: LIST },
        { type: "CatalogGroups", id: LIST },
      ],
    }),
    updateCatalogMaterial: build.mutation<CatalogMaterial, { id: string; body: UpdateCatalogMaterialBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.admin.materialById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "CatalogMaterials", id },
        { type: "CatalogMaterials", id: LIST },
      ],
    }),
  }),
});

export const {
  useGetCatalogGroupsQuery,
  useGetCatalogMaterialsQuery,
  useCreateCatalogMaterialMutation,
  useUpdateCatalogMaterialMutation,
} = adminCatalogApi;
