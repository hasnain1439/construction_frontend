import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyAccount } from "@/api/types";
import { RecordPaymentSlideOver } from "@/features/billing/components/BillingSlideOvers";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

const api = vi.hoisted(() => ({ accounts: [] as CompanyAccount[], record: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/api/services/companyAccounts.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/companyAccounts.api")>()),
  useGetCompanyAccountsQuery: () => ({ data: api.accounts, isLoading: false }),
}));
vi.mock("@/api/services/tax.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/tax.api")>()),
  useGetProjectTaxQuery: () => ({ data: undefined, isLoading: false }),
}));
vi.mock("@/api/services/billing.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/billing.api")>()),
  useGetInvoicesQuery: () => ({ data: { items: [] } }),
  useRecordPaymentMutation: () => [api.record, { isLoading: false }],
}));

const account = (
  id: string,
  type: CompanyAccount["type"],
  name: string,
  accountNumber: string | null = null,
): CompanyAccount => ({
  id,
  type,
  name,
  accountTitle: accountNumber ? "Malik & Sons" : null,
  accountNumber,
  iban: null,
  branch: null,
  note: null,
  isActive: true,
  paymentCount: 0,
  createdAt: "2026-11-06T09:00:00.000Z",
  updatedAt: "2026-11-06T09:00:00.000Z",
});

const open = () =>
  renderWithStore(<RecordPaymentSlideOver open onOpenChange={() => {}} projectId="p1" />, {
    me: meFixture("THEKEDAR"),
  });
const choose = async (label: RegExp, option: RegExp) => {
  await userEvent.click(screen.getByRole("combobox", { name: label }));
  await userEvent.click(await screen.findByRole("option", { name: option }));
};
const optionsOf = async (label: RegExp) => {
  await userEvent.click(screen.getByRole("combobox", { name: label }));
  const names = (await screen.findAllByRole("option")).map((o) => o.textContent);
  await userEvent.keyboard("{Escape}");
  return names;
};

describe("Payment form: group, then its accounts", () => {
  beforeEach(() => {
    api.record.mockReset();
    api.accounts = [
      account("c1", "CASH", "Office cash"),
      account("w1", "WALLET", "JazzCash", "03001112222"),
      account("w2", "WALLET", "Easypaisa", "03003334444"),
      account("b1", "BANK", "HBL", "0123456789"),
    ];
  });

  it("shows only the accounts of the chosen group, and fills in an only account", async () => {
    open();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: /^Account/ })).toHaveTextContent("HBL · 0123456789"),
    );
    await choose(/^Method/, /^Online wallet$/);
    expect(await optionsOf(/^Account/)).toEqual(["JazzCash · 03001112222", "Easypaisa · 03003334444"]);
    await choose(/^Method/, /^Cash$/);
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: /^Account/ })).toHaveTextContent("Office cash"),
    );
  });

  it("a group with no account says so and offers to add one", async () => {
    api.accounts = [account("c1", "CASH", "Office cash")];
    open();
    await choose(/^Method/, /^Online wallet$/);
    expect(await screen.findByText("No Online wallet account yet")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /^Account/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add account" })).toBeInTheDocument();
  });
});
