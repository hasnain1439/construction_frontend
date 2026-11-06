import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminPaymentAccount, PaymentAccount, PlanOption } from "@/api/types";
import { PaymentAccountsView } from "@/features/admin/views/PaymentAccountsView";
import { UploadSlipSlideOver } from "@/features/subscription/components/UploadSlipSlideOver";
import { ADMIN_NAV } from "@/lib/navigation";
import { renderWithStore } from "../render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin/payment-accounts",
  useSearchParams: () => new URLSearchParams(),
}));

const api = vi.hoisted(() => ({
  accounts: [] as unknown[],
  adminAccounts: [] as unknown[],
  submit: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/api/services/subscription.api", () => ({
  useGetPaymentAccountsQuery: () => ({ data: api.accounts, isLoading: false }),
  useSubmitPaymentMutation: () => [api.submit, { isLoading: false }],
}));
vi.mock("@/api/services/admin/paymentAccounts.api", () => ({
  useGetAdminPaymentAccountsQuery: () => ({ data: api.adminAccounts, isLoading: false, isFetching: false }),
  useCreatePaymentAccountMutation: () => [api.create, { isLoading: false }],
  useUpdatePaymentAccountMutation: () => [api.update, { isLoading: false }],
}));
vi.mock("@/components/common/FileUpload", () => ({
  FileUpload: ({ onChange }: { onChange: (v: unknown) => void }) => (
    <button type="button" onClick={() => onChange({ id: "slip1", url: null, fileName: "slip.png", mimeType: "image/png" })}>
      attach slip
    </button>
  ),
}));

const PLANS = [{ id: "p1", code: "PROFESSIONAL", name: "Professional", pricePaisa: "950000" }] as unknown as PlanOption[];
const HBL: PaymentAccount = { id: "a1", name: "HBL", method: "IBFT", accountTitle: "Keystone", accountNumber: "00000000000001", iban: "PK00HABB0000000000000001", note: "Same day please" };
const JAZZ: PaymentAccount = { id: "a2", name: "JazzCash", method: "JAZZCASH", accountTitle: "Keystone", accountNumber: "03000000001", iban: null, note: null };

const openForm = () => renderWithStore(<UploadSlipSlideOver open onOpenChange={vi.fn()} plans={PLANS} defaultPlanId="p1" />);
const fillRest = async () => {
  await userEvent.type(screen.getByRole("textbox", { name: /Transaction ID/ }), "FT2610030117");
  await userEvent.click(screen.getByRole("button", { name: "attach slip" }));
};
const send = () => userEvent.click(screen.getByRole("button", { name: "Submit for review" }));

beforeEach(() => {
  api.accounts = [];
  api.adminAccounts = [];
  for (const fn of [api.submit, api.create, api.update]) {
    fn.mockReset();
    fn.mockReturnValue({ unwrap: async () => ({}) });
  }
});

describe("slip form", () => {
  it("says the exact amount to pay", () => {
    openForm();
    expect(screen.getAllByRole("status").map((el) => el.textContent).join(" ")).toContain("Pay exactly Rs 9,500 for one month of Professional.");
  });

  it("with no accounts it asks for the method, as before", async () => {
    openForm();
    expect(screen.getByRole("combobox", { name: /Paid with/ })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Send the money to/ })).toBeNull();
    await fillRest();
    await send();
    await waitFor(() => expect(api.submit).toHaveBeenCalled());
    expect(api.submit.mock.calls[0]![0]).toMatchObject({ method: "EASYPAISA" });
    expect(api.submit.mock.calls[0]![0]).not.toHaveProperty("paymentAccountId");
  });

  it("with one account it is chosen already, its details show and the method is not asked", async () => {
    api.accounts = [HBL];
    openForm();
    expect(screen.queryByRole("combobox", { name: /Paid with/ })).toBeNull();
    const details = await screen.findByTestId("payment-account-details");
    expect(details).toHaveTextContent("00000000000001");
    expect(details).toHaveTextContent("PK00HABB0000000000000001");
    expect(details).toHaveTextContent("Same day please");
    await fillRest();
    await send();
    await waitFor(() => expect(api.submit).toHaveBeenCalled());
    expect(api.submit.mock.calls[0]![0]).toMatchObject({ paymentAccountId: "a1" });
    expect(api.submit.mock.calls[0]![0]).not.toHaveProperty("method");
  });

  it("with several accounts one must be picked before it sends", async () => {
    api.accounts = [HBL, JAZZ];
    openForm();
    expect(screen.queryByTestId("payment-account-details")).toBeNull();
    await fillRest();
    await send();
    expect(await screen.findByText("Choose the account you sent the money to")).toBeInTheDocument();
    expect(api.submit).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("combobox", { name: /Send the money to/ }));
    await userEvent.click(await screen.findByRole("option", { name: /JazzCash/ }));
    expect(await screen.findByTestId("payment-account-details")).toHaveTextContent("03000000001");
    await send();
    await waitFor(() => expect(api.submit).toHaveBeenCalled());
    expect(api.submit.mock.calls[0]![0]).toMatchObject({ paymentAccountId: "a2" });
  });

  it("copies the number", async () => {
    api.accounts = [JAZZ];
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    openForm();
    await user.click(await screen.findByRole("button", { name: "Copy Account number" }));
    expect(writeText).toHaveBeenCalledWith("03000000001");
  });
});

describe("admin screen", () => {
  const row = { ...HBL, isActive: true, createdAt: "2026-11-06T00:00:00.000Z", updatedAt: "2026-11-06T00:00:00.000Z" } as AdminPaymentAccount;

  it("is on the admin menu", () => {
    expect(ADMIN_NAV.find((i) => i.id === "admin.paymentAccounts")).toMatchObject({ href: "/admin/payment-accounts", available: true });
  });

  it("adds an account; an empty IBAN and note go as null", async () => {
    renderWithStore(<PaymentAccountsView />);
    expect(screen.getByText("No accounts yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add account" }));
    const form = await screen.findByRole("dialog");
    await userEvent.type(within(form).getByRole("textbox", { name: /^Name/ }), "MCB");
    await userEvent.type(within(form).getByRole("textbox", { name: /Account title/ }), "Keystone");
    await userEvent.type(within(form).getByRole("textbox", { name: /Account number/ }), "00000000000002");
    await userEvent.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.create).toHaveBeenCalled());
    expect(api.create.mock.calls[0]![0]).toEqual({ name: "MCB", method: "IBFT", accountTitle: "Keystone", accountNumber: "00000000000002", iban: null, note: null, isActive: true });
  });

  it("closes an account only after confirming", async () => {
    api.adminAccounts = [row];
    renderWithStore(<PaymentAccountsView />);
    await userEvent.click(screen.getByRole("button", { name: /Actions/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Close" }));
    expect(api.update).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole("button", { name: "Close account" }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith({ id: "a1", body: { isActive: false } }));
  });
});
