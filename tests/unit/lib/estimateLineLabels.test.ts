import { describe, expect, it } from "vitest";
import type { EstimateLine } from "@/api/types";
import { formulaText, lineText } from "@/features/projects/estimate/labels";
import { en } from "@/i18n/en";
import type { TranslationKey, TranslationVars } from "@/i18n/useT";

/** A plain English `t` over the real dictionary (placeholders filled, missing ones "—"). */
const t = (key: TranslationKey, vars?: TranslationVars): string => {
  const text = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en);
  if (typeof text !== "string") return key;
  return text.replace(/\{(\w+)\}/g, (_m, name: string) => (vars?.[name] !== undefined ? String(vars[name]) : "—"));
};

describe("estimate line labels (QE5 hand-offs)", () => {
  it("translates the scaled wall formula and appends the square-root scale suffix", () => {
    const text = formulaText(
      t,
      {
        key: "wallsScaled",
        params: {
          roomExt: 100,
          roomInt: 50,
          linearScale: 2.0461,
          areaScale: 4.1867,
          roomsPercent: 23,
          perimeter: 180,
          ext: 180,
          int: 126.9,
          height: 10,
          extIn: 9,
          intIn: 4.5,
          windows: 60,
          doors: 80,
        },
      },
      "fallback",
    );
    expect(text).toContain("Rooms cover 23 % of the floor");
    expect(text).toContain("square root of the area factor 4.19");
    expect(text).not.toContain("{");
  });

  it("appends the AREA suffix by scaleKind", () => {
    const text = formulaText(t, { key: "plasterCeiling", params: { coverageScale: 1.5, scaleKind: "AREA", areaScale: 1.5, roomsPercent: 70 } }, "fallback");
    expect(text).toBe("Σ room floor areas × 1.5 (area factor: rooms cover 70 % of the floor)");
  });

  it("never prints [object Object] for an object param", () => {
    const params = { floor: { level: "GROUND", name: "Ground floor" }, length: 10, height: 10, slabIn: 5, windows: 0 } as unknown as Record<string, number | string>;
    expect(formulaText(t, { key: "plasterExternal", params }, "fallback")).not.toContain("[object Object]");
  });

  it("uses the API's plain label for an element the app does not know", () => {
    const line = { kind: "WORK", element: "somethingNew", measure: "VOLUME", material: null, label: "Ground floor · something (volume)" } as unknown as EstimateLine;
    expect(lineText(t, line)).toBe("Ground floor · something (volume)");
  });

  it("the how-it-works mortar text reads the values it is given", () => {
    expect(t("projects.estimate.how.mortar", { bricks: 13.5, mortar: 0.3, dry: 1.27, mix: "1:6" })).toBe(
      "Brickwork: 13.5 bricks per cft; 0.3 cft wet mortar per cft × 1.27 = dry, split by 1:6.",
    );
  });
});
