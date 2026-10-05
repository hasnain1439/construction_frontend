import { adminBaseApi } from "@/api/adminBaseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import type { AdminPlan, CreatePlanBody, UpdatePlanBody } from "@/api/types";

export const adminPlansApi = adminBaseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminPlans: build.query<AdminPlan[], void>({
      query: () => ENDPOINTS.admin.plans,
      providesTags: (rows) => providesList(rows, "AdminPlans"),
    }),
    createPlan: build.mutation<AdminPlan, CreatePlanBody>({
      query: (body) => ({ url: ENDPOINTS.admin.plans, method: "POST", body }),
      invalidatesTags: [{ type: "AdminPlans", id: LIST }],
    }),
    updatePlan: build.mutation<AdminPlan, { id: string; body: UpdatePlanBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.admin.planById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "AdminPlans", id }, { type: "AdminPlans", id: LIST }],
    }),
  }),
});

export const { useGetAdminPlansQuery, useCreatePlanMutation, useUpdatePlanMutation } = adminPlansApi;
