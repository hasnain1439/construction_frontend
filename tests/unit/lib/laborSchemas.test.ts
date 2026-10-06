import { describe, expect, it } from "vitest";
import { advanceSchema, kharchaSchema, lineAdjustSchema } from "@/features/labor/schemas";
import { newClientId } from "@/features/labor/components/LaborSlideOvers";

const kharcha = {
  category: "FUEL" as const,
  amountPaisa: "565000",
  description: "Diesel for the mixer",
  date: "2026-10-02",
  receipt: null,
  withItems: false,
  supplierId: null,
  items: [{ materialId: null, qty: null }],
};

describe("labour & cash form rules", () => {
  it("kharcha: category and amount are required; goods need seller, bill photo and lines", () => {
    expect(kharchaSchema.safeParse(kharcha).success).toBe(true);
    const noCategory = kharchaSchema.safeParse({ ...kharcha, category: null });
    expect(noCategory.success).toBe(false);
    const goods = kharchaSchema.safeParse({ ...kharcha, category: "URGENT_MATERIAL", withItems: true });
    expect(goods.success).toBe(false);
    const paths = goods.error!.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["supplierId", "receipt", "items.0.materialId", "items.0.qty"]));
    // Plain urgent material (no goods) is fine
    expect(kharchaSchema.safeParse({ ...kharcha, category: "URGENT_MATERIAL" }).success).toBe(true);
  });

  it("peshgi needs a payee and an amount > 0", () => {
    const base = { payeeType: "WORKER", payeeId: "w1", amountPaisa: "500000", date: "2026-09-22", paidFrom: "SITE_CASH", reference: "", note: "" } as const;
    expect(advanceSchema.safeParse(base).success).toBe(true);
    expect(advanceSchema.safeParse({ ...base, payeeId: null }).success).toBe(false);
    expect(advanceSchema.safeParse({ ...base, amountPaisa: "0" }).success).toBe(false);
  });

  it("a settlement override needs a reason", () => {
    expect(lineAdjustSchema.safeParse({ advanceAdjustedPaisa: "0", note: "Wedding at home" }).success).toBe(true);
    expect(lineAdjustSchema.safeParse({ advanceAdjustedPaisa: "0", note: "no" }).success).toBe(false);
  });

  it("client ids are time-ordered UUID v7", () => {
    const a = newClientId();
    const b = newClientId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a.slice(0, 13) <= b.slice(0, 13)).toBe(true);
    expect(a).not.toBe(b);
  });
});
