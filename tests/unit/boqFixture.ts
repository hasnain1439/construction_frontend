/**
 * Step 11 fixtures shaped like the dev API (DHA Phase 6 · 10 Marla, Rev 1 approved / Rev 2 draft):
 * GET /estimates/:id, GET /projects/:id/estimates, compare, owner shopping list, GET /rulebook.
 */
import type {
  BoqLine,
  CompanyRulebook,
  EstimateCompare,
  EstimateDetail,
  EstimateSummary,
  OwnerShoppingList,
} from "@/api/types";

const MONEY_KEYS = ["ratePaisa", "effectiveRatePaisa", "rateUnit", "rateQuantity", "amountPaisa", "rateStatus"] as const;

export function boqLine(over: Partial<BoqLine> & Pick<BoqLine, "lineKey" | "section">): BoqLine {
  return {
    id: `id-${over.lineKey}`,
    stageKey: "GF_STRUCTURE",
    kind: "MATERIAL",
    description: "Cement OPC",
    material: "cement",
    materialId: "m-cement",
    unit: "bag",
    quantity: 193.92,
    wastagePercent: 2,
    quantityWithWastage: 197.8,
    suppliedBy: "CONTRACTOR",
    formula: "3 items · 193.92 bag + 2% wastage = 197.8 bag",
    trace: ["Ground floor · slab: 743.49 cft × 1.54 dry × 1/7 ÷ 1.25 cft per bag = 130.85 bag"],
    override: null,
    effectiveQuantity: 197.8,
    ratePaisa: "145000",
    effectiveRatePaisa: "145000",
    rateUnit: "bag",
    rateQuantity: 197.8,
    amountPaisa: "28681000",
    rateStatus: "OK",
    ...over,
  };
}

const CEMENT = boqLine({ lineKey: "CONCRETE.GF_STRUCTURE.cement", section: "CONCRETE" });
const STEEL = boqLine({
  lineKey: "STEEL.GF_STRUCTURE.steel",
  section: "STEEL",
  description: "Steel Grade-60 #4",
  material: "steel",
  materialId: "m-steel",
  unit: "kg",
  quantity: 3560.28,
  wastagePercent: 4,
  quantityWithWastage: 3702.69,
  effectiveQuantity: 3702.69,
  formula: "3 items · 3560.28 kg + 4% wastage = 3702.69 kg",
  trace: ["Ground floor · slab: 743.49 cft × 1% × 222 kg per cft = 1650.55 kg"],
  ratePaisa: "28500000",
  effectiveRatePaisa: "28500000",
  rateUnit: "ton",
  rateQuantity: 3.7027,
  amountPaisa: "105526950",
});
const TILES_OWNER = boqLine({
  lineKey: "FLOORING_TILES.FINISHING.floorTiles",
  section: "FLOORING_TILES",
  stageKey: "FINISHING",
  description: "Floor tiles",
  material: "floorTiles",
  materialId: "m-tiles",
  unit: "sqft",
  quantity: 2269,
  wastagePercent: 7,
  quantityWithWastage: 2427.83,
  effectiveQuantity: 2427.83,
  suppliedBy: "OWNER",
  formula: "Room floors 2269 sq ft + 7% wastage",
  trace: ["Ground floor · Lounge 20 × 16 = 320 sq ft"],
  ratePaisa: null,
  effectiveRatePaisa: null,
  rateUnit: null,
  rateQuantity: null,
  amountPaisa: null,
  rateStatus: "OWNER_SUPPLIED",
});
const ELECTRICAL = boqLine({
  lineKey: "MEP_ROUGH_IN.PLASTER_MEP.electrical",
  section: "MEP_ROUGH_IN",
  stageKey: "PLASTER_MEP",
  kind: "LUMP_SUM",
  description: "Electrical rough-in (conduits, boxes)",
  material: null,
  materialId: null,
  unit: "sqft",
  quantity: 3950,
  wastagePercent: 0,
  quantityWithWastage: 3950,
  effectiveQuantity: 3950,
  formula: "Covered 3950 sq ft × Rs 150 per sq ft",
  trace: ["Covered area 3950 sq ft"],
  ratePaisa: "15000",
  effectiveRatePaisa: "15000",
  rateUnit: "sqft",
  rateQuantity: 3950,
  amountPaisa: "59250000",
});
const OVERHEADS = boqLine({
  lineKey: "SITE_OVERHEADS.ALL.siteOverheads",
  section: "SITE_OVERHEADS",
  stageKey: null,
  kind: "PERCENT",
  description: "Site overheads",
  material: null,
  materialId: null,
  unit: "%",
  quantity: 3,
  wastagePercent: 0,
  quantityWithWastage: 3,
  effectiveQuantity: 3,
  formula: "3% of the direct cost",
  trace: [],
  ratePaisa: null,
  effectiveRatePaisa: null,
  rateUnit: null,
  rateQuantity: 193457950,
  amountPaisa: "5803739",
});

const SUMMARY: EstimateSummary = {
  id: "est-2",
  projectId: "p1",
  revision: 2,
  status: "DRAFT",
  ratesOutdated: false,
  note: "Updated after the price-list revision",
  region: "PUNJAB_KP",
  rulebook: { id: "rb1", region: "PUNJAB_KP", version: 1 },
  generatedAt: "2026-10-16T07:15:03.861Z",
  generatedBy: { id: "u2", name: "Bilal Ahmed" },
  approvedAt: null,
  approvedBy: null,
  supersededAt: null,
  coveredAreaSqft: 3950,
  lineCount: 5,
  ownerSuppliedLines: 1,
  directCostPaisa: "193457950",
  overheadPaisa: "5803739",
  contingencyPaisa: "13948318",
  totalPaisa: "213210007",
  perSqftPaisa: "53977",
  contractTotalPaisa: "1850000000",
  marginPaisa: "1636789993",
  marginPercent: 88.48,
};

export function estimateDetail(over: Partial<EstimateDetail> = {}): EstimateDetail {
  return {
    ...SUMMARY,
    project: { id: "p1", code: "MSB-2026-012", name: "DHA Phase 6 · 10 Marla", contractType: "GREY_OWNER_FINISHING" },
    sections: [
      // API order is BoQ order; given shuffled here to prove the UI orders them.
      { section: "STEEL", lines: [STEEL], amountPaisa: "105526950" },
      { section: "CONCRETE", lines: [CEMENT], amountPaisa: "28681000" },
      { section: "FLOORING_TILES", lines: [TILES_OWNER], amountPaisa: "0" },
      { section: "MEP_ROUGH_IN", lines: [ELECTRICAL], amountPaisa: "59250000" },
      { section: "SITE_OVERHEADS", lines: [OVERHEADS], amountPaisa: "5803739" },
    ],
    stages: [
      { stageKey: "GF_STRUCTURE", amountPaisa: "134207950" },
      { stageKey: "PLASTER_MEP", amountPaisa: "59250000" },
      { stageKey: "FINISHING", amountPaisa: "0" },
    ],
    parameters: { contingencyPercent: { value: 7, source: "COMPANY" } },
    warnings: [],
    basis: { structureType: "FRAMED", coveredAreaSqft: 3950, floors: [] },
    ...over,
  };
}

/** What the API sends without fields.rates: every money key absent. */
export function withoutMoney(e: EstimateDetail): EstimateDetail {
  const strip = <T extends object>(o: T, keys: readonly string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k))) as T;
  return {
    ...strip(e, ["directCostPaisa", "overheadPaisa", "contingencyPaisa", "totalPaisa", "perSqftPaisa", "contractTotalPaisa", "marginPaisa", "marginPercent"]),
    sections: e.sections.map((s) => ({ section: s.section, lines: s.lines.map((l) => strip(l, MONEY_KEYS)) })),
    stages: e.stages.map((s) => ({ stageKey: s.stageKey })),
  };
}

export const REVISIONS: EstimateSummary[] = [
  SUMMARY,
  {
    ...SUMMARY,
    id: "est-1",
    revision: 1,
    status: "APPROVED",
    note: "First estimate for the owner meeting",
    generatedAt: "2026-03-02T05:00:00.000Z",
    generatedBy: { id: "u1", name: "Khalid Malik" },
    approvedAt: "2026-03-04T11:30:00.000Z",
    approvedBy: { id: "u1", name: "Khalid Malik" },
    totalPaisa: "196668188",
  },
];

export const COMPARE: EstimateCompare = {
  a: REVISIONS[1]!,
  b: REVISIONS[0]!,
  lines: [
    { lineKey: "MASONRY.GF_STRUCTURE.bricks", section: "MASONRY", stageKey: "GF_STRUCTURE", description: "Clay bricks Class-1", unit: "nos", change: "CHANGED", quantityA: 22942.67, quantityB: 23700, quantityDelta: 757.33, ratePaisaA: "1700", ratePaisaB: "1700", amountPaisaA: "39002539", amountPaisaB: "40290000", amountDeltaPaisa: "1287461" },
    { lineKey: "PAINT.FINISHING.primer", section: "PAINT", stageKey: "FINISHING", description: "Primer", unit: "gallon", change: "ADDED", quantityA: null, quantityB: 37.63, quantityDelta: 37.63, ratePaisaA: null, ratePaisaB: null, amountPaisaA: null, amountPaisaB: null, amountDeltaPaisa: null },
    { lineKey: "ROOF_WATERPROOFING.MUMTY_ROOF.bitumen", section: "ROOF_WATERPROOFING", stageKey: "MUMTY_ROOF", description: "Bitumen", unit: "kg", change: "REMOVED", quantityA: 280, quantityB: null, quantityDelta: -280, ratePaisaA: "30000", ratePaisaB: null, amountPaisaA: "8400000", amountPaisaB: null, amountDeltaPaisa: "-8400000" },
    { lineKey: "CONCRETE.GF_STRUCTURE.cement", section: "CONCRETE", stageKey: "GF_STRUCTURE", description: "Cement OPC", unit: "bag", change: "UNCHANGED", quantityA: 197.8, quantityB: 197.8, quantityDelta: 0, ratePaisaA: "145000", ratePaisaB: "145000", amountPaisaA: "28681000", amountPaisaB: "28681000", amountDeltaPaisa: "0" },
  ],
  sections: [
    { section: "CONCRETE", amountPaisaA: "28681000", amountPaisaB: "28681000", deltaPaisa: "0" },
    { section: "MASONRY", amountPaisaA: "39002539", amountPaisaB: "40290000", deltaPaisa: "1287461" },
    { section: "ROOF_WATERPROOFING", amountPaisaA: "8400000", amountPaisaB: "0", deltaPaisa: "-8400000" },
  ],
  totals: { totalPaisaA: "196668188", totalPaisaB: "213210007", deltaPaisa: "16541819", deltaPercent: 8.41 },
};

export const SHOPPING: OwnerShoppingList = {
  source: "APPROVED",
  estimateId: "est-1",
  revision: 1,
  items: [
    { material: "cement", materialId: "m-cement", description: "Cement OPC", unit: "bag", quantity: 41.04, neededBy: "FINISHING", stages: [{ stageKey: "FINISHING", quantity: 41.04 }] },
    { material: "floorTiles", materialId: "m-tiles", description: "Floor tiles", unit: "sqft", quantity: 2427.83, neededBy: "FINISHING", stages: [{ stageKey: "FINISHING", quantity: 2427.83 }] },
    { material: "steel", materialId: "m-steel", description: "Steel Grade-60 #4", unit: "kg", quantity: 1200.5, neededBy: "GF_STRUCTURE", stages: [{ stageKey: "GF_STRUCTURE", quantity: 800 }, { stageKey: "F1_STRUCTURE", quantity: 400.5 }] },
  ],
};

export const RULEBOOK: CompanyRulebook = {
  region: "PUNJAB_KP",
  rulebook: { id: "rb1", version: 1, status: "PUBLISHED", publishedAt: "2026-10-16T00:14:22.358Z", notes: "v1" },
  parameters: [
    {
      key: "externalWallThicknessIn",
      group: "WALLS",
      label: { en: "External wall thickness", roman: "Bahar ki deewar ki motai", ur: "بیرونی دیوار کی موٹائی" },
      unit: "in",
      description: "External walls (and foundation walls).",
      platformValue: 9,
      companyValue: null,
      companyNote: null,
      value: 9,
      source: "RULEBOOK",
      safeMin: 4.5,
      safeMax: 18,
      reviewStatus: "PENDING_ENGINEER_REVIEW",
      projectOverridable: true,
    },
    {
      key: "contingencyPercent",
      group: "OVERHEADS",
      label: { en: "Contingency", roman: "Ghair mutawaqqa kharcha", ur: "غیر متوقع خرچہ" },
      unit: "%",
      description: "% of direct cost + overheads.",
      platformValue: 5,
      companyValue: 7,
      companyNote: "Steel and cement prices keep moving",
      value: 7,
      source: "COMPANY",
      safeMin: 0,
      safeMax: 15,
      reviewStatus: "REVIEWED",
      projectOverridable: true,
    },
  ],
};
