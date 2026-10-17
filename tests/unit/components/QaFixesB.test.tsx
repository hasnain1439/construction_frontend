import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import { QtyText, QtyUnitText, useUnitLabel } from "@/components/common/QtyText";
import { useRelativeTime } from "@/components/common/useRelativeTime";
import { useReportHeader } from "@/features/reports/views/ReportView";
import { DelayBreakdown } from "@/features/schedule/components/DelayCards";
import { useMilestoneName } from "@/features/schedule/labels";
import { downloadFile } from "@/lib/download";
import { translate, translateEnum } from "@/i18n/useT";
import { makeStore } from "@/store";
import { hydrateUi, initialUiState, normalizeUiLanguage, setLanguage, type UiLanguage } from "@/store/slices/uiSlice";
import { renderWithStore } from "../render";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));

const wrapperFor = (language: UiLanguage) => {
  const store = makeStore({ auth: { me: null, status: "unknown" }, ui: { ...initialUiState, language } });
  const Wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  return Wrapper;
};

describe("QA-B-01 relative time", () => {
  it.each([
    ["en", 60_000, "1 minute ago"],
    ["en", 2 * 86_400_000, "2 days ago"],
    ["roman-ur", 3 * 3_600_000, "3 ghante pehle"],
    ["ur", 2 * 86_400_000, "2 دن پہلے"],
  ] as const)("%s: %i ms ago → %s", (language, ms, text) => {
    const { result } = renderHook(() => useRelativeTime(), { wrapper: wrapperFor(language) });
    expect(result.current(new Date(Date.now() - ms))).toBe(text);
  });

  it("future times and every unit have a text (never a raw key)", () => {
    const { result } = renderHook(() => useRelativeTime(), { wrapper: wrapperFor("en") });
    expect(result.current(new Date(Date.now() + 2 * 3_600_000))).toBe("in 2 hours");
    for (const ms of [5_000, 60_000, 3_600_000, 86_400_000, 40 * 86_400_000, 400 * 86_400_000]) {
      expect(result.current(new Date(Date.now() - ms))).not.toMatch(/app\.time/);
    }
  });
});

describe("QA-B-18 stored language", () => {
  it("normalises server and legacy spellings", () => {
    expect(normalizeUiLanguage("roman")).toBe("roman-ur");
    expect(normalizeUiLanguage("ROMAN_URDU")).toBe("roman-ur");
    expect(normalizeUiLanguage("URDU")).toBe("ur");
    expect(normalizeUiLanguage("klingon")).toBe("en");
  });

  it("hydrating `language: \"roman\"` gives Roman Urdu and translate never crashes", () => {
    const store = makeStore();
    store.dispatch(hydrateUi({ language: "roman" as UiLanguage }));
    expect(store.getState().ui.language).toBe("roman-ur");
    store.dispatch(setLanguage("nonsense" as UiLanguage));
    expect(store.getState().ui.language).toBe("roman-ur");
    expect(translate("roman" as UiLanguage, "common.save")).toBe("Save");
    expect(translateEnum("roman" as UiLanguage, "delayReason", "RAIN")).toBe("Rain");
  });
});

describe("QA-B-19 RTL variant", () => {
  it("mirrors only by dir=rtl, never by :lang(ur) (Roman Urdu is ur-Latn)", () => {
    const css = readFileSync(resolve(__dirname, "../../../src/app/globals.css"), "utf8");
    expect(css).toMatch(/@custom-variant rtl \(&:where\(\[dir="rtl"\], \[dir="rtl"\] \*\)\);/);
    expect(css).not.toMatch(/:lang\(ur\)/);
  });
});

describe("QA-B-04 quantities in Urdu", () => {
  it("renders a negative quantity with its unit as an LTR isolate", () => {
    renderWithStore(<QtyText value={-155.687} unit="cft" />, { ui: { language: "ur" } });
    const el = screen.getByText("-155.687 cft");
    expect(el.tagName).toBe("BDI");
    expect(el).toHaveAttribute("dir", "ltr");
  });
});

describe("QA-B-24 plurals and units", () => {
  it("uses the English singular for n = 1", () => {
    expect(translate("en", "schedule.stoppages.workingDays", { n: 1 })).toBe("1 working day");
    expect(translate("en", "schedule.stoppages.workingDays", { n: 2 })).toBe("2 working days");
    expect(translate("en", "schedule.delays.reasonDays", { reason: "Rain", n: 1 })).toBe("Rain · 1 day");
    expect(translate("en", "schedule.delays.pending", { n: 1 })).toBe("1 stoppage day waiting for approval is not counted yet.");
    expect(translate("roman-ur", "schedule.stoppages.workingDays", { n: 1 })).toBe("1 kaam ke din");
  });

  it("translates common units and keeps hand-typed ones", () => {
    const en = renderHook(() => useUnitLabel(), { wrapper: wrapperFor("en") }).result.current;
    const ur = renderHook(() => useUnitLabel(), { wrapper: wrapperFor("ur") }).result.current;
    expect(en("bag", 10)).toBe("bags");
    expect(ur("bag", 10)).toBe("بوری");
    expect(ur("day", 5)).toBe("دن");
    expect(ur("Kanal", 2)).toBe("Kanal");
    renderWithStore(<QtyUnitText quantity="1" unit="job" />, { ui: { language: "ur" } });
    expect(screen.getByText("1 کام")).toBeInTheDocument();
  });
});

describe("QA-B-05 tax report headers", () => {
  it("translates tax report columns by key and leaves other reports alone", () => {
    const ur = renderHook(() => useReportHeader("wht-summary"), { wrapper: wrapperFor("ur") }).result.current;
    expect(ur({ key: "wht", label: "WHT deducted" })).toBe("کٹا ہوا ٹیکس");
    expect(ur({ key: "somethingNew", label: "Something new" })).toBe("Something new");
    const other = renderHook(() => useReportHeader("cash-book"), { wrapper: wrapperFor("ur") }).result.current;
    expect(other({ key: "wht", label: "API label" })).toBe("API label");
  });
});

describe("QA-B-08 / QA-B-22 delay breakdown", () => {
  it("labels CHANGE_ORDER, hides 0-day reasons and names the progress basis", () => {
    renderWithStore(
      <DelayBreakdown
        delays={{
          originalEnd: "2027-02-15",
          baselineEnd: "2026-10-28",
          plannedEnd: "2027-02-26",
          revisedEnd: "2027-02-23",
          projectedEnd: "2027-03-03",
          pace: 0.96,
          progressPercent: 41.2,
          days: { owner: 3, excusable: 2, contractor: 0, changeOrders: 3, total: 5 },
          aheadDays: 0,
          categories: [
            { category: "OWNER", days: 3, reasons: [{ stoppageId: null, reason: "CHANGE_ORDER", dates: [], days: 3, note: null }] },
            {
              category: "EXCUSABLE",
              days: 2,
              reasons: [
                { stoppageId: "s1", reason: "RAIN", dates: ["2026-10-07", "2026-10-08"], days: 2, note: null },
                { stoppageId: "s2", reason: "RAIN", dates: ["2026-10-11"], days: 0, note: "QA-B rain on a Sunday" },
              ],
            },
            { category: "CONTRACTOR", days: 0, reasons: [] },
          ],
          pending: [],
          changeOrders: { days: 3, items: [] },
        }}
      />,
    );
    expect(screen.getByText("Change order · 3 days")).toBeInTheDocument();
    expect(screen.queryByText(/CHANGE_ORDER/)).toBeNull();
    expect(screen.getByText("Rain · 2 days")).toBeInTheDocument();
    expect(screen.queryByText("QA-B rain on a Sunday")).toBeNull();
    expect(screen.getByText(/schedule progress 41.2% \(by effort\)/)).toBeInTheDocument();
    expect(screen.getByText("Revised end (all excused days)")).toBeInTheDocument();
  });
});

describe("QA-B-26 milestone names", () => {
  it("translates generated milestones by templateKey and keeps renamed ones", () => {
    const ur = renderHook(() => useMilestoneName(), { wrapper: wrapperFor("ur") }).result.current;
    expect(ur({ name: "Paint", templateKey: "FINISHING.PAINT" })).toBe("رنگ");
    expect(ur({ name: "Excavation (khudai)", templateKey: "FOUNDATION_PLINTH.EXCAVATION" })).toBe("کھدائی");
    expect(ur({ name: "Boundary wall", templateKey: null })).toBe("Boundary wall");
    const en = renderHook(() => useMilestoneName(), { wrapper: wrapperFor("en") }).result.current;
    expect(en({ name: "Paint", templateKey: "FINISHING.PAINT" })).toBe("Paint");
  });
});

describe("QA-B-15 export file name", () => {
  it("saves the fetched file under the API's file name", async () => {
    const created: HTMLAnchorElement[] = [];
    const origCreate = document.createElement.bind(document);
    const spy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === "a") {
        vi.spyOn(el as HTMLAnchorElement, "click").mockImplementation(() => {});
        created.push(el as HTMLAnchorElement);
      }
      return el;
    });
    const urlApi = URL as unknown as { createObjectURL?: unknown; revokeObjectURL?: unknown };
    urlApi.createObjectURL = vi.fn(() => "blob:x");
    urlApi.revokeObjectURL = vi.fn();
    const fetchFn = vi.fn(async () => new Response("a,b\n1,2", { status: 200 })) as unknown as typeof fetch;
    await expect(downloadFile("https://files.test/x?dl=1", "tax-invoice-register-2026-10-17.csv", fetchFn)).resolves.toBe("saved");
    expect(created[0]?.download).toBe("tax-invoice-register-2026-10-17.csv");
    spy.mockRestore();
  });

  it("opens the link when the file can't be fetched", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const fetchFn = vi.fn(async () => {
      throw new TypeError("CORS");
    }) as unknown as typeof fetch;
    await expect(downloadFile("https://files.test/x?dl=1", "a.pdf", fetchFn)).resolves.toBe("opened");
    expect(open).toHaveBeenCalledWith("https://files.test/x?dl=1", "_blank", "noopener,noreferrer");
    open.mockRestore();
  });
});
