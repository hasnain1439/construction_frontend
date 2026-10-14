import type { Id, IsoDate, IsoDateTime, Paisa } from "./common";

// ─── Setup checklist ────────────────────────────────────────────────────────

export type ChecklistStepKey = "LOGO" | "RATES" | "TEAM" | "WORKERS" | "SUPPLIERS" | "PROJECT";

export interface DemoProjectRef {
  id: Id;
  code: string;
  name: string;
  createdAt: IsoDateTime;
}

export interface SetupChecklist {
  steps: Array<{ key: ChecklistStepKey; done: boolean }>;
  completed: number;
  total: number;
  percent: number;
  allDone: boolean;
  dismissed: boolean;
  dismissedAt: IsoDateTime | null;
  ratesReviewedAt: IsoDateTime | null;
  counts: {
    workers: number;
    suppliers: number;
    projects: number;
    teamUsers: number;
    pendingOrSentInvites: number;
  };
  demo: DemoProjectRef | null;
}

// ─── Imports ────────────────────────────────────────────────────────────────

export type ImportEntity = "workers" | "subcontractors" | "suppliers" | "materials" | "clients";

export interface ImportCellError {
  column: string;
  message: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  values: Record<string, string>;
  errors: ImportCellError[];
  valid: boolean;
}

export interface ImportPreview {
  entity: ImportEntity;
  fileName: string;
  columns: Array<{ key: string; label: string; labelRoman: string; labelUrdu: string; required: boolean }>;
  unknownColumns: string[];
  skippedExampleRows: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ImportPreviewRow[];
}

export interface ImportResult {
  entity: ImportEntity;
  fileName: string;
  created: number;
  skipped: number;
  ids: Id[];
}

// ─── Opening balances ───────────────────────────────────────────────────────

export type OpeningKind = "SUPPLIER_UDHAAR" | "CASH_IN_HAND" | "STORE_STOCK" | "WORKER_PESHGI";

export interface OpeningBalance {
  id: Id;
  kind: OpeningKind;
  entity: { id: Id; name: string; unit?: string };
  project: { id: Id; code: string; name: string } | null;
  amountPaisa: Paisa;
  quantity: number | null;
  ratePaisa: Paisa | null;
  date: IsoDate;
  note: string | null;
  refType: string;
  refId: Id;
  locked: true;
  createdBy: { id: Id; name: string } | null;
  createdAt: IsoDateTime;
}

interface OpeningBase {
  date: IsoDate;
  note?: string;
}
export type CreateOpeningBalanceBody =
  | (OpeningBase & { kind: "SUPPLIER_UDHAAR"; supplierId: Id; amountPaisa: Paisa })
  | (OpeningBase & { kind: "CASH_IN_HAND"; holderUserId: Id; amountPaisa: Paisa })
  | (OpeningBase & { kind: "STORE_STOCK"; materialId: Id; quantity: number; ratePaisa: Paisa })
  | (OpeningBase & { kind: "WORKER_PESHGI"; workerId: Id; projectId: Id; amountPaisa: Paisa });

// ─── Demo data ──────────────────────────────────────────────────────────────

export interface DemoCreated {
  project: { id: Id; code: string; name: string; isDemo: true };
  counts: { workers: number; hazri: number; purchases: number; kharcha: number; invoices: number };
}
