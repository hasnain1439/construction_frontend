import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import type {
  CreateRoleBody,
  DuplicateRoleBody,
  PermissionCatalog,
  PermissionRole,
  SetOverridesBody,
  SetRolePermissionsBody,
  SetUserRoleBody,
  UpdateRoleBody,
  UserPermissions,
} from "@/api/types";

/**
 * Roles & permissions (PERMISSIONS_API.md §3). Everything except the catalogue needs
 * THEKEDAR or `team.member.manage`. A change to a role, a user's role or overrides can change
 * what the signed-in user may do, so those mutations also refresh `/auth/me`.
 */
export const permissionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPermissionCatalog: build.query<PermissionCatalog, void>({
      query: () => ENDPOINTS.permissions.catalog,
      providesTags: ["PermissionCatalog"],
      // The catalogue only changes with a deploy.
      keepUnusedDataFor: 3600,
    }),

    // ─── Role templates ────────────────────────────────────────────────────
    getRoles: build.query<PermissionRole[], void>({
      query: () => ENDPOINTS.roles.list,
      providesTags: (rows) => providesList(rows, "Roles"),
    }),
    getRole: build.query<PermissionRole, string>({
      query: (id) => ENDPOINTS.roles.byId(id),
      providesTags: (_r, _e, id) => [{ type: "Roles", id }],
    }),
    createRole: build.mutation<PermissionRole, CreateRoleBody>({
      query: (body) => ({ url: ENDPOINTS.roles.list, method: "POST", body }),
      invalidatesTags: [{ type: "Roles", id: LIST }],
    }),
    duplicateRole: build.mutation<PermissionRole, { id: string; body?: DuplicateRoleBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.roles.duplicate(id), method: "POST", body: body ?? {} }),
      invalidatesTags: [{ type: "Roles", id: LIST }],
    }),
    updateRole: build.mutation<PermissionRole, { id: string; body: UpdateRoleBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.roles.byId(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Roles", id },
        { type: "Roles", id: LIST },
        { type: "Users", id: LIST },
      ],
    }),
    setRolePermissions: build.mutation<PermissionRole, { id: string; body: SetRolePermissionsBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.roles.permissions(id), method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Roles", id },
        { type: "Roles", id: LIST },
        "UserPermissions",
        "Me",
      ],
    }),

    // ─── A member's permissions ────────────────────────────────────────────
    getUserPermissions: build.query<UserPermissions, string>({
      query: (userId) => ENDPOINTS.users.permissions(userId),
      providesTags: (_r, _e, userId) => [{ type: "UserPermissions", id: userId }],
    }),
    setUserOverrides: build.mutation<UserPermissions, { userId: string; body: SetOverridesBody }>({
      query: ({ userId, body }) => ({
        url: ENDPOINTS.users.permissionOverrides(userId),
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { userId }) => [
        { type: "UserPermissions", id: userId },
        { type: "Users", id: userId },
        { type: "Users", id: LIST },
        "Me",
      ],
    }),
    setUserRole: build.mutation<UserPermissions, { userId: string; body: SetUserRoleBody }>({
      query: ({ userId, body }) => ({ url: ENDPOINTS.users.role(userId), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { userId }) => [
        { type: "UserPermissions", id: userId },
        { type: "Users", id: userId },
        { type: "Users", id: LIST },
        { type: "Roles", id: LIST },
        "Me",
      ],
    }),
  }),
});

export const {
  useGetPermissionCatalogQuery,
  useGetRolesQuery,
  useGetRoleQuery,
  useCreateRoleMutation,
  useDuplicateRoleMutation,
  useUpdateRoleMutation,
  useSetRolePermissionsMutation,
  useGetUserPermissionsQuery,
  useSetUserOverridesMutation,
  useSetUserRoleMutation,
} = permissionsApi;
