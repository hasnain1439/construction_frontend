import { describe, expect, it } from "vitest";
import {
  formatPKR,
  formatPKRShort,
  groupSouthAsian,
  multiplyPaisa,
  paisaToRupees,
  percentOfPaisa,
  rupeesToPaisa,
  sumPaisa,
} from "@/lib/money";

describe("formatPKR (South Asian grouping)", () => {
  it("formats crore and lakh amounts", () => {
    expect(formatPKR("1850000000")).toBe("Rs 1,85,00,000");
    expect(formatPKR("147000000")).toBe("Rs 14,70,000");
    expect(formatPKR("950000")).toBe("Rs 9,500");
    expect(formatPKR("100")).toBe("Rs 1");
    expect(formatPKR("0")).toBe("Rs 0");
  });

  it("shows paisa only when non-zero", () => {
    expect(formatPKR("145050")).toBe("Rs 1,450.50");
    expect(formatPKR("145005")).toBe("Rs 1,450.05");
  });

  it("handles negatives, bigints, numbers and empty values", () => {
    expect(formatPKR("-2500000")).toBe("-Rs 25,000");
    expect(formatPKR(BigInt("12345678900"))).toBe("Rs 12,34,56,789");
    expect(formatPKR(45000)).toBe("Rs 450");
    expect(formatPKR(null)).toBe("—");
    expect(formatPKR("abc")).toBe("—");
  });

  it("stays exact beyond Number.MAX_SAFE_INTEGER", () => {
    expect(formatPKR("900719925474099312")).toBe("Rs 9,00,71,99,25,47,40,993.12");
  });

  it("groups digits", () => {
    expect(groupSouthAsian("1")).toBe("1");
    expect(groupSouthAsian("1000")).toBe("1,000");
    expect(groupSouthAsian("100000")).toBe("1,00,000");
    expect(groupSouthAsian("10000000")).toBe("1,00,00,000");
  });
});

describe("formatPKRShort", () => {
  it("uses crore (Cr) and lakh (L)", () => {
    expect(formatPKRShort("1850000000")).toBe("Rs 1.85 Cr");
    expect(formatPKRShort("1920000000")).toBe("Rs 1.92 Cr");
    expect(formatPKRShort("147000000")).toBe("Rs 14.7 L");
    expect(formatPKRShort("118500000")).toBe("Rs 11.85 L");
    expect(formatPKRShort("1000000000")).toBe("Rs 1 Cr");
    expect(formatPKRShort("10000000")).toBe("Rs 1 L");
  });

  it("rounds to 2 decimals", () => {
    expect(formatPKRShort("1856700000")).toBe("Rs 1.86 Cr");
    expect(formatPKRShort("3400000000")).toBe("Rs 3.4 Cr");
    expect(formatPKRShort("34000000000")).toBe("Rs 34 Cr");
  });

  it("falls back to the full amount below a lakh", () => {
    expect(formatPKRShort("950000")).toBe("Rs 9,500");
    expect(formatPKRShort("685050")).toBe("Rs 6,851");
  });
});

describe("rupees ↔ paisa", () => {
  it("converts typed rupees to paisa strings", () => {
    expect(rupeesToPaisa("450")).toBe("45000");
    expect(rupeesToPaisa("1,85,000.50")).toBe("18500050");
    expect(rupeesToPaisa("Rs 9,500")).toBe("950000");
    expect(rupeesToPaisa("0.5")).toBe("50");
    expect(rupeesToPaisa(".75")).toBe("75");
    expect(rupeesToPaisa(1450)).toBe("145000");
    expect(rupeesToPaisa("-12.3")).toBe("-1230");
  });

  it("rounds a third decimal half-up", () => {
    expect(rupeesToPaisa("10.005")).toBe("1001");
    expect(rupeesToPaisa("10.004")).toBe("1000");
  });

  it("rejects invalid input", () => {
    expect(rupeesToPaisa("")).toBeNull();
    expect(rupeesToPaisa("abc")).toBeNull();
    expect(rupeesToPaisa("1.2.3")).toBeNull();
    expect(rupeesToPaisa(null)).toBeNull();
  });

  it("converts paisa back to rupees for inputs", () => {
    expect(paisaToRupees("45000")).toBe("450");
    expect(paisaToRupees("18500050")).toBe("185000.5");
    expect(paisaToRupees("1001")).toBe("10.01");
    expect(paisaToRupees(null)).toBe("");
  });

  it("round-trips crore-sized values", () => {
    const paisa = rupeesToPaisa("18500000")!;
    expect(paisa).toBe("1850000000");
    expect(paisaToRupees(paisa)).toBe("18500000");
  });
});

describe("arithmetic helpers", () => {
  it("sums paisa strings", () => {
    expect(sumPaisa(["100", "250", null, "abc"])).toBe("350");
  });

  it("splits a contract by percent, rounded to the rupee (backend rule)", () => {
    expect(percentOfPaisa("1850000000", 15)).toBe("277500000");
    // 33.33 % of Rs 10,000.50 = Rs 3,333.17 → Rs 3,333
    expect(percentOfPaisa("1000050", 33.33)).toBe("333300");
  });

  it("multiplies a rate by a quantity (labour-only total)", () => {
    // Rs 450 / sq ft × 3,950 sq ft = Rs 17,77,500
    expect(multiplyPaisa("45000", 3950)).toBe("177750000");
    expect(formatPKR(multiplyPaisa("45000", 3950))).toBe("Rs 17,77,500");
  });
});
