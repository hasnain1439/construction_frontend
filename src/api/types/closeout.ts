/**
 * Step 17 · Closeout — drawings, snag list, handover, retention. Request bodies / queries come from
 * the generated OpenAPI file; response shapes are written here (the backend documents them by
 * example, see PHASE_2_3_CONTRACTS.md "Step 17"). Money is OMITTED without `fields.amounts` — hence `?`.
 */
import type { Id, IsoDate, IsoDateTime, Paisa, QueryParams, RequestBody } from "./common";
import type { ProjectStatus } from "./projects";

export type DrawingFolder = "ARCHITECTURAL" | "STRUCTURAL" | "MEP" | "SOCIETY_APPROVED" | "OTHER";
export const DRAWING_FOLDERS: DrawingFolder[] = ["ARCHITECTURAL", "STRUCTURAL", "MEP", "SOCIETY_APPROVED", "OTHER"];
export type SnagStatus = "OPEN" | "FIXED" | "VERIFIED";
export const SNAG_STATUSES: SnagStatus[] = ["OPEN", "FIXED", "VERIFIED"];
export type SnagCostAttribution = "NONE" | "REWORK" | "SUBCONTRACTOR_DEDUCTION" | "CHANGE_ORDER";
export const COST_ATTRIBUTIONS: SnagCostAttribution[] = ["NONE", "REWORK", "SUBCONTRACTOR_DEDUCTION", "CHANGE_ORDER"];
export type HandoverItemKey = "KEYS" | "ELECTRICITY_CONNECTION" | "GAS_CONNECTION" | "WATER_CONNECTION" | "WARRANTY_CARDS" | "FINAL_DRAWINGS" | "FINAL_PHOTOS";
export type HandoverBlocker = "PROJECT_NOT_CLOSEOUT" | "ITEMS_PENDING" | "SIGN_OFF_MISSING";

export interface CloseoutPerson {
  id: Id;
  name: string;
}

export interface CloseoutPhoto {
  id: Id;
  mimeType: string;
  url: string;
  thumbUrl: string;
}

export interface CloseoutFile {
  id: Id;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  thumbUrl: string | null;
  expiresAt: IsoDateTime;
}

// ─── Drawings ───────────────────────────────────────────────────────────────

export interface DrawingRevision {
  id: Id;
  drawingId: Id;
  revisionNo: number;
  isLatest: boolean;
  approvedAt: IsoDate | null;
  notes: string | null;
  file: CloseoutFile | null;
  uploadedBy: CloseoutPerson | null;
  createdAt: IsoDateTime;
}

export interface Drawing {
  id: Id;
  projectId: Id;
  folder: DrawingFolder;
  title: string;
  number: string | null;
  milestoneId: Id | null;
  notes: string | null;
  revisionCount: number;
  latest: DrawingRevision | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DrawingDetail extends Drawing {
  revisions: DrawingRevision[];
}

export interface DrawingList {
  items: Drawing[];
  folders: Array<{ folder: DrawingFolder; count: number }>;
}

export type DrawingsQuery = QueryParams<"/api/v1/projects/{id}/drawings", "get"> & { projectId: Id };
export type CreateDrawingBody = RequestBody<"/api/v1/projects/{id}/drawings", "post">;
export type UpdateDrawingBody = RequestBody<"/api/v1/drawings/{id}", "patch">;
export type AddRevisionBody = RequestBody<"/api/v1/drawings/{id}/revisions", "post">;
export type UpdateRevisionBody = RequestBody<"/api/v1/drawing-revisions/{id}", "patch">;

// ─── Snags ──────────────────────────────────────────────────────────────────

export interface SnagCost {
  attribution: SnagCostAttribution;
  /** Omitted without fields.amounts. */
  amountPaisa?: Paisa;
  note: string | null;
  subcontractAssignmentId: Id | null;
  postedTo: "PROJECT_COST" | "SUBCONTRACTOR_ACCOUNT" | "CHANGE_ORDER_FLAG" | null;
  postedAt: IsoDateTime | null;
}

export interface Snag {
  id: Id;
  projectId: Id;
  number: number;
  code: string;
  roomId: Id | null;
  room: { id: Id; name: string; floor: string } | null;
  location: string | null;
  description: string;
  status: SnagStatus;
  targetDate: IsoDate | null;
  overdue: boolean;
  inDefectPeriod: boolean;
  assignee: { type: "WORKER" | "SUBCONTRACTOR"; id: Id; name: string } | null;
  beforePhotos: CloseoutPhoto[];
  afterPhotos: CloseoutPhoto[];
  fixNote: string | null;
  fixedAt: IsoDateTime | null;
  fixedBy: CloseoutPerson | null;
  verifiedAt: IsoDateTime | null;
  verifiedBy: CloseoutPerson | null;
  reopenCount: number;
  lastReopenReason: string | null;
  cost: SnagCost;
  clientId: Id | null;
  createdBy: CloseoutPerson | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface SnagSummary {
  open: number;
  fixed: number;
  verified: number;
  overdue: number;
  defectPeriodOpen: number;
  reworkPaisa?: Paisa;
  deductionPaisa?: Paisa;
  changeOrderPaisa?: Paisa;
}

export interface SnagPage {
  items: Snag[];
  summary: SnagSummary;
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export type SnagsQuery = QueryParams<"/api/v1/projects/{id}/snags", "get"> & { projectId: Id };
export type CreateSnagBody = RequestBody<"/api/v1/projects/{id}/snags", "post">;
export type UpdateSnagBody = RequestBody<"/api/v1/snags/{id}", "patch">;
export type FixSnagBody = RequestBody<"/api/v1/snags/{id}/fix", "post">;
export type VerifySnagBody = RequestBody<"/api/v1/snags/{id}/verify", "post">;
export type ReopenSnagBody = RequestBody<"/api/v1/snags/{id}/reopen", "post">;
export type SnagCostBody = RequestBody<"/api/v1/snags/{id}/cost", "put">;

// ─── Handover ───────────────────────────────────────────────────────────────

export interface HandoverItem {
  key: HandoverItemKey;
  done: boolean;
  note: string | null;
  attachments: CloseoutPhoto[];
  doneAt: IsoDateTime | null;
  doneBy: CloseoutPerson | null;
}

export interface Handover {
  projectId: Id;
  projectStatus: ProjectStatus;
  items: HandoverItem[];
  signOff: {
    ownerName: string;
    signedOn: IsoDate;
    note: string | null;
    signature: CloseoutPhoto | null;
    recordedAt: IsoDateTime | null;
    recordedBy: CloseoutPerson | null;
  } | null;
  handedOverAt: IsoDate | null;
  defectPeriodMonths: number;
  retentionDueDate: IsoDate | null;
  openSnags: number;
  canComplete: boolean;
  blockers: HandoverBlocker[];
  certificate: { attachmentId: Id; generatedAt: IsoDateTime | null } | null;
}

export type HandoverItemBody = RequestBody<"/api/v1/projects/{id}/handover/items/{key}", "put">;
export type SignOffBody = RequestBody<"/api/v1/projects/{id}/handover/sign-off", "post">;
export type CompleteHandoverBody = RequestBody<"/api/v1/projects/{id}/handover/complete", "post">;

// ─── Retention ──────────────────────────────────────────────────────────────

export interface RetentionSubcontractor {
  assignmentId: Id;
  subcontractorId: Id;
  name: string;
  trade: string;
  scope: string;
  retentionPercent: number;
  retentionHeldPaisa?: Paisa;
  retentionReleasedPaisa?: Paisa;
  releaseDate: IsoDate | null;
  releasable: boolean;
}

export interface Retention {
  projectId: Id;
  projectStatus: ProjectStatus;
  retentionPercent: number;
  defectPeriodMonths: number;
  handedOverAt: IsoDate | null;
  retentionDueDate: IsoDate | null;
  daysToDue: number | null;
  reminder: { daysBefore: number; reminderSentAt: IsoDateTime | null; dueNotifiedAt: IsoDateTime | null };
  client: {
    hasRetentionStage: boolean;
    stageLabel: string | null;
    amountPaisa?: Paisa;
    invoice: { id: Id; number: string | null; status: string; dueDate: IsoDate | null; totalPaisa?: Paisa; balancePaisa?: Paisa } | null;
    canInvoice: boolean;
  };
  subcontractors: RetentionSubcontractor[];
  totals: { clientHeldPaisa?: Paisa; subcontractorHeldPaisa?: Paisa };
  defectSnags: { total: number; open: number };
}

export type RetentionSettingsBody = RequestBody<"/api/v1/projects/{id}/retention", "patch">;
