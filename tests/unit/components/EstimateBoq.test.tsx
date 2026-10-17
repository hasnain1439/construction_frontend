import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EstimateDetail, ProjectDetail, ProjectEstimate } from "@/api/types";
import { PROJECT_NAV, COMPANY_NAV, ADMIN_NAV } from "@/lib/navigation";
import { canAccess } from "@/lib/permissions";
import { translate, type TranslationKey, type TranslationVars } from "@/i18n/useT";
import { COMPARE, REVISIONS, RULEBOOK, SHOPPING, boqLine, estimateDetail, withoutMoney } from "../boqFixture";
import { meFixture } from "../fixtures";
import { renderWithStore } from "../render";

let detail: EstimateDetail = estimateDetail();
let revisions = REVISIONS;
const approve = vi.fn();
const setOverrides = vi.fn();
const mutation = (fn = vi.fn()) => () => [fn, { isLoading: false }];
vi.mock("@/api/services/estimates.api", () => ({
  useGetEstimatesQuery: () => ({ data: revisions, isLoading: false }),
  useGetEstimateRevisionQuery: (_id: string, opts: { skip?: boolean }) => ({ data: opts.skip ? undefined : detail, isLoading: false, isFetching: false }),
  useCompareEstimatesQuery: () => ({ data: COMPARE, isLoading: false, isFetching: false }),
  useGetOwnerShoppingListQuery: () => ({ data: SHOPPING, isLoading: false }),
  useGetCompanyRulebookQuery: () => ({ data: RULEBOOK, isLoading: false }),
  useGenerateEstimateMutation: mutation(),
  useRegenerateEstimateMutation: mutation(),
  useOverrideEstimateLineMutation: mutation(),
  useApproveEstimateMutation: mutation(approve),
  useGetEstimatePdfMutation: mutation(),
  useGetOwnerShoppingListPdfMutation: mutation(),
  useSetRulebookOverridesMutation: mutation(setOverrides),
  useDeleteRulebookOverrideMutation: mutation(),
}));
vi.mock("@/features/projects/views/ProjectModeViews", () => ({
  ProjectPageShell: ({ children }: { children: (p: unknown) => ReactNode }) => <div>{children({ id: "p1", status: "ACTIVE", name: "DHA Phase 6 · 10 Marla" })}</div>,
}));

const { BoqTable } = await import("@/features/estimates/BoqTable");
const { BoqWorkspace } = await import("@/features/estimates/BoqWorkspace");
const { CompareResult } = await import("@/features/estimates/EstimateRevisionsView");
const { ShoppingListBody, shoppingText } = await import("@/features/estimates/ShoppingListView");
const { RulebookBody } = await import("@/features/estimates/RulebookSettingsView");
const { lineText } = await import("@/features/estimates/labels");

const PROJECT = { id: "p1", status: "ACTIVE", name: "DHA Phase 6 · 10 Marla", client: { id: "c1", name: "Ahmed Raza", phone: "+923001112233" } } as unknown as ProjectDetail;
const LIVE = { warnings: [] } as unknown as ProjectEstimate;
const en = (key: TranslationKey, vars?: TranslationVars) => translate("en", key, vars);

describe("BoQ table", () => {
  it("groups lines by section in BoQ order with section totals and the grand total", () => {
    const e = estimateDetail();
    renderWithStore(<BoqTable sections={e.sections} totals={e} money />);
    const table = screen.getByTestId("boq-table");
    const order = [...table.querySelectorAll("tr[data-section]")].map((r) => r.getAttribute("data-section"));
    expect(order).toEqual(["CONCRETE", "STEEL", "FLOORING_TILES", "MEP_ROUGH_IN", "SITE_OVERHEADS"]);
    expect(screen.getByText("Concrete (PCC / RCC)")).toBeInTheDocument();
    expect(within(screen.getByTestId("section-total-STEEL")).getByText("Rs 10,55,270")).toBeInTheDocument();
    expect(screen.getByText("Grand total")).toBeInTheDocument();
    expect(screen.getByText("Rs 21,32,100")).toBeInTheDocument();
    // Price-list material keeps the company's name; engine lines use the dictionary.
    expect(screen.getByText("Steel Grade-60 #4")).toBeInTheDocument();
    expect(screen.getByText("Electrical rough-in (conduits, boxes)")).toBeInTheDocument();
    expect(screen.getByText("Rs 2,85,000 / ton")).toBeInTheDocument();
  });

  it("owner-supplied lines keep the quantity but show Owner instead of rate and amount", () => {
    const e = estimateDetail();
    renderWithStore(<BoqTable sections={e.sections} totals={e} money />);
    const row = screen.getByText("Floor tiles").closest("tr")!;
    expect(row).toHaveAttribute("data-owner", "true");
    expect(within(row).getByText("2,427.83")).toBeInTheDocument();
    expect(within(row).getAllByText("Owner")).toHaveLength(3); // supplied by + rate + amount
    expect(within(row).queryByText(/Rs/)).toBeNull();
  });

  it("the trace popover shows the human-readable formula", async () => {
    const user = userEvent.setup();
    const e = estimateDetail();
    renderWithStore(<BoqTable sections={e.sections} totals={e} money />);
    await user.click(screen.getByRole("button", { name: "How Steel Grade-60 #4 is worked out" }));
    const trace = await screen.findByTestId("line-trace");
    expect(within(trace).getByText("3 items · 3560.28 kg + 4% wastage = 3702.69 kg")).toBeInTheDocument();
    expect(within(trace).getByText(/743.49 cft × 1% × 222 kg per cft/)).toBeInTheDocument();
  });

  it("an adjusted line shows the override and the worked-out quantity", () => {
    const e = estimateDetail();
    const adjusted = boqLine({
      lineKey: "CONCRETE.GF_STRUCTURE.cement",
      section: "CONCRETE",
      override: { quantity: 210, note: "Extra for the porch", by: { id: "u1", name: "Khalid Malik" }, at: "2026-10-16T08:00:00Z" },
      effectiveQuantity: 210,
    });
    renderWithStore(<BoqTable sections={[{ section: "CONCRETE", lines: [adjusted] }]} totals={e} money />);
    expect(screen.getByText("Adjusted")).toBeInTheDocument();
    expect(screen.getByText("210")).toBeInTheDocument();
    expect(screen.getByText("worked out 197.8")).toBeInTheDocument();
  });

  it("Urdu: section, stage and supplier names are translated", () => {
    const e = estimateDetail();
    renderWithStore(<BoqTable sections={e.sections} totals={e} money />, { ui: { language: "ur" } });
    expect(screen.getByText("کنکریٹ (سادہ / سریا دار)")).toBeInTheDocument();
    expect(screen.getAllByText("گراؤنڈ فلور کا ڈھانچہ").length).toBeGreaterThan(0);
    expect(screen.getByText("کل جوڑ")).toBeInTheDocument();
  });

  it("line names: engine lines translated, unknown keys fall back to the API description", () => {
    expect(lineText(en, boqLine({ lineKey: "MEP_ROUGH_IN.PLASTER_MEP.sewerageGas", section: "MEP_ROUGH_IN", kind: "LUMP_SUM", materialId: null, material: null, description: "x" }))).toBe(
      "Sewerage, rain-water and gas rough-in",
    );
    expect(lineText(en, boqLine({ lineKey: "PAINT.FINISHING.primer", section: "PAINT", material: "primer", materialId: null, description: "Primer" }))).toBe("Primer");
    expect(lineText(en, boqLine({ lineKey: "X.Y.somethingNew", section: "PAINT", kind: "LUMP_SUM", material: null, materialId: null, description: "New thing" }))).toBe("New thing");
  });
});

describe("Estimate (BoQ) page — revisions", () => {
  beforeEach(() => {
    detail = estimateDetail();
    revisions = REVISIONS;
    approve.mockReset();
    approve.mockImplementation(() => ({ unwrap: () => Promise.resolve(estimateDetail({ status: "APPROVED" })) }));
  });

  it("opens the draft by default with KPIs, margin card and the BoQ", () => {
    renderWithStore(<BoqWorkspace project={PROJECT} live={LIVE} />, { me: meFixture("THEKEDAR") });
    expect(within(screen.getByTestId("revision-bar")).getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Estimated cost")).toBeInTheDocument();
    expect(screen.getByText("Cost per sq ft")).toBeInTheDocument();
    expect(screen.getByText("Margin vs contract")).toBeInTheDocument();
    expect(screen.getByText("88.48%")).toBeInTheDocument();
    expect(screen.getByTestId("boq-table")).toBeInTheDocument();
    expect(screen.getByTestId("stage-totals")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Adjust / }).length).toBeGreaterThan(0);
  });

  it("approve needs estimate.revision.approve: owner sees it and approves; PM does not", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithStore(<BoqWorkspace project={PROJECT} live={LIVE} />, { me: meFixture("PM", { canSeeFinancials: true }) });
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    unmount();

    renderWithStore(<BoqWorkspace project={PROJECT} live={LIVE} />, { me: meFixture("THEKEDAR") });
    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(await screen.findByText("Approve Rev 2?")).toBeInTheDocument();
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(approve).toHaveBeenCalledWith({ id: "est-2", confirmOutdatedRates: false }));
  });

  it("outdated rates: banner, and approving needs the explicit tick (confirmOutdatedRates)", async () => {
    const user = userEvent.setup();
    detail = estimateDetail({ ratesOutdated: true });
    revisions = [{ ...REVISIONS[0]!, ratesOutdated: true }, REVISIONS[1]!];
    renderWithStore(<BoqWorkspace project={PROJECT} live={LIVE} />, { me: meFixture("THEKEDAR") });
    expect(screen.getByTestId("rates-outdated")).toHaveTextContent("The price list changed after Rev 2");
    await user.click(screen.getByRole("button", { name: "Approve" }));
    const dialog = await screen.findByRole("alertdialog");
    const confirm = within(dialog).getByRole("button", { name: "Approve" });
    expect(confirm).toBeDisabled();
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(confirm);
    await waitFor(() => expect(approve).toHaveBeenCalledWith({ id: "est-2", confirmOutdatedRates: true }));
  });

  it("no fields.rates: quantities only — no rate / amount columns, no rupees, no cost KPIs", () => {
    detail = withoutMoney(estimateDetail());
    revisions = REVISIONS.map((r) => ({ ...r, totalPaisa: undefined, perSqftPaisa: undefined, marginPercent: undefined, marginPaisa: undefined, contractTotalPaisa: undefined, directCostPaisa: undefined, overheadPaisa: undefined, contingencyPaisa: undefined }));
    const { container } = renderWithStore(<BoqWorkspace project={PROJECT} live={LIVE} />, { me: meFixture("PM", { deny: ["fields.rates", "fields.amounts"] }) });
    expect(screen.getByText("Rates and amounts are hidden for your role — quantities only.")).toBeInTheDocument();
    const table = screen.getByTestId("boq-table");
    expect(within(table).queryByText("Rate")).toBeNull();
    expect(within(table).queryByText("Amount")).toBeNull();
    expect(within(table).getByText("3,702.69")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Rs\s?\d/);
    expect(screen.queryByText("Estimated cost")).toBeNull();
    expect(screen.queryByText("Margin vs contract")).toBeNull();
  });

  it("approved revisions are locked: no adjust, regenerate or approve; new revision can be generated", () => {
    detail = estimateDetail({ id: "est-1", revision: 1, status: "APPROVED" });
    revisions = [REVISIONS[1]!];
    renderWithStore(<BoqWorkspace project={PROJECT} live={LIVE} />, { me: meFixture("THEKEDAR") });
    expect(screen.queryByRole("button", { name: /^Adjust / })).toBeNull();
    expect(screen.queryByRole("button", { name: "Regenerate" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.getByRole("button", { name: "Generate Rev 2" })).toBeInTheDocument();
  });

  it("no revision yet: generate call to action above the live preview", () => {
    revisions = [];
    renderWithStore(<BoqWorkspace project={PROJECT} live={{ warnings: [], boq: { ...estimateDetail(), coveredAreaSqft: 3950 } } as unknown as ProjectEstimate} />, {
      me: meFixture("THEKEDAR"),
    });
    expect(screen.getByText("Generate the first estimate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate estimate" })).toBeInTheDocument();
    expect(screen.getByText("Live preview — not saved yet")).toBeInTheDocument();
    expect(screen.getByTestId("boq-table")).toBeInTheDocument();
  });
});

describe("Compare revisions", () => {
  it("line diffs (added / removed / changed; unchanged hidden) and totals per section", async () => {
    const user = userEvent.setup();
    renderWithStore(<CompareResult data={COMPARE} />);
    const result = screen.getByTestId("compare-result");
    expect(within(result).getByText("Added")).toBeInTheDocument();
    expect(within(result).getByText("Removed")).toBeInTheDocument();
    expect(within(result).getByText("Changed")).toBeInTheDocument();
    expect(within(result).queryByText("Same")).toBeNull();
    expect(within(result).getByText("+757.33 nos")).toBeInTheDocument();
    expect(within(result).getByText("−280 kg")).toBeInTheDocument();
    expect(within(result).getByText("+Rs 1,65,418")).toBeInTheDocument(); // total difference
    expect(within(result).getAllByText("−Rs 84,000").length).toBeGreaterThan(0); // removed bitumen + its section
    expect(within(result).getByText("8.41% of Rev 1")).toBeInTheDocument();
    await user.click(within(result).getByRole("switch"));
    expect(within(result).getByText("Same")).toBeInTheDocument();
  });
});

describe("Owner shopping list", () => {
  it("items grouped by the stage that needs them, quantities rounded up, never a rate", () => {
    const { container } = renderWithStore(<ShoppingListBody project={PROJECT} />, { me: meFixture("THEKEDAR") });
    expect(screen.getByTestId("shopping-source")).toHaveTextContent("From approved Rev 1");
    const stages = [...container.querySelectorAll("[data-stage]")].map((n) => n.getAttribute("data-stage"));
    expect(stages).toEqual(["GF_STRUCTURE", "FINISHING"]);
    expect(screen.getByText("Needed by: Finishing")).toBeInTheDocument();
    expect(screen.getByText("2,428")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Rs\s?\d/);
    expect(screen.getByRole("link", { name: /WhatsApp \(text\)/ })).toHaveAttribute("href", expect.stringContaining("https://wa.me/923001112233?text="));
  });

  it("WhatsApp text in the UI language", () => {
    const text = shoppingText(en, "DHA Phase 6", SHOPPING.items.slice(0, 1));
    expect(text).toBe("Assalam o Alaikum! Material list for DHA Phase 6 — to be bought by you:\n• Cement OPC: 42 bags — by Finishing");
    const roman = shoppingText((k, v) => translate("roman-ur", k, v), "DHA Phase 6", SHOPPING.items.slice(0, 1));
    expect(roman).toContain("Cement OPC: 42 boriyan — Finishing tak");
  });
});

describe("Settings → Rulebook", () => {
  beforeEach(() => setOverrides.mockReset());

  it("groups values with unit, platform value, company value, safe range and the review badge", () => {
    renderWithStore(<RulebookBody />, { me: meFixture("THEKEDAR") });
    expect(screen.getByTestId("rulebook-version")).toHaveTextContent("Rulebook v1");
    expect(screen.getByText("Walls")).toBeInTheDocument();
    expect(screen.getByText("Overheads & contingency")).toBeInTheDocument();
    expect(screen.getByText("Pending engineer review")).toBeInTheDocument();
    expect(screen.getByText("Steel and cement prices keep moving")).toBeInTheDocument();
    expect(screen.getByText("4.5 – 18")).toBeInTheDocument();
  });

  it("company value outside the safe range: the API's OUT_OF_SAFE_RANGE shows on the field", async () => {
    setOverrides.mockImplementation(() => ({
      unwrap: () => Promise.reject({ status: 400, code: "OUT_OF_SAFE_RANGE", message: "externalWallThicknessIn must be between 4.5 and 18", details: { key: "externalWallThicknessIn", value: 12, safeMin: 4.5, safeMax: 18 } }),
    }));
    const user = userEvent.setup();
    renderWithStore(<RulebookBody />, { me: meFixture("THEKEDAR") });
    await user.click(screen.getByRole("button", { name: "Actions for External wall thickness" }));
    await user.click(screen.getByRole("menuitem", { name: "Set company value" }));
    const value = await screen.findByLabelText(/^Company value/);
    await user.clear(value);
    await user.type(value, "25");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Company value must be at most 18")).toBeInTheDocument();
    expect(setOverrides).not.toHaveBeenCalled();

    await user.clear(value);
    await user.type(value, "12");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(setOverrides).toHaveBeenCalledWith({ overrides: [{ key: "externalWallThicknessIn", value: 12 }] }));
    expect(await screen.findByText("This value is outside the safe range.")).toBeInTheDocument();
  });

  it("PM can view but not change (rulebook.override.manage)", () => {
    renderWithStore(<RulebookBody />, { me: meFixture("PM") });
    expect(screen.getByText("External wall thickness")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Actions for External wall thickness" })).toBeNull();
  });
});

describe("Step 11 navigation", () => {
  it("Estimate, revisions and shopping list are live and need projects.estimate.view; Munshi sees none", () => {
    const planning = PROJECT_NAV.find((s) => s.id === "p.planning")!;
    const ids = ["p.planning.estimate", "p.planning.revisions", "p.planning.shopping"];
    const items = planning.items.filter((i) => ids.includes(i.id));
    expect(items.every((i) => i.available)).toBe(true);
    expect(items.filter((i) => canAccess(meFixture("THEKEDAR"), i.access)).map((i) => i.id)).toEqual(ids);
    expect(items.filter((i) => canAccess(meFixture("MUNSHI"), i.access))).toEqual([]);
  });

  it("Settings → Rulebook needs rulebook.override.view; the admin Rulebook page is live", () => {
    const rulebook = COMPANY_NAV.flatMap((s) => s.items).find((i) => i.id === "settings.rulebook")!;
    expect(rulebook.available).toBe(true);
    expect(canAccess(meFixture("PM"), rulebook.access)).toBe(true);
    expect(canAccess(meFixture("MUNSHI"), rulebook.access)).toBe(false);
    expect(ADMIN_NAV.find((i) => i.id === "admin.rulebook")?.available).toBe(true);
  });
});
