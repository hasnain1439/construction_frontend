import { describe, expect, it } from "vitest";
import { BILLING_ACCESS, COMPANY_NAV, PROJECT_NAV } from "@/lib/navigation";
import { canAccess } from "@/lib/permissions";
import { meFixture } from "../fixtures";

const billingItems = (me: ReturnType<typeof meFixture>) => {
  const section = PROJECT_NAV.find((s) => s.id === "p.billing")!;
  return canAccess(me, section.access) ? section.items.filter((i) => canAccess(me, i.access)).map((i) => i.id) : [];
};

describe("billing visibility", () => {
  it("a PM without financials has no Billing menu and no money cards", () => {
    const pm = meFixture("PM");
    expect(billingItems(pm)).toEqual([]);
    expect(canAccess(pm, BILLING_ACCESS)).toBe(false);
    expect(canAccess(meFixture("MUNSHI"), BILLING_ACCESS)).toBe(false);
  });

  it("a PM with financials and the owner see the four billing pages (built, not ComingSoon)", () => {
    const expected = ["p.billing.schedule", "p.billing.invoices", "p.billing.received", "p.billing.statement"];
    expect(billingItems(meFixture("PM", { canSeeFinancials: true }))).toEqual(expected);
    expect(billingItems(meFixture("THEKEDAR"))).toEqual(expected);
    expect(canAccess(meFixture("PM", { canSeeFinancials: true }), BILLING_ACCESS)).toBe(true);
    expect(PROJECT_NAV.find((s) => s.id === "p.billing")!.items.every((i) => i.available)).toBe(true);
  });

  it("Finance → Receivables is available to the owner only", () => {
    const finance = COMPANY_NAV.find((s) => s.id === "finance")!;
    const receivables = finance.items.find((i) => i.id === "finance.receivables")!;
    expect(receivables.available).toBe(true);
    expect(canAccess(meFixture("THEKEDAR"), receivables.access)).toBe(true);
    expect(canAccess(meFixture("PM", { canSeeFinancials: true }), receivables.access)).toBe(false);
  });
});
