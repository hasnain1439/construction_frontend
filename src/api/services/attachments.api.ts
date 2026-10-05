import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import type { Attachment, AttachmentKind } from "@/api/types";

export interface UploadArgs {
  file: File;
  kind: AttachmentKind;
}

export const attachmentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    uploadAttachment: build.mutation<Attachment, UploadArgs>({
      query: ({ file, kind }) => {
        const form = new FormData();
        form.append("kind", kind);
        form.append("file", file);
        return { url: ENDPOINTS.attachments.upload, method: "POST", body: form };
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
