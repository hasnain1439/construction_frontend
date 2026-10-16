import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { cleanParams } from "@/api/transform";
import type {
  BurnRate,
  ControlAlert,
  ControlSettings,
  ControlSettingsBody,
  CostVariance,
  DelayAnalysis,
  MaterialVariance,
  RunAlertsBody,
  RunAlertsResult,
} from "@/api/types";

/** Step 14 · control: variance, burn rate, delay analysis, alerts and thresholds. */
export const controlApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMaterialVariance: build.query<MaterialVariance, { projectId: string; milestoneId?: string }>({
      query: ({ projectId, milestoneId }) => ({ url: ENDPOINTS.control.materialVariance(projectId), params: cleanParams({ milestoneId }) }),
      providesTags: (_r, _e, { projectId }) => [{ type: "Control", id: projectId }],
    }),
    getCostVariance: build.query<CostVariance, string>({
      query: (projectId) => ENDPOINTS.control.costVariance(projectId),
      providesTags: (_r, _e, projectId) => [{ type: "Control", id: projectId }],
    }),
    getBurnRate: build.query<BurnRate, string>({
      query: (projectId) => ENDPOINTS.control.burnRate(projectId),
      providesTags: (_r, _e, projectId) => [{ type: "Control", id: projectId }],
    }),
    getDelayAnalysis: build.query<DelayAnalysis, string>({
      query: (projectId) => ENDPOINTS.control.delayAnalysis(projectId),
      providesTags: (_r, _e, projectId) => [
        { type: "Control", id: projectId },
        { type: "ScheduleDelays", id: projectId },
      ],
    }),
    getProjectControlAlerts: build.query<{ items: ControlAlert[] }, { projectId: string; status?: "OPEN" | "RESOLVED" | "ALL" }>({
      query: ({ projectId, status }) => ({ url: ENDPOINTS.control.projectAlerts(projectId), params: cleanParams({ status }) }),
      providesTags: [{ type: "ControlAlerts", id: "LIST" }],
    }),
    getControlSettings: build.query<ControlSettings, void>({
      query: () => ENDPOINTS.control.settings,
      providesTags: ["ControlSettings"],
    }),
    updateControlSettings: build.mutation<ControlSettings, ControlSettingsBody>({
      query: (body) => ({ url: ENDPOINTS.control.settings, method: "PUT", body }),
      invalidatesTags: ["ControlSettings", "CompanySettings", "Control"],
    }),
    runControlAlerts: build.mutation<RunAlertsResult, RunAlertsBody>({
      query: (body) => ({ url: ENDPOINTS.control.run, method: "POST", body }),
      invalidatesTags: [{ type: "ControlAlerts", id: "LIST" }, "Dashboard", "Notifications"],
    }),
  }),
});

export const {
  useGetMaterialVarianceQuery,
  useGetCostVarianceQuery,
  useGetBurnRateQuery,
  useGetDelayAnalysisQuery,
  useGetProjectControlAlertsQuery,
  useGetControlSettingsQuery,
  useUpdateControlSettingsMutation,
  useRunControlAlertsMutation,
} = controlApi;
