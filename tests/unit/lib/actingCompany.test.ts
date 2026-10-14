import { afterEach, describe, expect, it } from "vitest";
import { actingTenantId, clearActingTenant, setActingTenant } from "@/lib/actingCompany";

const TENANT = "01a10000-0000-7000-8000-000000000001";

describe("acting company cookie (super admin direct access)", () => {
  afterEach(() => clearActingTenant());

  it("the company cookie alone is enough (no support session)", () => {
    expect(actingTenantId()).toBeNull();
    setActingTenant(TENANT);
    expect(actingTenantId()).toBe(TENANT);
    expect(document.cookie).toContain(`act_as_tenant=${TENANT}`);
  });

  it("ignores malformed ids, clears the cookie and any legacy session cookie", () => {
    setActingTenant("not-a-company");
    expect(actingTenantId()).toBeNull();
    document.cookie = "act_as_session=01a10000-0000-7000-8000-0000000000f0; Path=/";
    setActingTenant(TENANT);
    expect(document.cookie).not.toContain("act_as_session=0");
    clearActingTenant();
    expect(actingTenantId()).toBeNull();
  });
});
