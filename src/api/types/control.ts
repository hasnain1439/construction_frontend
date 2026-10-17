/**
 * Control & alerts (Phase 2 · Step 14): material / cost variance, burn rate vs progress, projected
 * margin, delay analysis, control alerts and thresholds. Responses are documented by example in the
 * OpenAPI file, so their shapes are written here once (PHASE_2_3_CONTRACTS.md → Step 14).
 * Rupee keys are ABSENT (not null) without the matching data-visibility permission.
 */
import type { Id, IsoDate, IsoDateTime, Paisa, RequestBody } from "./common";
import type { MilestoneStatus, ScheduleDelays, ScheduleStageKey } from "./schedule";

export type ControlSeverity = "INFO" | "WARNING" | "CRITICAL";
export type ControlProjectRef = { id: Id; code: string; name: string; status: string };
export type ProgressBasis = "ESTIMATE_VALUE" | "EFFORT" | "NONE";
export type VarianceStatus = "OVER" | "UNDER" | "ON_TRACK" | "UNPLANNED" | "NOT_STARTED" | "NO_SCHEDULE";
export type ControlBucket = "MATERIALS" | "LABOUR" | "SUBCONTRACT" | "EQUIPMENT" | "OVERHEADS" | "LOSSES" | "CONTINGENCY";
export type BucketStatus = "OVER" | "UNDER" | "ON_TRACK" | "NO_ESTIMATE";
export type ControlRule =
  | "MATERIAL_OVERUSE"
  | "MILESTONE_BEHIND_PLAN"
  | "QUOTA_EXHAUSTED"
  | "SPEND_AHEAD_OF_PROGRESS"
  | "EQUIPMENT_IDLE"
  | "MISSING_DAILY_LOG"
  | "STAGE_READY_UNBILLED";

export interface ControlMilestoneRef {
  id: Id;
  key: string;
  name: string;
  stageKey: ScheduleStageKey;
  status: MilestoneStatus;
  progressPercent: number;
}

export interface MaterialVarianceItem {
  materialId: Id | null;
  material: { id: Id; name: string; unit: string } | null;
  estimateKey: string | null;
  description: string;
  unit: string;
  ownerSupplied: boolean;
  estimatedTotalQty: number;
  estimatedToDateQty: number | null;
  deliveredQty: number | null;
  usedQty: number;
  lossQty: number | null;
  inStockQty: number | null;
  consumedQty: number;
  varianceQty: number | null;
  variancePercent: number | null;
  status: VarianceStatus;
  /** fields.rates */
  estimateRatePaisa?: Paisa | null;
  actualAvgCostPaisa?: Paisa | null;
  quantityImpactPaisa?: Paisa | null;
  priceImpactPaisa?: Paisa | null;
  impactPaisa?: Paisa | null;
}

export interface MaterialVariance {
  project: ControlProjectRef;
  milestone: ControlMilestoneRef | null;
  asOf: IsoDate;
  estimate: { id: Id; revision: number } | null;
  hasSchedule: boolean;
  progress: { percent: number; basis: ProgressBasis };
  thresholdPercent: number;
  items: MaterialVarianceItem[];
  counts: { over: number; under: number; onTrack: number; unplanned: number; notStarted: number };
  totals?: { quantityImpactPaisa: Paisa; priceImpactPaisa: Paisa; impactPaisa: Paisa };
  milestones: ControlMilestoneRef[];
}

export interface Projection {
  contractPaisa: Paisa;
  approvedChangesPaisa: Paisa;
  revisedContractPaisa: Paisa;
  budgetAtCompletionPaisa: Paisa | null;
  actualToDatePaisa: Paisa;
  earnedValuePaisa: Paisa | null;
  costPerformanceIndex: number | null;
  estimateAtCompletionPaisa: Paisa | null;
  remainingCostPaisa: Paisa | null;
  projectedMarginPaisa: Paisa | null;
  projectedMarginPercent: number | null;
  basis: "EARNED_VALUE" | "PROGRESS_ONLY" | "NOT_ENOUGH_PROGRESS" | "NO_CONTRACT";
  note: string;
}

export interface CostBucketRow {
  bucket: ControlBucket;
  status: BucketStatus;
  /** fields.amounts + fields.rates */
  estimateTotalPaisa?: Paisa;
  estimateToDatePaisa?: Paisa;
  actualPaisa?: Paisa;
  variancePaisa?: Paisa;
  variancePercent?: number | null;
}

export interface CostVariance {
  project: ControlProjectRef;
  asOf: IsoDate;
  estimate: { id: Id; revision: number } | null;
  hasSchedule: boolean;
  progress: { percent: number; basis: ProgressBasis };
  thresholdPercent: number;
  buckets: CostBucketRow[];
  totals?: { estimateTotalPaisa: Paisa; estimateToDatePaisa: Paisa; actualPaisa: Paisa; variancePaisa: Paisa; variancePercent: number | null };
  labourCombined?: { estimateToDatePaisa: Paisa; actualPaisa: Paisa; variancePaisa: Paisa; variancePercent: number | null };
  stages: Array<{ stageKey: ScheduleStageKey; progressPercent: number; estimatePaisa?: Paisa; estimateToDatePaisa?: Paisa }>;
  /** fields.amounts + rates + contract + profit */
  projection?: Projection;
}

export interface BurnMonth {
  month: string;
  progressPercent: number;
  costPaisa?: Paisa;
  cumulativeCostPaisa?: Paisa;
  spentPercent?: number | null;
  gapPoints?: number | null;
  ahead?: boolean;
}

export interface BurnRate {
  project: ControlProjectRef;
  asOf: IsoDate;
  thresholdPoints: number;
  progressBasis: ProgressBasis;
  hasSchedule: boolean;
  contractPaisa?: Paisa;
  months: BurnMonth[];
  current: { progressPercent: number; plannedProgressPercent: number; spentPercent?: number | null; gapPoints?: number | null; ahead?: boolean };
}

export interface DelayMilestone {
  id: Id;
  key: string;
  name: string;
  templateKey?: string | null;
  stageKey: ScheduleStageKey;
  status: MilestoneStatus;
  plannedStart: IsoDate;
  plannedEnd: IsoDate;
  baselineStart: IsoDate | null;
  baselineEnd: IsoDate | null;
  varianceDays: number;
  actualStart: IsoDate | null;
  actualEnd: IsoDate | null;
  progressPercent: number;
  plannedProgressPercent: number;
  behindPoints: number;
  late: boolean;
  lateDays: number;
  behind: boolean;
}

export interface DelayTimelineEvent {
  date: IsoDate;
  kind: "STOPPAGE" | "PLAN_VERSION" | "MILESTONE_UPDATE";
  title: string;
  detail: string | null;
  category: string | null;
  status: string | null;
  days: number | null;
  refId: Id;
  plannedEnd: IsoDate | null;
  progressPercent: number | null;
}

export interface DelayAnalysis {
  project: ControlProjectRef;
  asOf: IsoDate;
  thresholdPoints: number;
  graceDays: number;
  hasSchedule: boolean;
  delays: ScheduleDelays | null;
  milestones: DelayMilestone[];
  timeline: DelayTimelineEvent[];
  summary: { behind: number; late: number; finished: number; total: number };
}

export interface ControlAlert {
  id: Id;
  rule: string;
  severity: ControlSeverity;
  status: "OPEN" | "RESOLVED";
  project: { id: Id; code: string; name: string } | null;
  title: string;
  body: string;
  refType: string;
  refId: Id | null;
  details: Record<string, unknown>;
  actionUrl: string;
  openedAt: IsoDateTime;
  lastSeenAt: IsoDateTime;
  /** When the alert engine last evaluated this alert's rule ("as of", QA-B-10). */
  lastEvaluatedAt?: IsoDateTime;
  resolvedAt: IsoDateTime | null;
  notifiedAt: IsoDateTime | null;
  occurrences: number;
}

export interface ControlSettings {
  overuseAlertPercent: number;
  behindPlanAlertPoints: number;
  lateFinishGraceDays: number;
  quotaAlertPercent: number;
  spendAheadAlertPoints: number;
  controlAlertsEnabled: boolean;
}
export type ControlSettingsBody = RequestBody<"/api/v1/control/settings", "put">;
export type RunAlertsBody = RequestBody<"/api/v1/control/alerts/run", "post">;

export interface RunAlertsResult {
  ranAt: IsoDateTime;
  projects: number;
  evaluated: number;
  opened: number;
  updated: number;
  resolved: number;
  notified: number;
  alerts: ControlAlert[];
}
