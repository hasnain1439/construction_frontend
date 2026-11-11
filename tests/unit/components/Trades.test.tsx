import { renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithStore } from "../render";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import { makeStore } from "@/store";
import { initialUiState } from "@/store/slices/uiSlice";

const trades = [
  { id: "t1", key: "SHUTTERING", label: "Shuttering", labelRoman: null, labelUrdu: null, unit: "SQFT", ratePaisa: "4500", isActive: true, subcontractorCount: 2 },
  { id: "t2", key: "FALSE_CEILING", label: "False ceiling", labelRoman: "Chhat ki jaali", labelUrdu: "فالس سیلنگ", unit: "SQFT", ratePaisa: "6000", isActive: true, subcontractorCount: 0 },
  { id: "t3", key: "GLASS_WORK", label: "Glass work", labelRoman: null, labelUrdu: null, unit: "SQFT", ratePaisa: "9000", isActive: false, subcontractorCount: 1 },
];
const update = vi.fn((_a: { id: string; body: Record<string, unknown> }) => ({ unwrap: async () => trades[1] }));
vi.mock("@/api/services/masterData.api", () => ({
  useGetTradesQuery: () => ({ data: trades, isLoading: false }),
  useCreateTradeMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateTradeMutation: () => [update, { isLoading: false }],
}));

const { pickTradeName, useTradeName, useTradeOptions } = await import("@/hooks/useTrades");
const { TradeSlideOver } = await import("@/features/master-data/components/TradeSlideOver");
const { payeeAccountCreate, payeeAccountUpdate } = await import("@/features/master-data/components/PayeeAccountFields");

const wrap = (language: "en" | "roman-ur" | "ur") =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={makeStore({ auth: { me: null, status: "unknown" }, ui: { ...initialUiState, language } })}>{children}</Provider>;
  };

describe("trades", () => {
  it("names: built-in ones in the app's words, the company's own by their names in the UI language", () => {
    const en = renderHook(() => useTradeName(), { wrapper: wrap("en") }).result.current;
    expect(en("SHUTTERING")).toBe("Shuttering");
    expect(en("FALSE_CEILING")).toBe("False ceiling");
    const roman = renderHook(() => useTradeName(), { wrapper: wrap("roman-ur") }).result.current;
    expect(roman("FALSE_CEILING")).toBe("Chhat ki jaali");
    expect(roman("GLASS_WORK")).toBe("Glass work"); // no Roman name → English
    expect(roman("UNKNOWN_KEY", { label: "From the row" })).toBe("From the row");
    expect(pickTradeName({ label: "A", labelUrdu: "ب" }, "ur")).toBe("ب");
  });

  it("options: the active trades, plus the current one when it was switched off", () => {
    const active = renderHook(() => useTradeOptions(), { wrapper: wrap("en") }).result.current.options;
    expect(active.map((o) => o.value)).toEqual(["SHUTTERING", "FALSE_CEILING"]);
    const keep = renderHook(() => useTradeOptions({ current: "GLASS_WORK" }), { wrapper: wrap("en") }).result.current.options;
    expect(keep.map((o) => o.value)).toContain("GLASS_WORK");
  });

  it("edit a trade: only what changed is sent; switching it off", async () => {
    const user = userEvent.setup();
    renderWithStore(<TradeSlideOver open trade={trades[1] as never} onOpenChange={() => {}} />);
    const name = screen.getByLabelText("Name (English)");
    await user.clear(name);
    await user.type(name, "Ceiling");
    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(update).toHaveBeenCalledWith({ id: "t2", body: { label: "Ceiling", isActive: false } });
  });
});

describe("payee account", () => {
  it("a new record sends only the filled fields; an edit clears the emptied ones", () => {
    const v = { bankName: "HBL", accountTitle: "", accountNumber: "0123", iban: "" };
    expect(payeeAccountCreate(v)).toEqual({ bankName: "HBL", accountNumber: "0123" });
    expect(payeeAccountUpdate(v)).toEqual({ bankName: "HBL", accountTitle: null, accountNumber: "0123", iban: null });
  });
});
