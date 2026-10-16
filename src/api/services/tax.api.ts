import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import type { ClientPayment, ProjectTax, ProjectTaxBody, TaxSettings, TaxSettingsBody, WhtCertificateBody } from "@/api/types";

/** Step 18 · tax: company settings, project override, WHT certificate on a payment. */
export const taxApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTaxSettings: build.query<TaxSettings, void>({
      query: () => ENDPOINTS.tax.settings,
      providesTags: ["TaxSettings"],
    }),
    updateTaxSettings: build.mutation<TaxSettings, TaxSettingsBody>({
      query: (body) => ({ url: ENDPOINTS.tax.settings, method: "PATCH", body }),
      // Drafts are recalculated on the server; the legacy company settings mirror the switch.
      invalidatesTags: ["TaxSettings", "ProjectTax", "Invoices", "CompanySettings"],
    }),
    getProjectTax: build.query<ProjectTax, string>({
      query: (projectId) => ENDPOINTS.tax.project(projectId),
      providesTags: (_r, _e, projectId) => [{ type: "ProjectTax", id: projectId }],
    }),
    updateProjectTax: build.mutation<ProjectTax, { projectId: string; body: ProjectTaxBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.tax.project(projectId), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { projectId }) => [{ type: "ProjectTax", id: projectId }, "Invoices"],
    }),
    setWhtCertificate: build.mutation<ClientPayment, { id: string; body: WhtCertificateBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.tax.whtCertificate(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "ClientPayments", id }, { type: "ClientPayments", id: "LIST" }, { type: "Reports", id: "wht-summary" }],
    }),
  }),
});

export const { useGetTaxSettingsQuery, useUpdateTaxSettingsMutation, useGetProjectTaxQuery, useUpdateProjectTaxMutation, useSetWhtCertificateMutation } = taxApi;
