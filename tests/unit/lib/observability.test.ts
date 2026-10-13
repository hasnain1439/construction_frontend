import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  group: vi.fn(),
  reset: vi.fn(),
  get_distinct_id: vi.fn(() => "anon"),
}));
vi.mock("posthog-js", () => ({ default: posthogMock }));

import {
  beforeSendAnalytics,
  identifyAnalytics,
  resetAnalyticsForTests,
  sanitizeProps,
  track,
} from "@/lib/observability/analytics";
import { hashUserId } from "@/lib/observability/hash";
import { FILTERED, scrubBreadcrumb, scrubEvent, scrubText, scrubUrl, stripQuery } from "@/lib/observability/scrub";
import { initSentry, sentryOptions, tracesSampleRate } from "@/lib/observability/sentry";
import { contentSecurityPolicy } from "@/lib/securityHeaders";

const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";

describe("hashUserId", () => {
  it("matches the API: first 32 hex of sha256('user:' + id)", async () => {
    // node -e "crypto.createHash('sha256').update('user:abc').digest('hex').slice(0,32)"
    await expect(hashUserId("abc")).resolves.toBe("4dc0ddfa4a7ccd9e66b8a0ba00428c0e");
  });
});

describe("Sentry options", () => {
  it("is completely off when the DSN is empty", () => {
    const init = vi.fn();
    expect(sentryOptions({ dsn: undefined })).toBeNull();
    expect(sentryOptions({ dsn: "   " })).toBeNull();
    expect(initSentry(init, { dsn: "" })).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it("starts with sendDefaultPii off and the scrubbers attached when a DSN is set", () => {
    const init = vi.fn();
    expect(initSentry(init, { dsn: "https://k@o1.ingest.sentry.io/1", tracesSampleRate: "0.5" })).toBe(true);
    const options = init.mock.calls[0][0];
    expect(options.sendDefaultPii).toBe(false);
    expect(options.tracesSampleRate).toBe(0.5);
    expect(typeof options.beforeSend).toBe("function");
    expect(typeof options.beforeSendTransaction).toBe("function");
    expect(typeof options.beforeBreadcrumb).toBe("function");
  });

  it("falls back to 0.1 for missing or invalid sample rates", () => {
    expect(tracesSampleRate(undefined)).toBe(0.1);
    expect(tracesSampleRate("abc")).toBe(0.1);
    expect(tracesSampleRate("2")).toBe(0.1);
    expect(tracesSampleRate("0")).toBe(0);
  });
});

describe("scrubber", () => {
  it("masks emails, phones, tokens and amounts in free text", () => {
    const out = scrubText(`ali@example.com 0300-1234567 +923001234567 Bearer abc.def ${JWT} Rs 25,000`);
    expect(out).not.toMatch(/ali@example|1234567|abc\.def|eyJ|25,000/);
    expect(out).toContain(FILTERED);
  });

  it("drops cookies, bodies and env, filters auth headers and secret query values", () => {
    const event = scrubEvent({
      message: "failed for ali@example.com",
      user: { id: "hash123", email: "ali@example.com", ip_address: "1.2.3.4" },
      request: {
        url: "https://app.example.com/invite/secret-token-123?token=abc&page=2#frag",
        query_string: "token=abc&phone=03001234567&page=2",
        data: { password: "hunter2" },
        cookies: { access_token: "x" },
        env: { REMOTE_ADDR: "1.2.3.4" },
        headers: { Authorization: "Bearer xyz", Cookie: "a=b", "User-Agent": "Mozilla" },
      },
      exception: { values: [{ type: "Error", value: `bad token ${JWT}` }] },
      extra: { phone: "03001234567", note: "call 0300 1234567" },
    });
    expect(event.user).toEqual({ id: "hash123" });
    expect(event.message).toBe(`failed for ${FILTERED}`);
    expect(event.request?.data).toBeUndefined();
    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.env).toBeUndefined();
    expect(event.request?.headers).toEqual({ Authorization: FILTERED, Cookie: FILTERED, "User-Agent": "Mozilla" });
    expect(event.request?.url).not.toContain("secret-token-123");
    expect(event.request?.url).not.toContain("token=abc");
    expect(event.request?.url).not.toContain("#frag");
    expect(String(event.request?.query_string)).not.toMatch(/abc|03001234567/);
    expect(event.exception?.values?.[0].value).not.toContain("eyJ");
    expect(event.extra).toEqual({ phone: FILTERED, note: `call ${FILTERED}` });
  });

  it("cleans breadcrumbs: URLs scrubbed, bodies dropped", () => {
    const crumb = scrubBreadcrumb({
      category: "fetch",
      data: { url: "/api/v1/auth/reset-password/abc?code=123456", method: "POST", status_code: 400, body: "{}" },
    });
    expect(crumb.data).toEqual({ url: `/api/v1/auth/reset-password/${FILTERED}?code=%5BFiltered%5D`, method: "POST", status_code: 400 });
  });

  it("keeps the trace id and plain page paths", () => {
    const traceId = "0123456789abcdef0123456789abcdef";
    const event = scrubEvent({ transaction: "/projects/[id]", contexts: { trace: { trace_id: traceId } } });
    expect(event.transaction).toBe("/projects/[id]");
    expect(event.contexts).toEqual({ trace: { trace_id: traceId } });
    expect(scrubUrl("/dashboard?page=2")).toBe("/dashboard?page=2");
    expect(stripQuery("https://a.com/x?y=1#z")).toBe("https://a.com/x");
  });
});

describe("analytics props", () => {
  it("keeps only allow-listed keys with plain values", () => {
    expect(
      sanitizeProps({
        client: "web",
        method: "password",
        role: "OWNER",
        count: 3,
        duration_ms: 120,
        offline: false,
        amount: 5000,
        name: "Ali",
        userEmail: "ali@example.com",
      }),
    ).toEqual({ client: "web", method: "password", role: "OWNER", count: 3, duration_ms: 120, offline: false });
  });

  it("allows numbers only for count / duration_ms", () => {
    expect(sanitizeProps({ status: 500, count: Number.NaN, kind: 7 })).toEqual({});
  });

  it("drops strings that look like an email, phone, token or amount", () => {
    expect(
      sanitizeProps({
        source: "ali@example.com",
        status: "03001234567",
        kind: JWT,
        error_code: "Rs 25,000",
        method: "12500",
        platform: "x".repeat(65),
        client: "web",
      }),
    ).toEqual({ client: "web" });
  });

  it("before_send drops unknown events and strips URL query strings", () => {
    expect(beforeSendAnalytics({ event: "$pageview", properties: {} } as never)).toBeNull();
    const out = beforeSendAnalytics({
      event: "login",
      properties: { $current_url: "https://app.example.com/login?next=/x&phone=0300", client: "web" },
    } as never);
    expect(out?.properties).toEqual({ $current_url: "https://app.example.com/login", client: "web" });
  });
});

describe("track()", () => {
  beforeEach(() => {
    resetAnalyticsForTests();
    Object.values(posthogMock).forEach((fn) => fn.mockClear());
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is a no-op (posthog-js never initialised) without NEXT_PUBLIC_POSTHOG_KEY", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    await track("login", { client: "web" });
    await identifyAnalytics("hash", "tenant-1");
    expect(posthogMock.init).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it("initialises once with autocapture / recording off and sends filtered props", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com/");
    await track("login", { client: "web", method: "otp", role: "OWNER", ...({ email: "a@b.co" } as object) });
    await track("not_an_event" as never);
    await identifyAnalytics("hash123", "tenant-1");

    expect(posthogMock.init).toHaveBeenCalledTimes(1);
    const [key, config] = posthogMock.init.mock.calls[0];
    expect(key).toBe("phc_test");
    expect(config).toMatchObject({
      api_host: "https://eu.i.posthog.com",
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
    });
    expect(posthogMock.capture).toHaveBeenCalledTimes(1);
    expect(posthogMock.capture).toHaveBeenCalledWith("login", { client: "web", method: "otp", role: "OWNER" });
    expect(posthogMock.identify).toHaveBeenCalledWith("hash123");
    expect(posthogMock.group).toHaveBeenCalledWith("company", "tenant-1");
  });
});

describe("CSP connect-src and observability hosts", () => {
  const connectSrc = (csp: string) => csp.split(";").find((d) => d.trim().startsWith("connect-src"))!.trim();

  it("stays 'self' when Sentry and PostHog are not configured", () => {
    expect(connectSrc(contentSecurityPolicy({ fileOrigins: [], dev: false }))).toBe("connect-src 'self'");
    expect(connectSrc(contentSecurityPolicy({ fileOrigins: [], dev: false, sentryDsn: "", posthogHost: "" }))).toBe(
      "connect-src 'self'",
    );
  });

  it("adds the Sentry ingest origin (no key or path) and the PostHog hosts when set", () => {
    const csp = contentSecurityPolicy({
      fileOrigins: [],
      dev: false,
      sentryDsn: "https://publickey@o123.ingest.us.sentry.io/456",
      posthogHost: "https://us.i.posthog.com",
    });
    expect(connectSrc(csp)).toBe(
      "connect-src 'self' https://o123.ingest.us.sentry.io https://us.i.posthog.com https://us-assets.i.posthog.com",
    );
    expect(csp).not.toContain("publickey");
  });

  it("allows a self-hosted PostHog host as-is", () => {
    const csp = contentSecurityPolicy({ fileOrigins: [], dev: false, posthogHost: "https://ph.example.com/ingest" });
    expect(connectSrc(csp)).toBe("connect-src 'self' https://ph.example.com");
  });
});
