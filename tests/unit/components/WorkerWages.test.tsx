/**
 * Owner decision 4: worker daily wages follow `fields.wages` (default ON for the Munshi, PM,
 * Accountant and Administrator). Without it the API leaves `dailyRatePaisa` / `ratePaisa` out and
 * refuses rate inputs, so the web hides rate columns and inputs — wage payments keep working.
 */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Settlement, SettlementLine, Worker } from "@/api/types";
import { canSeeField } from "@/lib/permissions";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

const state = vi.hoisted(() => ({ wages: true }));
const calls = vi.hoisted(() => ({ pay: [] as unknown[], update: [] as unknown[] }));

const project = { id: "p1", code: "MSB-2026-012", name: "DHA Phase 6", status: "ACTIVE" };

const WORKER: Worker = {
  id: "w1",
  name: "Aslam Masih",
  type: "MASON",
  typeLabel: "Mason",
  typeLabelRoman: "Mistri",
  typeLabelUrdu: "مستری",
  phone: null,
  isActive: true,
  notes: null,
  createdAt: "2026-09-01T05:00:00.000Z",
};
const worker = (): Worker => (state.wages ? { ...WORKER, dailyRatePaisa: "180000" } : WORKER);

const LINE: SettlementLine = {
  id: "l1",
  worker: { id: "w1", name: "Aslam Masih", type: "MASON" },
  fullDays: 5,
  halfDays: 0,
  daysWorked: 5,
  overtimeHours: 0,
  overtimePaisa: "0",
  grossPaisa: "900000",
  advanceAdjustedPaisa: "0",
  advanceOverride: false,
  overrideNote: null,
  netPaisa: "900000",
  paymentStatus: "UNPAID",
  paidFrom: null,
  paidAt: null,
  cashEntryId: null,
  advances: [],
};
const settlement = (): Settlement => ({
  id: "s1",
  project: { id: "p1", code: "MSB-2026-012", name: "DHA Phase 6" },
  weekStart: "2026-10-12",
  weekEnd: "2026-10-18",
  status: "APPROVED",
  workers: 1,
  daysWorked: 5,
  grossPaisa: "900000",
  advancePaisa: "0",
  netPaisa: "900000",
  paidPaisa: "0",
  unpaidPaisa: "900000",
  fullyPaid: false,
  createdBy: null,
  createdAt: "2026-10-18T05:00:00.000Z",
  submittedBy: null,
  submittedAt: "2026-10-18T06:00:00.000Z",
  approvedBy: null,
  approvedAt: "2026-10-18T07:00:00.000Z",
  returnComment: null,
  lines: [state.wages ? { ...LINE, dailyRatePaisa: "180000" } : LINE],
});

const ok = (bucket: unknown[]) => [
  vi.fn((arg: unknown) => {
    bucket.push(arg);
    return { unwrap: async () => ({ id: "ok", label: "Mason", labelRoman: null, labelUrdu: null }) };
  }),
  { isLoading: false },
];
const idle = () => [vi.fn(), { isLoading: false }];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/workforce/workers",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/onboarding/components/ImportWizard", () => ({ ImportButton: () => null }));
vi.mock("@/api/services/masterData.api", () => ({
  useGetTradesQuery: () => ({ data: [], isLoading: false }),
  useGetWorkersQuery: () => ({
    data: { items: [worker()], meta: { page: 1, limit: 25, total: 1, totalPages: 1 } },
    isLoading: false,
    isFetching: false,
  }),
  useGetSubcontractorsQuery: () => ({ data: { items: [], meta: { page: 1, limit: 25, total: 0, totalPages: 0 } }, isLoading: false }),
  useGetWorkerTypesQuery: () => ({
    data: [
      {
        id: "wt1",
        key: "MASON",
        label: "Mason",
        labelRoman: "Mistri",
        labelUrdu: "مستری",
        ...(state.wages ? { ratePaisa: "180000" } : {}),
        overtimeMultiplier: 1.5,
        isActive: true,
        workerCount: 1,
      },
    ],
    isLoading: false,
  }),
  useSetWorkerActiveMutation: idle,
  useSetSubcontractorActiveMutation: idle,
  useCreateWorkerMutation: idle,
  useUpdateWorkerMutation: () => ok(calls.update),
  useCreateSubcontractorMutation: idle,
  useUpdateSubcontractorMutation: idle,
}));
vi.mock("@/api/services/labor.api", () => ({
  useGetSettlementQuery: () => ({ data: settlement(), isLoading: false }),
  useGenerateSettlementMutation: idle,
  useSubmitSettlementMutation: idle,
  useApproveSettlementMutation: idle,
  useReturnSettlementMutation: idle,
  useAdjustSettlementLineMutation: idle,
  usePaySettlementMutation: () => ok(calls.pay),
}));
vi.mock("@/features/projects/views/ProjectModeViews", () => ({
  ProjectPageShell: ({ children }: { children: (p: unknown, f: unknown) => ReactNode }) => (
    <div>{children(project, { canEdit: true, readOnly: false })}</div>
  ),
}));

const { WorkersView } = await import("@/features/master-data/views/WorkforceViews");
const { WorkerSlideOver } = await import("@/features/master-data/components/WorkforceSlideOvers");
const { SettlementDetailView } = await import("@/features/labor/views/MoneyViews");

const noWagesPm = () => meFixture("PM", { deny: ["fields.wages"] });

describe("fields.wages — the field-access helper", () => {
  it("is on by default for the PM and Munshi templates, and off when denied", () => {
    expect(canSeeField(meFixture("PM"), "wages")).toBe(true);
    expect(canSeeField(meFixture("MUNSHI"), "wages")).toBe(true);
    expect(canSeeField(noWagesPm(), "wages")).toBe(false);
  });

  it("falls back to the fields.wages key when an older API sends no fieldAccess.wages", () => {
    const { wages: _w, ...older } = meFixture("MUNSHI").fieldAccess;
    expect(canSeeField({ ...meFixture("MUNSHI"), fieldAccess: older }, "wages")).toBe(true);
    const denied = noWagesPm();
    const { wages: _d, ...olderDenied } = denied.fieldAccess;
    expect(canSeeField({ ...denied, fieldAccess: olderDenied }, "wages")).toBe(false);
  });
});

describe("fields.wages — workers directory", () => {
  it("shows the daily rate column with fields.wages", () => {
    state.wages = true;
    renderWithStore(<WorkersView />, { me: meFixture("PM") });
    expect(screen.getByRole("columnheader", { name: "Daily rate" })).toBeInTheDocument();
    expect(screen.getByText("Rs 1,800")).toBeInTheDocument();
  });

  it("hides the column (no placeholder) without fields.wages and the rate is absent", () => {
    state.wages = false;
    renderWithStore(<WorkersView />, { me: noWagesPm() });
    expect(screen.getByText("Aslam Masih")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Daily rate" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Rs /)).not.toBeInTheDocument();
  });
});

describe("fields.wages — worker form", () => {
  it("offers the daily rate input with fields.wages", () => {
    state.wages = true;
    renderWithStore(<WorkerSlideOver open worker={worker()} onOpenChange={() => {}} />, { me: meFixture("PM") });
    expect(screen.getByLabelText(/Daily rate/)).toBeInTheDocument();
  });

  it("hides the input and never sends a rate without fields.wages", async () => {
    state.wages = false;
    calls.update.length = 0;
    const user = userEvent.setup();
    renderWithStore(<WorkerSlideOver open worker={worker()} onOpenChange={() => {}} />, { me: noWagesPm() });
    expect(screen.queryByLabelText(/Daily rate/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save worker" }));
    await vi.waitFor(() => expect(calls.update).toHaveLength(1));
    const { body } = calls.update[0] as { body: Record<string, unknown> };
    expect(body).not.toHaveProperty("dailyRatePaisa");
    expect(body).toMatchObject({ name: "Aslam Masih", type: "MASON" });
  });
});

describe("fields.wages — settlements and paying wages", () => {
  it("shows the per-line daily rate with fields.wages", () => {
    state.wages = true;
    renderWithStore(<SettlementDetailView projectId="p1" settlementId="s1" />, { me: meFixture("PM") });
    expect(screen.getByRole("columnheader", { name: "Rate" })).toBeInTheDocument();
    expect(screen.getByText("Rs 1,800")).toBeInTheDocument();
  });

  it("without fields.wages: no rate column, wages / net still shown, and paying still works", async () => {
    state.wages = false;
    calls.pay.length = 0;
    const user = userEvent.setup();
    renderWithStore(<SettlementDetailView projectId="p1" settlementId="s1" />, { me: noWagesPm() });
    expect(screen.queryByRole("columnheader", { name: "Rate" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Rs 9,000").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Pay all" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Pay Rs 9,000/ }));
    await vi.waitFor(() => expect(calls.pay).toHaveLength(1));
    expect(calls.pay[0]).toEqual({ id: "s1", body: { lineIds: ["l1"], paidFrom: "OFFICE_CASH" } });
  });
});
