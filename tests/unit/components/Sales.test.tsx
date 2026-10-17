import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuoteComputed, QuoteDetail, QuoteInsights, QuoteSummary } from "@/api/types";
import { COMPANY_NAV } from "@/lib/navigation";
import { canAccess } from "@/lib/permissions";
import { meFixture } from "../fixtures";
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
  useCreateQuoteMutation: mutation(),
  useAddQuoteRevisionMutation: mutation(),
  useDeleteQuoteMutation: mutation(),
  useSendQuoteMutation: mutation(),
  useRecordNegotiationMutation: mutation(),
  useMarkQuoteLostMutation: mutation(),
  useMarkQuoteWonMutation: () => [markWon, { isLoading: false }],
  useGetQuotePdfMutation: mutation(),
}));
vi.mock("@/api/services/clients.api", () => ({ useGetClientsQuery: () => ({ data: { items: [{ id: "c1", name: "Hamid Ali", phone: "+923214445566" }] } }) }));
vi.mock("@/api/services/masterData.api", () => ({ useGetQualityCategoriesQuery: () => ({ data: [] }), useGetPaymentTemplatesQuery: () => ({ data: [] }) }));

const { QuotePipelineView } = await import("@/features/sales/QuotePipelineView");
const { NewQuoteView } = await import("@/features/sales/NewQuoteView");
const { QuoteDetailView } = await import("@/features/sales/QuoteDetailView");
const { InsightsView } = await import("@/features/sales/InsightsView");

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
