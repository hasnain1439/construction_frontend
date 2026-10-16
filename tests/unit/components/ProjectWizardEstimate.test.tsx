import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectDetail, ProjectEstimate, ProjectReview } from "@/api/types";
import {
  adjacentWizardStep,
  clampWizardTab,
  ESTIMATE_STEP,
  REVIEW_STEP,
  visibleWizardSteps,
  WIZARD_STEPS,
} from "@/features/projects/constants";
import { EstimateTab } from "@/features/projects/wizard/EstimateTab";
import { ProjectWizard } from "@/features/projects/wizard/ProjectWizard";
import { WizardContext, type WizardContextValue } from "@/features/projects/wizard/WizardContext";
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
  review: { isLoading: true } as unknown,
  project: undefined as unknown,
}));
vi.mock("@/api/services/projects.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/projects.api")>()),
  useGetProjectQuery: () => ({ data: api.project, isLoading: false, refetch: vi.fn() }),
  useGetReviewQuery: () => ({ ...(api.review as object), refetch: vi.fn() }),
  useGetEstimateQuery: () => ({ data: api.estimate, isLoading: false, refetch: vi.fn() }),
  useActivateProjectMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateEstimateSettingsMutation: () => [vi.fn(), { isLoading: false }],
}));

const PROJECT = {
  id: "p1",
  code: "MSB-2026-020",
  name: "Johar Town 5 Marla",
  status: "DRAFT",
  client: { id: "c1", name: "Ahmed Raza" },
  wizardCompletedSteps: [1, 2, 3, 4, 5],
  billingStages: [],
  team: { pm: null, munshis: [] },
  siteAddress: "House 9",
  city: "Lahore",
} as unknown as ProjectDetail;

const ESTIMATE: ProjectEstimate = {
  ...estimateFixture(),
  materials: [
    { material: "cement", unit: "bag", netQuantity: 760, quantity: 798.4, suppliedBy: "CONTRACTOR", materialId: null, materialName: "Cement" },
    { material: "bricks", unit: "nos", netQuantity: 40000, quantity: 42000, suppliedBy: "CONTRACTOR", materialId: null, materialName: "Bricks" },
    { material: "steel", unit: "kg", netQuantity: 4000, quantity: 4200, suppliedBy: "CONTRACTOR", materialId: null, materialName: "Steel" },
  ],
  stages: [{ stage: "WALLS", lines: [], totals: [] } as unknown as ProjectEstimate["stages"][number]],
  cost: {
    materialsPaisa: "500000000",
    ownerSuppliedPaisa: "0",
    labourPaisa: "100000000",
    totalPaisa: "600000000",
    perSqftPaisa: "533300",
    contractTotalPaisa: "750000000",
    marginPaisa: "150000000",
    marginPercent: 20,
  },
  warnings: [
    { code: "NO_ROOMS", message: "No rooms yet", tab: 5 },
    { code: "FOUNDATION_MISSING", message: "Foundation missing", tab: 3 },
  ],
};

const REVIEW = {
  ready: true,
  errors: [],
  warnings: [],
  summary: {
    client: null,
    contract: { contractType: null, billingModel: null, contractTotalPaisa: "0", billingStages: 0, retentionPercent: 0, defectPeriodMonths: 0 },
    plot: { plotUnit: null, plotSize: null, plotAreaSqft: null, frontFt: null, depthFt: null, cornerPlot: false },
    structure: { structureType: null, hasBasement: false, floors: 1 },
    coverage: { coveredAreaSqft: null, semiCoveredSqft: 0, openAreaSqft: 0, boundaryWall: false },
    foundation: null,
    roomsPerFloor: [],
    supply: { contractor: 0, owner: 0 },
  },
} as unknown as ProjectReview;

const en = (key: Parameters<typeof translate>[1]) => translate("en", key);

beforeEach(() => {
  api.estimate = ESTIMATE;
  api.review = { isLoading: true };
  api.project = PROJECT;
});

describe("wizard steps", () => {
  it("Estimate sits between Rooms and Review; ids are stable", () => {
    expect(WIZARD_STEPS.map((s) => en(s.labelKey))).toEqual([
      "Basic Info",
      "Contract & Supply",
      "Plot & Structure",
      "Coverage & Boundary",
      "Floors & Rooms",
      "Estimate",
      "Review",
    ]);
    expect(WIZARD_STEPS.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(ESTIMATE_STEP).toBe(6);
    expect(REVIEW_STEP).toBe(7);
    expect(translate("roman-ur", "projects.wizard.stepEstimate")).toBe("Andaza");
    expect(translate("ur", "projects.wizard.stepEstimate")).toBe("تخمینہ");
  });

  it("without estimate access the step is skipped: Rooms → Review and back", () => {
    const visible = visibleWizardSteps(false);
    expect(visible.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 7]);
    expect(adjacentWizardStep(visible, 5, 1)).toBe(7);
    expect(adjacentWizardStep(visible, 7, -1)).toBe(5);
    const all = visibleWizardSteps(true);
    expect(adjacentWizardStep(all, 5, 1)).toBe(6);
    expect(adjacentWizardStep(all, 6, 1)).toBe(7);
    expect(adjacentWizardStep(all, 7, 1)).toBe(7);
    expect(adjacentWizardStep(all, 1, -1)).toBe(1);
  });

  it("clamps ?tab= to 1…7", () => {
    expect(clampWizardTab("7")).toBe(7);
    expect(clampWizardTab("9")).toBe(7);
    expect(clampWizardTab(undefined)).toBe(1);
    expect(clampWizardTab("abc")).toBe(1);
  });
});

describe("ProjectWizard", () => {
  it("shows 7 numbered steps and opens the Estimate tab (?tab=6)", () => {
    renderWithStore(<ProjectWizard projectId="p1" mode="edit" initialTab={6} />, { me: meFixture("THEKEDAR") });
    const tabs = within(screen.getByRole("tablist", { name: /steps/i })).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      expect.stringContaining("Basic Info"),
      expect.stringContaining("Contract & Supply"),
      expect.stringContaining("Plot & Structure"),
      expect.stringContaining("Coverage & Boundary"),
      expect.stringContaining("Floors & Rooms"),
      "6Estimate",
      "7Review",
    ]);
    expect(screen.getByRole("tab", { name: /Estimate/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("wizard-estimate")).toBeInTheDocument();
    // Read-only step: Back + Next, no Save as draft
    expect(screen.queryByRole("button", { name: "Save as draft" })).toBeNull();
    expect(screen.getAllByRole("button", { name: /Next/ }).length).toBeGreaterThan(0);
  });

  it("hides the Estimate step without projects.estimate.view; ?tab=6 opens Review, numbered 6", () => {
    renderWithStore(<ProjectWizard projectId="p1" mode="edit" initialTab={6} />, {
      me: meFixture("PM", { canSeeFinancials: true, deny: ["projects.estimate.view"] }),
    });
    const tabs = within(screen.getByRole("tablist", { name: /steps/i })).getAllByRole("tab");
    expect(tabs).toHaveLength(6);
    expect(screen.queryByRole("tab", { name: /Estimate/ })).toBeNull();
    const review = screen.getByRole("tab", { name: /Review/ });
    expect(review).toHaveAttribute("aria-selected", "true");
    expect(review.textContent).toBe("6Review");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("id", `step-panel-${REVIEW_STEP}`);
  });

  it("Review shows the estimated cost and links back to the Estimate step", async () => {
    api.review = { data: REVIEW, isLoading: false };
    renderWithStore(<ProjectWizard projectId="p1" mode="edit" initialTab={7} />, { me: meFixture("THEKEDAR") });
    const card = screen.getByTestId("review-estimate");
    expect(card).toHaveTextContent("60,00,000");
    expect(card).toHaveTextContent("5,333");
    expect(card).toHaveTextContent("20%");
    await userEvent.setup().click(screen.getByRole("button", { name: "Open estimate" }));
    expect(screen.getByRole("tab", { name: /Estimate/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("wizard-estimate")).toBeInTheDocument();
  });

  it("no estimate card on Review without estimate access", () => {
    api.review = { data: REVIEW, isLoading: false };
    renderWithStore(<ProjectWizard projectId="p1" mode="edit" initialTab={7} />, {
      me: meFixture("PM", { canSeeFinancials: true, deny: ["projects.estimate.view"] }),
    });
    expect(screen.getByText(/Everything needed is filled in/)).toBeInTheDocument();
    expect(screen.queryByTestId("review-estimate")).toBeNull();
  });
});

describe("EstimateTab", () => {
  const renderTab = (goTo = vi.fn(), locked = false) => {
    const ctx: WizardContextValue = { projectId: "p1", project: PROJECT, locked, onSaved: vi.fn(), setFormState: vi.fn(), goTo };
    renderWithStore(
      <WizardContext.Provider value={ctx}>
        <EstimateTab />
      </WizardContext.Provider>,
      { me: meFixture("THEKEDAR") },
    );
    return goTo;
  };

  it("KPIs, warnings with Go to <tab> that switch wizard tabs, stage tables collapsed", async () => {
    const goTo = renderTab();
    expect(screen.getByText("Estimated cost")).toBeInTheDocument();
    expect(screen.getByText("Cost per sq ft")).toBeInTheDocument();
    expect(screen.getByText("799 bags")).toBeInTheDocument();
    expect(screen.getByText("Margin vs contract")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();

    const warnings = screen.getByTestId("estimate-warnings");
    expect(within(warnings).getByText(/No rooms yet/)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(within(warnings).getByRole("button", { name: "Go to Floors & Rooms" }));
    expect(goTo).toHaveBeenCalledWith(5);
    await user.click(within(warnings).getByRole("button", { name: "Go to Plot & Structure" }));
    expect(goTo).toHaveBeenCalledWith(3);
    // No page links to the wizard from inside the wizard
    expect(within(warnings).queryByRole("link", { name: "Open setup" })).toBeNull();

    // Material summary open; stage tables folded
    expect(screen.getByText("Material summary")).toBeInTheDocument();
    const stage = screen.getByRole("button", { name: /2 · Brickwork/ });
    expect(stage).toHaveAttribute("aria-expanded", "false");
    await user.click(stage);
    expect(stage).toHaveAttribute("aria-expanded", "true");
  });

  it("Assumptions opens the settings modal", async () => {
    renderTab();
    await userEvent.setup().click(screen.getByRole("button", { name: "Assumptions" }));
    expect(await screen.findByText("Estimate assumptions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("Urdu: step name and Go to label are translated", () => {
    const ctx: WizardContextValue = { projectId: "p1", project: PROJECT, locked: false, onSaved: vi.fn(), setFormState: vi.fn(), goTo: vi.fn() };
    renderWithStore(
      <WizardContext.Provider value={ctx}>
        <EstimateTab />
      </WizardContext.Provider>,
      { me: meFixture("THEKEDAR"), ui: { language: "ur" } },
    );
    expect(screen.getByRole("button", { name: "منزلیں اور کمرے پر جائیں" })).toBeInTheDocument();
  });
});
