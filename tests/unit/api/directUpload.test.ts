import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { baseApi } from "@/api/baseApi";
import { attachmentsApi, resetDirectUploadForTests } from "@/api/services/attachments.api";

const attachment = { id: "a1", kind: "DOCUMENT", fileName: "boq.pdf", mimeType: "application/pdf", sizeBytes: 9, url: "u", urlExpiresAt: "x", createdAt: "x" };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

interface Call {
  method: string;
  url: string;
  body: unknown;
}

function backend(routes: Record<string, (call: Call) => Response>) {
  const calls: Call[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(String(input), init);
    const url = new URL(req.url, "http://localhost");
    const key = `${req.method} ${url.host === "bucket.test" ? "PUT-STORAGE" : url.pathname}`;
    const call = { method: req.method, url: url.toString(), body: req.method === "GET" ? null : req.headers.get("content-type")?.includes("json") ? await req.json() : req.headers.get("content-type") };
    calls.push(call);
    const route = routes[key];
    if (!route) throw new Error(`unexpected ${key}`);
    return route(call);
  });
  vi.stubGlobal("fetch", fetchFn);
  // The app calls the API on its own origin ("/api/v1/…"); Node's Request needs an absolute URL.
  const NodeRequest = Request;
  vi.stubGlobal(
    "Request",
    class extends NodeRequest {
      constructor(input: RequestInfo | URL, init?: RequestInit) {
        super(typeof input === "string" && input.startsWith("/") ? `http://localhost${input}` : input, init);
      }
    },
  );
  return calls;
}

function upload() {
  const store = configureStore({ reducer: { [baseApi.reducerPath]: baseApi.reducer }, middleware: (gDM) => gDM().concat(baseApi.middleware) });
  const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 1, 2, 3, 4])], "boq.pdf", { type: "application/pdf" });
  return store.dispatch(attachmentsApi.endpoints.uploadAttachment.initiate({ file, kind: "DOCUMENT" })).unwrap();
}

beforeEach(() => resetDirectUploadForTests());
afterEach(() => vi.unstubAllGlobals());

describe("uploads go straight to storage when the API offers it", () => {
  it("upload-url → PUT to the bucket → complete", async () => {
    const calls = backend({
      "POST /api/v1/attachments/upload-url": () =>
        json(201, { success: true, data: { upload: { attachmentId: "a1", method: "PUT", url: "https://bucket.test/t/a1.pdf?X-Amz-Signature=s", headers: { "Content-Type": "application/pdf" }, token: "tok", expiresAt: "x" } } }),
      "PUT PUT-STORAGE": () => new Response(null, { status: 200 }),
      "POST /api/v1/attachments/complete": () => json(201, { success: true, data: attachment }),
    });
    await expect(upload()).resolves.toMatchObject({ id: "a1" });
    expect(calls.map((c) => c.method + " " + new URL(c.url).pathname)).toEqual([
      "POST /api/v1/attachments/upload-url",
      "PUT /t/a1.pdf",
      "POST /api/v1/attachments/complete",
    ]);
    expect(calls[0]!.body).toEqual({ kind: "DOCUMENT", mimeType: "application/pdf", sizeBytes: 9, fileName: "boq.pdf" });
    expect(calls[1]!.body).toBe("application/pdf"); // the signed Content-Type header is sent
    expect(calls[2]!.body).toEqual({ token: "tok" });
  });

  it("falls back to the multipart upload when the server can't (and remembers it)", async () => {
    const calls = backend({
      "POST /api/v1/attachments/upload-url": () => json(409, { success: false, error: { code: "DIRECT_UPLOAD_UNAVAILABLE", message: "no" } }),
      "POST /api/v1/attachments": () => json(201, { success: true, data: attachment }),
    });
    await expect(upload()).resolves.toMatchObject({ id: "a1" });
    await expect(upload()).resolves.toMatchObject({ id: "a1" });
    expect(calls.map((c) => new URL(c.url).pathname)).toEqual(["/api/v1/attachments/upload-url", "/api/v1/attachments", "/api/v1/attachments"]);
  });

  it("a failed PUT is an upload error; validation errors come back as they are", async () => {
    backend({
      "POST /api/v1/attachments/upload-url": () =>
        json(201, { success: true, data: { upload: { attachmentId: "a1", method: "PUT", url: "https://bucket.test/x", headers: {}, token: "tok", expiresAt: "x" } } }),
      "PUT PUT-STORAGE": () => new Response("denied", { status: 403 }),
    });
    await expect(upload()).rejects.toMatchObject({ code: "UPLOAD_FAILED", status: 403 });

    backend({ "POST /api/v1/attachments/upload-url": () => json(400, { success: false, error: { code: "FILE_TOO_LARGE", message: "big" } }) });
    await expect(upload()).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
  });
});
