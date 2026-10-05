import { adminBaseApi } from "@/api/adminBaseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams } from "@/api/transform";
import type {
  AdminHolidaysQuery,
  CreatePlatformHolidayBody,
  PlatformHoliday,
  UpdatePlatformHolidayBody,
} from "@/api/types";

export const adminHolidaysApi = adminBaseApi.injectEndpoints({
  endpoints: (build) => ({
    getPlatformHolidays: build.query<PlatformHoliday[], AdminHolidaysQuery | void>({
      query: (params) => ({ url: ENDPOINTS.admin.holidays, params: cleanParams(params ?? undefined) }),
      providesTags: (rows) => providesList(rows, "AdminHolidays"),
    }),
    createPlatformHoliday: build.mutation<PlatformHoliday, CreatePlatformHolidayBody>({
      query: (body) => ({ url: ENDPOINTS.admin.holidays, method: "POST", body }),
      invalidatesTags: [{ type: "AdminHolidays", id: LIST }],
    }),
    updatePlatformHoliday: build.mutation<PlatformHoliday, { id: string; body: UpdatePlatformHolidayBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.admin.holidayById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "AdminHolidays", id },
        { type: "AdminHolidays", id: LIST },
      ],
    }),
    deletePlatformHoliday: build.mutation<unknown, string>({
      query: (id) => ({ url: ENDPOINTS.admin.holidayById(id), method: "DELETE" }),
      invalidatesTags: [{ type: "AdminHolidays", id: LIST }],
    }),
  }),
});

export const {
  useGetPlatformHolidaysQuery,
  useCreatePlatformHolidayMutation,
  useUpdatePlatformHolidayMutation,
  useDeletePlatformHolidayMutation,
} = adminHolidaysApi;
