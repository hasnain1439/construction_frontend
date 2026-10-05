import { describe, expect, it } from "vitest";
import { formatQty, formatSignedQty, isQtyDraft, normalizeQty, qtyDiff, qtyTimesRate } from "@/lib/quantity";

describe("quantity helpers", () => {
  it("accepts drafts with up to 3 decimals only", () => {
    expect(isQtyDraft("")).toBe(true);
    expect(isQtyDraft("12.")).toBe(true);
    expect(isQtyDraft("0.125")).toBe(true);
    expect(isQtyDraft("0.1255")).toBe(false);
    expect(isQtyDraft("1e3")).toBe(false);
  });

  it("normalises to a plain decimal string", () => {
    expect(normalizeQty("012.500")).toBe("12.5");
    expect(normalizeQty("17,000")).toBe("17000");
    expect(normalizeQty(".5")).toBe("0.5");
    expect(normalizeQty("12.")).toBe("12");
    expect(normalizeQty("1.2345")).toBeNull();
    expect(normalizeQty("")).toBeNull();
  });

  it("qty × rate in exact paisa, rounded half-up like the backend", () => {
    expect(qtyTimesRate("400", "143000")).toBe("57200000");
    expect(qtyTimesRate("2.5", "143000")).toBe("357500");
    expect(qtyTimesRate("0.333", "100")).toBe("33");
    expect(qtyTimesRate("0.005", "100")).toBe("1"); // 0.5 paisa rounds up
    expect(qtyTimesRate(null, "100")).toBeNull();
    expect(qtyTimesRate("10", null)).toBeNull();
  });

  it("differences and formatting", () => {
    expect(qtyDiff("190", "200")).toBe(-10);
    expect(qtyDiff("0.3", "0.1")).toBe(0.2);
    expect(formatQty(5000, "nos")).toBe("5,000 nos");
    expect(formatQty(150000)).toBe("1,50,000");
    expect(formatQty(1, "bag")).toBe("1 bag");
    expect(formatQty(200, "bag")).toBe("200 bags");
    expect(formatSignedQty(2, "bag")).toBe("+2 bags");
    expect(formatSignedQty(-10, "bag")).toBe("-10 bags");
  });
});
