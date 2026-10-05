import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  CancelInvitationResult,
  CreateInvitationBody,
  DeviceRow,
  Invitation,
  InvitationSent,
  InvitationsQuery,
  PageQuery,
  Paginated,
  RevokeDeviceResult,
  SetUserProjectsBody,
  TeamUser,
  TeamUserDetail,
  UpdateUserBody,
  UsersQuery,
  UsersUsage,
} from "@/api/types";

export const teamApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ─── Users ─────────────────────────────────────────────────────────────
    getUsers: build.query<Paginated<TeamUser, UsersUsage>, UsersQuery | void>({
      query: (params) => ({ url: ENDPOINTS.users.list, params: cleanParams(params ?? undefined) }),
      transformResponse: (data, meta) => toPage<TeamUser, UsersUsage>(data, meta),
      providesTags: (page) => providesList(page?.items, "Users"),
    }),
    getUser: build.query<TeamUserDetail, string>({
      query: (id) => ENDPOINTS.users.byId(id),
      providesTags: (_r, _e, id) => [{ type: "Users", id }],
    }),
    updateUser: build.mutation<TeamUserDetail, { id: string; body: UpdateUserBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.users.byId(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Users", id }, { type: "Users", id: LIST }, "Subscription"],
    }),
    setUserProjects: build.mutation<TeamUserDetail, { id: string; body: SetUserProjectsBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.users.projects(id), method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Users", id }, { type: "Users", id: LIST }, "Projects"],
    }),
    deactivateUser: build.mutation<TeamUserDetail, string>({
      query: (id) => ({ url: ENDPOINTS.users.byId(id), method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Users", id },
        { type: "Users", id: LIST },
        { type: "Devices", id: LIST },
        "Subscription",
      ],
    }),
    reactivateUser: build.mutation<TeamUserDetail, string>({
      query: (id) => ({ url: ENDPOINTS.users.reactivate(id), method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Users", id }, { type: "Users", id: LIST }, "Subscription"],
    }),

    // ─── Invitations ───────────────────────────────────────────────────────
    getInvitations: build.query<Paginated<Invitation>, InvitationsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.invitations.list, params: cleanParams(params ?? undefined) }),
      transformResponse: (data, meta) => toPage<Invitation>(data, meta),
      providesTags: (page) => providesList(page?.items, "Invitations"),
    }),
    createInvitation: build.mutation<InvitationSent, CreateInvitationBody>({
      query: (body) => ({ url: ENDPOINTS.invitations.list, method: "POST", body }),
      invalidatesTags: [{ type: "Invitations", id: LIST }, { type: "Users", id: LIST }, "Subscription"],
    }),
    resendInvitation: build.mutation<InvitationSent, string>({
      query: (id) => ({ url: ENDPOINTS.invitations.resend(id), method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Invitations", id }, { type: "Invitations", id: LIST }],
    }),
    cancelInvitation: build.mutation<CancelInvitationResult, string>({
      query: (id) => ({ url: ENDPOINTS.invitations.byId(id), method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Invitations", id },
        { type: "Invitations", id: LIST },
        { type: "Users", id: LIST },
        "Subscription",
      ],
    }),

    // ─── Devices ───────────────────────────────────────────────────────────
    getDevices: build.query<Paginated<DeviceRow>, PageQuery | void>({
      query: (params) => ({ url: ENDPOINTS.devices.list, params: cleanParams(params ?? undefined) }),
      transformResponse: (data, meta) => toPage<DeviceRow>(data, meta),
      providesTags: (page) => providesList(page?.items, "Devices"),
    }),
    revokeDevice: build.mutation<RevokeDeviceResult, string>({
      query: (id) => ({ url: ENDPOINTS.devices.byId(id), method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Devices", id }, { type: "Devices", id: LIST }],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useUpdateUserMutation,
  useSetUserProjectsMutation,
  useDeactivateUserMutation,
  useReactivateUserMutation,
  useGetInvitationsQuery,
  useCreateInvitationMutation,
  useResendInvitationMutation,
  useCancelInvitationMutation,
  useGetDevicesQuery,
  useRevokeDeviceMutation,
} = teamApi;
