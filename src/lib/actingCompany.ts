/**
 * Which company the platform super admin is working in (Company data, /admin/data/…).
 *
 * Kept in a cookie so both the browser (the company API sends `X-Act-As-Tenant`) and the
 * Next.js proxy (company links → /admin/data/…) see it. It only has an effect together with the
 * admin's own sign-in cookie: the API trusts the header only from a signed-in platform admin,
 * who then has direct, full (read and write) access — every change is logged in the company's
 * audit log with the admin's name.
 */
import { useSyncExternalStore } from "react";

export const ACTING_COOKIE = "act_as_tenant";
/** Cookie of the former support-session flow; only cleared now. */
const LEGACY_SESSION_COOKIE = "act_as_session";
export const ACT_AS_HEADER = "X-Act-As-Tenant";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  const value = hit ? decodeURIComponent(hit.slice(name.length + 1)) : "";
  return UUID.test(value) ? value : null;
}

/** The company id the admin is working in, or null (browser only). */
export function actingTenantId(): string | null {
  return readCookie(ACTING_COOKIE);
}

export function setActingTenant(tenantId: string) {
  if (!UUID.test(tenantId)) return;
  document.cookie = `${ACTING_COOKIE}=${encodeURIComponent(tenantId)}; Path=/; SameSite=Strict`;
  document.cookie = `${LEGACY_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict`;
  listeners.forEach((l) => l());
}

export function clearActingTenant() {
  if (typeof document === "undefined") return;
  document.cookie = `${ACTING_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict`;
  document.cookie = `${LEGACY_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict`;
  listeners.forEach((l) => l());
}

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
