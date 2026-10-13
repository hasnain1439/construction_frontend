/**
 * Which company the platform super admin is working in (Company data, /admin/data/…), and the
 * support session that allows it.
 *
 * Kept in cookies so both the browser (the company API sends `X-Act-As-Tenant` +
 * `X-Act-As-Session`) and the Next.js proxy (company links → /admin/data/…) see it. It only has
 * an effect together with the admin's own sign-in cookie: the API trusts the headers only from a
 * signed-in admin with a live session (started with a reason, read-only unless switched to write
 * mode with a second reason, 60 minutes by default).
 */
import { useSyncExternalStore } from "react";

export const ACTING_COOKIE = "act_as_tenant";
export const ACTING_SESSION_COOKIE = "act_as_session";
export const ACT_AS_HEADER = "X-Act-As-Tenant";
export const ACT_AS_SESSION_HEADER = "X-Act-As-Session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  const value = hit ? decodeURIComponent(hit.slice(name.length + 1)) : "";
  return UUID.test(value) ? value : null;
}

/** The company id the admin is working in, or null (browser only). Needs a session too. */
export function actingTenantId(): string | null {
  return readCookie(ACTING_SESSION_COOKIE) ? readCookie(ACTING_COOKIE) : null;
}

/** The support session id sent as `X-Act-As-Session`, or null. */
export function actingSessionId(): string | null {
  return readCookie(ACTING_COOKIE) ? readCookie(ACTING_SESSION_COOKIE) : null;
}

export function setActingTenant(tenantId: string, sessionId: string) {
  if (!UUID.test(tenantId) || !UUID.test(sessionId)) return;
  document.cookie = `${ACTING_COOKIE}=${encodeURIComponent(tenantId)}; Path=/; SameSite=Strict`;
  document.cookie = `${ACTING_SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; SameSite=Strict`;
  listeners.forEach((l) => l());
}

export function clearActingTenant() {
  if (typeof document === "undefined") return;
  document.cookie = `${ACTING_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict`;
  document.cookie = `${ACTING_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict`;
  listeners.forEach((l) => l());
}

/** API error codes that mean the support session is gone (expired, ended, missing or not ours). */
export const ACT_AS_SESSION_GONE = new Set([
  "ACT_AS_SESSION_REQUIRED",
  "ACT_AS_SESSION_INVALID",
  "ACT_AS_SESSION_EXPIRED",
  "ACT_AS_SESSION_ENDED",
]);

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** The chosen company id; "pending" during server render (the cookie is read in the browser). */
export function useActingTenant(): string | null | "pending" {
  return useSyncExternalStore(subscribe, actingTenantId, () => "pending" as const);
}

/** The support session id; "pending" during server render. */
export function useActingSession(): string | null | "pending" {
  return useSyncExternalStore(subscribe, actingSessionId, () => "pending" as const);
}
