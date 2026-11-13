/**
 * Step 12 · Quotes / sales pipeline. Request bodies come from the generated OpenAPI file; response
 * shapes are written here (PHASE_2_3_CONTRACTS.md "Step 12"). Money keys are OMITTED without the
 * field permission — hence `?`: price → fields.contract, cost → fields.rates, margin → contract + profit.
 */
import type { Id, IsoDate, IsoDateTime, Paisa, RequestBody } from "./common";
import type { ProjectStatus, SupplyCategoryKey } from "./projects";

export type QuoteStatus = "DRAFT" | "SENT" | "NEGOTIATION" | "WON" | "LOST" | "EXPIRED";
export const QUOTE_STATUSES: QuoteStatus[] = ["DRAFT", "SENT", "NEGOTIATION", "WON", "LOST", "EXPIRED"];
export type QuoteLostReason = "COMPETITOR_CHEAPER" | "CLIENT_POSTPONED" | "SELF_BUILD" | "OTHER";
export const LOST_REASONS: QuoteLostReason[] = ["COMPETITOR_CHEAPER", "CLIENT_POSTPONED", "SELF_BUILD", "OTHER"];
export type QuoteContractType = "FULL" | "GREY_OWNER_FINISHING" | "LABOR_ONLY";
export type QuoteStructureType = "FRAMED" | "LOAD_BEARING";
export type QuotePlotUnit = "MARLA" | "KANAL" | "SQFT";

export interface QuotePerson {
  id: Id;
  name: string;
}

export interface QuoteInputs {
  plot: { unit: QuotePlotUnit; size: number; frontFt: number | null; depthFt: number | null; marlaStandard: number };
  coveredAreaSqft: number;
  floors: number;
  mumty: boolean;
  basement: boolean;
  basementHeightFt: number;
  structureType: QuoteStructureType;
  contractType: QuoteContractType;
  qualityCategoryId: Id | null;
  supplyRules: Array<{ categoryKey: string; suppliedBy: "CONTRACTOR" | "OWNER" }>;
  paymentTemplateId: Id | null;
  /** fields.contract */
  finalPricePaisa?: Paisa | null;
  /** fields.contract + fields.profit */
  marginPercent?: number;
  finishingAllowancePercent?: number;
  /** Scope of work + terms; missing on revisions saved before it existed. */
  scope?: QuoteScope | null;
}

/** Who a work item is for: in the quoted rate, provided / done by the owner, or not in this quotation. */
export type QuoteScopeWho = "INCLUDED" | "OWNER" | "EXCLUDED";
/** What a quotation prints: work list, rate per sq ft in parts, material base rates, notes. */
export type QuotePriceBasis = "SQFT" | "UNIT" | "LUMP_SUM";
/** One work line: who does it, its price when included, and the supply categories of its material. */
export interface QuoteScopeItem {
  text: string;
  who: QuoteScopeWho;
  price?: { basis: QuotePriceBasis; ratePaisa: Paisa; quantity?: number | null } | null;
  materials?: SupplyCategoryKey[];
}
export interface QuoteScopeContent {
  /** Quality category for the material prices (price list); null = the quote's / company default. */
  qualityCategoryId?: string | null;
  name: string;
  sections: Array<{ title: string; outside?: boolean; items: QuoteScopeItem[] }>;
  rates: Array<{ label: string; ratePerSqftPaisa: Paisa }>;
  baseRates: Array<{ item: string; ratePaisa: Paisa; unit: string }>;
  terms: Array<{ title: string; text: string }>;
}
/** A quote's own copy (inputs.scope). */
export interface QuoteScopeBody extends QuoteScopeContent {
  templateId?: string | null;
}
/** COMPANY / DEFAULT = copied from a template; QUOTE = edited for this quote. */
export interface QuoteScope extends QuoteScopeContent {
  source: "COMPANY" | "DEFAULT" | "QUOTE";
  templateId: string | null;
}
export interface QuoteTemplateBody extends QuoteScopeContent {
  contractType: QuoteContractType;
  isDefault: boolean;
}
export interface QuoteTemplate extends QuoteTemplateBody {
  id: string;
}
/** The price of a work line, by name: one rate for contracts with material, one for labour only. */
export interface QuoteWorkRate {
  name: string;
  basis: QuotePriceBasis;
  ratePaisa: Paisa | null;
  labourRatePaisa: Paisa | null;
  materials: SupplyCategoryKey[];
}
export interface QuoteWorkRates {
  source: "COMPANY" | "DEFAULT";
  rates: QuoteWorkRate[];
}
/** COMPANY = the company saved its list; DEFAULT = the built-in list. */
export interface QuoteTemplateList {
  source: "COMPANY" | "DEFAULT";
  templates: QuoteTemplate[];
}

export interface QuoteSummary {
  id: Id;
  number: string;
  status: QuoteStatus;
  title: string;
  client: { id: Id; name: string; phone: string };
  siteAddress: string | null;
  city: string | null;
  revision: number;
  contractType: QuoteContractType;
  coveredAreaSqft: number;
  validUntil: IsoDate;
  sentAt: IsoDateTime | null;
  lastActivityAt: IsoDateTime;
  daysSinceActivity: number;
  followUp: boolean;
  wonAt: IsoDateTime | null;
  lostAt: IsoDateTime | null;
  expiredAt: IsoDateTime | null;
  lostReason: QuoteLostReason | null;
  lostNote: string | null;
  wonProject: { id: Id; code: string; name: string; status: ProjectStatus } | null;
  createdBy: QuotePerson | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  pricePaisa?: Paisa | null;
  perSqftPaisa?: Paisa | null;
}

export interface QuoteFloorBasis {
  level: "BASEMENT" | "GROUND" | "FIRST" | "SECOND" | "THIRD" | "MUMTY";
  name: string;
  areaSqft: number;
  rooms: number;
  wetRooms: number;
  ceilingHeightFt: number;
}

export interface QuoteQuantities {
  cementBags: number;
  steelKg: number;
  bricks: number;
  blocks: number;
  sandCft: number;
  crushCft: number;
  plasterSqft: number;
  floorTilesSqft: number;
  wallTilesSqft: number;
  paintGallons: number;
}

/** A priced quote version (saved revision, or the live preview without id / revision). */
export interface QuoteLinePricing {
  lines: Array<{ section: string; outside: boolean; text: string; who: QuoteScopeWho; amountPaisa: Paisa }>;
  workPaisa: Paisa;
  insideWorkPaisa: Paisa;
  outsideWorkPaisa: Paisa;
  materialPaisa: Paisa;
  materialMarginPaisa: Paisa;
  materials: Array<{ categoryKey: string; amountPaisa: Paisa }>;
  insideRatePaisa: Paisa | null;
  outsideRatePaisa: Paisa | null;
}

export interface QuoteComputed {
  inputs: QuoteInputs;
  rulebook: { region: string; version: number | null };
  basis: { plotAreaSqft: number | null; coveredAreaSqft: number; storeyAreaSqft: number; floors: QuoteFloorBasis[]; foundation: "ISOLATED" | "STRIP"; assumptions: Record<string, number> };
  quantities: QuoteQuantities;
  sections: Array<{ section: string; amountPaisa?: Paisa }>;
  specifications: Array<{ categoryKey: string; label: string; suppliedBy: "CONTRACTOR" | "OWNER"; qualityCategory: { id: Id; name: string } | null; materials: string[] }>;
  paymentStages: Array<{ label: string; percent: number; isRetention: boolean; amountPaisa?: Paisa | null }>;
  paymentTemplate: { id: Id; name: string } | null;
  /** Translated in the app from `code` + `params` / `materials` / `items` (QA-A-10). */
  warnings: Array<{ code: string; message: string; params?: Record<string, number>; materials?: string[]; items?: string[] }>;
  /** Priced line by line (work list prices + material from the price list of the category). */
  pricedByLine?: boolean;
  // fields.rates
  linePricing?: QuoteLinePricing | null;
  costPaisa?: Paisa;
  directCostPaisa?: Paisa;
  overheadPaisa?: Paisa;
  contingencyPaisa?: Paisa;
  finishingAllowancePaisa?: Paisa;
  costPerSqftPaisa?: Paisa | null;
  // fields.contract
  pricePaisa?: Paisa | null;
  computedPricePaisa?: Paisa | null;
  perSqftPaisa?: Paisa | null;
  priceOverridden?: boolean;
  // fields.contract + fields.profit
  marginPercent?: number;
  finishingAllowancePercent?: number;
  marginPaisa?: Paisa | null;
  marginOnPricePercent?: number | null;
}

export interface QuoteRevision extends QuoteComputed {
  id: Id;
  revision: number;
  note: string | null;
  createdAt: IsoDateTime;
  createdBy: QuotePerson | null;
}

export interface QuoteActivity {
  action: string;
  at: IsoDateTime;
  by: QuotePerson | null;
  system: boolean;
  details: Record<string, unknown> | null;
}

export interface QuoteDetail extends QuoteSummary {
  notes: string | null;
  latest: QuoteRevision;
  revisions: Array<{ revision: number; createdAt: IsoDateTime; createdBy: QuotePerson | null; note: string | null; pricePaisa?: Paisa; perSqftPaisa?: Paisa | null; costPaisa?: Paisa }>;
  activity: QuoteActivity[];
}

export interface QuoteAssumption {
  key: string;
  group: "QUICK";
  label: { en: string; roman: string; ur: string };
  unit: string;
  value: number;
  description: string;
  reviewStatus: string;
}

export interface QuoteInsights {
  from: IsoDate;
  to: IsoDate;
  months: number;
  totals: { quotes: number; sent: number; won: number; lost: number; expired: number; open: number };
  winRate: number | null;
  perMonth: Array<{ month: string; created: number; won: number; lost: number }>;
  lossReasons: Array<{ reason: QuoteLostReason; count: number }>;
  followUps: QuoteSummary[];
  avgRateQuotedPaisa?: Paisa | null;
  avgRateWonPaisa?: Paisa | null;
  wonValuePaisa?: Paisa;
  pipelineValuePaisa?: Paisa;
}

export interface QuoteWonResult {
  quote: QuoteDetail;
  projectId: Id;
  projectCode: string;
  created: boolean;
}

export interface QuotesQuery {
  page?: number;
  limit?: number;
  status?: QuoteStatus;
  search?: string;
  clientId?: Id;
  followUp?: "true" | "false";
}

export type QuoteInputsBody = RequestBody<"/api/v1/quotes/preview", "post">["inputs"] & { scope?: QuoteScopeBody | null; scopeTemplateId?: string | null };
export type CreateQuoteBody = RequestBody<"/api/v1/quotes", "post">;
export type UpdateQuoteBody = RequestBody<"/api/v1/quotes/{id}", "patch">;
export type AddQuoteRevisionBody = RequestBody<"/api/v1/quotes/{id}/revisions", "post">;
export type SendQuoteBody = RequestBody<"/api/v1/quotes/{id}/send", "post">;
export type QuoteLostBody = RequestBody<"/api/v1/quotes/{id}/lost", "post">;
export type QuoteWonBody = RequestBody<"/api/v1/quotes/{id}/won", "post">;
