/**
 * QA re-test fixes, area B (R2) + the R1 text leftovers:
 *   R2-B-01  Urdu dates with Urdu month names are RTL islands (never LTR-isolated)
 *   QA-B-04  money is an LTR island on Urdu pages ("-Rs 36,470", never "Rs 36,470-")
 *   QA-A-10 / QA-A-28 / QA-B-24  units in the UI language, singular per-unit form, aliases
 *   QA-B-24 / QA-A-32 / R1-N4  singular forms in en / roman-ur / ur when the count is 1
 *   QA-B-26  milestone names from refs without templateKey (change orders, variance filter)
 *   R2-B-02  persisted UI: any non-object JSON gives the defaults
 *   R2-B-04  Roman wording ("rows", "late")
 *   QA-B-30  dense wide tables
 */
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it } from "vitest";
import { DENSE_TABLE } from "@/components/common/DataTable";
import { templateKeyOf, useMilestoneName } from "@/features/schedule/labels";
import { en } from "@/i18n/en";
import { SINGULAR } from "@/i18n/plurals";
import { romanUr } from "@/i18n/roman-ur";
import { ur } from "@/i18n/ur";
import { translate, type TranslationKey } from "@/i18n/useT";
import { isolate, LRI, PDI, RLI } from "@/lib/bidi";
import { formatDate, formatDateRange } from "@/lib/dates";
import { formatPKR, formatPKRShort } from "@/lib/money";
import { formatQty, formatSignedQty, perUnitLabel, unitKey, unitLabel } from "@/lib/quantity";
import { makeStore } from "@/store";
import { parsePersistedUi } from "@/store/StoreProvider";
import { hydrateUi, initialUiState, type UiLanguage } from "@/store/slices/uiSlice";

const page = (lang: "en" | "ur" | "ur-Latn") => {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
};
afterEach(() => page("en"));

describe("R2-B-01 — Urdu dates", () => {
  it("a date with an Urdu month name is a right-to-left island; a Latin date a left-to-right one", () => {
    page("ur");
    expect(formatDate("2027-02-17")).toBe(`${RLI}17 فروری 2027${PDI}`);
    expect(formatDate("2027-02-17")).not.toContain(LRI);
    expect(isolate("8 Oct 2026")).toBe(`${LRI}8 Oct 2026${PDI}`);
    expect(formatDateRange("2026-10-12", "2026-10-18").startsWith(RLI)).toBe(true);
  });

  it("no marks on English / Roman pages (and on the server)", () => {
    page("en");
    expect(formatDate("2027-02-17")).toBe("17 Feb 2027");
    page("ur-Latn");
    expect(formatDate("2027-02-17")).toBe("17 Feb 2027");
  });
});

describe("QA-B-04 — money on Urdu pages", () => {
  it("formatted money is an LTR island, so the minus stays in front", () => {
    page("ur");
    expect(formatPKR("-3647000")).toBe(`${LRI}-Rs 36,470${PDI}`);
    expect(formatPKRShort("-12400000")).toBe(`${LRI}-Rs 1.24 L${PDI}`);
    expect(translate("ur", "control.material.qtyImpact", { amount: formatPKRShort("-2802400") })).toContain(`${LRI}-Rs 28,024${PDI}`);
    page("en");
    expect(formatPKR("-3647000")).toBe("-Rs 36,470");
  });
});

describe("QA-A-10 / QA-A-28 / QA-B-24 — units", () => {
  it("aliases and plural spellings map to one unit", () => {
    expect(unitKey("bags")).toBe("bag");
    expect(unitKey("Tons")).toBe("ton");
    expect(unitKey("sq ft")).toBe("sqft");
    expect(unitKey("gallons")).toBe("gallon");
    expect(unitKey("bricks")).toBe("brick");
    expect(unitKey("nos")).toBe("nos");
    expect(unitKey("shuttering plate")).toBeNull();
  });

  it("English plurals and the singular per-unit form", () => {
    expect(unitLabel("bags", 1, "en")).toBe("bag");
    expect(unitLabel("bag", 200, "en")).toBe("bags");
    expect(unitLabel("nos", 1, "en")).toBe("no.");
    expect(unitLabel("nos", 2, "en")).toBe("nos");
    expect(unitLabel("cft", 3, "en")).toBe("cft");
    expect(perUnitLabel("bags", "en")).toBe("bag");
    expect(formatQty(1, "nos")).toBe("1 no.");
  });

  it("Roman Urdu and Urdu words; a unit typed by hand stays as typed", () => {
    expect(unitLabel("bags", 10, "ur")).toBe("بوری");
    expect(unitLabel("kg", 5, "ur")).toBe("کلو");
    expect(unitLabel("brick", 500, "ur")).toBe("اینٹ");
    expect(unitLabel("gallons", 8, "ur")).toBe("گیلن");
    expect(unitLabel("brick", 500, "roman-ur")).toBe("eent");
    expect(unitLabel("shuttering plate", 2, "ur")).toBe("shuttering plate");
  });

  it("on an Urdu page a quantity reads number-then-Urdu-unit, the signed number LTR", () => {
    page("ur");
    expect(formatQty(-155.687, "cft")).toBe(`${RLI}${LRI}-155.687${PDI} مکعب فٹ${PDI}`);
    expect(formatSignedQty(-2, "bag")).toBe(`${RLI}${LRI}-2${PDI} بوری${PDI}`);
    expect(formatQty(5000)).toBe(`${LRI}5,000${PDI}`);
  });
});

describe("QA-B-24 / QA-A-32 / R1-N4 — singular forms", () => {
  it.each([
    ["en", "control.delay.stoppage", { reason: "Rain", days: 1, category: "Excusable" }, "Rain · 1 day (Excusable)"],
    ["en", "changeOrders.list.kpiApprovedHint", { n: 1 }, "1 approved change order"],
    ["en", "sales.live.floorLine", { name: "Mumty", area: "180", rooms: 1, wet: 0 }, "Mumty: 180 sq ft · 1 room (0 wet)"],
    ["roman-ur", "schedule.stoppages.workingDays", { n: 1 }, "1 kaam ka din"],
    ["roman-ur", "schedule.stoppages.workingDays", { n: 2 }, "2 kaam ke din"],
    ["ur", "schedule.stoppages.workingDays", { n: 1 }, "1 کام کا دن"],
    ["ur", "schedule.stoppages.workingDays", { n: 3 }, "3 کام کے دن"],
    ["ur", "sales.live.floorLine", { name: "ممٹی", area: "180", rooms: 1, wet: 0 }, "ممٹی: 180 مربع فٹ · 1 کمرہ (0 گیلا)"],
    ["ur", "changeOrders.list.kpiApprovedHint", { n: 1 }, "1 منظور تبدیلی آرڈر"],
  ] as const)("%s %s %j → %s", (language, key, vars, text) => {
    expect(translate(language as UiLanguage, key as TranslationKey, vars)).toBe(text);
  });

  it("every singular form exists in its catalogue and has the same placeholders", () => {
    const dicts = { en, "roman-ur": romanUr, ur } as const;
    const lookup = (d: unknown, key: string) => key.split(".").reduce<unknown>((n, p) => (n as Record<string, unknown> | undefined)?.[p], d);
    const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
    for (const [language, forms] of Object.entries(SINGULAR)) {
      for (const [key, singular] of Object.entries(forms)) {
        const base = lookup(dicts[language as UiLanguage], key);
        expect(typeof base, `${language} ${key}`).toBe("string");
        expect(names(singular!), `${language} ${key}`).toBe(names(base as string));
      }
    }
  });
});

describe("QA-B-26 — milestone names from refs", () => {
  it("translates a generated milestone by its key while the name is unchanged", () => {
    expect(templateKeyOf({ key: "FINISHING.PAINT", name: "Paint" })).toBe("FINISHING.PAINT");
    expect(templateKeyOf({ key: "FINISHING.PAINT", name: "Paint (owner colours)" })).toBeNull();
    const store = makeStore({ auth: { me: null, status: "unknown" }, ui: { ...initialUiState, language: "ur" } });
    const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
    const { result } = renderHook(() => useMilestoneName(), { wrapper });
    expect(result.current({ key: "FINISHING.PAINT", name: "Paint" })).toBe(ur.enum.milestoneTemplate["FINISHING.PAINT"]);
    expect(result.current({ key: "CUSTOM.1", name: "Boundary wall" })).toBe("Boundary wall");
  });
});

describe("R2-B-02 — persisted UI", () => {
  it.each(["null", "42", '"ur"', "[1,2]", "{not json", "true"])("%s gives the defaults", (raw) => {
    expect(parsePersistedUi(raw)).toEqual({});
  });

  it("keeps only well-typed fields; the reducer ignores a null payload", () => {
    expect(parsePersistedUi('{"railCollapsed":"yes","language":"roman"}')).toEqual({ language: "roman-ur" });
    expect(parsePersistedUi('{"railCollapsed":true,"language":7}')).toEqual({ railCollapsed: true });
    const store = makeStore();
    expect(() => store.dispatch(hydrateUi(null as never))).not.toThrow();
    expect(store.getState().ui.railCollapsed).toBe(false);
  });
});

describe("R2-B-04 — Roman wording", () => {
  it("no English 'rows' / 'late' left in the Roman texts", () => {
    expect(translate("roman-ur", "billing.reports.nRows", { n: 20 })).toBe("20 qataarein");
    expect(translate("roman-ur", "control.delay.summary", { behind: 1, late: 0, finished: 6, total: 13 })).not.toMatch(/\blate\b/);
  });
});

describe("QA-B-30 — dense tables", () => {
  it("small text, tight padding, wrapping headers", () => {
    expect(DENSE_TABLE).toContain("[&_table]:text-xs");
    expect(DENSE_TABLE).toContain("[&_th]:whitespace-normal");
    expect(DENSE_TABLE).toContain("[&_td]:px-1.5");
  });
});
