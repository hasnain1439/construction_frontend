import {
  fetchBaseQuery,
  type BaseQueryApi,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
  type FetchBaseQueryMeta,
} from "@reduxjs/toolkit/query/react";
import { Mutex } from "async-mutex";
import type { ApiError, PageMeta } from "@/api/types";

/** Request metadata plus the backend's `meta` (pagination, usage …) when present. */
export interface ApiMeta extends FetchBaseQueryMeta {
  page?: PageMeta & Record<string, unknown>;
}

export type ApiBaseQuery = BaseQueryFn<string | FetchArgs, unknown, ApiError, object, ApiMeta>;

/** 401 codes where a refresh can't help: the login itself is gone. */
const SESSION_DEAD_CODES = new Set([
  "SESSION_REVOKED",
  "ACCOUNT_DISABLED",
  "DEVICE_REVOKED",
  "REFRESH_INVALID",
  "REFRESH_TOKEN_REUSED",
]);

/** Waits before each GET retry on a transient failure (2 retries, ~2 s in total). */
const GET_RETRY_DELAYS_MS = [400, 1200] as const;

interface Envelope {
  success?: boolean;
  data?: unknown;
  meta?: PageMeta & Record<string, unknown>;
  error?: { code?: string; message?: string; details?: unknown };
}

/** Turns any RTK Query fetch error into `{ status, code, message, details }`. */
export function toApiError(error: FetchBaseQueryError): ApiError {
  if (typeof error.status === "number") {
    const body = error.data as Envelope | undefined;
    return {
      status: error.status,
      code: body?.error?.code ?? `HTTP_${error.status}`,
      message: body?.error?.message ?? "Request failed",
      details: body?.error?.details,
    };
  }
  switch (error.status) {
    case "FETCH_ERROR":
      return { status: 0, code: "NETWORK_ERROR", message: "Could not reach the server" };
    case "TIMEOUT_ERROR":
      return { status: 0, code: "TIMEOUT", message: "The server took too long to answer" };
    case "PARSING_ERROR":
      // A non-JSON 5xx comes from the Next.js proxy (API down / connection dropped), not the API.
      return error.originalStatus >= 500
        ? { status: error.originalStatus, code: "UPSTREAM_ERROR", message: "Could not reach the server" }
        : { status: error.originalStatus, code: `HTTP_${error.originalStatus}`, message: "Unexpected server response" };
    default:
      return { status: 0, code: "UNKNOWN_ERROR", message: error.error ?? "Something went wrong" };
  }
}

export interface ReauthOptions {
  baseUrl: string;
  /** Refresh endpoint for this audience (company or platform admin). */
  refreshUrl: string;
  /** Paths whose 401 must not trigger a refresh (login, OTP, refresh itself …). */
  noRefreshPaths: readonly string[];
  /** Called once when the session can't be recovered. */
  onSessionExpired: (api: BaseQueryApi) => void;
  /** Injected in tests. */
  fetchFn?: typeof fetch;
}

/**
 * fetchBaseQuery + cookie credentials + envelope unwrapping + single-flight refresh.
 *
 * The backend treats two refreshes with the same token as token theft and revokes the
 * whole family, so refreshes are serialised behind a mutex. Every request records the
 * refresh "epoch" it started in; if a refresh finished while it was in flight, it just
 * retries instead of refreshing again — so N parallel 401s cause exactly one refresh.
 */
export function createReauthBaseQuery(options: ReauthOptions): ApiBaseQuery {
  const raw = fetchBaseQuery({
    baseUrl: options.baseUrl,
    credentials: "include",
    ...(options.fetchFn ? { fetchFn: options.fetchFn } : {}),
  });
  const mutex = new Mutex();
  let epoch = 0;
  let lastRefreshOk = true;

  const pathOf = (args: string | FetchArgs) => (typeof args === "string" ? args : args.url).split("?")[0];
  const methodOf = (args: string | FetchArgs) => (typeof args === "string" ? "GET" : (args.method ?? "GET").toUpperCase());

  /**
   * Temporary failures: any 5xx (API busy, e.g. DB pool exhausted → 503 / 500), the Next.js
   * proxy's bare non-JSON 5xx for a dropped upstream connection, or a network error.
   */
  const isTransientFailure = (error: FetchBaseQueryError | undefined) => {
    if (!error) return false;
    if (error.status === "FETCH_ERROR") return true;
    if (error.status === "PARSING_ERROR") return error.originalStatus >= 500;
    return typeof error.status === "number" && error.status >= 500;
  };

  /** Reads are retried with a short backoff on a transient failure; writes never (they may have landed). */
  const send = async (args: string | FetchArgs, api: BaseQueryApi, extraOptions: object) => {
    let result = await raw(args, api, extraOptions);
    if (methodOf(args) !== "GET") return result;
    for (const delay of GET_RETRY_DELAYS_MS) {
      if (!isTransientFailure(result.error) || api.signal.aborted) break;
      await new Promise((resolve) => setTimeout(resolve, delay));
      result = await raw(args, api, extraOptions);
    }
    return result;
  };

  const canRefresh = (args: string | FetchArgs, error: FetchBaseQueryError) => {
    if (error.status !== 401) return false;
    if (options.noRefreshPaths.includes(pathOf(args))) return false;
    const code = (error.data as Envelope | undefined)?.error?.code;
    return !code || !SESSION_DEAD_CODES.has(code);
  };

  const sessionDead = (args: string | FetchArgs, error: FetchBaseQueryError) => {
    if (error.status !== 401 || options.noRefreshPaths.includes(pathOf(args))) return false;
    const code = (error.data as Envelope | undefined)?.error?.code;
    return Boolean(code && SESSION_DEAD_CODES.has(code));
  };

  return async (args, api, extraOptions) => {
    await mutex.waitForUnlock();
    const startedIn = epoch;
    let result = await send(args, api, extraOptions);

    if (result.error && canRefresh(args, result.error)) {
      const refreshed = await mutex.runExclusive(async () => {
        if (epoch !== startedIn) return { ok: lastRefreshOk, mine: false };
        const refresh = await raw(
          { url: options.refreshUrl, method: "POST", body: { client: "web" } },
          api,
          extraOptions,
        );
        epoch += 1;
        lastRefreshOk = !refresh.error;
        return { ok: lastRefreshOk, mine: true };
      });
      if (refreshed.ok) {
        result = await send(args, api, extraOptions);
      } else if (refreshed.mine) {
        options.onSessionExpired(api);
      }
    } else if (result.error && sessionDead(args, result.error)) {
      options.onSessionExpired(api);
    }

    if (result.error) {
      return { error: toApiError(result.error), meta: result.meta };
    }
    const body = result.data as Envelope | undefined;
    const isEnvelope = body !== null && typeof body === "object" && "success" in body;
    return {
      data: isEnvelope ? body.data : body,
      meta: { ...(result.meta as FetchBaseQueryMeta), page: isEnvelope ? body.meta : undefined },
    };
  };
}
