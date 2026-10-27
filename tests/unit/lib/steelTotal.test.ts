import { describe, expect, it } from "vitest";
import { steelKgOf } from "@/features/projects/estimate/labels";

describe("steelKgOf (QA pass 2, NEW-8)", () => {
  it("adds the generic steel line and every bar size — the overview no longer shows #4 only", () => {
    // QA3: #3 968 kg + #4 7,832 kg + #5 1,840 kg = 10,640 kg (the summary showed 7.83 t)
    const materials = [
      { material: "cement", quantity: 1200 },
      { material: "steel10", quantity: 968 },
      { material: "steel12", quantity: 7832 },
      { material: "steel16", quantity: 1840 },
    ];
    expect(steelKgOf(materials)).toBe(10640);
    expect(steelKgOf([{ material: "steel", quantity: 500 }, { material: "steel20", quantity: 100 }])).toBe(600);
    expect(steelKgOf(undefined)).toBe(0);
  });
});
