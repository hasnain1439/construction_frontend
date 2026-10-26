/**
 * Live updates: the API's GET /realtime/stream (Server-Sent Events) says "something in the
 * company changed" after every write by anyone, on any device; the open screens then re-read
 * their data (useLiveUpdates invalidates the RTK Query cache). Events carry no data.
 *
 * One stream per browser, not per tab: browsers allow ~6 open connections per site over
 * HTTP/1.1, so a stream in every tab would starve the normal requests. The tab holding the Web
 * Lock opens it and passes the events to the other tabs over a BroadcastChannel; when it closes,
 * another tab takes the lock and opens a new stream.
 *
 * Every request carries this tab's X-Client-Id (api/baseQuery.ts), so a tab skips the echo of its
 * own writes — its mutations already invalidated exactly the right tags.
 */
import { API_BASE_URL, ENDPOINTS } from "@/api/endpoints";

export const CLIENT_ID_HEADER = "X-Client-Id";
const LOCK_NAME = "live-updates-stream";
const CHANNEL_NAME = "live-updates";
const RETRY_DELAYS_MS = [1_000, 3_000, 10_000, 30_000] as const;
/** The server has live updates turned off (503): try again much later. */
const DISABLED_RETRY_MS = 5 * 60_000;

/** Random id of this tab (8–64 of A–Z a–z 0–9 _ -, as the API expects). */
export const TAB_ID: string = (() => {
  const bytes = new Uint8Array(12);
  globalThis.crypto?.getRandomValues?.(bytes);
  return `w${Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("")}`.slice(0, 24);
})();

export interface ChangeEvent {
  /** API path of the write without ids ("projects/attendance/bulk"); "*" = re-read everything. */
  resource: string;
  /** X-Client-Id of the writer (null when it sent none). */
  origin: string | null;
  at: string;
}

export interface SseMessage {
  event: string;
  data: string;
}

/** Incremental text/event-stream parser: feed it chunks, get complete messages back. */
export class SseParser {
  private buffer = "";

  push(chunk: string): SseMessage[] {
    this.buffer += chunk.replace(/\r\n?/g, "\n");
    const out: SseMessage[] = [];
    let end: number;
    while ((end = this.buffer.indexOf("\n\n")) >= 0) {
      const block = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (!line || line.startsWith(":")) continue;
        const colon = line.indexOf(":");
        const field = colon < 0 ? line : line.slice(0, colon);
        const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
        if (field === "event") event = value;
        else if (field === "data") data.push(value);
      }
      if (data.length) out.push({ event, data: data.join("\n") });
    }
    return out;
  }
}

/** `change` message → event, or null when it isn't one. */
export function toChangeEvent(message: SseMessage): ChangeEvent | null {
  if (message.event !== "change") return null;
  try {
    const parsed = JSON.parse(message.data) as Partial<ChangeEvent>;
    if (typeof parsed.resource !== "string") return null;
    return {
      resource: parsed.resource,
      origin: typeof parsed.origin === "string" ? parsed.origin : null,
      at: typeof parsed.at === "string" ? parsed.at : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export interface LiveUpdatesOptions {
  /** A change made by someone else (or "*": re-read everything). */
  onChange: (event: ChangeEvent) => void;
  /**
   * The stream got 401: refresh the login the normal way (GET /auth/me through the re-auth base
   * query) and say whether it worked. A dead session is handled there (redirect to login).
   */
  refreshSession: () => Promise<boolean>;
  fetchFn?: typeof fetch;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });

const errorCode = async (res: Response) =>
  ((await res.json().catch(() => null)) as { error?: { code?: string } } | null)?.error?.code;

/** Holds the stream open until `signal` aborts: reconnects, refreshes the login on 401. */
async function runStream(signal: AbortSignal, emit: (event: ChangeEvent) => void, options: LiveUpdatesOptions) {
  const fetchFn = options.fetchFn ?? fetch;
  let failures = 0;
  let missed = false;
  while (!signal.aborted) {
    let wait: number = RETRY_DELAYS_MS[Math.min(failures, RETRY_DELAYS_MS.length - 1)];
    try {
      const res = await fetchFn(`${API_BASE_URL}${ENDPOINTS.realtime.stream}`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "text/event-stream", [CLIENT_ID_HEADER]: TAB_ID },
        signal,
      });
      if (res.status === 401) {
        failures += 1;
        // Access token expired: refresh and reconnect at once (twice at most, then back off).
        if (failures <= 2 && (await options.refreshSession())) continue;
      } else if (res.status === 503 && (await errorCode(res)) === "REALTIME_DISABLED") {
        wait = DISABLED_RETRY_MS;
      } else if (res.ok && res.body) {
        failures = 0;
        // Reconnected after a failure: changes made meanwhile were never announced.
        if (missed) emit({ resource: "*", origin: null, at: new Date().toISOString() });
        missed = false;
        const parser = new SseParser();
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          for (const message of parser.push(decoder.decode(value, { stream: true }))) {
            const event = toChangeEvent(message);
            if (event) emit(event);
          }
        }
        // The server ends a stream after ~10 minutes: reconnect at once.
        continue;
      } else {
        failures += 1;
      }
    } catch {
      if (signal.aborted) return;
      failures += 1;
    }
    missed = true;
    await sleep(wait, signal);
  }
}

/** Starts live updates for this tab; returns the function that stops them. */
export function startLiveUpdates(options: LiveUpdatesOptions): () => void {
  const abort = new AbortController();
  const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL_NAME);
  const deliver = (event: ChangeEvent) => {
    if (event.origin !== TAB_ID) options.onChange(event);
  };
  if (channel) channel.onmessage = (message: MessageEvent<ChangeEvent>) => deliver(message.data);
  // The stream owner hands every event to the other tabs (a channel never echoes to its sender).
  const emit = (event: ChangeEvent) => {
    channel?.postMessage(event);
    deliver(event);
  };

  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (locks && channel) {
    locks
      .request(LOCK_NAME, { signal: abort.signal }, () => runStream(abort.signal, emit, options))
      .catch(() => undefined); // AbortError when stopped while waiting for the lock
  } else {
    void runStream(abort.signal, emit, options);
  }

  return () => {
    abort.abort();
    channel?.close();
  };
}
