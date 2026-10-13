import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import { originOf, securityHeaders } from "./src/lib/securityHeaders";

/**
 * The backend's httpOnly auth cookies only work first-party, so the browser talks to
 * `/api/v1/*` on this origin and Next.js forwards it to the Express API.
 */
const API_ORIGIN = (process.env.API_ORIGIN ?? "http://localhost:4000").replace(/\/+$/, "");

/**
 * Where signed attachment links point (the API's API_PUBLIC_URL). Defaults to API_ORIGIN;
 * set API_PUBLIC_URL when browsers reach the API on another address than Next.js does.
 */
const FILE_ORIGINS = [originOf(process.env.API_PUBLIC_URL), originOf(API_ORIGIN)].filter((o): o is string => Boolean(o));
const SECURITY_HEADERS = securityHeaders({
  fileOrigins: FILE_ORIGINS,
  dev: process.env.NODE_ENV !== "production",
  // Observability endpoints are allowed only when configured (see README "Observability").
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()
    ? process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com"
    : undefined,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // `next build` also writes .next/standalone (a minimal server.js + traced node_modules) that the
  // Docker image runs. `next dev` and `next start` are unaffected.
  output: "standalone",
  devIndicators: false,
  // Smallest modern formats first (the login photo is served as AVIF/WebP at the screen size).
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_ORIGIN}/api/v1/:path*`,
      },
    ];
  },
};

/**
 * Sentry's build plugin is used only to upload source maps, so it is added only when
 * SENTRY_AUTH_TOKEN is set (CI / production builds). Without it the app builds exactly as before;
 * runtime error reporting comes from src/instrumentation*.ts and needs only the DSN.
 */
export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ? { name: process.env.NEXT_PUBLIC_SENTRY_RELEASE } : undefined,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
      telemetry: false,
      silent: !process.env.CI,
    })
  : nextConfig;
