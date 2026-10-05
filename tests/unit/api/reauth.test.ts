// @vitest-environment node
import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import { describe, expect, it, vi } from "vitest";
import { createReauthBaseQuery } from "@/api/baseQuery";

const ORIGIN = "http://api.test";
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function apiStub(): BaseQueryApi {
  return {
    signal: new AbortController().signal,
    abort: () => {},
    dispatch: vi.fn() as unknown as BaseQueryApi["dispatch"],
    getState: () => ({}),
    extra: undefined,
    endpoint: "test",
    type: "query",
  };
}

/** Fake backend: data routes answer 401 until a refresh succeeds. */
function fakeBackend(options: { refreshOk?: boolean; dataCode?: string } = {}) {
  let tokenValid = false;
  const calls = { refresh: 0, data: 0 };
  const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname === "/api/v1/auth/refresh") {
      calls.refresh += 1;
      await sleep(25); // a slow refresh: other 401s arrive while it runs
      if (options.refreshOk === false) return json(401, { success: false, error: { code: "REFRESH_INVALID", message: "x" } });
      tokenValid = true;
      return json(200, { success: true, data: { accessTokenExpiresIn: 900 } });
    }
    calls.data += 1;
    await sleep(5);
    if (!tokenValid) {
      return json(401, { success: false, error: { code: options.dataCode ?? "TOKEN_EXPIRED", message: "expired" } });
    }
    return json(200, { success: true, data: { path: url.pathname }, meta: { page: 1, limit: 25, total: 1, totalPages: 1 } });
  });
  return { fetchFn: fetchFn as unknown as typeof fetch, calls };
}

function makeQuery(backend: ReturnType<typeof fakeBackend>, onSessionExpired = vi.fn()) {
  const query = createReauthBaseQuery({
    baseUrl: `${ORIGIN}/api/v1`,
    refreshUrl: "/auth/refresh",
    noRefreshPaths: ["/auth/login", "/auth/refresh"],
    onSessionExpired,
    fetchFn: backend.fetchFn,
  });
  return { query, onSessionExpired };
}

describe("reauth base query", () => {
  it("runs ONE refresh for three parallel 401s, then retries each request", async () => {
    const backend = fakeBackend();
    const { query, onSessionExpired } = makeQuery(backend);

    const results = await Promise.all([
      query("/projects", apiStub(), {}),
      query("/clients", apiStub(), {}),
      query("/users", apiStub(), {}),
    ]);

    expect(backend.calls.refresh).toBe(1);
    expect(results.map((r) => r.error)).toEqual([undefined, undefined, undefined]);
    expect(results.map((r) => (r.data as { path: string }).path)).toEqual([
      "/api/v1/projects",
      "/api/v1/clients",
      "/api/v1/users",
    ]);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("unwraps the envelope and exposes pagination meta", async () => {
    const backend = fakeBackend();
    const { query } = makeQuery(backend);
    const result = await query("/projects", apiStub(), {});
    expect(result.data).toEqual({ path: "/api/v1/projects" });
    expect(result.meta?.page).toEqual({ page: 1, limit: 25, total: 1, totalPages: 1 });
  });

  it("does not refresh again for requests that start after a successful refresh", async () => {
    const backend = fakeBackend();
    const { query } = makeQuery(backend);
    await query("/projects", apiStub(), {});
    await query("/clients", apiStub(), {});
    expect(backend.calls.refresh).toBe(1);
  });

  it("signals an expired session once when the refresh fails", async () => {
    const backend = fakeBackend({ refreshOk: false });
    const { query, onSessionExpired } = makeQuery(backend);

    const results = await Promise.all([query("/projects", apiStub(), {}), query("/clients", apiStub(), {})]);

    expect(backend.calls.refresh).toBe(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.error?.status === 401)).toBe(true);
  });

  it("never refreshes on a revoked session; it signs out instead", async () => {
    const backend = fakeBackend({ dataCode: "SESSION_REVOKED" });
    const { query, onSessionExpired } = makeQuery(backend);
    const result = await query("/projects", apiStub(), {});
    expect(backend.calls.refresh).toBe(0);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(result.error).toMatchObject({ status: 401, code: "SESSION_REVOKED" });
  });

  it("does not refresh for a failed login", async () => {
    const backend = fakeBackend();
    const { query, onSessionExpired } = makeQuery(backend);
    const result = await query({ url: "/auth/login", method: "POST", body: {} }, apiStub(), {});
    expect(backend.calls.refresh).toBe(0);
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(result.error?.status).toBe(401);
  });

  it("retries a read once when the proxy drops the upstream connection, but never a write", async () => {
    let calls = 0;
    const flaky = (async () => {
      calls += 1;
      return calls === 1
        ? new Response("Internal Server Error", { status: 500, headers: { "content-type": "text/plain" } })
        : json(200, { success: true, data: { ok: true } });
    }) as unknown as typeof fetch;
    const query = createReauthBaseQuery({
      baseUrl: `${ORIGIN}/api/v1`,
      refreshUrl: "/auth/refresh",
      noRefreshPaths: [],
      onSessionExpired: vi.fn(),
      fetchFn: flaky,
    });
    const read = await query("/projects", apiStub(), {});
    expect(read.data).toEqual({ ok: true });
    expect(calls).toBe(2);

    calls = 0;
    const write = await query({ url: "/projects", method: "POST", body: {} }, apiStub(), {});
    expect(calls).toBe(1);
    expect(write.error).toMatchObject({ status: 500, code: "UPSTREAM_ERROR" });
  });

  it("retries a read when the API is briefly busy (JSON 500/503) and succeeds", async () => {
    let calls = 0;
    const busy = (async () => {
      calls += 1;
      return calls < 3
        ? json(503, { success: false, error: { code: "SERVICE_BUSY", message: "busy" } })
        : json(200, { success: true, data: { ok: true } });
    }) as unknown as typeof fetch;
    const query = createReauthBaseQuery({
      baseUrl: `${ORIGIN}/api/v1`,
      refreshUrl: "/auth/refresh",
      noRefreshPaths: [],
      onSessionExpired: vi.fn(),
      fetchFn: busy,
    });
    const read = await query("/projects", apiStub(), {});
    expect(read.data).toEqual({ ok: true });
    expect(calls).toBe(3);
  });

  it("does not retry a read on a 4xx", async () => {
    let calls = 0;
    const query = createReauthBaseQuery({
      baseUrl: `${ORIGIN}/api/v1`,
      refreshUrl: "/auth/refresh",
      noRefreshPaths: [],
      onSessionExpired: vi.fn(),
      fetchFn: (async () => {
        calls += 1;
        return json(404, { success: false, error: { code: "NOT_FOUND", message: "x" } });
      }) as unknown as typeof fetch,
    });
    await query("/projects/x", apiStub(), {});
    expect(calls).toBe(1);
  });

  it("normalises network failures", async () => {
    const query = createReauthBaseQuery({
      baseUrl: `${ORIGIN}/api/v1`,
      refreshUrl: "/auth/refresh",
      noRefreshPaths: [],
      onSessionExpired: vi.fn(),
      fetchFn: (async () => {
        throw new TypeError("Failed to fetch");
      }) as unknown as typeof fetch,
    });
    const result = await query("/projects", apiStub(), {});
    expect(result.error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });
});
