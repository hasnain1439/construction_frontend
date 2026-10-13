/**
 * Product analytics (PostHog). Off unless NEXT_PUBLIC_POSTHOG_KEY is set: then posthog-js is never
 * downloaded or initialised and every call here is a no-op.
 *
 * Shared contract with the API and the mobile app (keep the three in step):
 * - events: login, project_activated, hazri_marked, purchase_saved, invoice_issued, sync_error —
 *   anything else is dropped. The web sends only `login`; the API sends the business events.
 * - distinct id: `hashUserId(user.id)`; the company is the PostHog group `company` = tenant id.
 * - props: only the allow-listed keys below, with plain values. Never money, names, phones, emails.
 *
 * posthog-js runs with autocapture, page views, session recording, surveys, remote config and
 * external script loading all off, so it only ever POSTs to the PostHog host (see securityHeaders).
 */
import type { CaptureResult, PostHog, Properties } from "posthog-js";
import { stripQuery } from "./scrub";

export const ANALYTICS_EVENTS = [
  "login",
  "project_activated",
  "hazri_marked",
  "purchase_saved",
  "invoice_issued",
  "sync_error",
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export const ANALYTICS_PROP_KEYS = [
  "client",
  "platform",
  "method",
  "source",
  "role",
  "status",
  "kind",
  "count",
  "error_code",
  "app_version",
  "offline",
  "duration_ms",
] as const;
export type AnalyticsPropKey = (typeof ANALYTICS_PROP_KEYS)[number];
export type AnalyticsProps = Partial<Record<AnalyticsPropKey, string | number | boolean | null | undefined>>;

export const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";
export const COMPANY_GROUP = "company";

const NUMERIC_KEYS = new Set<string>(["count", "duration_ms"]);
const FORBIDDEN_KEY = /amount|paisa|price|rate|total|balance|money|name|phone|email|cnic|address|token/i;
const MAX_STRING = 64;

const LOOKS_LIKE_EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const LOOKS_LIKE_JWT = /eyJ[\w-]+\.[\w-]+/;
const LOOKS_LIKE_TOKEN = /[\w\-+/=.]{32,}/;
const LOOKS_LIKE_MONEY = /(?:\brs\.?|\bpkr\b|₨)\s*\d|^\s*[-+]?[\d,]+(?:\.\d+)?\s*$/i;

function safeString(value: string): boolean {
  if (value.length === 0 || value.length > MAX_STRING) return false;
  if (LOOKS_LIKE_EMAIL.test(value) || LOOKS_LIKE_JWT.test(value) || LOOKS_LIKE_TOKEN.test(value)) return false;
  if ((value.match(/\d/g)?.length ?? 0) >= 7) return false; // phone numbers (and long ids)
  return !LOOKS_LIKE_MONEY.test(value);
}

export function isAnalyticsEvent(event: string): event is AnalyticsEvent {
  return (ANALYTICS_EVENTS as readonly string[]).includes(event);
}

/** Keeps only allow-listed keys with plain, non-personal values; everything else is dropped. */
export function sanitizeProps(props: Record<string, unknown> | undefined): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!props) return out;
  for (const [key, value] of Object.entries(props)) {
    if (!(ANALYTICS_PROP_KEYS as readonly string[]).includes(key) || FORBIDDEN_KEY.test(key)) continue;
    if (typeof value === "boolean") out[key] = value;
    else if (typeof value === "number") {
      if (NUMERIC_KEYS.has(key) && Number.isFinite(value)) out[key] = value;
    } else if (typeof value === "string" && safeString(value)) out[key] = value;
  }
  return out;
}

/** Strips query strings from every URL-like property posthog-js adds ($current_url, $referrer …). */
function stripUrls(props: Properties | undefined): Properties | undefined {
  if (!props) return props;
  const out: Properties = { ...props };
  for (const [key, value] of Object.entries(out)) {
    if (typeof value === "string" && /url|referrer|pathname|href/i.test(key)) out[key] = stripQuery(value);
  }
  return out;
}

/** PostHog's own events we allow alongside ours (identify / group). */
const INTERNAL_EVENTS = new Set(["$identify", "$groupidentify", "$set"]);

/** posthog-js `before_send`: last line of defence before anything leaves the browser. */
export function beforeSendAnalytics(result: CaptureResult | null): CaptureResult | null {
  if (!result) return null;
  if (!INTERNAL_EVENTS.has(result.event) && !isAnalyticsEvent(result.event)) return null;
  return {
    ...result,
    properties: stripUrls(result.properties) ?? {},
    $set: stripUrls(result.$set),
    $set_once: stripUrls(result.$set_once),
  };
}

/** Reads the env at call time (Next.js inlines NEXT_PUBLIC_* in the browser bundle). */
export function analyticsConfig(): { key: string; host: string } | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return null;
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST).replace(/\/+$/, "");
  return { key, host };
}

let client: Promise<PostHog | null> | null = null;

/** Loads and initialises posthog-js once, on first use. Null when analytics is off or on the server. */
function getClient(): Promise<PostHog | null> {
  const config = analyticsConfig();
  if (!config || typeof window === "undefined") return Promise.resolve(null);
  client ??= import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(config.key, {
        api_host: config.host,
        person_profiles: "identified_only",
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_dead_clicks: false,
        capture_exceptions: false,
        capture_heatmaps: false,
        capture_performance: false,
        rageclick: false,
        disable_session_recording: true,
        disable_surveys: true,
        disable_product_tours: true,
        disable_conversations: true,
        disable_web_experiments: true,
        // No remote config / feature flags and no extra scripts from the assets host.
        advanced_disable_flags: true,
        disable_external_dependency_loading: true,
        persistence: "localStorage",
        save_referrer: false,
        mask_all_text: true,
        mask_all_element_attributes: true,
        before_send: beforeSendAnalytics,
      });
      return posthog;
    })
    .catch(() => null);
  return client;
}

/**
 * Sends one product event. Unknown events are dropped and props are filtered by `sanitizeProps`.
 * Safe to call anywhere: a no-op without NEXT_PUBLIC_POSTHOG_KEY, on the server, or if PostHog fails.
 */
export async function track(event: AnalyticsEvent | (string & {}), props?: AnalyticsProps): Promise<void> {
  if (!isAnalyticsEvent(event)) return;
  const posthog = await getClient();
  posthog?.capture(event, sanitizeProps(props));
}

/** Ties the following events to a person (hashed id) and their company (tenant id). */
export async function identifyAnalytics(hashedUserId: string, tenantId: string | null | undefined): Promise<void> {
  const posthog = await getClient();
  if (!posthog) return;
  if (posthog.get_distinct_id() !== hashedUserId) posthog.identify(hashedUserId);
  if (tenantId) posthog.group(COMPANY_GROUP, tenantId);
}

/** On sign-out: forget the person and company. Does not load PostHog if it was never used. */
export async function resetAnalytics(): Promise<void> {
  if (!client) return;
  const posthog = await client;
  posthog?.reset();
}

/** Test helper: forget the loaded client. */
export function resetAnalyticsForTests(): void {
  client = null;
}
