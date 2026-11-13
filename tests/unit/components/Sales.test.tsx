import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuoteComputed, QuoteDetail, QuoteInsights, QuoteScope, QuoteSummary, QuoteTemplate, QuoteTemplateList, QuoteWorkRates } from "@/api/types";
import { COMPANY_NAV } from "@/lib/navigation";
import { canAccess } from "@/lib/permissions";
import { meFixture, permissionsFor } from "../fixtures";
import { renderWithStore } from "../render";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }), usePathname: () => "/sales/quotes", useSearchParams: () => new URLSearchParams() }));

const summary = (over: Partial<QuoteSummary>): QuoteSummary => ({
  id: "q1",
  number: "Q-2026-0001",
  status: "SENT",
  title: "Valencia · 1 Kanal",
  client: { id: "c1", name: "Hamid Ali", phone: "+923214445566" },
  siteAddress: null,
  city: "Lahore",
  revision: 1,
  contractType: "FULL",
  coveredAreaSqft: 6200,
  validUntil: "2026-10-23",
  sentAt: "2026-10-08T11:00:00.000Z",
  lastActivityAt: "2026-10-08T11:00:00.000Z",
  daysSinceActivity: 8,
  followUp: true,
  wonAt: null,
  lostAt: null,
  expiredAt: null,
  lostReason: null,
  lostNote: null,
  wonProject: null,
  createdBy: { id: "u1", name: "Khalid Malik" },
  createdAt: "2026-10-07T05:00:00.000Z",
  updatedAt: "2026-10-08T11:00:00.000Z",
  pricePaisa: "3500000000",
  perSqftPaisa: "564516",
  ...over,
});

const QUOTES = [
  summary({}),
  summary({ id: "q2", number: "Q-2026-0002", status: "WON", title: "DHA Phase 6 · 10 Marla", followUp: false, wonProject: { id: "p1", code: "MSB-2026-012", name: "DHA", status: "ACTIVE" } }),
  summary({ id: "q3", number: "Q-2026-0003", status: "DRAFT", title: "Wapda Town · 7 Marla", followUp: false }),
];

const COMPUTED: QuoteComputed = {
  inputs: { plot: { unit: "MARLA", size: 10, frontFt: 35, depthFt: 65, marlaStandard: 225 }, coveredAreaSqft: 3950, floors: 2, mumty: true, basement: false, basementHeightFt: 10, structureType: "FRAMED", contractType: "GREY_OWNER_FINISHING", qualityCategoryId: null, supplyRules: [], paymentTemplateId: null, marginPercent: 20, finishingAllowancePercent: 0, finalPricePaisa: null },
  rulebook: { region: "PUNJAB_KP", version: 1 },
  basis: { plotAreaSqft: 2250, coveredAreaSqft: 3950, storeyAreaSqft: 1880.95, floors: [{ level: "GROUND", name: "Ground floor", areaSqft: 1880.95, rooms: 13, wetRooms: 5, ceilingHeightFt: 11 }], foundation: "ISOLATED", assumptions: {} },
  quantities: { cementBags: 2140, steelKg: 13920, bricks: 101200, blocks: 0, sandCft: 6120, crushCft: 3410, plasterSqft: 21400, floorTilesSqft: 2620, wallTilesSqft: 1480, paintGallons: 196 },
  sections: [
    { section: "CONCRETE", amountPaisa: "210000000" },
    { section: "CONTINGENCY", amountPaisa: "52000000" },
  ],
  specifications: [{ categoryKey: "CEMENT", label: "Cement", suppliedBy: "CONTRACTOR", qualityCategory: { id: "qc", name: "A Standard" }, materials: ["Cement OPC"] }],
  paymentStages: [
    { label: "Agreement & mobilisation", percent: 50, isRetention: false, amountPaisa: "925000000" },
    { label: "Handover", percent: 50, isRetention: false, amountPaisa: "925000000" },
  ],
  paymentTemplate: null,
  warnings: [],
  costPaisa: "1541666700",
  directCostPaisa: "1400000000",
  overheadPaisa: "70000000",
  contingencyPaisa: "71666700",
  finishingAllowancePaisa: "0",
  costPerSqftPaisa: "390296",
  pricePaisa: "1850000000",
  computedPricePaisa: "1850000000",
  perSqftPaisa: "468354",
  priceOverridden: false,
  marginPercent: 20,
  finishingAllowancePercent: 0,
  marginPaisa: "308333300",
  marginOnPricePercent: 16.67,
};

/** What the API returns to a PM without fields.contract / fields.profit: no price, no margin. */
const { pricePaisa: _p, computedPricePaisa: _c, perSqftPaisa: _s, priceOverridden: _o, marginPaisa: _m, marginOnPricePercent: _mp, marginPercent: _mpc, finishingAllowancePercent: _f, ...PM_COMPUTED } = COMPUTED;

const DETAIL: QuoteDetail = {
  ...summary({ status: "NEGOTIATION", followUp: false, revision: 2 }),
  notes: null,
  latest: { ...COMPUTED, id: "r2", revision: 2, note: null, createdAt: "2026-10-10T00:00:00.000Z", createdBy: { id: "u1", name: "Khalid Malik" } },
  revisions: [
    { revision: 2, createdAt: "2026-10-10T00:00:00.000Z", createdBy: { id: "u1", name: "Khalid Malik" }, note: "Margin 15 %", pricePaisa: "1850000000" },
    { revision: 1, createdAt: "2026-10-07T00:00:00.000Z", createdBy: { id: "u1", name: "Khalid Malik" }, note: null, pricePaisa: "1900000000" },
  ],
  activity: [
    { action: "quote.negotiation", at: "2026-10-12T00:00:00.000Z", by: { id: "u1", name: "Khalid Malik" }, system: false, details: { note: "Wants a better price" } },
    { action: "quote.create", at: "2026-10-07T00:00:00.000Z", by: { id: "u1", name: "Khalid Malik" }, system: false, details: null },
  ],
};

const INSIGHTS: QuoteInsights = {
  from: "2025-11-01",
  to: "2026-10-16",
  months: 12,
  totals: { quotes: 6, sent: 5, won: 1, lost: 1, expired: 1, open: 3 },
  winRate: 33.33,
  perMonth: [{ month: "2026-10", created: 3, won: 0, lost: 0 }],
  lossReasons: [
    { reason: "COMPETITOR_CHEAPER", count: 1 },
    { reason: "CLIENT_POSTPONED", count: 0 },
    { reason: "SELF_BUILD", count: 0 },
    { reason: "OTHER", count: 0 },
  ],
  followUps: [QUOTES[0]!],
  avgRateQuotedPaisa: "412000",
  avgRateWonPaisa: "468350",
  wonValuePaisa: "1850000000",
  pipelineValuePaisa: "3900000000",
};

const LABOUR_SCOPE: QuoteScope = {
  source: "DEFAULT",
  templateId: "labour-grey",
  name: "Labour only · grey structure",
  sections: [{ title: "A · Up to DPC", items: [{ text: "Excavation of foundations", who: "INCLUDED", price: { basis: "SQFT", ratePaisa: "4000" }, materials: [] }, { text: "Anti-termite proofing", who: "OWNER", price: { basis: "SQFT", ratePaisa: "1500" }, materials: [] }] }],
  rates: [{ label: "All work", ratePerSqftPaisa: "67500" }],
  baseRates: [],
  terms: [{ title: "Plot depth", text: "Rs 15 per sq ft for each foot below road level." }],
};
const tplOf = (id: string, contractType: QuoteTemplate["contractType"], isDefault: boolean, over: Partial<QuoteTemplate> = {}): QuoteTemplate => {
  const { source: _s, templateId: _t, ...content } = LABOUR_SCOPE;
  return { id, contractType, isDefault, ...content, ...over };
};
const TEMPLATE_LIST: QuoteTemplateList = {
  source: "DEFAULT",
  templates: [
    tplOf("labour-grey", "LABOR_ONLY", true),
    tplOf("grey-standard", "GREY_OWNER_FINISHING", true, { name: "Grey · Standard", sections: [{ title: "Grey structure", items: [{ text: "Brick work", who: "INCLUDED" }] }], rates: [{ label: "Inside", ratePerSqftPaisa: "285000" }, { label: "Outside", ratePerSqftPaisa: "30000" }] }),
    tplOf("grey-premium", "GREY_OWNER_FINISHING", false, { name: "Grey · Premium (A+)", baseRates: [{ item: "Steel Grade 60", ratePaisa: "25000", unit: "kg" }] }),
  ],
};
const createTemplate = vi.fn(() => ({ unwrap: () => Promise.resolve(TEMPLATE_LIST) }));
const updateTemplate = vi.fn(() => ({ unwrap: () => Promise.resolve(TEMPLATE_LIST) }));
const WORK_RATES: QuoteWorkRates = {
  source: "DEFAULT",
  rates: [
    { name: "Excavation of foundations", basis: "SQFT", ratePaisa: "4000", labourRatePaisa: "4000", materials: [] },
    { name: "Brick work up to roof slab", basis: "SQFT", ratePaisa: "14600", labourRatePaisa: "14600", materials: ["BRICKS", "CEMENT"] },
  ],
};
const saveRates = vi.fn(() => ({ unwrap: () => Promise.resolve({ ...WORK_RATES, source: "COMPANY" }) }));
const createQuote = vi.fn(() => ({ unwrap: () => Promise.resolve({ id: "q9", number: "Q-2026-0009" }) }));

let previewResult: QuoteComputed = COMPUTED;
const preview = vi.fn(() => ({ unwrap: () => Promise.resolve(previewResult) }));
const markWon = vi.fn(() => ({ unwrap: () => Promise.resolve({ quote: DETAIL, projectId: "p9", projectCode: "MSB-2026-017", created: true }) }));
const mutation = (fn = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }))) => () => [fn, { isLoading: false }];
let detail: QuoteDetail = DETAIL;
let quotes: QuoteSummary[] = QUOTES;
vi.mock("@/api/services/sales.api", () => ({
  useGetQuotesQuery: () => ({ data: { items: quotes, meta: { page: 1, limit: 100, total: 3, totalPages: 1 } }, isLoading: false, isFetching: false }),
  useGetQuoteQuery: () => ({ data: detail, isLoading: false }),
  useGetQuoteRevisionsQuery: () => ({ data: [detail.latest, { ...detail.latest, id: "r1", revision: 1, pricePaisa: "1900000000" }] }),
  useGetQuoteInsightsQuery: () => ({ data: INSIGHTS, isLoading: false }),
  usePreviewQuoteMutation: () => [preview, { isLoading: false }],
  useCreateQuoteMutation: () => [createQuote, { isLoading: false }],
  useAddQuoteRevisionMutation: mutation(),
  useDeleteQuoteMutation: mutation(),
  useSendQuoteMutation: mutation(),
  useRecordNegotiationMutation: mutation(),
  useMarkQuoteLostMutation: mutation(),
  useMarkQuoteWonMutation: () => [markWon, { isLoading: false }],
  useGetQuotePdfMutation: mutation(),
  useGetQuoteTemplatesQuery: () => ({ data: TEMPLATE_LIST, isLoading: false, isSuccess: true }),
  useCreateQuoteTemplateMutation: () => [createTemplate, { isLoading: false }],
  useUpdateQuoteTemplateMutation: () => [updateTemplate, { isLoading: false }],
  useDeleteQuoteTemplateMutation: mutation(),
  useResetQuoteTemplatesMutation: mutation(),
  useGetQuoteWorkRatesQuery: () => ({ data: WORK_RATES, isLoading: false, isSuccess: true }),
  useSaveQuoteWorkRatesMutation: () => [saveRates, { isLoading: false }],
  useResetQuoteWorkRatesMutation: mutation(),
}));
vi.mock("@/api/services/clients.api", () => ({ useGetClientsQuery: () => ({ data: { items: [{ id: "c1", name: "Hamid Ali", phone: "+923214445566" }] } }) }));
vi.mock("@/api/services/masterData.api", () => ({ useGetQualityCategoriesQuery: () => ({ data: [] }), useGetPaymentTemplatesQuery: () => ({ data: [] }) }));

const { QuotePipelineView } = await import("@/features/sales/QuotePipelineView");
const { NewQuoteView } = await import("@/features/sales/NewQuoteView");
const { QuoteDetailView } = await import("@/features/sales/QuoteDetailView");
const { InsightsView } = await import("@/features/sales/InsightsView");
const { QuoteTemplatesView } = await import("@/features/sales/QuoteTemplatesView");

beforeEach(() => {
  push.mockClear();
  preview.mockClear();
  previewResult = COMPUTED;
  detail = DETAIL;
  quotes = QUOTES;
});

describe("Sales — navigation and gating", () => {
  it("the three quote pages are live; the Munshi sees none of them", () => {
    const section = COMPANY_NAV.find((s) => s.id === "sales")!;
    const ids = ["sales.quotes", "sales.newQuote", "sales.insights"];
    expect(section.items.filter((i) => ids.includes(i.id)).every((i) => i.available)).toBe(true);
    const visible = (role: "THEKEDAR" | "PM" | "MUNSHI") => section.items.filter((i) => ids.includes(i.id) && canAccess(meFixture(role), i.access)).map((i) => i.id);
    expect(visible("THEKEDAR")).toEqual(ids);
    expect(visible("PM")).toEqual(ids);
    expect(visible("MUNSHI")).toEqual([]);
  });
});

describe("Sales — pipeline", () => {
  it("board: one column per status, cards in their column, follow-up flag, won project", () => {
    renderWithStore(<QuotePipelineView />, { me: meFixture("THEKEDAR") });
    expect(within(screen.getByTestId("column-SENT")).getByText("Valencia · 1 Kanal")).toBeInTheDocument();
    expect(within(screen.getByTestId("column-WON")).getByText("Project MSB-2026-012")).toBeInTheDocument();
    expect(within(screen.getByTestId("column-LOST")).getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("No reply for 8 days")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /New quote/ })).toBeInTheDocument();
  });

  it("table view lists the quotes; a PM may start a quote; prices the API leaves out show as hidden", async () => {
    const user = userEvent.setup();
    quotes = QUOTES.map(({ pricePaisa: _a, perSqftPaisa: _b, ...q }) => q as QuoteSummary);
    renderWithStore(<QuotePipelineView />, { me: meFixture("PM") });
    expect(screen.getByRole("link", { name: /New quote/ })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Table" }));
    expect(screen.getByText("Q-2026-0002")).toBeInTheDocument();
    expect(screen.getAllByText("Hidden for your role").length).toBeGreaterThan(0);
  });

  it("Roman Urdu labels", () => {
    renderWithStore(<QuotePipelineView />, { me: meFixture("THEKEDAR"), ui: { language: "roman-ur" } });
    expect(screen.getByText("Naya quote")).toBeInTheDocument();
    expect(screen.getAllByText("Bhej diya").length).toBeGreaterThan(0);
  });
});

describe("Sales — new quote (live internal view)", () => {
  it("typing the plot and covered area prices it live: price, per sq ft, cost, margin, customer summary", async () => {
    const user = userEvent.setup();
    renderWithStore(<NewQuoteView />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("Enter the plot, covered area and storeys to see the price.")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Plot size/), "10");
    await user.type(screen.getByLabelText(/Covered area/), "3950");
    await waitFor(() => expect(preview).toHaveBeenCalled(), { timeout: 3000 });
    const body = (preview.mock.calls.at(-1) as unknown as [{ coveredAreaSqft: number; plot: { size: number } }])[0];
    expect(body).toMatchObject({ coveredAreaSqft: 3950, plot: { size: 10 }, floors: 2 });
    const internal = await screen.findByTestId("quote-internal");
    expect(within(within(internal).getByTestId("quote-price")).getByText("Rs 1,85,00,000")).toBeInTheDocument();
    expect(within(within(internal).getByTestId("quote-cost")).getByText("Rs 1,54,16,667")).toBeInTheDocument();
    expect(within(internal).getByText("16.67% of the price")).toBeInTheDocument();
    expect(within(internal).getByText("Concrete (PCC / RCC)")).toBeInTheDocument();
    const customer = screen.getByTestId("quote-customer");
    expect(within(customer).getByText("Rs 4,683.54")).toBeInTheDocument();
    // the customer summary never shows cost or margin
    expect(within(customer).queryByText("Rs 1,54,16,667")).toBeNull();
    expect(within(customer).queryByText(/Margin/)).toBeNull();
    expect(within(customer).getByText("Total 100%")).toBeInTheDocument();
  });

  it("a PM without profit / contract permissions gets no margin or agreed-price fields and sees cost only", async () => {
    previewResult = PM_COMPUTED as QuoteComputed;
    const user = userEvent.setup();
    renderWithStore(<NewQuoteView />, { me: meFixture("PM") });
    expect(screen.queryByLabelText(/Margin on cost/)).toBeNull();
    expect(screen.queryByLabelText(/Agreed price/)).toBeNull();
    await user.type(screen.getByLabelText(/Plot size/), "10");
    await user.type(screen.getByLabelText(/Covered area/), "3950");
    const internal = await screen.findByTestId("quote-internal", {}, { timeout: 3000 });
    await waitFor(() => expect(within(internal).getByTestId("quote-cost")).toHaveTextContent("Rs 1,54,16,667"));
    expect(within(within(internal).getByTestId("quote-price")).getByText("Hidden for your role")).toBeInTheDocument();
  });
});

describe("Sales — quote detail", () => {
  it("shows the revisions compare and the activity; Mark as won opens the pre-filled project wizard", async () => {
    const user = userEvent.setup();
    renderWithStore(<QuoteDetailView quoteId="q1" />, { me: meFixture("THEKEDAR") });
    expect(screen.getByTestId("revision-compare")).toBeInTheDocument();
    expect(within(screen.getByTestId("quote-activity")).getByText("Wants a better price")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mark as won" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Mark as won" }));
    await waitFor(() => expect(markWon).toHaveBeenCalledWith({ id: "q1", body: {} }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/projects/new?id=p9&tab=5"));
  });

  it("a PM can work on the quote but not mark it won or send a price", () => {
    renderWithStore(<QuoteDetailView quoteId="q1" />, { me: meFixture("PM") });
    expect(screen.queryByRole("button", { name: "Mark as won" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Send/ })).toBeNull();
  });

  it("owner decision 7: a PM granted sales.quote.approve (+ projects.project.create) sees Mark as won and can use it", async () => {
    const user = userEvent.setup();
    renderWithStore(<QuoteDetailView quoteId="q1" />, { me: meFixture("PM", { permissions: [...permissionsFor("PM"), "sales.quote.approve"] }) });
    await user.click(screen.getByRole("button", { name: "Mark as won" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Mark as won" }));
    await waitFor(() => expect(markWon).toHaveBeenCalledWith({ id: "q1", body: {} }));
  });

  it("owner decision 7: both keys are needed — sales.quote.approve without projects.project.create shows no Mark as won", () => {
    renderWithStore(<QuoteDetailView quoteId="q1" />, { me: meFixture("PM", { permissions: [...permissionsFor("PM").filter((k) => k !== "projects.project.create"), "sales.quote.approve"] }) });
    expect(screen.queryByRole("button", { name: "Mark as won" })).toBeNull();
  });

  it("a lost quote shows its reason and no actions", () => {
    detail = { ...DETAIL, status: "LOST", lostReason: "COMPETITOR_CHEAPER", lostNote: "Rs 300 per sq ft less" };
    renderWithStore(<QuoteDetailView quoteId="q1" />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("Lost: Competitor was cheaper")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as won" })).toBeNull();
  });
});

describe("Sales — win / loss insights", () => {
  it("KPIs, loss reasons and the follow-up list (Urdu)", () => {
    renderWithStore(<InsightsView />, { me: meFixture("THEKEDAR"), ui: { language: "ur" } });
    expect(screen.getByText("جیت کی شرح")).toBeInTheDocument();
    expect(screen.getByText("33.33%")).toBeInTheDocument();
    expect(within(screen.getByTestId("follow-ups")).getByText("Valencia · 1 Kanal")).toBeInTheDocument();
  });
});

describe("Sales — quotation templates (scope)", () => {
  it("a new quote starts with the default template of its type; another grade can be picked; Edit for this quote sends its own list", { timeout: 30_000 }, async () => {
    const user = userEvent.setup();
    createQuote.mockClear();
    renderWithStore(<NewQuoteView />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("Work details & terms")).toBeInTheDocument();
    expect(screen.getAllByText("Grey · Standard").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Use the template rate \(Rs 3,150 per sq ft\)/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Edit for this quote/ }));
    expect(screen.getByText("Changes here are for this quote only.")).toBeInTheDocument();
    const title = screen.getByDisplayValue("Grey structure");
    await user.clear(title);
    await user.type(title, "A · Foundation");
    await user.type(screen.getByLabelText(/Plot size/), "10");
    await user.type(screen.getByLabelText(/Covered area/), "3950");
    await user.type(screen.getByLabelText(/Quote title/), "Valencia grey");
    await user.click(screen.getByRole("radio", { name: "New client" }));
    await user.type(screen.getByLabelText(/Client name/), "Hamid Ali");
    await user.type(screen.getByLabelText(/Client phone/), "03214445566");
    await user.click(screen.getAllByRole("button", { name: "Save quote" })[0]!);
    await waitFor(() => expect(createQuote).toHaveBeenCalled());
    const body = (createQuote.mock.calls.at(-1) as unknown as [{ inputs: { scope: { templateId: string; name: string; sections: Array<{ title: string }>; rates: unknown[] } } }])[0];
    expect(body.inputs.scope).toMatchObject({ templateId: "grey-standard", name: "Grey · Standard", sections: [{ title: "A · Foundation" }] });
    expect(body.inputs.scope.rates).toHaveLength(2);
    // the live price follows the edited list (it prices the quote)
    await waitFor(() => expect((preview.mock.calls.at(-1) as unknown as [Record<string, unknown>])[0]).toHaveProperty("scope"));
  });

  it("Use the template rate sets the agreed price = rate × covered area", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();
    renderWithStore(<NewQuoteView />, { me: meFixture("THEKEDAR") });
    await user.type(screen.getByLabelText(/Covered area/), "3600");
    await user.click(screen.getByRole("button", { name: /Use the template rate/ }));
    expect(screen.getByLabelText(/Agreed price/)).toHaveValue("1,13,40,000");
  });

  it("templates page: grouped by contract type; the owner edits a template and saves it", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();
    updateTemplate.mockClear();
    renderWithStore(<QuoteTemplatesView />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("These are the built-in templates. Your first change saves them as your company's list.")).toBeInTheDocument();
    // one tab per contract type; Labour only first
    expect(screen.getByRole("tab", { name: /Labour only \(1\)/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText("Grey · Premium (A+)")).toBeNull();
    await user.click(screen.getByRole("tab", { name: /Grey \+ owner finishing/ }));
    expect(screen.getByText("Grey · Premium (A+)")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Labour only/ }));
    await user.click(screen.getAllByRole("button", { name: /^Edit$/ })[0]!);
    expect(screen.getByDisplayValue("A · Up to DPC")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Add item/ }));
    const items = screen.getAllByRole("textbox", { name: "Work item" });
    await user.type(items.at(-1)!, "DPC 50 mm thick");
    await user.click(screen.getByRole("button", { name: /Save template/ }));
    await waitFor(() => expect(updateTemplate).toHaveBeenCalled());
    const arg = (updateTemplate.mock.calls.at(-1) as unknown as [{ id: string; body: { contractType: string; sections: Array<{ items: Array<{ text: string; who: string }> }> } }])[0];
    expect(arg.id).toBe("labour-grey");
    expect(arg.body.contractType).toBe("LABOR_ONLY");
    expect(arg.body.sections[0]!.items.at(-1)).toEqual({ text: "DPC 50 mm thick", who: "INCLUDED", price: null, materials: [] });
  });

  it("a PM (no sales.quote.manage) only reads the templates", async () => {
    const user = userEvent.setup();
    renderWithStore(<QuoteTemplatesView />, { me: meFixture("PM") });
    expect(screen.queryByRole("button", { name: /New template/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Edit$/ })).toBeNull();
    await user.click(screen.getByRole("tab", { name: /Grey \+ owner finishing/ }));
    expect(screen.getByText("Grey · Standard")).toBeInTheDocument();
  });

  it("the quote detail lists the rate parts and the work items with who does them", () => {
    detail = { ...DETAIL, latest: { ...DETAIL.latest, inputs: { ...DETAIL.latest.inputs, scope: LABOUR_SCOPE } } };
    renderWithStore(<QuoteDetailView quoteId="q1" />, { me: meFixture("THEKEDAR") });
    expect(screen.getByText("Anti-termite proofing")).toBeInTheDocument();
    expect(screen.getAllByText("By owner").length).toBeGreaterThan(0);
    expect(screen.getByText("Total Rs 675 per sq ft")).toBeInTheDocument();
    // each line shows its price; the owner's line is struck out (it adds nothing)
    expect(screen.getByText("Rs 40 / sq ft")).toBeInTheDocument();
    expect(screen.getByText("Rs 15 / sq ft")).toHaveClass("line-through");
    expect(screen.getByText("Included lines: Rs 40 per sq ft (+ material from the price list)")).toBeInTheDocument();
  });
});

describe("Sales — work rates", () => {
  it("the Work rates tab lists each work's price; the owner changes one and saves the list", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();
    saveRates.mockClear();
    renderWithStore(<QuoteTemplatesView />, { me: meFixture("THEKEDAR") });
    await user.click(screen.getByRole("tab", { name: "Work rates" }));
    expect(screen.getByDisplayValue("Excavation of foundations")).toBeInTheDocument();
    const rates = screen.getAllByRole("textbox", { name: "Rate (with material)" });
    await user.clear(rates[0]!);
    await user.type(rates[0]!, "60");
    await user.click(screen.getByRole("button", { name: /Save rates/ }));
    await waitFor(() => expect(saveRates).toHaveBeenCalled());
    const sent = (saveRates.mock.calls.at(-1) as unknown as [Array<{ name: string; ratePaisa: string }>])[0];
    expect(sent[0]).toMatchObject({ name: "Excavation of foundations", ratePaisa: "6000" });
    expect(sent).toHaveLength(2);
  });

  it("a template line shows the work rate of its name, or that it has none", { timeout: 20_000 }, async () => {
    const user = userEvent.setup();
    renderWithStore(<QuoteTemplatesView />, { me: meFixture("THEKEDAR") });
    await user.click(screen.getAllByRole("button", { name: /^Edit$/ })[0]!);
    expect(screen.getAllByText("No rate — add it in Work rates").length).toBeGreaterThan(0);
  });
});
