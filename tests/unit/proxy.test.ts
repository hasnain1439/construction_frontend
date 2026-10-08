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
    for (const path of [
      "/login",
      "/otp?phone=1",
      "/signup",
      "/invite/abc",
      "/suspended",
      "/reset-password",
    ]) {
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

describe("proxy: super admin working inside a company (Company data)", () => {
  const acting = { admin_access_token: "jwt", act_as_tenant: "01a10000-0000-7000-8000-000000000001" };

  it("sends company links into the admin console", () => {
    expect(location(proxy(req("/suppliers-stock/purchases/abc?tab=x", acting)))).toBe(
      "http://localhost:3000/admin/data/suppliers-stock/purchases/abc?tab=x",
    );
    expect(location(proxy(req("/", acting)))).toBe("http://localhost:3000/admin/data/dashboard");
  });

  it("does nothing without the admin's own sign-in cookie, or without a chosen company", () => {
    expect(
      location(proxy(req("/dashboard", { access_token: "jwt", act_as_tenant: acting.act_as_tenant }))),
    ).toBeNull();
    expect(location(proxy(req("/dashboard", { admin_access_token: "jwt", access_token: "jwt" })))).toBeNull();
  });

  it("leaves admin and public pages alone", () => {
    expect(location(proxy(req("/admin/data/projects", acting)))).toBeNull();
    expect(location(proxy(req("/login", acting)))).toBeNull();
  });
});
