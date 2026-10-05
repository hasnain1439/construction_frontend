/** Browser-side navigation helpers for auth state changes. */

export const PUBLIC_PATHS = [
  "/login",
  "/otp",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/select-company",
  "/invite",
  "/suspended",
  "/admin/login",
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Only same-origin, absolute paths are allowed as a post-login destination. */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || isPublicPath(next)) return fallback;
  return next;
}

export function loginUrl(audience: "company" | "platform", next?: string): string {
  const base = audience === "platform" ? "/admin/login" : "/login";
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}

/** Hard redirect to the login page (clears in-memory state). No-op on public pages. */
export function redirectToLogin(audience: "company" | "platform"): void {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (isPublicPath(pathname)) return;
  window.location.assign(loginUrl(audience, `${pathname}${search}`));
}
