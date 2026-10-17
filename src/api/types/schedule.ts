/**
 * Schedule (Phase 2 · Step 13): stages, milestones, curing, holidays, stoppages, delays.
 * Request bodies come from the generated OpenAPI file; responses are documented by example only,
 * so their shapes are written here once (PHASE_2_3_CONTRACTS.md → Step 13). Nothing here carries
 * money — quotas are quantities.
 */
import type { Id, IsoDate, IsoDateTime, NamedRef, RequestBody } from "./common";
import type { WeekDay } from "./labor";

export type ScheduleStageKey =
  | "FOUNDATION_PLINTH"
  | "GF_STRUCTURE"
  | "F1_STRUCTURE"
  | "F2_STRUCTURE"
  | "F3_STRUCTURE"
  | "MUMTY_ROOF"
  | "PLASTER_MEP"
  | "FINISHING";
export type MilestoneStatus = "PLANNED" | "IN_PROGRESS" | "CURING" | "DONE" | "BLOCKED";
export type ScheduleStageStatus = "PLANNED" | "IN_PROGRESS" | "DONE";
export type DependencyType = "FS" | "SS";
export type StoppageReason =
  "RAIN" | "SMOG_BAN" | "HOLIDAY" | "OWNER_HOLD" | "MATERIAL_SHORT" | "LABOUR_SHORT" | "OTHER";
export type StoppageStatus = "PENDING" | "APPROVED" | "REJECTED";
export type DelayCategory = "OWNER" | "EXCUSABLE" | "CONTRACTOR";
export type PlanVersionReason = "GENERATED" | "REPLANNED" | "MILESTONE_EDITED" | "STOPPAGE_APPROVED";

export interface MilestoneDependency {
  milestoneId: Id;
  key: string;
  type: DependencyType;
  lagDays: number;
}

export interface Quota {
  id: Id;
  materialId: Id | null;
  /** Estimate key: cement, bricks … */
  material: string;
  description: string;
  unit: string;
  ownerSupplied: boolean;
  plannedQty: number;
  usedQty: number;
  remainingQty: number;
  usedPercent: number | null;
  over: boolean;
}

export interface Milestone {
  id: Id;
  projectId: Id;
  scheduleId: Id;
  stageId: Id;
  stageKey: ScheduleStageKey;
  key: string;
  name: string;
  /** Generator template ("F1_STRUCTURE.SLAB") while the name is unchanged, else null — translate by it. */
  templateKey?: string | null;
  sortOrder: number;
  workDays: number;
  durationDays: number;
  plannedStart: IsoDate;
  plannedEnd: IsoDate;
  baselineStart: IsoDate | null;
  baselineEnd: IsoDate | null;
  /** plannedEnd − baselineEnd, calendar days. */
  varianceDays: number;
  curingDays: number;
  /** (actualEnd ?? plannedEnd) + curingDays */
  curingUntil: IsoDate | null;
  startNoEarlierThan: IsoDate | null;
  status: MilestoneStatus;
  progressPercent: number;
  actualStart: IsoDate | null;
  actualEnd: IsoDate | null;
  /** plannedEnd < today and not DONE / CURING */
  late: boolean;
  dependsOn: MilestoneDependency[];
  billingStage: { id: Id; label: string; sortOrder: number } | null;
  quotas: Quota[];
  /** How workDays was computed. */
  basis: string[];
  lastUpdate: { at: IsoDateTime; by: NamedRef | null; note: string | null } | null;
  updatedAt: IsoDateTime;
}

export interface MilestoneUpdate {
  id: Id;
  at: IsoDateTime;
  date: IsoDate;
  status: MilestoneStatus;
  progressPercent: number;
  previousStatus: MilestoneStatus | null;
  previousProgress: number | null;
  note: string | null;
  photos: { id: Id; url: string | null; thumbUrl?: string | null }[];
  by: NamedRef | null;
}

export type MilestoneDetail = Milestone & { updates: MilestoneUpdate[] };

export interface PlanStage {
  id: Id;
  stageKey: ScheduleStageKey;
  name: string;
  sortOrder: number;
  plannedStart: IsoDate;
  plannedEnd: IsoDate;
  baselineStart: IsoDate | null;
  baselineEnd: IsoDate | null;
  progressPercent: number;
  status: ScheduleStageStatus;
}

export interface StoppagePhoto {
  id: Id;
  url: string | null;
  thumbUrl: string | null;
}

export interface Stoppage {
  id: Id;
  projectId: Id;
  dates: IsoDate[];
  from: IsoDate;
  to: IsoDate;
  /** Working days among the dates. */
  days: number;
  /** NO_WORKING_DAYS: every date is an off day / holiday, so it moves nothing (QA-B-22). */
  warning?: "NO_WORKING_DAYS" | null;
  reason: StoppageReason;
  category: DelayCategory;
  status: StoppageStatus;
  note: string | null;
  photos: StoppagePhoto[];
  clientId: string | null;
  reportedBy: NamedRef | null;
  reportedAt: IsoDateTime;
  decidedBy: NamedRef | null;
  decidedAt: IsoDateTime | null;
  decisionNote: string | null;
}

export interface ScheduleHoliday {
  date: IsoDate;
  name: string;
  type: "NON_WORKING" | "PARTIAL";
  source: "PLATFORM" | "COMPANY";
}

export interface ScheduleCalendar {
  workingDays: WeekDay[];
  ramadanDayFactor: number;
  ramadanPeriods: { start: IsoDate; end: IsoDate }[];
  holidays: ScheduleHoliday[];
}

export interface ScheduleInfo {
  id: Id;
  version: number;
  startDate: IsoDate;
  teams: number;
  note: string | null;
  changeOrderDays: number;
  estimate: { id: Id; revision: number };
  generatedAt: IsoDateTime;
  generatedBy: NamedRef | null;
  replannedAt: IsoDateTime | null;
  planFloor: IsoDate | null;
}

export interface ScheduleDetail {
  schedule: ScheduleInfo | null;
  project: {
    id: Id;
    code: string;
    name: string;
    status: string;
    startDate: IsoDate | null;
    endDate: IsoDate | null;
  };
  approvedEstimate: { id: Id; revision: number; approvedAt: IsoDateTime } | null;
  canGenerate: boolean;
  today: IsoDate;
  plannedEnd: IsoDate | null;
  baselineEnd: IsoDate | null;
  projectedEnd: IsoDate | null;
  calendar: ScheduleCalendar;
  stages: PlanStage[];
  milestones: Milestone[];
  /** PENDING + APPROVED, for the Gantt bands. */
  stoppages: Stoppage[];
  baseline: { id: Id; createdAt: IsoDateTime; startDate: IsoDate; plannedEnd: IsoDate } | null;
}

export interface DateShift {
  from: IsoDate;
  to: IsoDate;
}

export interface ShiftedMilestone {
  id: Id;
  key: string;
  name: string;
  plannedStart: DateShift;
  plannedEnd: DateShift;
}

export interface MilestoneEditResult {
  milestone: Milestone;
  shifted: ShiftedMilestone[];
  plannedEnd: DateShift;
  dryRun: boolean;
}

export type ProgressWarning =
  | {
      code: "PREVIOUS_STAGE_UNPAID";
      message: string;
      details: {
        billingStage: { id: Id; label: string };
        stages: {
          stageId: Id;
          label: string;
          invoiceNumber: string;
          dueDate: IsoDate | null;
          balancePaisa?: string;
        }[];
      };
    }
  | {
      code: "PREDECESSOR_NOT_DONE";
      message: string;
      details: { milestones: { id: Id; name: string; status: MilestoneStatus }[] };
    };

export interface MilestoneProgressResult {
  id: Id;
  milestone: Milestone;
  warnings: ProgressWarning[];
}

export interface StoppageList {
  items: Stoppage[];
  summary: { pending: number; approvedDays: Record<DelayCategory, number> };
}

export interface StoppageApproveResult {
  stoppage: Stoppage;
  shifted: ShiftedMilestone[];
  plannedEnd: DateShift;
}

export interface ScheduleBaseline {
  id: Id;
  scheduleId: Id;
  estimateId: Id;
  startDate: IsoDate;
  plannedEnd: IsoDate;
  createdAt: IsoDateTime;
  createdBy: NamedRef | null;
  milestones: {
    key: string;
    name: string;
    stageKey: ScheduleStageKey;
    plannedStart: IsoDate;
    plannedEnd: IsoDate;
    workDays: number;
    durationDays: number;
    curingDays: number;
    dependsOn: { key: string; type: DependencyType; lagDays: number }[];
  }[];
}

export interface PlanVersion {
  id: Id;
  version: number;
  reason: PlanVersionReason;
  note: string | null;
  plannedEnd: IsoDate;
  createdAt: IsoDateTime;
  createdBy: NamedRef | null;
  milestones: { key: string; plannedStart: IsoDate; plannedEnd: IsoDate }[];
}

export interface DelayReason {
  stoppageId: Id | null;
  /** A stoppage reason, SLOW_PROGRESS or CHANGE_ORDER (Step 15: approved change-order days). */
  reason: StoppageReason | "SLOW_PROGRESS" | "CHANGE_ORDER";
  dates: IsoDate[];
  days: number;
  note: string | null;
}

export interface ScheduleDelays {
  originalEnd: IsoDate | null;
  baselineEnd: IsoDate | null;
  plannedEnd: IsoDate | null;
  revisedEnd: IsoDate | null;
  projectedEnd: IsoDate | null;
  pace: number;
  progressPercent: number;
  days: { owner: number; excusable: number; contractor: number; changeOrders: number; total: number };
  aheadDays: number;
  calendarDaysLate?: number;
  categories: { category: DelayCategory; days: number; reasons: DelayReason[] }[];
  pending: {
    stoppageId: Id;
    reason: StoppageReason;
    category: DelayCategory;
    dates: IsoDate[];
    days: number;
  }[];
  changeOrders: { days: number; items: unknown[] };
}

export interface MaterialQuotaTotal {
  materialId: Id | null;
  material: string;
  description: string;
  unit: string;
  plannedQty: number;
  usedQty: number;
  remainingQty: number;
  usedPercent: number | null;
  over: boolean;
}

export interface ScheduleQuotas {
  milestones: {
    milestone: Pick<
      Milestone,
      "id" | "key" | "name" | "templateKey" | "stageKey" | "status" | "progressPercent" | "plannedStart" | "plannedEnd"
    >;
    quotas: Quota[];
  }[];
  materials: MaterialQuotaTotal[];
  unlinked: { materialId: Id; name: string; unit: string; usedQty: number }[];
}

export type GenerateScheduleBody = RequestBody<"/api/v1/projects/{id}/schedule/generate", "post">;
export type ReplanScheduleBody = RequestBody<"/api/v1/projects/{id}/schedule/replan", "post">;
export type MilestoneEditBody = RequestBody<"/api/v1/milestones/{id}", "patch">;
export type MilestoneProgressBody = RequestBody<"/api/v1/milestones/{id}/progress", "post">;
export type StoppageBody = RequestBody<"/api/v1/projects/{id}/stoppages", "post">;
export type ApproveStoppageBody = RequestBody<"/api/v1/stoppages/{id}/approve", "post">;
export type RejectStoppageBody = RequestBody<"/api/v1/stoppages/{id}/reject", "post">;
