import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContractSuggestion, EstimateWarning, ProjectDetail, ProjectEstimate } from "@/api/types";
import { ContractFromEstimateCard } from "@/features/projects/estimate/ContractFromEstimateCard";
import { isEstimateBlocked, useEstimateWarningText } from "@/features/projects/estimate/warningText";
import { ContractTab } from "@/features/projects/wizard/ContractTab";
import { EstimateTab } from "@/features/projects/wizard/EstimateTab";
import { WIZARD_FORM_ID, WizardContext, type WizardContextValue } from "@/features/projects/wizard/WizardContext";
import { translate } from "@/i18n/useT";
import { estimateFixture } from "../estimateFixture";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

/**
 * QE4: labour-only scope checkboxes (Contract tab) and ROOMS_TOO_FEW — rooms under 50 % of the
 * covered area → no estimate: the reason instead of the numbers, no "Use as contract value".
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/projects/p1/edit",
  useSearchParams: () => new URLSearchParams(),
}));

const api = vi.hoisted(() => ({ estimate: undefined as unknown, save: vi.fn() }));
vi.mock("@/api/services/projects.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/projects.api")>()),
  useGetEstimateQuery: () => ({ data: api.estimate, isLoading: false, refetch: vi.fn() }),
  useContractFromEstimateMutation: () => [vi.fn(), { isLoading: false }],
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

const TOO_FEW: EstimateWarning = {
  code: "ROOMS_TOO_FEW",
  blocking: true,
  tab: 5,
  params: { roomsAreaSqft: 400, coveredAreaSqft: 1000, percent: 40 },
  message: "Rooms cover only 40% of the covered area. Add the remaining rooms (or passages) before the estimate can be trusted.",
};
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
const blockedEstimate = (): ProjectEstimate => ({
  ...estimateFixture(),
  cost: { materialsPaisa: "500000000", ownerSuppliedPaisa: "0", labourPaisa: "100000000", totalPaisa: "600000000", perSqftPaisa: "600000", contractTotalPaisa: null },
  contractSuggestion: suggestion({ suggestedPaisa: null, blockedBy: "ROOMS_TOO_FEW" }),
  blockedBy: "ROOMS_TOO_FEW",
  warnings: [TOO_FEW],
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
const inWizard = (ui: React.ReactElement, value = ctx(), language: "en" | "roman-ur" | "ur" = "en") =>
  renderWithStore(<WizardContext.Provider value={value}>{ui}</WizardContext.Provider>, { me: meFixture("THEKEDAR"), ui: { language } });

beforeEach(() => {
  api.save.mockReset().mockReturnValue({ unwrap: () => Promise.resolve(PROJECT) });
  api.estimate = blockedEstimate();
});

describe("ROOMS_TOO_FEW: no estimate while rooms cover under half of the covered area", () => {
  it("wizard Estimate tab: the blocking reason and a clear message, no cost, no BoQ, no 'Use as contract value'", async () => {
    const goTo = vi.fn();
    inWizard(<EstimateTab />, ctx({ goTo }));
    const errors = screen.getByTestId("estimate-errors");
    expect(within(errors).getByText(/Rooms cover only 40% of the covered area \(400 of 1000 sq ft\)\. Add the remaining rooms \(or passages\) before the estimate can be trusted\./)).toBeInTheDocument();
    expect(screen.getByTestId("estimate-blocked")).toHaveTextContent("hidden until the rooms cover at least half of the covered area");
    expect(screen.queryByText("BoQ cost")).toBeNull();
    expect(screen.queryByTestId("wizard-boq")).toBeNull();
    expect(screen.queryByRole("button", { name: /Use as contract value/ })).toBeNull();
    await userEvent.setup().click(within(errors).getByRole("button", { name: "Go to Floors & Rooms" }));
    expect(goTo).toHaveBeenCalledWith(5);
  });

  it("the contract card is hidden while blocked (even from a stale suggestion)", () => {
    inWizard(<ContractFromEstimateCard projectId="p1" estimate={{ ...blockedEstimate(), contractSuggestion: suggestion() }} />);
    expect(screen.queryByRole("button", { name: /Use as contract value/ })).toBeNull();
    expect(isEstimateBlocked({ blockedBy: null, warnings: [TOO_FEW] })).toBe(true);
    expect(isEstimateBlocked({ blockedBy: null, warnings: [] })).toBe(false);
  });

  it("translated in all three languages; RULEBOOK_RATE_ZERO names the rate by its label", () => {
    for (const lang of ["en", "roman-ur", "ur"] as const) {
      expect(translate(lang, "projects.estimate.warn.ROOMS_TOO_FEW", { percent: 40, roomsAreaSqft: 400, coveredAreaSqft: 1000 })).toContain("40");
      expect(translate(lang, "projects.issue.ROOMS_TOO_FEW", { a: "40" })).toContain("40");
      expect(translate(lang, "projects.estimate.warn.RULEBOOK_RATE_ZERO", { items: "X" })).toContain("X");
      expect(translate(lang, "projects.contract.labourScopeFinishing")).not.toBe("projects.contract.labourScopeFinishing");
    }
    let text = "";
    function Probe() {
      const f = useEstimateWarningText([{ key: "finishRailingsRsPerSqft", label: "Stair + roof railings", labelRoman: "Railing", labelUrdu: "ریلنگ" }]);
      text = f({ code: "RULEBOOK_RATE_ZERO", message: "raw", items: ["finishRailingsRsPerSqft"] });
      return null;
    }
    renderWithStore(<Probe />, { me: meFixture("THEKEDAR") });
    expect(text).toBe("These rates are Rs 0, so their lines cost nothing: Stair + roof railings. Set a rate in the assumptions.");
  });
});

describe("ContractTab: labour-only scope", () => {
  const submit = () => userEvent.setup().click(screen.getByRole("button", { name: "submit-test" }));
  const renderTab = (project: ProjectDetail) =>
    inWizard(
      <>
        <ContractTab />
        <button type="submit" form={WIZARD_FORM_ID}>
          submit-test
        </button>
      </>,
      ctx({ project }),
    );
  const labourOnly = (over: Record<string, unknown> = {}) =>
    ({ ...PROJECT, contract: { contractType: "LABOR_ONLY", billingModel: "RUNNING_BILLS", contractValuePaisa: null, ratePerSqftPaisa: null, ...over } }) as unknown as ProjectDetail;

  it("labour-only shows both checkboxes (unticked by default) and sends them", async () => {
    renderTab(labourOnly());
    const scope = screen.getByTestId("labour-scope");
    const finishing = within(scope).getByRole("checkbox", { name: "Include finishing labour (tiles, paint)" });
    const mep = within(scope).getByRole("checkbox", { name: "Include electrical and plumbing labour" });
    expect(finishing).not.toBeChecked();
    expect(mep).not.toBeChecked();
    await userEvent.setup().click(finishing);
    await submit();
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    expect(api.save.mock.calls[0]![0].body).toMatchObject({ contractType: "LABOR_ONLY", labourScopeIncludesFinishing: true, labourScopeIncludesMep: false });
  });

  it("starts from the stored choice; other contract types neither show nor send it", async () => {
    renderTab(labourOnly({ labourScopeIncludesMep: true }));
    expect(screen.getByRole("checkbox", { name: "Include electrical and plumbing labour" })).toBeChecked();
    api.save.mockClear();
    const grey = { ...PROJECT, contract: { contractType: "GREY_OWNER_FINISHING", billingModel: "STAGE_SCHEDULE", contractValuePaisa: null, labourScopeIncludesMep: true } } as unknown as ProjectDetail;
    cleanup();
    renderTab(grey);
    expect(screen.queryByTestId("labour-scope")).toBeNull();
    await submit();
    await waitFor(() => expect(api.save).toHaveBeenCalled());
    expect(api.save.mock.calls[0]![0].body).not.toHaveProperty("labourScopeIncludesMep");
  });

  it("Urdu labels", () => {
    inWizard(
      <ContractTab />,
      ctx({ project: labourOnly() }),
      "ur",
    );
    expect(screen.getByText("فنشنگ کی مزدوری شامل کریں (ٹائلیں، رنگ)")).toBeInTheDocument();
    expect(screen.getByText("بجلی اور پلمبنگ کی مزدوری شامل کریں")).toBeInTheDocument();
  });
});
