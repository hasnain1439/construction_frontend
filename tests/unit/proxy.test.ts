// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

const req = (path: string, cookies: Record<string, string> = {}) => {
  const request = new NextRequest(new URL(path, "http://localhost:3000"));
  for (const [name, value] of Object.entries(cookies)) request.cookies.set(name, value);
  return request;
};

const location = (response: Response) => response.headers.get("location");

describe("proxy (route guard by cookie presence)", () => {
  it("sends a signed-out visitor to /login with ?next=", () => {
    const response = proxy(req("/projects?status=ACTIVE"));
    expect(response.status).toBe(307);
    expect(location(response)).toBe("http://localhost:3000/login?next=%2Fprojects%3Fstatus%3DACTIVE");
  });

  it("lets a visitor with the access cookie through", () => {
    const response = proxy(req("/dashboard", { access_token: "jwt" }));
    expect(location(response)).toBeNull();
  });

  it("never guards public pages", () => {
    for (const path of ["/login", "/otp?phone=1", "/signup", "/invite/abc", "/suspended", "/reset-password"]) {
      expect(location(proxy(req(path)))).toBeNull();
    }
  });

  it("guards /admin with the admin cookie, not the company one", () => {
    expect(location(proxy(req("/admin/companies", { access_token: "jwt" })))).toBe(
      "http://localhost:3000/admin/login?next=%2Fadmin%2Fcompanies",
    );
    expect(location(proxy(req("/admin/companies", { admin_access_token: "jwt" })))).toBeNull();
    expect(location(proxy(req("/admin/login")))).toBeNull();
  });
});
