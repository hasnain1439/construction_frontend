import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type { Client, ClientDetail, ClientsQuery, CreateClientBody, Paginated, UpdateClientBody } from "@/api/types";

export const clientsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getClients: build.query<Paginated<Client>, ClientsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.clients.list, params: cleanParams(params ?? undefined) }),
      transformResponse: (data, meta) => toPage<Client>(data, meta),
      providesTags: (page) => providesList(page?.items, "Clients"),
    }),
    getClient: build.query<ClientDetail, string>({
      query: (id) => ENDPOINTS.clients.byId(id),
      providesTags: (_r, _e, id) => [{ type: "Clients", id }],
    }),
    createClient: build.mutation<Client, CreateClientBody>({
      query: (body) => ({ url: ENDPOINTS.clients.list, method: "POST", body }),
      invalidatesTags: [{ type: "Clients", id: LIST }],
    }),
    updateClient: build.mutation<Client, { id: string; body: UpdateClientBody }>({
      query: ({ id, body }) => ({ url: ENDPOINTS.clients.byId(id), method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Clients", id },
        { type: "Clients", id: LIST },
        { type: "Projects", id: LIST },
      ],
    }),
  }),
});

export const { useGetClientsQuery, useGetClientQuery, useCreateClientMutation, useUpdateClientMutation } =
  clientsApi;
