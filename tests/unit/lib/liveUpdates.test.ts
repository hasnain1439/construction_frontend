import { describe, expect, it, vi } from "vitest";
import { SseParser, startLiveUpdates, TAB_ID, tagsForResource, toChangeEvent, type ChangeEvent } from "@/lib/liveUpdates";

/** A text/event-stream response whose body is `chunks` (then stays open until aborted). */
function streamResponse(chunks: string[], signal?: AbortSignal | null) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      signal?.addEventListener("abort", () => controller.error(new DOMException("aborted", "AbortError")));
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

const change = (event: Partial<ChangeEvent>) => `event: change\ndata: ${JSON.stringify({ at: "2026-10-26T07:40:00.000Z", origin: null, ...event })}\n\n`;

describe("SseParser", () => {
  it("joins chunks, skips comments and the retry field, handles CRLF and multi-line data", () => {
    const parser = new SseParser();
    expect(parser.push("retry: 3000\n\nevent: ready\ndata: {\"syncLag")).toEqual([]);
    expect(parser.push("Ms\":0}\n\n: ping\n\n")).toEqual([{ event: "ready", data: '{"syncLagMs":0}' }]);
    expect(parser.push("data: a\r\ndata: b\r\n\r\n")).toEqual([{ event: "message", data: "a\nb" }]);
  });

  it("turns only well-formed change messages into events", () => {
    expect(toChangeEvent({ event: "change", data: '{"resource":"clients","origin":"tab-1","at":"x"}' })).toEqual({ resource: "clients", origin: "tab-1", at: "x" });
    expect(toChangeEvent({ event: "ready", data: "{}" })).toBeNull();
    expect(toChangeEvent({ event: "change", data: "not json" })).toBeNull();
    expect(toChangeEvent({ event: "change", data: '{"origin":"x"}' })).toBeNull();
  });
});

describe("startLiveUpdates", () => {
  it("reports other people's changes, skips this tab's own writes, sends the tab id", async () => {
    const seen: ChangeEvent[] = [];
    const fetchFn = vi.fn((_url: RequestInfo | URL, init?: RequestInit) =>
      Promise.resolve(streamResponse([change({ resource: "clients", origin: "someone-else" }), change({ resource: "purchases", origin: TAB_ID })], init?.signal)),
    );
    const stop = startLiveUpdates({ onChange: (e) => seen.push(e), refreshSession: async () => true, fetchFn });
    await vi.waitFor(() => expect(seen).toHaveLength(1));
    stop();

    expect(seen[0]).toMatchObject({ resource: "clients", origin: "someone-else" });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("/api/v1/realtime/stream");
    expect(new Headers(init?.headers).get("X-Client-Id")).toBe(TAB_ID);
    expect(init?.credentials).toBe("include");
  });

  it("refreshes the login on 401 and reconnects", async () => {
    const seen: ChangeEvent[] = [];
    const refreshSession = vi.fn(async () => true);
    let calls = 0;
    const fetchFn = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      calls += 1;
      if (calls === 1) return Promise.resolve(new Response(JSON.stringify({ success: false, error: { code: "TOKEN_EXPIRED" } }), { status: 401 }));
      return Promise.resolve(streamResponse([change({ resource: "invoices/issue", origin: "x1234567" })], init?.signal));
    });
    const stop = startLiveUpdates({ onChange: (e) => seen.push(e), refreshSession, fetchFn });
    await vi.waitFor(() => expect(seen).toHaveLength(1));
    stop();

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("after a failed connection asks for a full re-read once it is back", async () => {
    vi.useFakeTimers();
    try {
      const seen: ChangeEvent[] = [];
      let calls = 0;
      const fetchFn = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
        calls += 1;
        return calls === 1 ? Promise.reject(new TypeError("Failed to fetch")) : Promise.resolve(streamResponse([], init?.signal));
      });
      const stop = startLiveUpdates({ onChange: (e) => seen.push(e), refreshSession: async () => true, fetchFn });
      await vi.advanceTimersByTimeAsync(1_100);
      await vi.waitFor(() => expect(seen).toEqual([expect.objectContaining({ resource: "*", origin: null })]));
      stop();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("tagsForResource — only the screens a change touches refetch (QA pass 2)", () => {
  it("maps a write to its screens plus the totals every write moves", () => {
    const coverage = tagsForResource("projects/coverage");
    expect(coverage).not.toBe("ALL");
    expect(coverage).toEqual(expect.arrayContaining(["Projects", "ProjectReview", "Dashboard", "Approvals"]));
    expect(coverage).not.toContain("Invoices");

    expect(tagsForResource("cash-expenses")).toEqual(expect.arrayContaining(["CashEntries", "CashAccounts", "Dashboard"]));
    expect(tagsForResource("projects/attendance/bulk")).toEqual(expect.arrayContaining(["Attendance", "Settlements"]));
    expect(tagsForResource("invoices/issue")).toEqual(expect.arrayContaining(["Invoices", "Receivables"]));
  });

  it("re-reads everything when it does not know the change", () => {
    expect(tagsForResource("sync/push")).toBe("ALL");
    expect(tagsForResource("approvals/bulk")).toBe("ALL");
    expect(tagsForResource("*")).toBe("ALL");
    expect(tagsForResource("")).toBe("ALL");
  });
});
