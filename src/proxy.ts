import { NextResponse, type NextRequest } from "next/server";

/**
 * Route guard by cookie PRESENCE only (Next.js 16 `proxy`, formerly `middleware`).
 * The real check is GET /auth/me in the shells.
 *
 * The refresh cookie is scoped to /api/v1/auth, so pages only ever see the 15-minute
 * access cookie. When it has expired, the visitor lands on /login?next=…, where a silent
 * /auth/me (which refreshes behind the scenes) sends them straight back.
 */
const COMPANY_ACCESS = "access_token";
const ADMIN_ACCESS = "admin_access_token";
/** Company the super admin is working in (see lib/actingCompany.ts). */
const ACTING = "act_as_tenant";

const PUBLIC = [
  "/login",
  "/otp",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/select-company",
  "/invite",
  "/suspended",
];

const isUnder = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isUnder(pathname, "/admin")) {
    if (isUnder(pathname, "/admin/login")) return NextResponse.next();
    if (request.cookies.has(ADMIN_ACCESS)) return NextResponse.next();
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (PUBLIC.some((base) => isUnder(pathname, base))) return NextResponse.next();

  // Super admin working inside a company (Company data): the company screens' own links
  // (/projects/…, /suppliers-stock/…) open inside the admin console instead.
  if (request.cookies.has(ACTING) && request.cookies.has(ADMIN_ACCESS)) {
    return NextResponse.redirect(
      new URL(`/admin/data${pathname === "/" ? "/dashboard" : pathname}${search}`, request.url),
    );
  }

  if (request.cookies.has(COMPANY_ACCESS)) return NextResponse.next();

  const url = new URL("/login", request.url);
  if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the API proxy, Next internals and files with an extension.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
