import { baseApi } from "@/api/baseApi";
import { ENDPOINTS } from "@/api/endpoints";
import type { ApiError, Attachment, AttachmentKind } from "@/api/types";
import { shrinkImage } from "@/lib/imageShrink";

export interface UploadArgs {
  file: File;
  kind: AttachmentKind;
}

interface UploadTicket {
  attachmentId: string;
  method: "PUT";
  url: string;
  headers: Record<string, string>;
  token: string;
  expiresAt: string;
}

type UploadUrlAnswer = { upload: UploadTicket } | { existing: Attachment };

/**
 * Remembered per page load: once the API says direct upload is unavailable (files on disk or
 * Cloudinary), later uploads go straight to the multipart form.
 */
let directUnavailable = false;

/** Tests only. */
export function resetDirectUploadForTests() {
  directUnavailable = false;
}

const storageError = (status: number): ApiError => ({
  status: status || 0,
  code: "UPLOAD_FAILED",
  message: "The file could not be uploaded. Check your connection and try again.",
});

export const attachmentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Every upload on the website. Photos are shrunk in the browser first (lib/imageShrink).
     * When the server stores files on S3 / R2 the bytes go straight there (upload-url → PUT →
     * complete), never through the API; otherwise (or when the server says it can't) the
     * multipart POST /attachments is used.
     */
    uploadAttachment: build.mutation<Attachment, UploadArgs>({
      queryFn: async ({ file, kind }, _api, _extra, baseQuery) => {
        const body = await shrinkImage(file, kind);

        if (!directUnavailable) {
          const asked = await baseQuery({
            url: ENDPOINTS.attachments.uploadUrl,
            method: "POST",
            body: { kind, mimeType: body.type, sizeBytes: body.size, fileName: body.name },
          });
          if (asked.error?.code === "DIRECT_UPLOAD_UNAVAILABLE" || asked.error?.status === 404) {
            directUnavailable = true; // older API or disk / Cloudinary storage
          } else if (asked.error) {
            return { error: asked.error };
          } else {
            const answer = asked.data as UploadUrlAnswer;
            if ("existing" in answer) return { data: answer.existing };
            const ticket = answer.upload;
            let put: Response;
            try {
              put = await fetch(ticket.url, { method: ticket.method, headers: ticket.headers, body });
            } catch {
              return { error: storageError(0) };
            }
            if (!put.ok) return { error: storageError(put.status) };
            const done = await baseQuery({ url: ENDPOINTS.attachments.complete, method: "POST", body: { token: ticket.token } });
            return done.error ? { error: done.error } : { data: done.data as Attachment };
          }
        }

        const form = new FormData();
        form.append("kind", kind);
        form.append("file", body);
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
