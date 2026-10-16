import { Building, Hammer, HardHat, Layers, PaintRoller } from "lucide-react";
import type { ContractType, FloorLevel, OpeningType, ProjectStatus, RoomType, SupplyCategoryKey } from "@/api/types";
import type { TranslationKey } from "@/i18n/useT";

/** Contract type cards (texts are dictionary keys, translated where rendered). */
export const CONTRACT_TYPES: Array<{ value: ContractType; titleKey: TranslationKey; descriptionKey: TranslationKey; badgeKey?: TranslationKey; icon: typeof Building }> = [
  { value: "FULL", titleKey: "projects.contract.fullTitle", descriptionKey: "projects.contract.fullDesc", icon: Building },
  {
    value: "GREY_OWNER_FINISHING",
    titleKey: "projects.contract.greyTitle",
    descriptionKey: "projects.contract.greyDesc",
    badgeKey: "projects.contract.mostCommon",
    icon: PaintRoller,
  },
  { value: "LABOR_ONLY", titleKey: "projects.contract.laborTitle", descriptionKey: "projects.contract.laborDesc", icon: Hammer },
];
/** Contract types in display order; labels via `te("projectContractType", v)`. */
export const CONTRACT_TYPE_VALUES: ContractType[] = ["FULL", "GREY_OWNER_FINISHING", "LABOR_ONLY"];

export const STRUCTURE_TYPES = [
  { value: "FRAMED" as const, titleKey: "projects.plot.framedTitle" as TranslationKey, descriptionKey: "projects.plot.framedDesc" as TranslationKey, icon: Layers },
  { value: "LOAD_BEARING" as const, titleKey: "projects.plot.loadBearingTitle" as TranslationKey, descriptionKey: "projects.plot.loadBearingDesc" as TranslationKey, icon: HardHat },
];

/** Plot units; labels via `te("projectPlotUnit", v)`. */
export const PLOT_UNITS = ["MARLA", "KANAL", "SQFT"] as const;

/** Display order of floors (backend FLOOR_LEVELS); labels via `te("projectFloorLevel", v)`. */
export const FLOOR_ORDER: FloorLevel[] = ["BASEMENT", "GROUND", "FIRST", "SECOND", "THIRD", "MUMTY"];
export const DEFAULT_CEILING: Record<FloorLevel, number> = { BASEMENT: 10, GROUND: 11, FIRST: 10, SECOND: 10, THIRD: 10, MUMTY: 9 };

/** Room types; labels via `te("projectRoomType", v)`. */
export const ROOM_TYPES: RoomType[] = [
  "MASTER_BEDROOM",
  "BEDROOM",
  "ATTACHED_BATH",
  "POWDER_ROOM",
  "KITCHEN",
  "TV_LOUNGE",
  "DRAWING_ROOM",
  "DINING",
  "STORE",
  "TERRACE",
  "STAIR",
  "GARAGE",
  "OTHER",
];

/** Opening types; labels via `te("projectOpeningType", v)`. */
export const OPENING_TYPES: OpeningType[] = ["DOOR", "WINDOW", "VENTILATOR"];

/** Supply categories in display order; labels via `te("projectSupplyCategory", key)`. */
export const SUPPLY_CATEGORIES: Array<{ key: SupplyCategoryKey; oftenChanges?: boolean }> = [
  { key: "CEMENT" },
  { key: "BRICKS" },
  { key: "STEEL" },
  { key: "SAND_BAJRI" },
  { key: "PIPES", oftenChanges: true },
  { key: "WATERPROOFING" },
  { key: "ELECTRICAL", oftenChanges: true },
  { key: "TILES_FLOORING" },
  { key: "SANITARY" },
  { key: "WOODWORK" },
  { key: "PAINT" },
];

export interface StatusTransition {
  to: ProjectStatus;
  labelKey: TranslationKey;
  tone: "default" | "danger";
}

/** Status changes a Thekedar may make (backend: only these arrows). */
export const STATUS_TRANSITIONS: Partial<Record<ProjectStatus, StatusTransition[]>> = {
  ACTIVE: [{ to: "CLOSEOUT", labelKey: "projects.mode.moveToCloseout", tone: "default" }],
  CLOSEOUT: [
    { to: "HANDED_OVER", labelKey: "projects.mode.markHandedOver", tone: "default" },
    { to: "ACTIVE", labelKey: "projects.mode.reopen", tone: "default" },
  ],
  HANDED_OVER: [{ to: "CLOSED", labelKey: "projects.mode.closeProject", tone: "danger" }],
};

/** Statuses where the wizard sections can't change (backend PROJECT_LOCKED). */
export const LOCKED_STATUSES: ProjectStatus[] = ["CLOSEOUT", "HANDED_OVER", "CLOSED", "READ_ONLY"];

/** Wizard step ids are stable (they are the `?tab=` value and the API review/estimate warning `tab`). */
export const ROOMS_STEP = 5;
export const ESTIMATE_STEP = 6;
export const REVIEW_STEP = 7;

export const WIZARD_STEPS: ReadonlyArray<{ id: number; labelKey: TranslationKey }> = [
  { id: 1, labelKey: "projects.wizard.stepBasic" },
  { id: 2, labelKey: "projects.wizard.stepContract" },
  { id: 3, labelKey: "projects.wizard.stepPlot" },
  { id: 4, labelKey: "projects.wizard.stepCoverage" },
  { id: ROOMS_STEP, labelKey: "projects.wizard.stepRooms" },
  { id: ESTIMATE_STEP, labelKey: "projects.wizard.stepEstimate" },
  { id: REVIEW_STEP, labelKey: "projects.wizard.stepReview" },
];

/**
 * The steps this user sees: Estimate only with `projects.estimate.view`. Hidden steps keep
 * their id (URLs and API warning tabs stay valid); the tab bar numbers the visible ones 1…n.
 */
export function visibleWizardSteps(canViewEstimate: boolean) {
  return WIZARD_STEPS.filter((s) => s.id !== ESTIMATE_STEP || canViewEstimate);
}

/** The visible step after / before `tab` (stays put at either end). */
export function adjacentWizardStep(steps: ReadonlyArray<{ id: number }>, tab: number, dir: 1 | -1): number {
  const index = steps.findIndex((s) => s.id === tab);
  return steps[Math.min(steps.length - 1, Math.max(0, index + dir))]?.id ?? tab;
}

/** Clamp a `?tab=` query value to a real step id. */
export const clampWizardTab = (value: unknown) => Math.min(REVIEW_STEP, Math.max(1, Math.trunc(Number(value)) || 1));
