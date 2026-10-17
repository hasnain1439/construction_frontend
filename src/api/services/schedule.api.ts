import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST } from "@/api/tags";
import { cleanParams } from "@/api/transform";
import type {
  ApproveStoppageBody,
  GenerateScheduleBody,
  MilestoneDetail,
  MilestoneEditBody,
  MilestoneEditResult,
  MilestoneProgressBody,
  MilestoneProgressResult,
  PlanVersion,
  RejectStoppageBody,
  ReplanScheduleBody,
  ScheduleBaseline,
  ScheduleDelays,
  ScheduleDetail,
  ScheduleQuotas,
  Stoppage,
  StoppageApproveResult,
  StoppageBody,
  StoppageList,
  StoppageStatus,
} from "@/api/types";

/** Anything that moves the plan changes the Gantt, versions, delays, quotas and milestone details. */
const planChanged = (projectId: string) => [
  { type: "Schedule" as const, id: projectId },
  { type: "ScheduleVersions" as const, id: projectId },
  { type: "ScheduleDelays" as const, id: projectId },
  { type: "ScheduleQuotas" as const, id: projectId },
  { type: "Milestones" as const, id: LIST },
  // Progress and dates feed the control figures and alerts (QA-B-10: a stale overuse alert next to a fresh table).
  { type: "Control" as const, id: projectId },
  { type: "ControlAlerts" as const, id: LIST },
  "Dashboard" as const,
];
const stoppagesChanged = (projectId: string) => [
  ...planChanged(projectId),
  { type: "Stoppages" as const, id: projectId },
];

export const scheduleApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSchedule: build.query<ScheduleDetail, string>({
      query: (projectId) => ENDPOINTS.schedule.detail(projectId),
      providesTags: (_r, _e, projectId) => [{ type: "Schedule", id: projectId }],
    }),
    generateSchedule: build.mutation<ScheduleDetail, { projectId: string; body: GenerateScheduleBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.schedule.generate(projectId), method: "POST", body }),
      invalidatesTags: (_r, _e, { projectId }) => stoppagesChanged(projectId),
    }),
    replanSchedule: build.mutation<ScheduleDetail, { projectId: string; body: ReplanScheduleBody }>({
      query: ({ projectId, body }) => ({ url: ENDPOINTS.schedule.replan(projectId), method: "POST", body }),
      invalidatesTags: (_r, _e, { projectId }) => planChanged(projectId),
    }),
    getScheduleBaseline: build.query<ScheduleBaseline, string>({
      query: (projectId) => ENDPOINTS.schedule.baseline(projectId),
      providesTags: (_r, _e, projectId) => [{ type: "ScheduleVersions", id: projectId }],
    }),
    getScheduleVersions: build.query<PlanVersion[], string>({
      query: (projectId) => ENDPOINTS.schedule.versions(projectId),
      providesTags: (_r, _e, projectId) => [{ type: "ScheduleVersions", id: projectId }],
    }),
    getScheduleDelays: build.query<ScheduleDelays, string>({
      query: (projectId) => ENDPOINTS.schedule.delays(projectId),
      providesTags: (_r, _e, projectId) => [{ type: "ScheduleDelays", id: projectId }],
    }),
    getScheduleQuotas: build.query<ScheduleQuotas, string>({
      query: (projectId) => ENDPOINTS.schedule.quotas(projectId),
      providesTags: (_r, _e, projectId) => [{ type: "ScheduleQuotas", id: projectId }],
    }),
    getMilestone: build.query<MilestoneDetail, string>({
      query: (milestoneId) => ENDPOINTS.schedule.milestone(milestoneId),
      providesTags: (_r, _e, id) => [
        { type: "Milestones", id },
        { type: "Milestones", id: LIST },
      ],
    }),
    /** The Gantt drag / date field. `dryRun: true` previews the shifts without saving (no cache change). */
    updateMilestone: build.mutation<
      MilestoneEditResult,
      { id: string; projectId: string; body: MilestoneEditBody }
    >({
      query: ({ id, body }) => ({ url: ENDPOINTS.schedule.milestone(id), method: "PATCH", body }),
      invalidatesTags: (_r, error, { projectId, body }) =>
        body.dryRun || error ? [] : planChanged(projectId),
    }),
    updateMilestoneProgress: build.mutation<
      MilestoneProgressResult,
      { id: string; projectId: string; body: MilestoneProgressBody }
    >({
      query: ({ id, body }) => ({ url: ENDPOINTS.schedule.milestoneProgress(id), method: "POST", body }),
      invalidatesTags: (_r, error, { id, projectId }) => (error ? [] : [...planChanged(projectId), { type: "Milestones" as const, id }]),
      // QA-A-08: show the saved progress at once (the panel and the Gantt row), before the refetch lands.
      async onQueryStarted({ id, projectId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(scheduleApi.util.updateQueryData("getMilestone", id, (d) => ({ ...d, ...data.milestone, updates: d.updates })));
          dispatch(
            scheduleApi.util.updateQueryData("getSchedule", projectId, (d) => {
              d.milestones = d.milestones.map((m) => (m.id === id ? { ...m, ...data.milestone } : m));
            }),
          );
        } catch {
          // the error toast comes from the caller
        }
      },
    }),
    getStoppages: build.query<StoppageList, { projectId: string; status?: StoppageStatus }>({
      query: ({ projectId, status }) => ({
        url: ENDPOINTS.schedule.stoppages(projectId),
        params: cleanParams({ status }),
      }),
      providesTags: (_r, _e, { projectId }) => [{ type: "Stoppages", id: projectId }],
    }),
    createStoppage: build.mutation<Stoppage, { projectId: string; body: StoppageBody }>({
      query: ({ projectId, body }) => ({
        url: ENDPOINTS.schedule.stoppages(projectId),
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { projectId }) => stoppagesChanged(projectId),
    }),
    approveStoppage: build.mutation<
      StoppageApproveResult,
      { id: string; projectId: string; body: ApproveStoppageBody }
    >({
      query: ({ id, body }) => ({ url: ENDPOINTS.schedule.stoppageApprove(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { projectId }) => stoppagesChanged(projectId),
    }),
    rejectStoppage: build.mutation<Stoppage, { id: string; projectId: string; body: RejectStoppageBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.schedule.stoppageReject(id), method: "POST", body }),
      invalidatesTags: (_r, _e, { projectId }) => stoppagesChanged(projectId),
    }),
  }),
});

export const {
  useGetScheduleQuery,
  useGenerateScheduleMutation,
  useReplanScheduleMutation,
  useGetScheduleBaselineQuery,
  useGetScheduleVersionsQuery,
  useGetScheduleDelaysQuery,
  useGetScheduleQuotasQuery,
  useGetMilestoneQuery,
  useUpdateMilestoneMutation,
  useUpdateMilestoneProgressMutation,
  useGetStoppagesQuery,
  useCreateStoppageMutation,
  useApproveStoppageMutation,
  useRejectStoppageMutation,
} = scheduleApi;
