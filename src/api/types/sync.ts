/**
 * Daily logs and phone sync health. Written from the live responses
 * (GET /projects/:id/daily-logs, GET /daily-logs/:id, GET /sync/status).
 */
import type { Id, IsoDate, IsoDateTime, Paisa } from "./common";
import type { Role } from "./auth";

export type SiteCondition =
  "NORMAL" | "RAIN" | "POWER_CUT" | "WATER_SHORTAGE" | "CURING" | "LABOUR_SHORT" | "MATERIAL_SHORT" | "OTHER";

export interface DailyLogFile {
  id: Id;
  mimeType: string;
  /** Short-lived signed URL. */
  url: string;
  thumbUrl?: string;
}

export interface DailyLog {
  id: Id;
  project: { id: Id; code: string; name: string };
  logDate: IsoDate;
  note: string | null;
  conditions: SiteCondition[];
  workDone: string | null;
  author: { id: Id; name: string; role: Role };
  photos: DailyLogFile[];
  voiceNotes: DailyLogFile[];
  editable: boolean;
  /** Written on a phone, reached the server more than 48 h later. */
  lateSync: boolean;
  clientId: string | null;
  deviceCreatedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DailyLogDaySummary {
  hazri: { full: number; half: number; absent: number; present: number };
  usage: Array<{ material: { id: Id; name: string; unit: string }; quantity: number }>;
  /** MINE: a munshi sees only his own kharcha. */
  kharcha: { scope: "MINE" | "PROJECT"; entries: number; totalPaisa: Paisa };
}

export interface DailyLogDetail extends DailyLog {
  summary: DailyLogDaySummary;
}

export interface DailyLogsQuery {
  projectId: Id;
  from?: IsoDate;
  to?: IsoDate;
  author?: Id;
  page?: number;
  limit?: number;
}

export interface SyncRejection {
  clientId: string;
  /** Mutation type, e.g. ATTENDANCE_UPSERT */
  type: string;
  code: string | null;
  message: string | null;
  deviceCreatedAt: IsoDateTime | null;
  at: IsoDateTime;
}

export interface SyncDeviceStatus {
  id: Id;
  user: { id: Id; name: string; role: Role };
  platform: "ANDROID" | "IOS" | "WEB";
  model: string | null;
  appVersion: string | null;
  revoked: boolean;
  lastActiveAt: IsoDateTime;
  lastSyncAt: IsoDateTime | null;
  pendingUploads: number;
  lastRejected: SyncRejection[];
}
