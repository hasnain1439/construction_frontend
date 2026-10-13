/**
 * Privacy scrubbing for error reports (Sentry) and analytics URLs (PostHog).
 *
 * Pure functions with no SDK import, so they are unit-tested on their own. Anything that might be
 * personal data (emails, phone numbers), a secret (JWTs, bearer tokens, long random strings,
 * cookies, invite / reset tokens) or a money value is replaced with "[Filtered]" before it leaves
 * the browser or the Next.js server. Request bodies are always dropped.
 */

export const FILTERED = "[Filtered]";

const PATTERNS: RegExp[] = [
  // JWTs (header.payload.signature, base64url).
  /\beyJ[\w-]+\.[\w-]+\.[\w-]*/g,
  // Authorization header values.
  /\b(?:Bearer|Basic|Token)\s+[\w\-.~+/]+=*/gi,
  // Emails, plain and URL-encoded (@ → %40).
  /[\w.%+-]+(?:@|%40)[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/gi,
  // Pakistani mobiles: +92 300 1234567, 92-300-1234567, 0300 1234567, %2B923001234567.
  /(?<!\d)(?:\+?92|0)[\s-]?3\d{2}[\s-]?\d{7}(?!\d)/g,
  // Any other E.164 number (+ and 7–15 digits).
  /\+[1-9]\d{6,14}(?!\d)/g,
  // Long hex secrets (signatures, hashes, API keys) — UUIDs have dashes and are kept.
  /\b[a-f0-9]{32,}\b/gi,
  // Long random tokens: 32+ base64url characters mixing upper case, lower case and digits.
  /(?<![\w-])(?=[\w-]*\d)(?=[\w-]*[A-Z])(?=[\w-]*[a-z])[\w-]{32,}={0,2}/g,
  // Rupee amounts.
  /\b(?:Rs\.?|PKR)\s?\d[\d,]*(?:\.\d+)?/gi,
];

/** Redacts emails, phone numbers, tokens and money amounts inside free text. */
export function scrubText(value: string): string {
  let out = value;
  for (const pattern of PATTERNS) out = out.replace(pattern, FILTERED);
  return out;
}

/** Query parameters that carry secrets or personal data: their values are always dropped. */
const SECRET_PARAM = /token|code|sig|key|secret|pass|otp|auth|session|cookie|phone|email|login|cnic|name|exp/i;

/** Path segments after these prefixes are secrets (invite / reset links). */
const SECRET_PATHS = /\/(invite|reset-password|invitations)\/[^/?#]+/gi;

function scrubQuery(query: string): string {
  if (!query) return query;
  const params = new URLSearchParams(query);
  const out = new URLSearchParams();
  for (const [key, value] of params) out.append(key, SECRET_PARAM.test(key) ? FILTERED : scrubText(value));
  return out.toString();
}

/**
 * Cleans a URL (absolute or a path): secret-looking query values and invite / reset tokens in the
 * path are replaced, the fragment is dropped, and the rest goes through `scrubText`.
 */
export function scrubUrl(url: string): string {
  if (!url) return url;
  const hashAt = url.indexOf("#");
  const noHash = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const queryAt = noHash.indexOf("?");
  const base = (queryAt >= 0 ? noHash.slice(0, queryAt) : noHash).replace(SECRET_PATHS, `/$1/${FILTERED}`);
  const query = queryAt >= 0 ? scrubQuery(noHash.slice(queryAt + 1)) : "";
  return scrubText(query ? `${base}?${query}` : base);
}

/** A URL without its query string and fragment (for analytics, where queries are never needed). */
export function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return (cut >= 0 ? url.slice(0, cut) : url).replace(SECRET_PATHS, `/$1/${FILTERED}`);
}

/** Object keys whose values are never sent: secrets, personal data, money. */
export const SENSITIVE_KEY =
  /pass|secret|token|auth|cookie|session|csrf|otp|code|sig|key|cnic|phone|mobile|email|name|address|amount|paisa|price|rate|total|balance|money|salary|wage|cost/i;

const MAX_DEPTH = 6;

/** Deep copy of `value` with sensitive keys filtered and every string run through `scrubText`. */
export function scrubValue(value: unknown, depth = 0, filterKeys = true): unknown {
  if (typeof value === "string") return scrubText(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return FILTERED;
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1, filterKeys));
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    out[key] = filterKeys && SENSITIVE_KEY.test(key) ? FILTERED : scrubValue(v, depth + 1, filterKeys);
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------
 * Sentry event / breadcrumb shapes (structural, so this module needs no Sentry import).
 * ---------------------------------------------------------------------------------------------- */

interface ScrubbableRequest {
  url?: string;
  query_string?: unknown;
  data?: unknown;
  cookies?: unknown;
  headers?: Record<string, string>;
  env?: unknown;
}

interface ScrubbableException {
  value?: string;
}

export interface ScrubbableEvent {
  message?: string;
  user?: { id?: string | number } | null;
  request?: ScrubbableRequest;
  exception?: { values?: ScrubbableException[] };
  breadcrumbs?: ScrubbableBreadcrumb[];
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  transaction?: string;
  logentry?: { message?: string; params?: unknown[] };
}

export interface ScrubbableBreadcrumb {
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
}

const SENSITIVE_HEADER = /authorization|cookie|token|secret|session|csrf|api-key|act-as|forwarded-for|real-ip/i;
const URL_KEYS = new Set(["url", "from", "to", "href"]);

function scrubHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!headers) return headers;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = SENSITIVE_HEADER.test(key) ? FILTERED : scrubText(String(value));
  }
  return out;
}

function scrubQueryString(query: unknown): unknown {
  if (typeof query === "string") return scrubQuery(query.replace(/^\?/, ""));
  if (Array.isArray(query)) {
    return query.map((pair) =>
      Array.isArray(pair) && pair.length === 2
        ? [pair[0], SECRET_PARAM.test(String(pair[0])) ? FILTERED : scrubText(String(pair[1]))]
        : FILTERED,
    );
  }
  if (query && typeof query === "object") {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) out[k] = SECRET_PARAM.test(k) ? FILTERED : scrubText(String(v));
    return out;
  }
  return query;
}

/** Breadcrumb data: URLs cleaned, request / response bodies dropped, other values scrubbed. */
function scrubBreadcrumbData(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (/body|data|payload/i.test(key)) continue;
    if (URL_KEYS.has(key) && typeof value === "string") out[key] = scrubUrl(value);
    else if (key === "method" || key === "status_code") out[key] = value;
    else out[key] = SENSITIVE_KEY.test(key) ? FILTERED : scrubValue(value, 1);
  }
  return out;
}

/** Sentry `beforeBreadcrumb`: never drops a breadcrumb, only cleans it. */
export function scrubBreadcrumb<B extends ScrubbableBreadcrumb>(breadcrumb: B): B {
  const out = { ...breadcrumb };
  if (typeof out.message === "string") out.message = scrubText(out.message);
  if (out.data && typeof out.data === "object") out.data = scrubBreadcrumbData(out.data);
  return out;
}

/** Sentry `beforeSend` / `beforeSendTransaction`: strips personal data and secrets from an event. */
export function scrubEvent<E extends ScrubbableEvent>(event: E): E {
  const out: E = { ...event };

  // Only the hashed id we set ourselves (see identity.ts) — never an email, name or IP.
  if (out.user) {
    const id = out.user.id;
    out.user = id === undefined || id === null ? null : { id: String(id) };
  }

  if (out.request) {
    const req = { ...out.request };
    delete req.data; // request bodies: always dropped
    delete req.cookies;
    delete req.env;
    if (typeof req.url === "string") req.url = scrubUrl(req.url);
    if (req.query_string !== undefined) req.query_string = scrubQueryString(req.query_string);
    req.headers = scrubHeaders(req.headers);
    out.request = req;
  }

  if (typeof out.message === "string") out.message = scrubText(out.message);
  if (out.logentry) {
    out.logentry = {
      ...out.logentry,
      message: out.logentry.message ? scrubText(out.logentry.message) : out.logentry.message,
      params: out.logentry.params ? (scrubValue(out.logentry.params) as unknown[]) : out.logentry.params,
    };
  }
  if (typeof out.transaction === "string") out.transaction = scrubUrl(out.transaction);
  if (out.exception?.values) {
    out.exception = {
      ...out.exception,
      values: out.exception.values.map((ex) => ({ ...ex, value: ex.value ? scrubText(ex.value) : ex.value })),
    };
  }
  if (out.breadcrumbs) out.breadcrumbs = out.breadcrumbs.map(scrubBreadcrumb);
  if (out.extra) out.extra = scrubValue(out.extra) as Record<string, unknown>;
  if (out.tags) out.tags = scrubValue(out.tags, 0, false) as Record<string, unknown>;
  // Contexts hold SDK structures (os.name, browser.name, trace ids): scrub strings, keep keys.
  // `trace` holds the 32-hex trace id, which the hex rule would otherwise hide.
  if (out.contexts) {
    const { trace, ...rest } = out.contexts;
    out.contexts = { ...(scrubValue(rest, 0, false) as Record<string, unknown>), ...(trace ? { trace } : {}) };
  }
  return out;
}
