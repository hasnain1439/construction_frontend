/**
 * Step 12 · Quotes / sales pipeline. Request bodies come from the generated OpenAPI file; response
 * shapes are written here (PHASE_2_3_CONTRACTS.md "Step 12"). Money keys are OMITTED without the
 * field permission — hence `?`: price → fields.contract, cost → fields.rates, margin → contract + profit.
 */
import type { Id, IsoDate, IsoDateTime, Paisa, RequestBody } from "./common";
import type { ProjectStatus } from "./projects";

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
  // fields.rates
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

export type QuoteInputsBody = RequestBody<"/api/v1/quotes/preview", "post">["inputs"];
export type CreateQuoteBody = RequestBody<"/api/v1/quotes", "post">;
export type UpdateQuoteBody = RequestBody<"/api/v1/quotes/{id}", "patch">;
export type AddQuoteRevisionBody = RequestBody<"/api/v1/quotes/{id}/revisions", "post">;
export type SendQuoteBody = RequestBody<"/api/v1/quotes/{id}/send", "post">;
export type QuoteLostBody = RequestBody<"/api/v1/quotes/{id}/lost", "post">;
export type QuoteWonBody = RequestBody<"/api/v1/quotes/{id}/won", "post">;
