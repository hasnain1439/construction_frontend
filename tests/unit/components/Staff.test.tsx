import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../render";

const calls = vi.hoisted(() => ({ pay: [] as unknown[], create: [] as unknown[] }));
const ok = (bucket: unknown[]) => () => [
  (arg: unknown) => {
    bucket.push(arg);
    return { unwrap: async () => ({}) };
  },
  { isLoading: false },
];

vi.mock("@/api/services/companyAccounts.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/companyAccounts.api")>()),
  useGetCompanyAccountGroupsQuery: () => ({ data: [], isLoading: false }),
  useGetCompanyAccountsQuery: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/api/services/staff.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/staff.api")>()),
  usePaySalaryMutation: ok(calls.pay),
  useCreateStaffMutation: ok(calls.create),
}));

const { SalarySlideOver, StaffSlideOver, salaryNet } = await import("@/features/finance/components/StaffSlideOvers");

const imran = { id: "s1", name: "Imran Ali", monthlySalaryPaisa: "6000000", advanceDuePaisa: "1000000" };

describe("office staff salaries", () => {
  it("net = salary + bonus − deduction − advance cut; empty cut takes the advance due, up to the salary", () => {
    const base = { basicPaisa: "6000000", bonusPaisa: null, deductionPaisa: null, advanceCutPaisa: null };
    expect(salaryNet(base, "1000000")).toBe(BigInt(5000000));
    expect(salaryNet({ ...base, bonusPaisa: "200000", deductionPaisa: "100000", advanceCutPaisa: "500000" }, "1000000")).toBe(BigInt(5600000));
    expect(salaryNet(base, "9000000")).toBe(BigInt(0));
    expect(salaryNet({ ...base, advanceCutPaisa: "0" }, "1000000")).toBe(BigInt(6000000));
  });

  it("paying a month sends only what differs from the defaults and shows the net", async () => {
    calls.pay.length = 0;
    const user = userEvent.setup();
    renderWithStore(<SalarySlideOver staff={imran} month="2026-10" onClose={() => {}} />);
    expect(screen.getByText(/Net to pay/)).toHaveTextContent("50,000");
    await user.click(screen.getByRole("button", { name: "Pay salary" }));
    await vi.waitFor(() => expect(calls.pay).toHaveLength(1));
    const { staffId, body } = calls.pay[0] as { staffId: string; body: Record<string, unknown> };
    expect(staffId).toBe("s1");
    expect(body).toMatchObject({ month: "2026-10", paidVia: "CASH" });
    expect(body).not.toHaveProperty("basicPaisa");
    expect(body).not.toHaveProperty("advanceCutPaisa");
  });

  it("adding staff leaves out empty optional fields", async () => {
    calls.create.length = 0;
    const user = userEvent.setup();
    renderWithStore(<StaffSlideOver staff={null} onClose={() => {}} />);
    await user.type(screen.getByLabelText(/^Name/), "Shahid");
    await user.type(screen.getByLabelText(/Monthly salary/), "30000");
    await user.type(screen.getByLabelText(/^Job/), "Office boy");
    await user.click(screen.getByRole("button", { name: "Add staff" }));
    await vi.waitFor(() => expect(calls.create).toHaveLength(1));
    expect(calls.create[0]).toEqual({ name: "Shahid", designation: "Office boy", monthlySalaryPaisa: "3000000" });
  });
});
