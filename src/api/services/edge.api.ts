import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import type { OfficeDeviceApproval, OfficeDevices, SyncProblems } from "@/api/types";

/** Offline office: office PCs waiting for / holding approval, and sync problems on the office PC. */
export const edgeApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOfficeDevices: build.query<OfficeDevices, void>({
      query: () => ENDPOINTS.edge.devices,
      providesTags: ["OfficeDevices"],
    }),
    approveOfficeDevice: build.mutation<OfficeDeviceApproval, string>({
      query: (id) => ({ url: ENDPOINTS.edge.deviceApprove(id), method: "POST" }),
      invalidatesTags: ["OfficeDevices"],
    }),
    revokeOfficeDevice: build.mutation<OfficeDeviceApproval, string>({
      query: (id) => ({ url: ENDPOINTS.edge.deviceRevoke(id), method: "POST" }),
      invalidatesTags: ["OfficeDevices"],
    }),
    getSyncProblems: build.query<SyncProblems, void>({
      query: () => ENDPOINTS.edge.problems,
      providesTags: ["SyncProblems"],
    }),
  }),
});

export const {
  useGetOfficeDevicesQuery,
  useApproveOfficeDeviceMutation,
  useRevokeOfficeDeviceMutation,
  useGetSyncProblemsQuery,
} = edgeApi;
