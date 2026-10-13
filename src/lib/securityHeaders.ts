/**
 * Security headers for every page (next.config.ts `headers()`).
 *
 * The CSP allows only what the app loads:
 * - scripts / styles from this origin. Next.js streams inline `<script>` chunks and next-themes
 *   sets the theme with an inline script, so 'unsafe-inline' stays until a nonce-based CSP
 *   (proxy.ts + dynamic rendering) replaces it. `next dev` also needs 'unsafe-eval' + websockets.
 * - fonts: `next/font/google` self-hosts Cabin and Noto Nastaliq at build time — no Google calls.
 * - images / PDFs / audio: signed attachment URLs point at the API's public origin (local storage)
 *   or Cloudinary (res. for thumbnails, api. for signed originals); upload previews use blob:.
 * - API calls go to `/api/v1` on this origin (rewritten to the API), so connect-src is 'self' —
 *   plus, only when configured, the Sentry ingest origin (from the DSN) and the PostHog host
 *   (and its assets host). posthog-js loads no scripts (see lib/observability/analytics.ts).
 */
export interface SecurityHeaderOptions {
  /** Origins that serve signed attachment files (the API's public URL). */
  fileOrigins: string[];
  dev: boolean;
  /** Sentry DSN (NEXT_PUBLIC_SENTRY_DSN): its origin is allowed in connect-src. */
  sentryDsn?: string;
  /** PostHog host (NEXT_PUBLIC_POSTHOG_HOST), only passed when NEXT_PUBLIC_POSTHOG_KEY is set. */
  posthogHost?: string;
}

const CLOUDINARY = ["https://res.cloudinary.com", "https://api.cloudinary.com"];

/** "http://localhost:4000/api" → "http://localhost:4000"; invalid values are dropped. */
export function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const { origin } = new URL(value);
    return origin === "null" ? null : origin;
  } catch {
    return null;
  }
}

/** "https://key@o1.ingest.us.sentry.io/42" → "https://o1.ingest.us.sentry.io" (no key, no path). */
export function sentryIngestOrigin(dsn: string | undefined): string | null {
  return originOf(dsn?.trim());
}

/**
 * PostHog origins: the API host, plus "<region>-assets.i.posthog.com" for PostHog Cloud
 * ("https://us.i.posthog.com" → also "https://us-assets.i.posthog.com"). Self-hosted / proxy: host only.
 */
export function posthogOrigins(host: string | undefined): string[] {
  const origin = originOf(host?.trim());
  if (!origin) return [];
  const cloud = /^https:\/\/(us|eu)\.i\.posthog\.com$/.exec(origin);
  return cloud ? [origin, `https://${cloud[1]}-assets.i.posthog.com`] : [origin];
}

export function contentSecurityPolicy({ fileOrigins, dev, sentryDsn, posthogHost }: SecurityHeaderOptions): string {
  const files = [...new Set(fileOrigins)];
  // Error / analytics endpoints — only when configured, so the default policy stays 'self'.
  const telemetry = [sentryIngestOrigin(sentryDsn), ...posthogOrigins(posthogHost)].filter(
    (o, i, all): o is string => Boolean(o) && all.indexOf(o) === i,
  );
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...files, ...CLOUDINARY],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...telemetry, ...(dev ? ["ws:", "wss:"] : [])],
    "media-src": ["'self'", "blob:", ...files, ...CLOUDINARY],
    "frame-src": ["'self'", "blob:", ...files, ...CLOUDINARY],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!dev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export function securityHeaders(options: SecurityHeaderOptions): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    // HTTPS only in production (localhost dev runs on http).
    ...(options.dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
  ];
}
