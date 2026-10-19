import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import type { ShareLink, ShareRefType } from "@/api/types";

/** Owner decision 2 · the share links of one document. */
export interface ShareLinkRef {
  refType: ShareRefType;
  refId: string;
}

const tagOf = (r: ShareLinkRef) => ({ type: "ShareLinks" as const, id: `${r.refType}:${r.refId}` });

export const shareLinksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listShareLinks: build.query<ShareLink[], ShareLinkRef>({
      query: (ref) => ({ url: ENDPOINTS.shareLinks.list, params: { refType: ref.refType, refId: ref.refId } }),
      providesTags: (_r, _e, ref) => [tagOf(ref)],
    }),
    /** "Link band karo" — the link then answers 410 LINK_REVOKED. */
    revokeShareLink: build.mutation<ShareLink, ShareLinkRef & { id: string }>({
      query: ({ id }) => ({ url: ENDPOINTS.shareLinks.revoke(id), method: "POST", body: {} }),
      invalidatesTags: (_r, _e, arg) => [tagOf(arg)],
    }),
  }),
});

export const { useListShareLinksQuery, useRevokeShareLinkMutation } = shareLinksApi;
