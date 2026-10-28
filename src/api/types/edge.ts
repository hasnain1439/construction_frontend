/**
 * Offline office: an office PC keeps a local copy of the company's data and syncs through
 * `/edge`. The platform admin allows the feature per company; the owner / an administrator
 * approves each office PC (`company.settings.manage`).
 */
import type { Id, IsoDateTime } from "./common";

export interface OfficeDevice {
  id: Id;
  model: string | null;
  platform: string;
  /** The person who signed the office PC in. */
  userName: string;
  requestedAt: IsoDateTime;
  approvedAt: IsoDateTime | null;
  lastSyncAt: IsoDateTime | null;
}

export interface OfficeDevices {
  /** False until the platform turns offline office on for the company. */
  allowed: boolean;
  devices: OfficeDevice[];
}

export interface OfficeDeviceApproval {
  id: Id;
  approvedAt: IsoDateTime | null;
}

export type SyncProblemStatus = "CONFLICT" | "ERROR";

export interface SyncProblem {
  id: Id;
  tableName: string;
  pk: Record<string, unknown>;
  status: SyncProblemStatus;
  code: string | null;
  message: string | null;
  officeRow: Record<string, unknown> | null;
  cloudRow: Record<string, unknown> | null;
  at: IsoDateTime;
}

export interface SyncProblems {
  /** True only when the web app runs on the office PC itself; in the cloud the list is empty. */
  officeMode: boolean;
  problems: SyncProblem[];
}

export interface TenantOfflineOfficeBody {
  allowed: boolean;
  note?: string;
}

export interface TenantOfflineOfficeResult {
  id: Id;
  offlineOfficeAllowed: boolean;
}
