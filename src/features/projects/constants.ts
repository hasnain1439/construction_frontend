import { Building, Hammer, HardHat, Layers, PaintRoller } from "lucide-react";
import type { ContractType, FloorLevel, OpeningType, ProjectStatus, RoomType, SupplyCategoryKey } from "@/api/types";

export const CONTRACT_TYPES: Array<{ value: ContractType; title: string; description: string; badge?: string; icon: typeof Building }> = [
  { value: "FULL", title: "Full Contract", description: "You supply all material and labour.", icon: Building },
  {
    value: "GREY_OWNER_FINISHING",
    title: "Grey + Owner Finishing",
    description: "You build the grey structure; the owner buys finishing.",
    badge: "Most common",
    icon: PaintRoller,
  },
  { value: "LABOR_ONLY", title: "Labor-Only", description: "Owner supplies material; you charge per sq ft.", icon: Hammer },
];
export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  FULL: "Full contract",
  GREY_OWNER_FINISHING: "Grey + owner finishing",
  LABOR_ONLY: "Labour only",
};

export const STRUCTURE_TYPES = [
  { value: "FRAMED" as const, title: "Framed", description: "RCC columns and beams carry the load.", icon: Layers },
  { value: "LOAD_BEARING" as const, title: "Load-bearing", description: "Brick walls carry the slabs.", icon: HardHat },
];
export const STRUCTURE_LABEL: Record<string, string> = { FRAMED: "Framed", LOAD_BEARING: "Load-bearing" };

export const PLOT_UNIT_LABEL: Record<string, string> = { MARLA: "Marla", KANAL: "Kanal", SQFT: "Sq ft" };

/** Display order of floors (backend FLOOR_LEVELS). */
export const FLOOR_ORDER: FloorLevel[] = ["BASEMENT", "GROUND", "FIRST", "SECOND", "THIRD", "MUMTY"];
export const FLOOR_LABEL: Record<FloorLevel, string> = {
  BASEMENT: "Basement",
  GROUND: "Ground floor",
  FIRST: "First floor",
  SECOND: "Second floor",
  THIRD: "Third floor",
  MUMTY: "Mumty",
};
export const DEFAULT_CEILING: Record<FloorLevel, number> = { BASEMENT: 10, GROUND: 11, FIRST: 10, SECOND: 10, THIRD: 10, MUMTY: 9 };

export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  MASTER_BEDROOM: "Master Bedroom",
  BEDROOM: "Bedroom",
  ATTACHED_BATH: "Attached Bath",
  POWDER_ROOM: "Powder Room",
  KITCHEN: "Kitchen",
  TV_LOUNGE: "TV Lounge",
  DRAWING_ROOM: "Drawing Room",
  DINING: "Dining",
  STORE: "Store",
  TERRACE: "Terrace",
  STAIR: "Stair",
  GARAGE: "Garage",
  OTHER: "Other",
};

export const OPENING_LABEL: Record<OpeningType, string> = { DOOR: "Door", WINDOW: "Window", VENTILATOR: "Ventilator" };

export const SUPPLY_CATEGORIES: Array<{ key: SupplyCategoryKey; label: string; oftenChanges?: boolean }> = [
  { key: "CEMENT", label: "Cement" },
  { key: "BRICKS", label: "Bricks / blocks" },
  { key: "STEEL", label: "Steel (Sarya)" },
  { key: "SAND_BAJRI", label: "Sand & bajri" },
  { key: "PIPES", label: "Plumbing pipes & fittings", oftenChanges: true },
  { key: "WATERPROOFING", label: "Waterproofing" },
  { key: "ELECTRICAL", label: "Electrical wiring & fittings", oftenChanges: true },
  { key: "TILES_FLOORING", label: "Tiles, marble & flooring" },
  { key: "SANITARY", label: "Sanitary ware" },
  { key: "WOODWORK", label: "Doors, windows & woodwork" },
  { key: "PAINT", label: "Paint & polish" },
];

/** Status changes a Thekedar may make (backend: only these arrows). */
export const STATUS_TRANSITIONS: Partial<Record<ProjectStatus, Array<{ to: ProjectStatus; label: string; tone: "default" | "danger" }>>> = {
  ACTIVE: [{ to: "CLOSEOUT", label: "Move to closeout", tone: "default" }],
  CLOSEOUT: [
    { to: "HANDED_OVER", label: "Mark handed over", tone: "default" },
    { to: "ACTIVE", label: "Reopen", tone: "default" },
  ],
  HANDED_OVER: [{ to: "CLOSED", label: "Close project", tone: "danger" }],
};

/** Statuses where the wizard sections can't change (backend PROJECT_LOCKED). */
export const LOCKED_STATUSES: ProjectStatus[] = ["CLOSEOUT", "HANDED_OVER", "CLOSED", "READ_ONLY"];

export const WIZARD_STEPS = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Contract & Supply" },
  { id: 3, label: "Plot & Structure" },
  { id: 4, label: "Coverage & Boundary" },
  { id: 5, label: "Floors & Rooms" },
  { id: 6, label: "Review" },
] as const;
