import * as Sentry from "@sentry/nextjs";
import { initSentry } from "@/lib/observability/sentry";

/**
 * Next.js server start-up (Node.js and edge runtimes). Starts Sentry only when SENTRY_DSN (or
 * NEXT_PUBLIC_SENTRY_DSN) is set; otherwise nothing is initialised. See README "Observability".
 */
export function register() {
  initSentry(Sentry.init, {
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  });
}

/** Errors thrown while rendering / in route handlers (a no-op when Sentry is not initialised). */
export const onRequestError = Sentry.captureRequestError;
