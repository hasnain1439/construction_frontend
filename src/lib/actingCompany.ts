/**
 * Which company the platform super admin is working in (Company data, /admin/data/…).
 *
 * Kept in a cookie so both the browser (the company API sends `X-Act-As-Tenant`) and the
 * Next.js proxy (company links → /admin/data/…) see it. It only has an effect together with
 * the admin's own sign-in cookie; the API trusts the header only from a signed-in admin.
 */
import { useSyncExternalStore } from "react";

export const ACTING_COOKIE = "act_as_tenant";
export const ACT_AS_HEADER = "X-Act-As-Tenant";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The company id the admin is working in, or null (browser only). */
export function actingTenantId(): string | null {
  if (typeof document === "undefined") return null;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${ACTING_COOKIE}=`));
  const value = hit ? decodeURIComponent(hit.slice(ACTING_COOKIE.length + 1)) : "";
  return UUID.test(value) ? value : null;
}

export function setActingTenant(tenantId: string) {
  if (!UUID.test(tenantId)) return;
  document.cookie = `${ACTING_COOKIE}=${encodeURIComponent(tenantId)}; Path=/; SameSite=Strict`;
  listeners.forEach((l) => l());
}

export function clearActingTenant() {
  if (typeof document === "undefined") return;
  document.cookie = `${ACTING_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict`;
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
