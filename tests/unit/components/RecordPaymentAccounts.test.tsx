import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyAccount, CompanyAccountGroup } from "@/api/types";
import { RecordPaymentSlideOver } from "@/features/billing/components/BillingSlideOvers";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

const api = vi.hoisted(() => ({
  groups: [] as CompanyAccountGroup[],
  accounts: [] as CompanyAccount[],
  record: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/api/services/companyAccounts.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/companyAccounts.api")>()),
  useGetCompanyAccountGroupsQuery: () => ({ data: api.groups, isLoading: false }),
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

const BANK: CompanyAccountGroup = { id: "g-bank", name: "Bank", type: "BANK", accountCount: 2, balancePaisa: "0" };
const CASH: CompanyAccountGroup = { id: "g-cash", name: "Cash", type: "CASH", accountCount: 1, balancePaisa: "0" };
const ONLINE: CompanyAccountGroup = { id: "g-online", name: "Online", type: "WALLET", accountCount: 0, balancePaisa: "0" };
const CARD: CompanyAccountGroup = { id: "g-card", name: "Credit card", type: "BANK", accountCount: 1, balancePaisa: "0" };

const account = (
  id: string,
  group: CompanyAccountGroup,
  name: string,
  accountNumber: string | null = null,
): CompanyAccount => ({
  id,
  group: { id: group.id, name: group.name, type: group.type },
  name,
  accountTitle: accountNumber ? "Malik & Sons" : null,
  accountNumber,
  iban: null,
  branch: null,
  note: null,
  isActive: true,
  balancePaisa: "0",
  openingBalancePaisa: "0",
  paymentCount: 0,
  createdAt: "2026-11-06T09:00:00.000Z",
  updatedAt: "2026-11-06T09:00:00.000Z",
});

const open = () =>
  renderWithStore(<RecordPaymentSlideOver open onOpenChange={() => {}} projectId="p1" />, {
    me: meFixture("THEKEDAR"),
  });
const choose = async (label: RegExp, option: RegExp) => {
  await userEvent.click(await screen.findByRole("combobox", { name: label }));
  await userEvent.click(await screen.findByRole("option", { name: option }));
};
/** The options of a select; it closes on its first one, which every list here opens on or may pick. */
const optionsOf = async (label: RegExp) => {
  await userEvent.click(await screen.findByRole("combobox", { name: label }));
  const options = await screen.findAllByRole("option");
  const names = options.map((o) => o.textContent);
  await userEvent.click(options[0]!);
  return names;
};

describe("Payment form: the company's groups, then their accounts", () => {
  beforeEach(() => {
    api.record.mockReset();
    api.groups = [BANK, CASH, CARD, ONLINE];
    api.accounts = [
      account("b1", BANK, "HBL", "0123456789"),
      account("b2", BANK, "MCB", "9988776655"),
      account("c1", CASH, "Office cash"),
      account("v1", CARD, "Visa", "4111222233"),
    ];
  });

  it("offers the company's own groups and only the accounts of the chosen one", async () => {
    open();
    expect(await optionsOf(/^Received in/)).toEqual(["Bank", "Cash", "Credit card", "Online"]);
    expect(await optionsOf(/^Account/)).toEqual(["HBL · 0123456789", "MCB · 9988776655"]);
    await choose(/^Received in/, /^Cash$/);
    // An only account fills in by itself; cash has no transfer / cheque choice.
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: /^Account/ })).toHaveTextContent("Office cash"),
    );
    expect(screen.queryByRole("combobox", { name: /^Method/ })).not.toBeInTheDocument();
    await choose(/^Received in/, /^Credit card$/);
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: /^Account/ })).toHaveTextContent("Visa · 4111222233"),
    );
    expect(await optionsOf(/^Method/)).toEqual(["Bank transfer", "Cheque"]);
  });

  it("coming back to a bank-type group keeps a method, and asks for the account", async () => {
    open();
    await choose(/^Received in/, /^Cash$/);
    await choose(/^Received in/, /^Bank$/);
    await waitFor(() => expect(screen.getByRole("combobox", { name: /^Method/ })).toHaveTextContent("Bank transfer"));
    expect(screen.getByRole("combobox", { name: /^Account/ })).not.toHaveTextContent("Office cash");
  });

  it("a group with no account says so and offers to add one", async () => {
    open();
    await choose(/^Received in/, /^Online$/);
    expect(await screen.findByText("No Online account yet")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /^Account/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add account" })).toBeInTheDocument();
  });
});
