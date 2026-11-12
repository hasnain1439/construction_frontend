import type { BoxKind } from "./layout";

/** Colours of the house parts in the 3D view and its legend. */
export const PART_COLOR: Record<BoxKind, string> = {
  ground: "#7fa86b",
  pcc: "#a3a3a3",
  footing: "#7d838c",
  foundationWall: "#a0522d",
  raft: "#7d838c",
  pile: "#6b7178",
  plinthFill: "#8b6b3d",
  plinthBeam: "#9aa0a6",
  dpc: "#262626",
  wall: "#eadfcb",
  column: "#b5b9be",
  slab: "#c9ccd1",
  parapet: "#e2d5bd",
  stair: "#b8a58a",
  door: "#7a4a24",
  window: "#6fa8d6",
  ventilator: "#8fbcd9",
  boundary: "#cbb79c",
};
