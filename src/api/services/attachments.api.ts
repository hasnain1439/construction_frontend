import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import type { Attachment, AttachmentKind } from "@/api/types";
import { shrinkImage } from "@/lib/imageShrink";

export interface UploadArgs {
  file: File;
  kind: AttachmentKind;
}

export const attachmentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Photos are shrunk in the browser first (see lib/imageShrink), for every upload on the website. */
    uploadAttachment: build.mutation<Attachment, UploadArgs>({
      queryFn: async ({ file, kind }, _api, _extra, baseQuery) => {
        const form = new FormData();
        form.append("kind", kind);
        form.append("file", await shrinkImage(file, kind));
        const result = await baseQuery({ url: ENDPOINTS.attachments.upload, method: "POST", body: form });
        return result.error ? { error: result.error } : { data: result.data as Attachment };
      },
    }),
    /** Fresh signed URL (they expire after ~10 minutes). */
    getAttachment: build.query<Attachment, string>({
      query: (id) => ENDPOINTS.attachments.byId(id),
      keepUnusedDataFor: 300,
    }),
  }),
});

export const { useUploadAttachmentMutation, useGetAttachmentQuery } = attachmentsApi;
