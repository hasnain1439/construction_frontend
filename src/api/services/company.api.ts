import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams } from "@/api/transform";
import type {
  Company,
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
      invalidatesTags: ["CompanySettings"],
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
} = companyApi;
