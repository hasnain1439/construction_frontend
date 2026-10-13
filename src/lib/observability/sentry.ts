/**
 * Sentry options shared by the browser (`src/instrumentation-client.ts`) and the Next.js server
 * (`src/instrumentation.ts`). Error monitoring is off unless a DSN is set: `sentryOptions` then
 * returns null and `Sentry.init` is never called.
 *
 * No session replay, no default PII (no IPs, cookies or request bodies), and every event and
 * breadcrumb goes through the scrubber in `./scrub`.
 */
import { scrubBreadcrumb, scrubEvent, type ScrubbableBreadcrumb, type ScrubbableEvent } from "./scrub";

export interface SentryEnv {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: string;
}

export const DEFAULT_TRACES_SAMPLE_RATE = 0.1;

export function tracesSampleRate(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return DEFAULT_TRACES_SAMPLE_RATE;
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : DEFAULT_TRACES_SAMPLE_RATE;
}

export interface SharedSentryOptions {
  dsn: string;
  environment?: string;
  release?: string;
  tracesSampleRate: number;
  sendDefaultPii: false;
  // Generic over Sentry's ErrorEvent / TransactionEvent / Breadcrumb (structurally typed in ./scrub).
  beforeSend: <E extends ScrubbableEvent>(event: E) => E;
  beforeSendTransaction: <E extends ScrubbableEvent>(event: E) => E;
  beforeBreadcrumb: <B extends ScrubbableBreadcrumb>(breadcrumb: B) => B;
}

/** Init options, or null when no DSN is configured (Sentry stays completely off). */
export function sentryOptions(env: SentryEnv): SharedSentryOptions | null {
  const dsn = env.dsn?.trim();
  if (!dsn) return null;
  return {
    dsn,
    environment: env.environment?.trim() || undefined,
    release: env.release?.trim() || undefined,
    tracesSampleRate: tracesSampleRate(env.tracesSampleRate),
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  };
}

/** Calls `init` only when a DSN is set. Returns whether Sentry was started. */
export function initSentry(init: (options: SharedSentryOptions) => unknown, env: SentryEnv): boolean {
  const options = sentryOptions(env);
  if (!options) return false;
  init(options);
  return true;
}

