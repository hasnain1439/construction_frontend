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

describe("payee accounts", () => {
  const cement = { id: "a1", bankName: "HBL", accountTitle: "", accountNumber: "0123", iban: "", forWhat: "Cement" };
  const wallet = { bankName: "JazzCash", accountTitle: "Bashir", accountNumber: "03001234567", iban: "", forWhat: "" };

  it("a new record sends the accounts only when some were added; empties become null", () => {
    expect(payeeAccountCreate({ accounts: [] })).toEqual({});
    expect(payeeAccountCreate({ accounts: [wallet] })).toEqual({ accounts: [{ bankName: "JazzCash", accountTitle: "Bashir", accountNumber: "03001234567", iban: null, forWhat: null }] });
  });

  it("an edit sends the whole list (kept rows with their id; [] removes them all)", () => {
    expect(payeeAccountUpdate({ accounts: [cement, wallet] }).accounts).toEqual([
      { id: "a1", bankName: "HBL", accountTitle: null, accountNumber: "0123", iban: null, forWhat: "Cement" },
      { bankName: "JazzCash", accountTitle: "Bashir", accountNumber: "03001234567", iban: null, forWhat: null },
    ]);
    expect(payeeAccountUpdate({ accounts: [] })).toEqual({ accounts: [] });
  });

  it("the form adds as many accounts as needed and needs a number or an IBAN", async () => {
    const user = userEvent.setup();
    const { FormProbe } = await import("./payeeFormProbe");
    const submitted = vi.fn();
    renderWithStore(<FormProbe onSubmit={submitted} />);
    const add = screen.getByRole("button", { name: "Add account" });
    await user.click(add);
    await user.click(add);
    expect(screen.getByText("Main account")).toBeInTheDocument();
    expect(screen.getByText("Account 2")).toBeInTheDocument();
    const banks = screen.getAllByLabelText(/Bank or wallet/);
    await user.type(banks[0]!, "HBL");
    await user.type(screen.getAllByLabelText(/^For/)[0]!, "Cement");
    await user.type(banks[1]!, "Meezan");
    await user.type(screen.getAllByLabelText("Account number")[0]!, "01234567");
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(await screen.findByText("Write the account number or the IBAN")).toBeInTheDocument();
    expect(submitted).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Remove account 2" }));
    await user.click(screen.getByRole("button", { name: "Go" }));
    await vi.waitFor(() => expect(submitted).toHaveBeenCalledTimes(1));
    expect(submitted.mock.calls[0]![0].accounts).toEqual([{ bankName: "HBL", accountTitle: null, accountNumber: "01234567", iban: null, forWhat: "Cement" }]);
  });
});
