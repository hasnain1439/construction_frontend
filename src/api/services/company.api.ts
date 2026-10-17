import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  Company,
  CompanyAuditEntry,
  CompanyAuditQuery,
  Paginated,
  CompanySettings,
  CreateHolidayBody,
  Holiday,
  HolidaysQuery,
  UpdateCompanyBody,
  UpdateSettingsBody,
} from "@/api/types";

export const companyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCompany: build.query<Company, void>({
      query: () => ENDPOINTS.company.profile,
      providesTags: ["Company"],
    }),
    updateCompany: build.mutation<Company, UpdateCompanyBody>({
      query: (body) => ({ url: ENDPOINTS.company.profile, method: "PATCH", body }),
      // Name / logo / region also appear in the /auth/me snapshot.
      invalidatesTags: ["Company", "Me"],
    }),
    getCompanySettings: build.query<CompanySettings, void>({
      query: () => ENDPOINTS.company.settings,
      providesTags: ["CompanySettings"],
    }),
    updateCompanySettings: build.mutation<CompanySettings, UpdateSettingsBody>({
      query: (body) => ({ url: ENDPOINTS.company.settings, method: "PATCH", body }),
      // The idle threshold and the shuttering planner parameters live in the settings.
      invalidatesTags: ["CompanySettings", "ShutteringDemand", "EquipmentIdle"],
    }),
    getHolidays: build.query<Holiday[], HolidaysQuery | void>({
      query: (params) => ({ url: ENDPOINTS.company.holidays, params: cleanParams(params ?? undefined) }),
      providesTags: (rows) => providesList(rows, "Holidays"),
    }),
    createHoliday: build.mutation<Holiday, CreateHolidayBody>({
      query: (body) => ({ url: ENDPOINTS.company.holidays, method: "POST", body }),
      invalidatesTags: [{ type: "Holidays", id: LIST }],
    }),
    deleteHoliday: build.mutation<{ deleted: true }, string>({
      query: (id) => ({ url: ENDPOINTS.company.holidayById(id), method: "DELETE" }),
      invalidatesTags: [{ type: "Holidays", id: LIST }],
    }),
    // Who changed what — including platform support sessions (owner only).
    getCompanyAuditLogs: build.query<Paginated<CompanyAuditEntry>, CompanyAuditQuery | void>({
      query: (params) => ({ url: ENDPOINTS.company.auditLogs, params: cleanParams(params ?? undefined) }),
      transformResponse: (data, meta) => toPage<CompanyAuditEntry>(data, meta),
      providesTags: (page) => providesList(page?.items, "CompanyAudit"),
    }),
  }),
});

export const {
  useGetCompanyQuery,
  useUpdateCompanyMutation,
  useGetCompanySettingsQuery,
  useUpdateCompanySettingsMutation,
  useGetHolidaysQuery,
  useCreateHolidayMutation,
  useDeleteHolidayMutation,
  useGetCompanyAuditLogsQuery,
} = companyApi;
