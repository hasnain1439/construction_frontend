import { afterEach, describe, expect, it } from "vitest";
import { actingSessionId, actingTenantId, clearActingTenant, setActingTenant } from "@/lib/actingCompany";

const TENANT = "01a10000-0000-7000-8000-000000000001";
const SESSION = "01a10000-0000-7000-8000-0000000000f0";

describe("acting company cookies (super admin support session)", () => {
  afterEach(() => clearActingTenant());

  it("needs both the company and the support session", () => {
    expect(actingTenantId()).toBeNull();
    document.cookie = `act_as_tenant=${TENANT}; Path=/`;
    // The company alone is not enough (the API refuses it without X-Act-As-Session).
    expect(actingTenantId()).toBeNull();
    expect(actingSessionId()).toBeNull();
    setActingTenant(TENANT, SESSION);
    expect(actingTenantId()).toBe(TENANT);
    expect(actingSessionId()).toBe(SESSION);
  });

  it("ignores malformed ids and clears both cookies", () => {
    setActingTenant(TENANT, "not-a-session");
    expect(actingSessionId()).toBeNull();
    setActingTenant(TENANT, SESSION);
    clearActingTenant();
    expect(actingTenantId()).toBeNull();
    expect(actingSessionId()).toBeNull();
  });
});
