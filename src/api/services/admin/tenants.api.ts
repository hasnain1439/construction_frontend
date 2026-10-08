import { adminBaseApi } from "@/api/adminBaseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  CompanyActivity,
  CompanyProjectRow,
  CompanyTeam,
  CreateTenantBody,
  CreateTenantResult,
  Paginated,
  TenantDetail,
  TenantPlanBody,
  TenantPlanResult,
  TenantRow,
  TenantsQuery,
  TenantStatusBody,
  TenantStatusResult,
} from "@/api/types";

const tenantChanged = (id: string) => [
  { type: "Tenants" as const, id },
  { type: "Tenants" as const, id: LIST },
  { type: "AuditLogs" as const, id: LIST },
  "AdminOverview" as const,
];

export const adminTenantsApi = adminBaseApi.injectEndpoints({
  endpoints: (build) => ({
    getTenants: build.query<Paginated<TenantRow>, TenantsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.admin.tenants, params: cleanParams(params ?? undefined) }),
      transformResponse: (data, meta) => toPage<TenantRow>(data, meta),
      providesTags: (page) => providesList(page?.items, "Tenants"),
    }),
    getTenant: build.query<TenantDetail, string>({
      query: (id) => ENDPOINTS.admin.tenantById(id),
      providesTags: (_r, _e, id) => [{ type: "Tenants", id }],
    }),
    // A company's own data — read-only; the server audits each look.
    getCompanyProjects: build.query<CompanyProjectRow[], string>({
      query: (id) => ENDPOINTS.admin.tenantProjects(id),
      providesTags: (_r, _e, id) => [{ type: "Tenants", id }],
    }),
    getCompanyTeam: build.query<CompanyTeam, string>({
      query: (id) => ENDPOINTS.admin.tenantTeam(id),
      providesTags: (_r, _e, id) => [{ type: "Tenants", id }],
    }),
    getCompanyActivity: build.query<CompanyActivity, string>({
      query: (id) => ENDPOINTS.admin.tenantActivity(id),
      providesTags: (_r, _e, id) => [{ type: "Tenants", id }],
    }),
    createTenant: build.mutation<CreateTenantResult, CreateTenantBody>({
      query: (body) => ({ url: ENDPOINTS.admin.tenants, method: "POST", body }),
      invalidatesTags: [{ type: "Tenants", id: LIST }, { type: "AuditLogs", id: LIST }, "AdminOverview"],
    }),
    setTenantStatus: build.mutation<TenantStatusResult, { id: string; body: TenantStatusBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.admin.tenantStatus(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => tenantChanged(id),
    }),
    setTenantPlan: build.mutation<TenantPlanResult, { id: string; body: TenantPlanBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.admin.tenantPlan(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [...tenantChanged(id), { type: "AdminPlans", id: LIST }],
    }),
  }),
});

export const {
  useGetTenantsQuery,
  useGetTenantQuery,
  useGetCompanyProjectsQuery,
  useGetCompanyTeamQuery,
  useGetCompanyActivityQuery,
  useCreateTenantMutation,
  useSetTenantStatusMutation,
  useSetTenantPlanMutation,
} = adminTenantsApi;
