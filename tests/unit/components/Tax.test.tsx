import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectTax, ScheduleStage, TaxSettings } from "@/api/types";
import { NewInvoiceSlideOver, RecordPaymentSlideOver } from "@/features/billing/components/BillingSlideOvers";
import { REPORTS } from "@/features/reports/reports.config";
import { ProjectTaxCard } from "@/features/tax/components/ProjectTax";
import { TaxSettingsForm } from "@/features/tax/components/TaxSettingsForm";
import { taxOf, whtFromRate } from "@/features/tax/schemas";
import { COMPANY_NAV, visibleItemIds } from "@/lib/navigation";
import { meFixture } from "../fixtures";
import { ACCOUNTANT_TEMPLATE } from "../permissionTemplates";
import { renderWithStore } from "../render";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));

const api = vi.hoisted(() => ({
  updateSettings: vi.fn(),
  projectTax: null as unknown,
  stages: [] as unknown[],
  changeOrders: [] as unknown[],
}));
vi.mock("@/api/services/changeOrders.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/changeOrders.api")>()),
  useGetChangeOrdersQuery: () => ({ data: { items: api.changeOrders } }),
}));

vi.mock("@/api/services/tax.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/tax.api")>()),
  useUpdateTaxSettingsMutation: () => [api.updateSettings, { isLoading: false }],
  useGetProjectTaxQuery: () => ({ data: api.projectTax, isLoading: false }),
  useUpdateProjectTaxMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock("@/api/services/billing.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/services/billing.api")>()),
  useGetBillingStagesQuery: () => ({ data: api.stages }),
  useGetOwnerStatementQuery: () => ({ data: { unbilledRecoverables: [] } }),
  useGetBillingProgressQuery: () => ({ data: { items: [] } }),
  useCreateInvoiceMutation: () => [vi.fn(), { isLoading: false }],
  useGetInvoicesQuery: () => ({ data: { items: [] } }),
  useRecordPaymentMutation: () => [vi.fn(), { isLoading: false }],
}));

const AUTHORITIES: TaxSettings["authorities"] = [
  { code: "PRA", name: "Punjab Revenue Authority", defaultRatePercent: 16, defaultLabel: "PRA Sales Tax" },
  { code: "SRB", name: "Sindh Revenue Board", defaultRatePercent: 15, defaultLabel: "SRB Sales Tax" },
  { code: "KPRA", name: "KPRA", defaultRatePercent: 15, defaultLabel: "KPRA Sales Tax" },
  { code: "ICT", name: "ICT", defaultRatePercent: 16, defaultLabel: "ICT Sales Tax" },
];
const SETTINGS = (over: Partial<TaxSettings> = {}): TaxSettings => ({
  enabled: false,
  authority: null,
  ratePercent: 0,
  label: null,
  effectiveLabel: null,
  ntn: null,
  strn: null,
  whtDefaultRatePercent: 8,
  authorities: AUTHORITIES,
  adviserNote: "Default rates and rules are a starting point only — verify with your tax adviser.",
  ...over,
});
const PROJECT_TAX = (over: Partial<ProjectTax["effective"]> = {}, mode: ProjectTax["mode"] = "INHERIT"): ProjectTax => ({
  projectId: "p1",
  mode,
  authority: null,
  ratePercent: null,
  effective: { taxOn: true, applies: true, authority: "PRA", ratePercent: 16, label: "PRA Sales Tax", source: "COMPANY", ...over },
  company: { enabled: true, authority: "PRA", ratePercent: 16, whtDefaultRatePercent: 8 },
});
const accountant = () => meFixture("PM", { permissions: [...ACCOUNTANT_TEMPLATE] });

beforeEach(() => {
  api.updateSettings.mockReset();
  api.updateSettings.mockReturnValue({ unwrap: () => Promise.resolve(SETTINGS({ enabled: true, authority: "PRA", ratePercent: 16 })) });
  api.projectTax = PROJECT_TAX();
  api.stages = [];
  api.changeOrders = [];
});

describe("Tax — rules shared with the API", () => {
  it("tax is half-up on the paisa; WHT is r % of the gross", () => {
    expect(taxOf("277500000", 16)).toBe("44400000");
    expect(taxOf("100004", 12.5)).toBe("12501"); // 12,500.5 → 12,501
    expect(whtFromRate("9200000", 8)).toBe("800000"); // Rs 92,000 cash → Rs 8,000 WHT (gross Rs 1,00,000)
    expect(whtFromRate(null, 8)).toBeNull();
    expect(whtFromRate("9200000", null)).toBeNull();
  });
});

describe("Settings → Tax", () => {
  it("off by default: banner + adviser note; switching on without an authority is refused", async () => {
    renderWithStore(<TaxSettingsForm settings={SETTINGS()} />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText(/Tax is off\./)).toBeInTheDocument();
    expect(screen.getByText(/verify with your tax adviser/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch", { name: /Charge sales tax on invoices/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save tax settings" }));
    expect(await screen.findByText("Choose the tax authority before switching tax on")).toBeInTheDocument();
    expect(api.updateSettings).not.toHaveBeenCalled();
  });

  it("with PRA 16 %: shows the worked example and saves the switch", async () => {
    renderWithStore(<TaxSettingsForm settings={SETTINGS({ authority: "PRA", ratePercent: 16, ntn: "1234567-8" })} />, { me: meFixture("THEKEDAR") });
    expect(screen.getByTestId("tax-example")).toHaveTextContent("Rs 10,00,000 → tax Rs 1,60,000");
    await userEvent.click(screen.getByRole("switch", { name: /Charge sales tax on invoices/ }));
    await userEvent.click(screen.getByRole("button", { name: "Save tax settings" }));
    await waitFor(() => expect(api.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ enabled: true, authority: "PRA", ratePercent: 16, ntn: "1234567-8", strn: null, label: null })));
  });

  it("the Accountant reads it but cannot change it", () => {
    renderWithStore(<TaxSettingsForm settings={SETTINGS({ enabled: true, authority: "SRB", ratePercent: 15 })} />, { me: accountant() });
    expect(screen.getByText("Only the owner or an Administrator can change tax settings.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save tax settings" })).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /Charge sales tax on invoices/ })).toBeDisabled();
  });
});

describe("Project tax + invoice preview", () => {
  it("shows the project's tax and its source; Change only with tax.settings.manage", () => {
    api.projectTax = PROJECT_TAX({ authority: "SRB", ratePercent: 15, label: "SRB Sales Tax", source: "PROJECT" }, "ON");
    const { unmount } = renderWithStore(<ProjectTaxCard projectId="p1" />, { me: meFixture("THEKEDAR") });
    expect(screen.getByTestId("project-tax")).toHaveTextContent("SRB Sales Tax 15% on new invoices");
    expect(screen.getByText(/Set for this project/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Change/ })).toBeInTheDocument();
    unmount();
    renderWithStore(<ProjectTaxCard projectId="p1" />, { me: accountant() });
    expect(screen.queryByRole("button", { name: /Change/ })).not.toBeInTheDocument();
  });

  it("new invoice: the tax line and total are previewed when tax applies", () => {
    api.stages = [{ id: "s2", label: "Plinth", percent: 15, isRetention: false, amountPaisa: "277500000", status: "READY", sortOrder: 2 } as unknown as ScheduleStage];
    renderWithStore(<NewInvoiceSlideOver open onOpenChange={() => {}} projectId="p1" billingModel="STAGES" stageId="s2" />, { me: meFixture("THEKEDAR") });
    const preview = screen.getByTestId("invoice-tax-preview");
    expect(preview).toHaveTextContent("PRA Sales Tax 16%");
    expect(preview).toHaveTextContent("Rs 4,44,000");
    expect(preview).toHaveTextContent("Rs 32,19,000");
  });

  it("QA-A-15: approved change orders waiting for the next stage are in the preview (the draft adds them)", () => {
    api.stages = [{ id: "s2", label: "Plinth", percent: 15, isRetention: false, amountPaisa: "200000000", status: "READY", sortOrder: 2 } as unknown as ScheduleStage];
    api.changeOrders = [
      { id: "co1", code: "CO-001", title: "Extra tiles", status: "APPROVED", billingMode: "NEXT_STAGE", invoice: null, totalPaisa: "8970000" },
      { id: "co2", code: "CO-002", title: "Billed already", status: "BILLED", billingMode: "NEXT_STAGE", invoice: { id: "i1", number: "INV-1", type: "STAGE", status: "ISSUED" }, totalPaisa: "100000" },
      { id: "co3", code: "CO-003", title: "Own invoice", status: "APPROVED", billingMode: "VARIATION", invoice: null, totalPaisa: "100000" },
    ];
    renderWithStore(<NewInvoiceSlideOver open onOpenChange={() => {}} projectId="p1" billingModel="STAGES" stageId="s2" />, { me: meFixture("THEKEDAR") });
    expect(screen.getByTestId("invoice-preview-cos")).toHaveTextContent("CO-001");
    expect(screen.getByTestId("invoice-preview-cos")).not.toHaveTextContent("CO-002");
    // Rs 20,00,000 + Rs 89,700
    expect(screen.getByTestId("invoice-preview")).toHaveTextContent("Rs 20,89,700");
    // 16 % of Rs 20,89,700 = Rs 3,34,352
    expect(screen.getByTestId("invoice-tax-preview")).toHaveTextContent("Rs 3,34,352");
  });

  it("new invoice: no tax preview when tax is off for the project", () => {
    api.projectTax = PROJECT_TAX({ taxOn: false, applies: false, source: "OFF" });
    api.stages = [{ id: "s2", label: "Plinth", percent: 15, isRetention: false, amountPaisa: "277500000", status: "READY", sortOrder: 2 } as unknown as ScheduleStage];
    renderWithStore(<NewInvoiceSlideOver open onOpenChange={() => {}} projectId="p1" billingModel="STAGES" stageId="s2" />, { me: meFixture("THEKEDAR") });
    expect(screen.queryByTestId("invoice-tax-preview")).not.toBeInTheDocument();
  });
});

describe("Payment form — WHT", () => {
  it("WHT fields only when tax is on for the project; the usual rate fills in", async () => {
    renderWithStore(<RecordPaymentSlideOver open onOpenChange={() => {}} projectId="p1" />, { me: meFixture("THEKEDAR") });
    expect(screen.getByTestId("wht-fields")).toBeInTheDocument();
    expect(screen.getByLabelText("WHT certificate no.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Use 8%" }));
    expect(screen.queryByRole("button", { name: "Use 8%" })).not.toBeInTheDocument();
  });

  it("no WHT fields when tax is off", () => {
    api.projectTax = PROJECT_TAX({ taxOn: false, applies: false, source: "OFF" });
    renderWithStore(<RecordPaymentSlideOver open onOpenChange={() => {}} projectId="p1" />, { me: meFixture("THEKEDAR") });
    expect(screen.queryByTestId("wht-fields")).not.toBeInTheDocument();
  });
});

describe("Tax reports", () => {
  it("are listed under Reports for tax.view + amounts (owner, Accountant), not a PM or the Munshi", () => {
    expect(REPORTS["wht-summary"]).toMatchObject({ dates: true, project: true, access: { allPermissions: ["tax.view", "fields.amounts"] } });
    expect(REPORTS["tax-invoice-register"].access).toEqual({ allPermissions: ["tax.view", "fields.amounts"] });
    const ids = ["reports.wht", "reports.taxRegister", "settings.tax"];
    expect(visibleItemIds(meFixture("THEKEDAR"), COMPANY_NAV)).toEqual(expect.arrayContaining(ids));
    expect(visibleItemIds(accountant(), COMPANY_NAV)).toEqual(expect.arrayContaining(ids));
    expect(visibleItemIds(meFixture("PM", { canSeeFinancials: true }), COMPANY_NAV).filter((id) => ids.includes(id))).toEqual([]);
    expect(visibleItemIds(meFixture("MUNSHI"), COMPANY_NAV).filter((id) => ids.includes(id))).toEqual([]);
  });
});
