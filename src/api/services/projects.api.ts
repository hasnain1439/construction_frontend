import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type {
  ChangeStatusBody,
  CopyFloorBody,
  CreateOpeningBody,
  CreateProjectBody,
  CreateRoomBody,
  Deleted,
  FloorWithRooms,
  Paginated,
  ProjectDetail,
  ProjectFloors,
  ProjectListItem,
  ProjectReview,
  ProjectsQuery,
  Room,
  SetTeamBody,
  SupplyPreset,
  UpdateBasicBody,
  UpdateContractBody,
  UpdateCoverageBody,
  UpdateOpeningBody,
  UpdatePlotStructureBody,
  UpdateRoomBody,
} from "@/api/types";

/** Everything a wizard save can change about one project. */
const projectChanged = (id: string) => [
  { type: "Projects" as const, id },
  { type: "Projects" as const, id: LIST },
  { type: "ProjectReview" as const, id },
];
/** Rooms / openings change floor totals, project totals and the review. */
const roomsChanged = (projectId: string) => [
  { type: "Floors" as const, id: projectId },
  { type: "Projects" as const, id: projectId },
  { type: "ProjectReview" as const, id: projectId },
];

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjects: build.query<Paginated<ProjectListItem>, ProjectsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.projects.list, params: cleanParams(params ?? undefined) }),
      transformResponse: (data, meta) => toPage<ProjectListItem>(data, meta),
      providesTags: (page) => providesList(page?.items, "Projects"),
    }),
    getProject: build.query<ProjectDetail, string>({
      query: (id) => ENDPOINTS.projects.byId(id),
      providesTags: (_r, _e, id) => [{ type: "Projects", id }],
    }),
    createProject: build.mutation<ProjectDetail, CreateProjectBody>({
      query: (body) => ({ url: ENDPOINTS.projects.list, method: "POST", body }),
      invalidatesTags: [{ type: "Projects", id: LIST }, { type: "Clients", id: LIST }],
    }),
    deleteProject: build.mutation<Deleted, string>({
      query: (id) => ({ url: ENDPOINTS.projects.byId(id), method: "DELETE" }),
      invalidatesTags: [{ type: "Projects", id: LIST }, { type: "Clients", id: LIST }],
    }),
    updateBasic: build.mutation<ProjectDetail, { id: string; body: UpdateBasicBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.projects.basic(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [...projectChanged(id), { type: "Clients", id: LIST }],
    }),
    setTeam: build.mutation<ProjectDetail, { id: string; body: SetTeamBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.projects.team(id), method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [...projectChanged(id), { type: "Users", id: LIST }],
    }),
    updateContract: build.mutation<ProjectDetail, { id: string; body: UpdateContractBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.projects.contract(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => projectChanged(id),
    }),
    updatePlotStructure: build.mutation<ProjectDetail, { id: string; body: UpdatePlotStructureBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.projects.plotStructure(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [...projectChanged(id), { type: "Floors", id }],
    }),
    updateCoverage: build.mutation<ProjectDetail, { id: string; body: UpdateCoverageBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.projects.coverage(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => projectChanged(id),
    }),
    getReview: build.query<ProjectReview, string>({
      query: (id) => ENDPOINTS.projects.review(id),
      providesTags: (_r, _e, id) => [{ type: "ProjectReview", id }],
    }),
    activateProject: build.mutation<ProjectDetail, string>({
      query: (id) => ({ url: ENDPOINTS.projects.activate(id), method: "POST" }),
      invalidatesTags: (_r, _e, id) => [...projectChanged(id), "Subscription"],
    }),
    changeProjectStatus: build.mutation<ProjectDetail, { id: string; body: ChangeStatusBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.projects.status(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [...projectChanged(id), "Subscription"],
    }),
    getSupplyPresets: build.query<SupplyPreset[], void>({
      query: () => ENDPOINTS.projects.supplyPresets,
      providesTags: ["SupplyPresets"],
      keepUnusedDataFor: 3600,
    }),

    // ─── Floors, rooms, openings (args carry projectId for cache tags) ─────
    getFloors: build.query<ProjectFloors, string>({
      query: (projectId) => ENDPOINTS.projects.floors(projectId),
      providesTags: (_r, _e, projectId) => [{ type: "Floors", id: projectId }],
    }),
    createRoom: build.mutation<Room, { projectId: string; floorId: string; body: CreateRoomBody }>({
      query: ({ floorId, body }) => ({ url: ENDPOINTS.projects.floorRooms(floorId), method: "POST", body }),
      invalidatesTags: (_r, _e, { projectId }) => roomsChanged(projectId),
    }),
    updateRoom: build.mutation<Room, { projectId: string; roomId: string; body: UpdateRoomBody }>({
      query: ({ roomId, body }) => ({ url: ENDPOINTS.projects.roomById(roomId), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { projectId }) => roomsChanged(projectId),
    }),
    deleteRoom: build.mutation<unknown, { projectId: string; roomId: string }>({
      query: ({ roomId }) => ({ url: ENDPOINTS.projects.roomById(roomId), method: "DELETE" }),
      invalidatesTags: (_r, _e, { projectId }) => roomsChanged(projectId),
    }),
    createOpening: build.mutation<Room, { projectId: string; roomId: string; body: CreateOpeningBody }>({
      query: ({ roomId, body }) => ({ url: ENDPOINTS.projects.roomOpenings(roomId), method: "POST", body }),
      invalidatesTags: (_r, _e, { projectId }) => roomsChanged(projectId),
    }),
    updateOpening: build.mutation<Room, { projectId: string; openingId: string; body: UpdateOpeningBody }>({
      query: ({ openingId, body }) => ({ url: ENDPOINTS.projects.openingById(openingId), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { projectId }) => roomsChanged(projectId),
    }),
    deleteOpening: build.mutation<unknown, { projectId: string; openingId: string }>({
      query: ({ openingId }) => ({ url: ENDPOINTS.projects.openingById(openingId), method: "DELETE" }),
      invalidatesTags: (_r, _e, { projectId }) => roomsChanged(projectId),
    }),
    copyFloor: build.mutation<FloorWithRooms, { projectId: string; floorId: string; body: CopyFloorBody }>({
      query: ({ floorId, body }) => ({ url: ENDPOINTS.projects.floorCopy(floorId), method: "POST", body }),
      invalidatesTags: (_r, _e, { projectId }) => roomsChanged(projectId),
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useUpdateBasicMutation,
  useSetTeamMutation,
  useUpdateContractMutation,
  useUpdatePlotStructureMutation,
  useUpdateCoverageMutation,
  useGetReviewQuery,
  useActivateProjectMutation,
  useChangeProjectStatusMutation,
  useGetSupplyPresetsQuery,
  useGetFloorsQuery,
  useCreateRoomMutation,
  useUpdateRoomMutation,
  useDeleteRoomMutation,
  useCreateOpeningMutation,
  useUpdateOpeningMutation,
  useDeleteOpeningMutation,
  useCopyFloorMutation,
} = projectsApi;
