import { screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ChangeOrderDetail, ChangeOrderList, ChangeOrderRateOptions, ChangeOrderStatus, ProjectDetail } from "@/api/types";
import { PROJECT_NAV } from "@/lib/navigation";
import { can, canAccess } from "@/lib/permissions";
import { translate } from "@/i18n/useT";
import { allowedActions, builderTotals, priceRateOf, proofProblem, stepIndex } from "@/features/change-orders/calc";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

const rs = (n: number) => String(Math.round(n * 100));

const DETAIL: ChangeOrderDetail = {
  id: "co1",
  projectId: "p1",
  number: 1,
  code: "CO-001",
  title: "Extra bathroom tiles",
  description: "Up to the ceiling",
  type: "ADDITION",
  status: "SENT",
  source: "MANUAL",
  siteInstructionId: null,
  snagId: null,
  daysImpact: 3,
  affectedMilestones: [{ id: "m1", key: "FINISHING.TILES", name: "Tiles", stageKey: "FINISHING" }],
  proofType: null,
  proofNote: null,
  proofCount: 0,
  lineCount: 1,
  billingMode: null,
  invoice: null,
  sentAt: "2026-10-10T07:00:00.000Z",
  approvedOn: null,
  approvedAt: null,
  approvedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  startedAt: null,
  completedAt: null,
  billedAt: null,
  createdBy: { id: "u1", name: "Khalid Malik" },
  createdAt: "2026-10-10T06:30:00.000Z",
  updatedAt: "2026-10-10T07:00:00.000Z",
  markupPercent: 10,
  costPaisa: rs(20000),
  markupPaisa: rs(2000),
  totalPaisa: rs(22000),
  lines: [
    {
      id: "l1",
      sortOrder: 1,
      kind: "OTHER",
      materialId: null,
      laborRateId: null,
      description: "Wall tiles to the ceiling",
      unit: "sqft",
      quantity: 100,
      rateSource: "MANUAL",
      ratePaisa: rs(200),
      amountPaisa: rs(20000),
      priceRatePaisa: rs(220),
      priceAmountPaisa: rs(22000),
    },
  ],
  proofFiles: [],
  siteInstruction: null,
  snag: null,
  project: { id: "p1", code: "MSB-2026-012", name: "DHA Phase 6", status: "ACTIVE" },
};

const LIST: ChangeOrderList = {
  items: [DETAIL],
  summary: {
    approvedCount: 1,
    daysImpact: 3,
    originalEndDate: "2027-02-15",
    revisedEndDate: "2027-02-18",
    approvedChangesPaisa: rs(22000),
    originalContractPaisa: rs(18500000),
    revisedContractPaisa: rs(18522000),
    byStatus: { DRAFT: 0, SENT: 1, APPROVED: 0, REJECTED: 0, IN_PROGRESS: 0, COMPLETED: 0, BILLED: 0 },
    newSiteInstructions: 2,
    changeOrderSnags: [{ id: "s1", code: "SN-007", description: "Bigger window", status: "OPEN", amountPaisa: rs(25000) }],
    pendingPaisa: rs(22000),
  },
};

const RATES: ChangeOrderRateOptions = {
  estimate: { id: "e1", revision: 1 },
  materials: [{ materialId: "mat1", name: "Floor tiles", unit: "sqft", rateSource: "ESTIMATE", ratePaisa: rs(220) }],
  labour: [{ laborRateId: "lr1", kind: "SUBCONTRACT", label: "Tile laying", unit: "sqft", ratePaisa: rs(45) }],
  milestones: [{ id: "m1", key: "FINISHING.TILES", name: "Tiles", stageKey: "FINISHING", status: "PLANNED" }],
};

const mutation = () => () => [vi.fn(), { isLoading: false }];
vi.mock("@/api/services/changeOrders.api", () => ({
  useGetChangeOrdersQuery: () => ({ data: LIST, isLoading: false }),
  useGetChangeOrderQuery: () => ({ data: DETAIL, isLoading: false }),
  useGetChangeOrderRatesQuery: () => ({ data: RATES, isLoading: false }),
  useCreateChangeOrderMutation: mutation(),
  useUpdateChangeOrderMutation: mutation(),
  useDeleteChangeOrderMutation: mutation(),
  useChangeOrderStepMutation: mutation(),
  useApproveChangeOrderMutation: mutation(),
  useRejectChangeOrderMutation: mutation(),
  useBillChangeOrderMutation: mutation(),
  useGetChangeOrderPdfMutation: mutation(),
  useGetSiteInstructionsQuery: () => ({ data: { items: [], summary: { new: 0, converted: 0, dismissed: 0 } }, isLoading: false }),
  useCreateSiteInstructionMutation: mutation(),
  useConvertSiteInstructionMutation: mutation(),
  useDismissSiteInstructionMutation: mutation(),
  useSnagToChangeOrderMutation: mutation(),
}));
vi.mock("@/api/services/attachments.api", () => ({ useUploadAttachmentMutation: () => [vi.fn(), { isLoading: false }] }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock("@/features/projects/views/ProjectModeViews", () => ({
  ProjectPageShell: ({ children }: { children: (p: unknown) => ReactNode }) => <div>{children({ id: "p1", status: "ACTIVE", client: { phone: null } })}</div>,
}));

const { ChangeOrdersList } = await import("@/features/change-orders/ChangeOrdersView");
const { ChangeOrderDetailBody } = await import("@/features/change-orders/ChangeOrderDetailView");
const { ChangeOrderBuilder } = await import("@/features/change-orders/ChangeOrderBuilder");
const { ContractCard, ClientCard } = await import("@/features/projects/components/ProjectSections");

const en = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate("en", key, vars);

describe("Change orders — maths (mirrors the API)", () => {
  it("price rate = rate × (1 + markup); totals; a deduction is negative; incomplete lines are not counted", () => {
    expect(priceRateOf(BigInt(4500), 10).toString()).toBe("4950");
    expect(priceRateOf(BigInt(333), 12.5).toString()).toBe("375"); // 374.625 → 375
    const t = builderTotals(
      [
        { quantity: "100", ratePaisa: rs(200) },
        { quantity: "40", ratePaisa: rs(100) },
        { quantity: null, ratePaisa: rs(50) },
      ],
      10,
      "ADDITION",
    );
    expect(t).toMatchObject({ costPaisa: rs(24000), totalPaisa: rs(26400), markupPaisa: rs(2400), incomplete: 1 });
    expect(t.lines[0]).toEqual({ amountPaisa: rs(20000), priceRatePaisa: rs(220), priceAmountPaisa: rs(22000) });
    expect(builderTotals([{ quantity: "800", ratePaisa: rs(45) }], 0, "DEDUCTION").totalPaisa).toBe(`-${rs(36000)}`);
    expect(builderTotals([{ quantity: "2.5", ratePaisa: "333" }], 0, "ADDITION").costPaisa).toBe("833"); // 832.5 → 833
  });

  it("proof rules: verbal needs a note, screenshot / slip a file", () => {
    expect(proofProblem(null, "", 0)).toBe("PROOF_REQUIRED");
    expect(proofProblem("VERBAL", "ok", 0)).toBe("PROOF_NOTE_REQUIRED");
    expect(proofProblem("VERBAL", "Owner agreed on site", 0)).toBeNull();
    expect(proofProblem("WHATSAPP_SCREENSHOT", "", 0)).toBe("PROOF_FILE_REQUIRED");
    expect(proofProblem("SIGNED_SLIP", "", 1)).toBeNull();
  });
});

describe("Change orders — stepper actions by status and permission", () => {
  const owner = meFixture("THEKEDAR");
  const pm = meFixture("PM");
  const ownerCan = (k: Parameters<typeof can>[1]) => can(owner, k);
  const pmCan = (k: Parameters<typeof can>[1]) => can(pm, k);

  it.each<[ChangeOrderStatus, string[]]>([
    ["DRAFT", ["edit", "send", "approve", "reject", "delete"]],
    ["SENT", ["approve", "reject", "reopen"]],
    ["REJECTED", ["reopen"]],
    ["APPROVED", ["start", "complete", "bill"]],
    ["IN_PROGRESS", ["complete", "bill"]],
    ["COMPLETED", ["bill"]],
    ["BILLED", []],
  ])("owner, %s → %j", (status, actions) => {
    expect(allowedActions(status, ownerCan)).toEqual(actions);
  });

  it("the PM records approval but cannot bill; a change order on an invoice is not billed again", () => {
    expect(allowedActions("SENT", pmCan)).toEqual(["approve", "reject", "reopen"]);
    expect(allowedActions("APPROVED", pmCan)).toEqual(["start", "complete"]);
    expect(allowedActions("COMPLETED", ownerCan, { onInvoice: true })).toEqual([]);
    expect(stepIndex("REJECTED")).toBe(1);
    expect(stepIndex("BILLED")).toBe(5);
  });

  it("detail: the SENT step is current; owner sees approve / reject / reopen and the slip actions", () => {
    renderWithStore(<ChangeOrderDetailBody co={DETAIL} projectId="p1" editable />, { me: meFixture("THEKEDAR") });
    expect(screen.getByTestId("step-DRAFT")).toHaveAttribute("data-state", "done");
    expect(screen.getByTestId("step-SENT")).toHaveAttribute("data-state", "current");
    const bar = screen.getByTestId("co-actions");
    expect(within(bar).getAllByRole("button").map((b) => b.textContent)).toEqual([en("changeOrders.actions.approve"), en("changeOrders.actions.reject"), en("changeOrders.actions.reopen")]);
    expect(screen.getByRole("button", { name: "WhatsApp" })).toBeInTheDocument();
    expect(screen.getAllByText("Rs 22,000").length).toBeGreaterThan(0);
  });

  it("detail: REJECTED shows the rejected step and only “back to draft”; a Munshi-like viewer gets no money and no actions", () => {
    renderWithStore(<ChangeOrderDetailBody co={{ ...DETAIL, status: "REJECTED", rejectionReason: "Too costly" }} projectId="p1" editable />, { me: meFixture("PM") });
    expect(screen.getByTestId("step-SENT")).toHaveAttribute("data-state", "rejected");
    expect(within(screen.getByTestId("co-actions")).getAllByRole("button").map((b) => b.textContent)).toEqual([en("changeOrders.actions.reopen")]);
    const { container } = renderWithStore(
      <ChangeOrderDetailBody co={{ ...DETAIL, costPaisa: undefined, markupPaisa: undefined, totalPaisa: undefined, markupPercent: undefined, lines: DETAIL.lines.map(({ ratePaisa, amountPaisa, priceRatePaisa, priceAmountPaisa, ...l }) => l) }} projectId="p1" editable />,
      { me: meFixture("MUNSHI", { permissions: ["projects.project.view", "changeorder.view"] }) },
    );
    expect(within(container).queryByTestId("co-actions")).toBeNull();
    expect(within(container).queryByRole("button", { name: "WhatsApp" })).toBeNull();
    expect(container.textContent).not.toContain("Rs 22,000");
  });
});

describe("Change orders — builder", () => {
  it("live totals from the lines (cost, markup, owner price) for a user who sees rates", () => {
    renderWithStore(<ChangeOrderBuilder projectId="p1" options={RATES} initial={DETAIL} />, { me: meFixture("THEKEDAR") });
    const totals = screen.getByTestId("builder-totals");
    expect(within(totals).getByText("Rs 20,000")).toBeInTheDocument();
    expect(within(totals).getByText("Rs 2,000")).toBeInTheDocument();
    expect(within(screen.getByTestId("builder-total")).getByText("Rs 22,000")).toBeInTheDocument();
    expect(screen.getByLabelText(en("changeOrders.builder.markup"))).toHaveValue("10");
  });

  it("without fields.rates: no rate inputs, no totals, a note that the server fills the rates", () => {
    renderWithStore(<ChangeOrderBuilder projectId="p1" options={{ ...RATES, materials: RATES.materials.map(({ ratePaisa, ...m }) => m) }} initial={DETAIL} />, {
      me: meFixture("PM", { deny: ["fields.rates"] }),
    });
    expect(screen.queryByTestId("builder-totals")).toBeNull();
    expect(screen.queryByLabelText(en("changeOrders.builder.markup"))).toBeNull();
    expect(screen.getByText(en("changeOrders.builder.ratesHidden"))).toBeInTheDocument();
  });
});

describe("Change orders — list, navigation, overview", () => {
  it("KPIs (approved changes, revised contract, revised end), the list and CHANGE_ORDER snags", () => {
    renderWithStore(<ChangeOrdersList projectId="p1" editable />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("CO-001")).toBeInTheDocument();
    expect(screen.getByText("Rs 1,85,22,000")).toBeInTheDocument();
    expect(screen.getByText(en("changeOrders.list.kpiDaysValue", { n: 3 }))).toBeInTheDocument();
    expect(screen.getByText(en("changeOrders.list.instructionsWaiting", { n: 2 }))).toBeInTheDocument();
    expect(within(screen.getByTestId("co-snag-SN-007")).getByRole("button", { name: en("changeOrders.list.convertSnag") })).toBeInTheDocument();
  });

  it("menu: owner and PM see change orders; the Munshi only site instructions", () => {
    const section = PROJECT_NAV.find((s) => s.id === "p.changes")!;
    expect(section.items.every((i) => i.available)).toBe(true);
    const visible = (role: "THEKEDAR" | "PM" | "MUNSHI") => section.items.filter((i) => canAccess(meFixture(role), i.access)).map((i) => i.id);
    expect(visible("THEKEDAR")).toEqual(["p.changes.all", "p.changes.new", "p.changes.instructions"]);
    expect(visible("PM")).toEqual(["p.changes.all", "p.changes.new", "p.changes.instructions"]);
    expect(visible("MUNSHI")).toEqual(["p.changes.instructions"]);
  });

  it("overview cards show the revised contract and the revised end date", () => {
    const project = {
      id: "p1",
      status: "ACTIVE",
      startDate: "2026-03-16",
      endDate: "2027-02-15",
      client: { id: "c1", name: "Ahmed Raza" },
      contract: { contractType: "FULL", billingModel: "STAGE_SCHEDULE", contractValuePaisa: rs(18500000), contractTotalPaisa: rs(18500000), retentionPercent: 5, defectPeriodMonths: 6 },
      billingStages: [],
      changeOrders: LIST.summary,
    } as unknown as ProjectDetail;
    renderWithStore(
      <>
        <ContractCard project={project} />
        <ClientCard project={project} />
      </>,
      { me: meFixture("THEKEDAR") },
    );
    expect(screen.getByText(en("changeOrders.project.revisedContract"))).toBeInTheDocument();
    expect(screen.getByText("Rs 1,85,22,000")).toBeInTheDocument();
    expect(screen.getByText(en("changeOrders.project.revisedEnd"))).toBeInTheDocument();
    expect(screen.getByText(en("changeOrders.project.revisedEndValue", { n: 3 }))).toBeInTheDocument();
  });
});
