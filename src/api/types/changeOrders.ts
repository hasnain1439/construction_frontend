/**
 * Step 15 · Change orders + site instructions. Request bodies come from the generated OpenAPI file;
 * response shapes are written here (PHASE_2_3_CONTRACTS.md "Step 15"). Money keys are OMITTED
 * without the field permission — hence `?`: cost side (rates, cost, markup) needs fields.rates,
 * owner price (totals, price rates) fields.rates or fields.amounts, contract values fields.contract.
 */
import type { CloseoutFile, CloseoutPerson, CloseoutPhoto } from "./closeout";
import type { Id, IsoDate, IsoDateTime, Paisa, RequestBody } from "./common";
import type { ProjectStatus } from "./projects";

export type ChangeOrderType = "ADDITION" | "DEDUCTION";
export type ChangeOrderStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED" | "BILLED";
export const CHANGE_ORDER_STATUSES: ChangeOrderStatus[] = ["DRAFT", "SENT", "APPROVED", "REJECTED", "IN_PROGRESS", "COMPLETED", "BILLED"];
export type ChangeOrderProofType = "WHATSAPP_SCREENSHOT" | "SIGNED_SLIP" | "VERBAL";
export const PROOF_TYPES: ChangeOrderProofType[] = ["WHATSAPP_SCREENSHOT", "SIGNED_SLIP", "VERBAL"];
export type ChangeOrderSource = "MANUAL" | "SITE_INSTRUCTION" | "SNAG";
export type ChangeOrderLineKind = "MATERIAL" | "LABOUR" | "OTHER";
export type ChangeOrderRateSource = "ESTIMATE" | "PRICE_LIST" | "LABOUR_RATE" | "MANUAL";
export type ChangeOrderBillingMode = "NEXT_STAGE" | "VARIATION";
export type SiteInstructionStatus = "NEW" | "CONVERTED" | "DISMISSED";

export interface ChangeOrderLine {
  id: Id;
  sortOrder: number;
  kind: ChangeOrderLineKind;
  materialId: Id | null;
  laborRateId: Id | null;
  description: string;
  unit: string;
  quantity: number;
  rateSource: ChangeOrderRateSource;
  ratePaisa?: Paisa;
  amountPaisa?: Paisa;
  priceRatePaisa?: Paisa;
  priceAmountPaisa?: Paisa;
}

export interface ChangeOrder {
  id: Id;
  projectId: Id;
  number: number;
  code: string;
  title: string;
  description: string | null;
  type: ChangeOrderType;
  status: ChangeOrderStatus;
  source: ChangeOrderSource;
  siteInstructionId: Id | null;
  snagId: Id | null;
  daysImpact: number;
  affectedMilestones: Array<{ id: Id; key: string; name: string; stageKey: string }>;
  proofType: ChangeOrderProofType | null;
  proofNote: string | null;
  proofCount: number;
  lineCount: number;
  billingMode: ChangeOrderBillingMode | null;
  invoice: { id: Id; number: string | null; type: string; status: string } | null;
  sentAt: IsoDateTime | null;
  approvedOn: IsoDate | null;
  approvedAt: IsoDateTime | null;
  approvedBy: CloseoutPerson | null;
  rejectedAt: IsoDateTime | null;
  rejectionReason: string | null;
  startedAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  billedAt: IsoDateTime | null;
  createdBy: CloseoutPerson | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  markupPercent?: number;
  costPaisa?: Paisa;
  markupPaisa?: Paisa;
  totalPaisa?: Paisa;
}

export interface ChangeOrderDetail extends ChangeOrder {
  lines: ChangeOrderLine[];
  proofFiles: CloseoutFile[];
  siteInstruction: { id: Id; code: string; note: string; photos: CloseoutPhoto[]; createdBy: CloseoutPerson | null; createdAt: IsoDateTime } | null;
  snag: { id: Id; code: string; description: string; status: string } | null;
  project: { id: Id; code: string; name: string; status: ProjectStatus };
}

/** Revised contract / revised end date of a project (also on `GET /projects/:id` as `changeOrders`). */
export interface ProjectChangeSummary {
  approvedCount: number;
  daysImpact: number;
  originalEndDate: IsoDate | null;
  revisedEndDate: IsoDate | null;
  approvedChangesPaisa?: Paisa;
  originalContractPaisa?: Paisa | null;
  revisedContractPaisa?: Paisa | null;
}

export interface ChangeOrderList {
  items: ChangeOrder[];
  summary: ProjectChangeSummary & {
    byStatus: Record<ChangeOrderStatus, number>;
    newSiteInstructions: number;
    changeOrderSnags: Array<{ id: Id; code: string; description: string; status: string; amountPaisa?: Paisa }>;
    pendingPaisa?: Paisa;
  };
}

export interface ChangeOrderRateOptions {
  estimate: { id: Id; revision: number } | null;
  materials: Array<{ materialId: Id; name: string; unit: string; rateSource: "ESTIMATE" | "PRICE_LIST" | null; ratePaisa?: Paisa | null }>;
  labour: Array<{ laborRateId: Id; kind: "DAILY" | "SUBCONTRACT"; label: string; unit: string; ratePaisa?: Paisa }>;
  milestones: Array<{ id: Id; key: string; name: string; stageKey: string; status: string }>;
}

export interface SiteInstruction {
  id: Id;
  projectId: Id;
  number: number;
  code: string;
  note: string;
  photos: CloseoutPhoto[];
  status: SiteInstructionStatus;
  changeOrder: { id: Id; code: string; status: ChangeOrderStatus } | null;
  dismissReason: string | null;
  clientId: Id | null;
  createdBy: CloseoutPerson | null;
  createdAt: IsoDateTime;
  decidedBy: CloseoutPerson | null;
  decidedAt: IsoDateTime | null;
  updatedAt: IsoDateTime;
}

export interface SiteInstructionList {
  items: SiteInstruction[];
  summary: { new: number; converted: number; dismissed: number };
}

export interface BillChangeOrderResult {
  changeOrder: ChangeOrderDetail;
  invoice: { id: Id; number: string | null; type: string; status: string } | null;
}

export type CreateChangeOrderBody = RequestBody<"/api/v1/projects/{id}/change-orders", "post">;
export type UpdateChangeOrderBody = RequestBody<"/api/v1/change-orders/{id}", "patch">;
export type ApproveChangeOrderBody = RequestBody<"/api/v1/change-orders/{id}/approve", "post">;
export type RejectChangeOrderBody = RequestBody<"/api/v1/change-orders/{id}/reject", "post">;
export type BillChangeOrderBody = RequestBody<"/api/v1/change-orders/{id}/bill", "post">;
export type ConvertToChangeOrderBody = RequestBody<"/api/v1/site-instructions/{id}/convert", "post">;
export type CreateSiteInstructionBody = RequestBody<"/api/v1/projects/{id}/site-instructions", "post">;
export type DismissSiteInstructionBody = RequestBody<"/api/v1/site-instructions/{id}/dismiss", "post">;
export type ChangeOrderLineInput = NonNullable<CreateChangeOrderBody["lines"]>[number];
