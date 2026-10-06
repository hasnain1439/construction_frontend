import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import { LIST, providesList } from "@/api/tags";
import { cleanParams, toPage } from "@/api/transform";
import type { AppNotification, NotificationsQuery, Paginated, UnreadCount } from "@/api/types";

/** How often the bell re-checks the unread count (it also refreshes on window focus). */
export const UNREAD_POLL_MS = 60_000;

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<Paginated<AppNotification>, NotificationsQuery | void>({
      query: (params) => ({ url: ENDPOINTS.notifications.list, params: cleanParams(params ?? undefined) }),
      transformResponse: toPage<AppNotification>,
      providesTags: (page) => providesList(page?.items, "Notifications"),
    }),
    getUnreadCount: build.query<UnreadCount, void>({
      query: () => ENDPOINTS.notifications.unreadCount,
      providesTags: [{ type: "Notifications", id: "COUNT" }],
    }),
    markNotificationRead: build.mutation<AppNotification, string>({
      query: (id) => ({ url: ENDPOINTS.notifications.read(id), method: "PATCH" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Notifications", id }, { type: "Notifications", id: LIST }, { type: "Notifications", id: "COUNT" }],
    }),
    markAllNotificationsRead: build.mutation<{ updated: number }, void>({
      query: () => ({ url: ENDPOINTS.notifications.readAll, method: "PATCH" }),
      invalidatesTags: [{ type: "Notifications", id: LIST }, { type: "Notifications", id: "COUNT" }],
    }),
  }),
});

export const { useGetNotificationsQuery, useGetUnreadCountQuery, useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation } = notificationsApi;
