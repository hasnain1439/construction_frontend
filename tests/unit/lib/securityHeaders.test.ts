import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, originOf, securityHeaders } from "@/lib/securityHeaders";

const directive = (csp: string, name: string) =>
  csp
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `));

describe("security headers", () => {
  const prod = securityHeaders({ fileOrigins: ["https://api.example.com"], dev: false });
  const header = (key: string) => prod.find((h) => h.key === key)?.value;

  it("sets the clickjacking, sniffing, referrer and permissions headers", () => {
    expect(header("X-Frame-Options")).toBe("DENY");
    expect(header("X-Content-Type-Options")).toBe("nosniff");
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header("Permissions-Policy")).toContain("camera=()");
    expect(header("Strict-Transport-Security")).toContain("max-age=");
  });

  it("production CSP: no eval, no framing, files from the API, Cloudinary and the S3 / R2 bucket only", () => {
    const csp = header("Content-Security-Policy")!;
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
    expect(directive(csp, "script-src")).not.toContain("unsafe-eval");
    // API calls stay same-origin; the bucket (R2 / S3) is allowed for direct uploads and file saves.
    expect(directive(csp, "connect-src")).toBe("connect-src 'self' https://*.r2.cloudflarestorage.com https://*.amazonaws.com");
    expect(directive(csp, "img-src")).toContain("https://*.r2.cloudflarestorage.com");
    expect(directive(csp, "frame-src")).toContain("https://*.r2.cloudflarestorage.com");
    expect(directive(csp, "img-src")).toContain("https://api.example.com");
    expect(directive(csp, "img-src")).toContain("https://res.cloudinary.com");
    expect(directive(csp, "frame-src")).toContain("https://api.example.com");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("dev CSP allows eval + HMR websockets, and no HSTS on http://localhost", () => {
    const csp = contentSecurityPolicy({ fileOrigins: ["http://localhost:4000"], dev: true });
    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(directive(csp, "connect-src")).toContain("ws:");
    expect(csp).not.toContain("upgrade-insecure-requests");
    expect(securityHeaders({ fileOrigins: [], dev: true }).some((h) => h.key === "Strict-Transport-Security")).toBe(false);
  });

  it("plainHttp (desktop app on the office network) leaves out upgrade-insecure-requests", () => {
    expect(contentSecurityPolicy({ fileOrigins: [], dev: false, plainHttp: true })).not.toContain("upgrade-insecure-requests");
    expect(contentSecurityPolicy({ fileOrigins: [], dev: false })).toContain("upgrade-insecure-requests");
  });

  it("originOf keeps only the origin and drops bad values", () => {
    expect(originOf("http://localhost:4000/api/")).toBe("http://localhost:4000");
    expect(originOf("not a url")).toBeNull();
    expect(originOf(undefined)).toBeNull();
  });
});
