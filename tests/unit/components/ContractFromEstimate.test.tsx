import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContractSuggestion, ProjectDetail, ProjectEstimate, ProjectReview } from "@/api/types";
import { REVIEW_STEP } from "@/features/projects/constants";
import { ContractFromEstimateCard } from "@/features/projects/estimate/ContractFromEstimateCard";
import { differencePaisa, suggestContractValue, suggestLabourRate, suggestionBreakdown } from "@/features/projects/estimate/contractSuggestion";
import { ContractTab } from "@/features/projects/wizard/ContractTab";
import { EstimateTab } from "@/features/projects/wizard/EstimateTab";
import { ReviewTab } from "@/features/projects/wizard/ReviewTab";
import { WIZARD_FORM_ID, WizardContext, type WizardContextValue } from "@/features/projects/wizard/WizardContext";
import { translate } from "@/i18n/useT";
import { estimateFixture } from "../estimateFixture";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/projects/p1/edit",
  useSearchParams: () => new URLSearchParams(),
}));

const api = vi.hoisted(() => ({
  estimate: undefined as unknown,
  review: undefined as unknown,
  apply: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@/api/services/projects.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/projects.api")>()),
  useGetEstimateQuery: () => ({ data: api.estimate, isLoading: false, refetch: vi.fn() }),
  useGetReviewQuery: () => ({ data: api.review, isLoading: false, refetch: vi.fn() }),
  useContractFromEstimateMutation: () => [api.apply, { isLoading: false }],
  useUpdateContractMutation: () => [api.save, { isLoading: false }],
  useUpdateEstimateSettingsMutation: () => [vi.fn(), { isLoading: false }],
  useGetSupplyPresetsQuery: () => ({ data: [{ contractType: "GREY_OWNER_FINISHING", rules: [] }, { contractType: "FULL", rules: [] }, { contractType: "LABOR_ONLY", rules: [] }] }),
}));
vi.mock("@/api/services/masterData.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/masterData.api")>()),
  useGetQualityCategoriesQuery: () => ({ data: [{ id: "q1", name: "A Standard", code: "A_STD", description: null, isDefault: true, isArchived: false, sortOrder: 1 }] }),
  useGetPaymentTemplatesQuery: () => ({ data: [{ id: "t1", name: "Standard", isDefault: true, stages: [{ label: "Advance", percent: 100 }] }] }),
}));

const PROJECT = {
  id: "p1",
  code: "MSB-2026-020",
  name: "Johar Town 5 Marla",
  status: "DRAFT",
  client: { id: "c1", name: "Ahmed Raza" },
  wizardCompletedSteps: [1, 2, 3, 4, 5],
  billingStages: [],
  supplyRules: [],
  contract: null,
  coverage: { coveredAreaSqft: 1000 },
  team: { pm: null, munshis: [] },
  siteAddress: "House 9",
  city: "Lahore",
} as unknown as ProjectDetail;

/** Cost Rs 60,00,000, labour Rs 10,00,000 on 1,000 sq ft; company margin 20 %, finishing 0 %. */
const suggestion = (over: Partial<ContractSuggestion> = {}): ContractSuggestion => ({
  kind: "CONTRACT_VALUE",
  contractType: "GREY_OWNER_FINISHING",
  basisPaisa: "600000000",
  coveredAreaSqft: 1000,
  marginPercent: 20,
  marginSource: "COMPANY",
  finishingAllowancePercent: 0,
  finishingSource: "COMPANY",
  finishingApplies: false,
  companyMarginPercent: 20,
  companyFinishingAllowancePercent: 0,
  suggestedPaisa: "720000000",
  currentPaisa: null,
  ...over,
});
const estimate = (s: ContractSuggestion | null): ProjectEstimate => ({
  ...estimateFixture(),
  cost: { materialsPaisa: "500000000", ownerSuppliedPaisa: "0", labourPaisa: "100000000", totalPaisa: "600000000", perSqftPaisa: "600000", contractTotalPaisa: null },
  contractSuggestion: s,
  warnings: [],
});

const ctx = (over: Partial<WizardContextValue> = {}): WizardContextValue => ({
  projectId: "p1",
  project: PROJECT,
  locked: false,
  onSaved: vi.fn(),
  setFormState: vi.fn(),
  goTo: vi.fn(),
  ...over,
});
const inWizard = (ui: React.ReactElement, value = ctx(), language: "en" | "ur" = "en") =>
  renderWithStore(<WizardContext.Provider value={value}>{ui}</WizardContext.Provider>, { me: meFixture("THEKEDAR"), ui: { language } });

beforeEach(() => {
  api.apply.mockReset().mockReturnValue({ unwrap: () => Promise.resolve(PROJECT) });
  api.save.mockReset().mockReturnValue({ unwrap: () => Promise.resolve(PROJECT) });
  api.estimate = estimate(suggestion());
  api.review = undefined;
});

describe("contract value calculations", () => {
  it("value = cost × (1 + finishing) × (1 + margin), nearest Rs 1,000", () => {
    expect(suggestContractValue("600000000", 20)).toBe("720000000");
    // Rs 50,12,345.67 × 1.2 = Rs 60,14,814.80 → Rs 60,15,000
    expect(suggestContractValue("501234567", 20)).toBe("601500000");
    // finishing allowance compounds: Rs 1 crore × 1.5 × 1.2 = Rs 1.8 crore
    expect(suggestContractValue("1000000000", 20, 50)).toBe("1800000000");
    expect(suggestContractValue("0", 20)).toBeNull();
    expect(suggestContractValue("600000000", -1)).toBeNull();
  });

  it("labour-only rate = labour × (1 + margin) ÷ covered sq ft, nearest Rs 5", () => {
    expect(suggestLabourRate("80000000", 20, 2000)).toBe("48000");
    expect(suggestLabourRate("77777700", 25, 1850)).toBe("52500");
    expect(suggestLabourRate("52760", 0, 1)).toBe("53000");
    expect(suggestLabourRate("80000000", 20, null)).toBeNull();
  });

  it("breakdown and difference", () => {
    expect(suggestionBreakdown("CONTRACT_VALUE", "1000000000", 20, 50, 1000)).toEqual({
      basis: "1000000000",
      finishing: "500000000",
      margin: "300000000",
      total: "1800000000",
      suggested: "1800000000",
    });
    expect(differencePaisa("720000000", "700000000")).toBe("20000000");
    expect(differencePaisa("720000000", null)).toBeNull();
  });
});

describe("ContractFromEstimateCard", () => {
  it("company margin by default; editing it shows 'Custom for this project' and recomputes", async () => {
    renderWithStore(<ContractFromEstimateCard projectId="p1" estimate={estimate(suggestion())} />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("Contract value from this estimate")).toBeInTheDocument();
    expect(screen.getByTestId("margin-source")).toHaveTextContent("Margin from company settings (20%)");
    const breakdown = screen.getByTestId("contract-breakdown");
    expect(breakdown).toHaveTextContent("Rs 60,00,000");
    expect(breakdown).toHaveTextContent("Rs 72,00,000");
    // grey structure: no finishing allowance field
    expect(screen.queryByLabelText("Finishing allowance")).toBeNull();

    const user = userEvent.setup();
    const margin = screen.getByLabelText("Profit margin");
    await user.clear(margin);
    await user.type(margin, "25");
    expect(screen.getByTestId("margin-source")).toHaveTextContent("Custom for this project (25%)");
    expect(breakdown).toHaveTextContent("Rs 75,00,000");

    // no value yet → applied without a confirmation
    await user.click(screen.getByRole("button", { name: "Use as contract value" }));
    expect(api.apply).toHaveBeenCalledWith({ id: "p1", body: { marginPercent: 25, replace: false } });
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("FULL: finishing allowance compounds before the margin", async () => {
    const s = suggestion({ contractType: "FULL", finishingApplies: true, companyFinishingAllowancePercent: 0 });
    renderWithStore(<ContractFromEstimateCard projectId="p1" estimate={estimate(s)} />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText(/prices no finishing/)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Finishing allowance"), "50");
    // Rs 60,00,000 × 1.5 × 1.2 = Rs 1,08,00,000
    expect(screen.getByTestId("contract-breakdown")).toHaveTextContent("Rs 1,08,00,000");
    await user.click(screen.getByRole("button", { name: "Use as contract value" }));
    expect(api.apply).toHaveBeenCalledWith({ id: "p1", body: { marginPercent: 20, finishingAllowancePercent: 50, replace: false } });
  });

  it("labour-only: suggests a rate per sq ft from the labour", async () => {
    const s = suggestion({ kind: "RATE_PER_SQFT", contractType: "LABOR_ONLY", basisPaisa: "100000000", suggestedPaisa: "120000" });
    renderWithStore(<ContractFromEstimateCard projectId="p1" estimate={estimate(s)} />, { me: meFixture("THEKEDAR") });
    const breakdown = screen.getByTestId("contract-breakdown");
    expect(breakdown).toHaveTextContent("BoQ cost (labour scope)");
    expect(breakdown).toHaveTextContent("1,000 sq ft");
    // Rs 10,00,000 × 1.2 ÷ 1,000 = Rs 1,200
    expect(breakdown).toHaveTextContent("Rs 1,200 / sq ft");
    await userEvent.setup().click(screen.getByRole("button", { name: "Use as rate" }));
    expect(api.apply).toHaveBeenCalledWith({ id: "p1", body: { marginPercent: 20, replace: false } });
  });

  it("an existing value: shows current + difference and asks before overwriting", async () => {
    renderWithStore(<ContractFromEstimateCard projectId="p1" estimate={estimate(suggestion({ currentPaisa: "700000000" }))} />, { me: meFixture("THEKEDAR") });
    expect(screen.getByTestId("contract-current")).toHaveTextContent("Current: Rs 70,00,000");
    expect(screen.getByTestId("contract-current")).toHaveTextContent("Difference: +Rs 2,00,000");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Use as contract value" }));
    expect(api.apply).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Replace the contract value?")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Replace" }));
    expect(api.apply).toHaveBeenCalledWith({ id: "p1", body: { marginPercent: 20, replace: true } });
  });

  it("hidden without fields.contract (or while locked)", () => {
    const { unmount } = renderWithStore(<ContractFromEstimateCard projectId="p1" estimate={estimate(suggestion())} />, {
      me: meFixture("PM", { canSeeFinancials: true, deny: ["fields.contract"] }),
    });
    expect(screen.queryByTestId("contract-from-estimate")).toBeNull();
    unmount();
    renderWithStore(<ContractFromEstimateCard projectId="p1" estimate={estimate(suggestion())} locked />, { me: meFixture("THEKEDAR") });
    expect(screen.queryByTestId("contract-from-estimate")).toBeNull();
  });
});

describe("wizard Estimate step: Finalize estimate", () => {
  it("applies the suggestion without asking when there is no value, then goes to Review", async () => {
    const goTo = vi.fn();
    inWizard(<EstimateTab />, ctx({ goTo }));
    await userEvent.setup().click(screen.getByRole("button", { name: /Finalize estimate/ }));
    expect(api.apply).toHaveBeenCalledWith({ id: "p1", body: { marginPercent: 20, replace: false } });
    await waitFor(() => expect(goTo).toHaveBeenCalledWith(REVIEW_STEP));
  });

  it("asks first when a value exists", async () => {
    api.estimate = estimate(suggestion({ currentPaisa: "700000000" }));
    const goTo = vi.fn();
    inWizard(<EstimateTab />, ctx({ goTo }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Finalize estimate/ }));
    expect(goTo).not.toHaveBeenCalled();
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Replace" }));
    await waitFor(() => expect(goTo).toHaveBeenCalledWith(REVIEW_STEP));
  });

  it("Urdu labels", () => {
    inWizard(<EstimateTab />, ctx(), "ur");
    expect(screen.getByText("اس تخمینے سے ٹھیکے کی رقم")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /تخمینہ مکمل کریں/ })).toBeInTheDocument();
  });
});

describe("Review: apply company margin", () => {
  const review = (codes: string[]) =>
    ({
      ready: false,
      errors: codes.map((code) => ({ tab: 2, code, message: "Enter the contract value" })),
      warnings: [],
      summary: {
        client: null,
        contract: { contractType: "GREY_OWNER_FINISHING", billingModel: "STAGE_SCHEDULE", contractTotalPaisa: null, billingStages: 1, retentionPercent: 5, defectPeriodMonths: 6 },
        plot: { plotUnit: null, plotSize: null, plotAreaSqft: null, frontFt: null, depthFt: null, cornerPlot: false },
        structure: { structureType: null, hasBasement: false, floors: 1 },
        coverage: { coveredAreaSqft: 1000, semiCoveredSqft: 0, openAreaSqft: 0, boundaryWall: false },
        foundation: null,
        roomsPerFloor: [],
        supply: { contractor: 0, owner: 0 },
      },
    }) as unknown as ProjectReview;

  it("one click next to CONTRACT_VALUE_MISSING", async () => {
    api.review = review(["CONTRACT_VALUE_MISSING"]);
    inWizard(<ReviewTab />);
    const button = screen.getByRole("button", { name: "Apply company margin (20%) → Rs 72,00,000" });
    await userEvent.setup().click(button);
    expect(api.apply).toHaveBeenCalledWith({ id: "p1", body: { replace: false } });
  });

  it("project margin is labelled as such; nothing when the value exists", () => {
    api.review = review(["CONTRACT_VALUE_MISSING"]);
    api.estimate = estimate(suggestion({ marginPercent: 25, marginSource: "PROJECT", suggestedPaisa: "750000000" }));
    const { unmount } = inWizard(<ReviewTab />);
    expect(screen.getByRole("button", { name: "Apply project margin (25%) → Rs 75,00,000" })).toBeInTheDocument();
    unmount();
    api.estimate = estimate(suggestion({ currentPaisa: "700000000" }));
    inWizard(<ReviewTab />);
    expect(screen.queryByRole("button", { name: /Apply company margin/ })).toBeNull();
  });
});

describe("ContractTab: value optional until activation", () => {
  const submit = () => userEvent.setup().click(screen.getByRole("button", { name: "submit-test" }));
  const renderTab = (project: ProjectDetail = PROJECT) =>
    inWizard(
      <>
        <ContractTab />
        <button type="submit" form={WIZARD_FORM_ID}>
          submit-test
        </button>
      </>,
      ctx({ project }),
    );

  it("saves without a contract value (sent as null) and shows the 'after the estimate' hint", async () => {
    renderTab();
    expect(screen.getByText("You can fill this after seeing the estimate (step 6) — required before activating.")).toBeInTheDocument();
    await submit();
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    const body = api.save.mock.calls[0]![0].body;
    expect(body).toMatchObject({ contractType: "GREY_OWNER_FINISHING", billingModel: "STAGE_SCHEDULE", contractValuePaisa: null });
    expect(body).not.toHaveProperty("ratePerSqftPaisa");
  });

  it("running bills on a grey contract show the rate per sq ft field and send it", async () => {
    renderTab({ ...PROJECT, contract: { contractType: "GREY_OWNER_FINISHING", billingModel: "RUNNING_BILLS", contractValuePaisa: "1000000000", ratePerSqftPaisa: "150000" } } as unknown as ProjectDetail);
    expect(screen.getByText("Rate per sq ft (for running bills)")).toBeInTheDocument();
    await submit();
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    expect(api.save.mock.calls[0]![0].body).toMatchObject({ contractValuePaisa: "1000000000", ratePerSqftPaisa: "150000" });
  });

  it("labour-only without a rate: no total line, still saves", async () => {
    renderTab({ ...PROJECT, contract: { contractType: "LABOR_ONLY", billingModel: "RUNNING_BILLS", contractValuePaisa: null, ratePerSqftPaisa: null } } as unknown as ProjectDetail);
    expect(screen.queryByTestId("labour-total")).toBeNull();
    await submit();
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    expect(api.save.mock.calls[0]![0].body).toMatchObject({ contractType: "LABOR_ONLY", ratePerSqftPaisa: null });
  });
});

describe("activation toast", () => {
  it("no more 'Phase 2'", () => {
    expect(translate("en", "projects.wizard.activated")).toBe("Project activated.");
    expect(translate("roman-ur", "projects.wizard.activated")).toBe("Project active ho gaya.");
    expect(translate("ur", "projects.wizard.activated")).toBe("پراجیکٹ فعال ہو گیا۔");
  });
});

describe("QA area A: one BoQ cost everywhere, never a silent replace", () => {
  const boqCost = { source: "REVISION" as const, estimateId: "e1", revision: 1, status: "APPROVED" as const, directCostPaisa: "800000000", overheadPaisa: "24000000", contingencyPaisa: "41200000", totalPaisa: "865200000", perSqftPaisa: "865200", coveredAreaSqft: 1000, contractTotalPaisa: "1301500000", marginPaisa: "436300000", marginPercent: 33.52 };
  const withBoq = (over: Partial<ContractSuggestion> = {}) => ({
    ...estimate(suggestion({ basisPaisa: boqCost.totalPaisa, basisSource: "REVISION", estimateId: "e1", estimateRevision: 1, estimateStatus: "APPROVED", ...over })),
    boqCost,
  });

  it("QA-A-01: the wizard KPI, the card and the review show the BoQ total (not the grey-structure cost)", () => {
    api.estimate = withBoq();
    inWizard(<EstimateTab />);
    // KPI tile: BoQ cost with direct + overheads + contingency
    expect(screen.getAllByText("BoQ cost").length).toBeGreaterThan(0);
    expect(screen.getByText(/Direct .*Rs 80,00,000/)).toBeInTheDocument();
    // card starts from the same total and says where it comes from
    expect(screen.getByTestId("contract-breakdown")).toHaveTextContent("Rs 86,52,000");
    expect(screen.getByTestId("contract-basis-source")).toHaveTextContent("BoQ revision 1");
    expect(screen.queryByText("Rs 60,00,000")).toBeNull();
  });

  it("QA-A-02: on the BoQ page the card uses the revision on screen and sends its id", async () => {
    renderWithStore(
      <ContractFromEstimateCard projectId="p1" estimate={withBoq()} basis={{ estimateId: "e2", totalPaisa: "900000000", revision: 2, status: "DRAFT", coveredAreaSqft: 1000 }} />,
      { me: meFixture("THEKEDAR") },
    );
    expect(screen.getByTestId("contract-breakdown")).toHaveTextContent("Rs 90,00,000");
    // Rs 90,00,000 × 1.2
    expect(screen.getByTestId("contract-breakdown")).toHaveTextContent("Rs 1,08,00,000");
    await userEvent.setup().click(screen.getByRole("button", { name: "Use as contract value" }));
    expect(api.apply).toHaveBeenCalledWith({ id: "p1", body: { marginPercent: 20, estimateId: "e2", replace: false } });
  });

  it("QA-A-03: replacing the won quote's price shows current vs new and needs a tick; 'keep current' moves on without a change", async () => {
    api.estimate = withBoq({ currentPaisa: "1301500000" });
    const goTo = vi.fn();
    inWizard(<EstimateTab />, ctx({ goTo, project: { ...PROJECT, createdFromQuoteId: "q1" } }));
    expect(screen.getByTestId("contract-current")).toHaveTextContent("agreed in the won quote");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Finalize estimate/ }));
    const dialog = await screen.findByRole("alertdialog");
    const compare = within(dialog).getByTestId("contract-confirm-compare");
    expect(compare).toHaveTextContent("Agreed quote price");
    expect(compare).toHaveTextContent("Rs 1,30,15,000");
    // Rs 86,52,000 × 1.2 = Rs 1,03,82,400 → Rs 1,03,82,000; difference −Rs 26,33,000
    expect(compare).toHaveTextContent("Rs 1,03,82,000");
    expect(within(dialog).getByTestId("contract-confirm-diff")).toHaveTextContent("−Rs 26,33,000");
    const replace = within(dialog).getByRole("button", { name: "Replace" });
    expect(replace).toBeDisabled();
    await user.click(within(dialog).getByRole("button", { name: "Keep current and continue" }));
    expect(api.apply).not.toHaveBeenCalled();
    expect(goTo).toHaveBeenCalledWith(REVIEW_STEP);

    // replace after the tick
    await user.click(screen.getByRole("button", { name: /Finalize estimate/ }));
    const again = await screen.findByRole("alertdialog");
    await user.click(within(again).getByRole("checkbox"));
    await user.click(within(again).getByRole("button", { name: "Replace" }));
    expect(api.apply).toHaveBeenCalledWith({ id: "p1", body: { marginPercent: 20, replace: true } });
  });
});
