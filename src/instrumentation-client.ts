import * as Sentry from "@sentry/nextjs";
import { initSentry } from "@/lib/observability/sentry";

/**
 * Browser start-up. Sentry runs only when NEXT_PUBLIC_SENTRY_DSN is set (no session replay, no
 * PII; events are scrubbed in lib/observability/scrub.ts). The env values must be written out in
 * full so Next.js can inline them.
 */
const enabled = initSentry(Sentry.init, {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  tracesSampleRate: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
});

/** Page-navigation spans for performance tracing. */
export function onRouterTransitionStart(...args: Parameters<typeof Sentry.captureRouterTransitionStart>) {
  if (enabled) Sentry.captureRouterTransitionStart(...args);
}
