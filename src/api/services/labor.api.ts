import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  Advance,
  AdvanceBody,
  AdvancesQuery,
  AssignSubcontractBody,
  AssignWorkerBody,
  AttendanceBody,
  AttendanceGrid,
  AttendanceQuery,
  AttendanceResult,
  DeductionBody,
  LaborOverview,
  LineBody,
  MeasurementBody,
  MeasurementsQuery,
  Paginated,
  PayWagesBody,
  ProgressBody,
  ProjectWorker,
  Settlement,
  SettlementsQuery,
  SubcontractAccounts,
  SubcontractAssignment,
  SubcontractLedger,
  SubcontractPaymentBody,
  SubcontractorLaborSummary,
  TodayAttendance,
  UpdateProjectWorkerBody,
  UpdateSubcontractBody,
  WorkerLaborSummary,
  WorkMeasurement,
} from "@/api/types";

/** Money leaving / entering site cash refreshes the cash book. */
export const CASH_CHANGED = [
  { type: "CashAccounts" as const, id: LIST },
  { type: "CashEntries" as const, id: LIST },
];

const settlementChanged = (id?: string) => [
  { type: "Settlements" as const, id: LIST },
  ...(id ? [{ type: "Settlements" as const, id }] : []),
  { type: "Attendance" as const, id: LIST },
  { type: "Advances" as const, id: LIST },
];

const accountChanged = [
  { type: "SubcontractAccounts" as const, id: LIST },
  { type: "Subcontracts" as const, id: LIST },
];

export const laborApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ─── Team on site ──────────────────────────────────────────────────────
    getProjectWorkers: build.query<ProjectWorker[], { projectId: string; active?: boolean }>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.labor.projectWorkers(projectId), params: cleanParams(params) }),
      providesTags: (rows) => providesList(rows, "ProjectWorkers"),
    }),
    assignWorker: build.mutation<ProjectWorker, { projectId: string; body: AssignWorkerBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.labor.projectWorkers(projectId), method: "POST", body }),
      invalidatesTags: [{ type: "ProjectWorkers", id: LIST }, { type: "Attendance", id: LIST }],
    }),
    updateProjectWorker: build.mutation<ProjectWorker, { id: string; body: UpdateProjectWorkerBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.labor.projectWorkerById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "ProjectWorkers", id }, { type: "ProjectWorkers", id: LIST }, { type: "Attendance", id: LIST }],
    }),
    removeProjectWorker: build.mutation<{ removed: boolean; deactivated: boolean; assignment: ProjectWorker | null }, string>({
      query: (id) => ({ url: ENDPOINTS.labor.projectWorkerById(id), method: "DELETE" }),
      invalidatesTags: [{ type: "ProjectWorkers", id: LIST }, { type: "Attendance", id: LIST }],
    }),
    getSubcontracts: build.query<SubcontractAssignment[], { projectId: string; active?: boolean }>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.labor.subcontracts(projectId), params: cleanParams(params) }),
      providesTags: (rows) => providesList(rows, "Subcontracts"),
    }),
    assignSubcontract: build.mutation<SubcontractAssignment, { projectId: string; body: AssignSubcontractBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.labor.subcontracts(projectId), method: "POST", body }),
      invalidatesTags: accountChanged,
    }),
    updateSubcontract: build.mutation<SubcontractAssignment, { id: string; body: UpdateSubcontractBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.labor.subcontractById(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Subcontracts", id }, ...accountChanged],
    }),

    // ─── Hazri ────────────────────────────────────────────────────────────
    getAttendance: build.query<AttendanceGrid, { projectId: string } & AttendanceQuery>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.labor.attendance(projectId), params: cleanParams(params) }),
      providesTags: [{ type: "Attendance", id: LIST }],
    }),
    getTodayAttendance: build.query<TodayAttendance, string>({
      query: (projectId) => ENDPOINTS.labor.attendanceToday(projectId),
      providesTags: [{ type: "Attendance", id: LIST }],
    }),
    markAttendance: build.mutation<AttendanceResult, { projectId: string; body: AttendanceBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.labor.attendance(projectId), method: "POST", body }),
      invalidatesTags: [{ type: "Attendance", id: LIST }],
    }),

    // ─── Measurements ─────────────────────────────────────────────────────
    getMeasurements: build.query<Paginated<WorkMeasurement, { pendingCount: number }>, { projectId: string } & MeasurementsQuery>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.labor.measurements(projectId), params: cleanParams(params) }),
      transformResponse: toPage<WorkMeasurement, { pendingCount: number }>,
      providesTags: (page) => providesList(page?.items, "Measurements"),
    }),
    recordMeasurement: build.mutation<WorkMeasurement, { projectId: string; body: MeasurementBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.labor.measurements(projectId), method: "POST", body }),
      invalidatesTags: [{ type: "Measurements", id: LIST }, ...accountChanged],
    }),
    verifyMeasurement: build.mutation<WorkMeasurement, string>({
      query: (id) => ({ url: ENDPOINTS.labor.measurementVerify(id), method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Measurements", id }, { type: "Measurements", id: LIST }, ...accountChanged],
    }),
    rejectMeasurement: build.mutation<WorkMeasurement, { id: string; note: string }>({
      query: ({ id, note }) => ({ url: ENDPOINTS.labor.measurementReject(id), method: "POST", body: { note } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Measurements", id }, { type: "Measurements", id: LIST }, ...accountChanged],
    }),

    // ─── Peshgi ───────────────────────────────────────────────────────────
    getAdvances: build.query<Paginated<Advance, { totalPaisa: string; outstandingPaisa: string }>, { projectId: string } & AdvancesQuery>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.labor.advances(projectId), params: cleanParams(params) }),
      transformResponse: toPage<Advance, { totalPaisa: string; outstandingPaisa: string }>,
      providesTags: (page) => providesList(page?.items, "Advances"),
    }),
    createAdvance: build.mutation<Advance, { projectId: string; body: AdvanceBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.labor.advances(projectId), method: "POST", body }),
      invalidatesTags: [{ type: "Advances", id: LIST }, { type: "Settlements", id: LIST }, ...accountChanged, ...CASH_CHANGED],
    }),

    // ─── Settlements ──────────────────────────────────────────────────────
    getProjectSettlements: build.query<Paginated<Settlement>, { projectId: string } & SettlementsQuery>({
      query: ({ projectId, ...params }) => ({ url: ENDPOINTS.labor.projectSettlements(projectId), params: cleanParams(params) }),
      transformResponse: toPage<Settlement>,
      providesTags: (page) => providesList(page?.items, "Settlements"),
    }),
    getSettlements: build.query<Paginated<Settlement>, SettlementsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.labor.settlements, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<Settlement>,
      providesTags: (page) => providesList(page?.items, "Settlements"),
    }),
    getSettlement: build.query<Settlement, string>({
      query: (id) => ENDPOINTS.labor.settlementById(id),
      providesTags: (_r, _e, id) => [{ type: "Settlements", id }],
    }),
    generateSettlement: build.mutation<Settlement, { projectId: string; weekStart: string }>({
      query: ({ projectId, weekStart }) => ({ url: ENDPOINTS.labor.generateSettlement(projectId), method: "POST", body: { weekStart } }),
      invalidatesTags: (r) => settlementChanged(r?.id),
    }),
    adjustSettlementLine: build.mutation<Settlement, { id: string; lineId: string; body: LineBody }>({
      query: ({ id, lineId, body }) => ({ url: ENDPOINTS.labor.settlementLine(id, lineId), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => settlementChanged(id),
    }),
    submitSettlement: build.mutation<Settlement, string>({
      query: (id) => ({ url: ENDPOINTS.labor.settlementSubmit(id), method: "POST" }),
      invalidatesTags: (_r, _e, id) => settlementChanged(id),
    }),
    approveSettlement: build.mutation<Settlement, string>({
      query: (id) => ({ url: ENDPOINTS.labor.settlementApprove(id), method: "POST" }),
      invalidatesTags: (_r, _e, id) => settlementChanged(id),
    }),
    returnSettlement: build.mutation<Settlement, { id: string; comment: string }>({
      query: ({ id, comment }) => ({ url: ENDPOINTS.labor.settlementReturn(id), method: "POST", body: { comment } }),
      invalidatesTags: (_r, _e, { id }) => settlementChanged(id),
    }),
    paySettlement: build.mutation<Settlement, { id: string; body: PayWagesBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.labor.settlementPay(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [...settlementChanged(id), ...CASH_CHANGED],
    }),

    // ─── Sub-contractor accounts ──────────────────────────────────────────
    getSubcontractAccounts: build.query<SubcontractAccounts, string>({
      query: (projectId) => ENDPOINTS.labor.subcontractAccounts(projectId),
      providesTags: [{ type: "SubcontractAccounts", id: LIST }],
    }),
    getSubcontractLedger: build.query<SubcontractLedger, string>({
      query: (id) => ENDPOINTS.labor.subcontractLedger(id),
      providesTags: (_r, _e, id) => [{ type: "SubcontractAccounts", id }, { type: "SubcontractAccounts", id: LIST }],
    }),
    postProgress: build.mutation<SubcontractLedger, { id: string; body: ProgressBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.labor.subcontractProgress(id), method: "POST", body }),
      invalidatesTags: accountChanged,
    }),
    paySubcontractor: build.mutation<SubcontractLedger, { id: string; body: SubcontractPaymentBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.labor.subcontractPayments(id), method: "POST", body }),
      invalidatesTags: [...accountChanged, ...CASH_CHANGED],
    }),
    deductSubcontractor: build.mutation<SubcontractLedger, { id: string; body: DeductionBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.labor.subcontractDeductions(id), method: "POST", body }),
      invalidatesTags: accountChanged,
    }),

    // ─── Office overview ──────────────────────────────────────────────────
    getLaborOverview: build.query<LaborOverview, void>({
      query: () => ENDPOINTS.labor.overview,
      providesTags: [
        { type: "Attendance", id: LIST },
        { type: "Settlements", id: LIST },
        { type: "Advances", id: LIST },
        { type: "Measurements", id: LIST },
        { type: "CashAccounts", id: LIST },
        { type: "CashEntries", id: LIST },
        { type: "Topups", id: LIST },
      ],
    }),
    getWorkerSummary: build.query<WorkerLaborSummary, string>({
      query: (workerId) => ENDPOINTS.labor.workerSummary(workerId),
      providesTags: [{ type: "ProjectWorkers", id: LIST }, { type: "Settlements", id: LIST }, { type: "Advances", id: LIST }],
    }),
    getSubcontractorSummary: build.query<SubcontractorLaborSummary, string>({
      query: (subcontractorId) => ENDPOINTS.labor.subcontractorSummary(subcontractorId),
      providesTags: [{ type: "SubcontractAccounts", id: LIST }],
    }),
  }),
});

export const {
  useGetProjectWorkersQuery,
  useAssignWorkerMutation,
  useUpdateProjectWorkerMutation,
  useRemoveProjectWorkerMutation,
  useGetSubcontractsQuery,
  useAssignSubcontractMutation,
  useUpdateSubcontractMutation,
  useGetAttendanceQuery,
  useGetTodayAttendanceQuery,
  useMarkAttendanceMutation,
  useGetMeasurementsQuery,
  useRecordMeasurementMutation,
  useVerifyMeasurementMutation,
  useRejectMeasurementMutation,
  useGetAdvancesQuery,
  useCreateAdvanceMutation,
  useGetProjectSettlementsQuery,
  useGetSettlementsQuery,
  useGetSettlementQuery,
  useGenerateSettlementMutation,
  useAdjustSettlementLineMutation,
  useSubmitSettlementMutation,
  useApproveSettlementMutation,
  useReturnSettlementMutation,
  usePaySettlementMutation,
  useGetSubcontractAccountsQuery,
  useGetSubcontractLedgerQuery,
  usePostProgressMutation,
  usePaySubcontractorMutation,
  useDeductSubcontractorMutation,
  useGetLaborOverviewQuery,
  useGetWorkerSummaryQuery,
  useGetSubcontractorSummaryQuery,
} = laborApi;
