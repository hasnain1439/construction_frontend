import type { BaseQueryApi } from "@reduxjs/toolkit/query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createReauthBaseQuery } from "@/api/baseQuery";
import { TAB_ID } from "@/lib/liveUpdates";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const apiStub = (): BaseQueryApi => ({
  signal: new AbortController().signal,
  abort: () => {},
  dispatch: vi.fn() as unknown as BaseQueryApi["dispatch"],
  getState: () => ({}),
  extra: undefined,
  endpoint: "test",
  type: "query",
});

/** The access cookie expired; another tab already rotated it, so the next request works. */
function backend() {
  const calls = { refresh: 0, data: 0 };
  const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname === "/api/v1/auth/refresh") {
      calls.refresh += 1;
      return json(200, { success: true, data: {} });
    }
    calls.data += 1;
    return calls.data === 1
      ? json(401, { success: false, error: { code: "TOKEN_EXPIRED", message: "expired" } })
      : json(200, { success: true, data: { ok: true } });
  });
  return { fetchFn: fetchFn as unknown as typeof fetch, calls };
}

const query = (fetchFn: typeof fetch) =>
  createReauthBaseQuery({ baseUrl: "http://api.test/api/v1", refreshUrl: "/auth/refresh", noRefreshPaths: [], onSessionExpired: vi.fn(), fetchFn });

afterEach(() => localStorage.clear());

describe("refresh across tabs", () => {
  it("another tab refreshed moments ago → no second refresh (it would look like token theft), just a retry", async () => {
    localStorage.setItem("auth-refreshed-at:/auth/refresh", JSON.stringify({ at: Date.now(), tab: "another-tab" }));
    const b = backend();
    const result = await query(b.fetchFn)("/projects", apiStub(), {});
    expect(result.error).toBeUndefined();
    expect(b.calls.refresh).toBe(0);
    expect(b.calls.data).toBe(2);
  });

  it("refreshes itself when nobody else did recently, and records it for the other tabs", async () => {
    localStorage.setItem("auth-refreshed-at:/auth/refresh", JSON.stringify({ at: Date.now() - 60_000, tab: "another-tab" }));
    const b = backend();
    const result = await query(b.fetchFn)("/projects", apiStub(), {});
    expect(result.error).toBeUndefined();
    expect(b.calls.refresh).toBe(1);
    expect(JSON.parse(localStorage.getItem("auth-refreshed-at:/auth/refresh")!)).toMatchObject({ tab: TAB_ID });
  });
});
