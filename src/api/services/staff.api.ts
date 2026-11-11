import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  StaffAttendanceDay,
  StaffAttendanceMonth,
  MarkStaffAttendanceBody,
  StaffDesignation,
  Paginated,
  SalaryPayment,
  SalaryPaymentBody,
  SalarySheet,
  StaffAdvance,
  StaffAdvanceBody,
  StaffBody,
  StaffDetail,
  StaffListMeta,
  StaffMember,
  StaffPatch,
  StaffQuery,
} from "@/api/types";

const STAFF_LIST = { type: "Staff" as const, id: LIST };
/** Paying moves office expenses and company account balances too. */
const MONEY = [
  STAFF_LIST,
  "SalarySheet" as const,
  { type: "OfficeExpenses" as const, id: LIST },
  { type: "CompanyAccounts" as const, id: LIST },
];

/** Office staff on a monthly salary: list, advances, salaries and the monthly sheet. */
export const staffApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStaff: build.query<Paginated<StaffMember, StaffListMeta>, StaffQuery | void>({
      query: (params) => ({ url: ENDPOINTS.staff.list, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<StaffMember, StaffListMeta>,
      providesTags: (page) => providesList(page?.items, "Staff"),
    }),
    getStaffMember: build.query<StaffDetail, string>({
      query: (id) => ENDPOINTS.staff.byId(id),
      providesTags: (_r, _e, id) => [{ type: "Staff", id }],
    }),
    createStaff: build.mutation<StaffMember, StaffBody>({
      query: (body) => ({ url: ENDPOINTS.staff.list, method: "POST", body }),
      invalidatesTags: [STAFF_LIST, "SalarySheet"],
    }),
    updateStaff: build.mutation<StaffMember, { id: string; body: StaffPatch }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.staff.byId(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Staff", id }, STAFF_LIST, "SalarySheet"],
    }),
    giveStaffAdvance: build.mutation<StaffAdvance, { staffId: string; body: StaffAdvanceBody }>({
      query: ({ staffId, body }) => ({ url: ENDPOINTS.staff.advances(staffId), method: "POST", body }),
      invalidatesTags: (_r, _e, { staffId }) => [{ type: "Staff", id: staffId }, ...MONEY],
    }),
    deleteStaffAdvance: build.mutation<{ deleted: true }, { id: string; staffId: string }>({
      query: ({ id }) => ({ url: ENDPOINTS.staff.advanceById(id), method: "DELETE" }),
      invalidatesTags: (_r, _e, { staffId }) => [{ type: "Staff", id: staffId }, ...MONEY],
    }),
    paySalary: build.mutation<SalaryPayment, { staffId: string; body: SalaryPaymentBody }>({
      query: ({ staffId, body }) => ({ url: ENDPOINTS.staff.salaries(staffId), method: "POST", body }),
      invalidatesTags: (_r, _e, { staffId }) => [{ type: "Staff", id: staffId }, ...MONEY],
    }),
    deleteSalary: build.mutation<{ deleted: true }, { id: string; staffId: string }>({
      query: ({ id }) => ({ url: ENDPOINTS.staff.salaryById(id), method: "DELETE" }),
      invalidatesTags: (_r, _e, { staffId }) => [{ type: "Staff", id: staffId }, ...MONEY],
    }),
    getSalarySheet: build.query<SalarySheet, string>({
      query: (month) => ({ url: ENDPOINTS.staff.salarySheet, params: { month } }),
      providesTags: ["SalarySheet"],
    }),

    // The company's own list of jobs. A rename shows on the staff too.
    getStaffDesignations: build.query<StaffDesignation[], void>({
      query: () => ENDPOINTS.staff.designations,
      providesTags: ["StaffDesignations"],
    }),
    createStaffDesignation: build.mutation<StaffDesignation, { name: string }>({
      query: (body) => ({ url: ENDPOINTS.staff.designations, method: "POST", body }),
      invalidatesTags: ["StaffDesignations"],
    }),
    renameStaffDesignation: build.mutation<StaffDesignation, { id: string; name: string }>({
      query: ({ id, name }) => ({ url: ENDPOINTS.staff.designationById(id), method: "PATCH", body: { name } }),
      invalidatesTags: ["StaffDesignations", "Staff", "SalarySheet", "StaffAttendance"],
    }),
    deleteStaffDesignation: build.mutation<{ deleted: true }, string>({
      query: (id) => ({ url: ENDPOINTS.staff.designationById(id), method: "DELETE" }),
      invalidatesTags: ["StaffDesignations"],
    }),

    // Attendance: a day to mark, a month to check.
    getStaffAttendanceDay: build.query<StaffAttendanceDay, string>({
      query: (date) => ({ url: ENDPOINTS.staff.attendance, params: { date } }),
      providesTags: ["StaffAttendance"],
    }),
    markStaffAttendance: build.mutation<StaffAttendanceDay, MarkStaffAttendanceBody>({
      query: (body) => ({ url: ENDPOINTS.staff.attendance, method: "PUT", body }),
      invalidatesTags: ["StaffAttendance", "SalarySheet"],
    }),
    getStaffAttendanceMonth: build.query<StaffAttendanceMonth, { month: string; staffId?: string }>({
      query: (params) => ({ url: ENDPOINTS.staff.attendanceMonth, params: cleanParams(params) }),
      providesTags: ["StaffAttendance"],
    }),
  }),
});

export const {
  useGetStaffQuery,
  useGetStaffMemberQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useGiveStaffAdvanceMutation,
  useDeleteStaffAdvanceMutation,
  usePaySalaryMutation,
  useDeleteSalaryMutation,
  useGetSalarySheetQuery,
  useGetStaffDesignationsQuery,
  useCreateStaffDesignationMutation,
  useRenameStaffDesignationMutation,
  useDeleteStaffDesignationMutation,
  useGetStaffAttendanceDayQuery,
  useMarkStaffAttendanceMutation,
  useGetStaffAttendanceMonthQuery,
} = staffApi;
