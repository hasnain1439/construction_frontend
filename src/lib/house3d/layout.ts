/**
 * House 3D — turns what the project setup holds (plot, foundation, floors, rooms with their walls and
 * openings, boundary wall) into plain boxes in feet, for the 3D view (components/house3d). No three.js
 * here: this file is pure and unit-tested.
 *
 * Axes: x along the plot front (left → right), z from the back of the plot (0) to the road (depthFt),
 * y up from the natural ground (0).
 *
 * Rooms have no saved position, so a plan is worked out:
 * - Walls entered with shared pairs: a room sits next to the room it shares a wall with, turned so the
 *   two shared sides face each other.
 * - Otherwise (the usual case) the house is one closed block the width of the plot: rooms in rows —
 *   bedrooms and baths at the back, lounge / kitchen / stairs in the middle, drawing room at the road
 *   side — with 4.5″ walls between them and a 9″ outer wall; space left over is a passage.
 * Walls are built per line, so a wall two rooms share is built once with both rooms' doors in it.
 * Doors open to a passage or the next room, windows to the outside (with a sunshade over them).
 */
import type { FloorLevel, FloorWithRooms, OpeningType, ProjectCoverage, ProjectFoundation, Room, RoomType, RoomWall, WallSide } from "@/api/types";

export type BoxKind =
  | "ground"
  | "road"
  | "paving"
  | "pcc"
  | "footing"
  | "foundationWall"
  | "raft"
  | "pile"
  | "plinthFill"
  | "plinthBeam"
  | "beam"
  | "dpc"
  | "plinthWall"
  | "floorFinish"
  | "wetFloor"
  | "wall"
  | "column"
  | "slab"
  | "parapet"
  | "chajja"
  | "stair"
  | "door"
  | "window"
  | "ventilator"
  | "frame"
  | "boundary";

/** An axis-aligned box: (x, y, z) is its minimum corner, (w, h, d) its size along x, y, z. */
export interface Box {
  kind: BoxKind;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  /** Index into `floors` (walls, slabs, openings …); null for foundation / site parts. */
  floor: number | null;
  /** Name of a structural member, e.g. "F-3" (footing), "G-C4" (ground floor column 4), "1-B2" (first floor beam 2). */
  part?: string;
}

export interface RoomLabel {
  text: string;
  x: number;
  y: number;
  z: number;
  floor: number;
}

export interface HouseFloor {
  level: FloorLevel;
  name: string;
  baseY: number;
  heightFt: number;
  rooms: number;
}

export interface HouseModel {
  boxes: Box[];
  labels: RoomLabel[];
  floors: HouseFloor[];
  plot: { frontFt: number; depthFt: number; known: boolean };
  /** Overall size, for the camera. */
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  /** Rooms placed next to the room they share a wall with / laid out in rows (no shared walls entered); rooms shown with an assumed door / window. */
  placement: { tied: number; packed: number; assumed: number };
  /** What the structure holds, as drawn (counts follow the setup). */
  structure: {
    foundation: { type: string; depthFt: number; footings: number; piles: number; plinthBeamFt: number };
    floors: Array<{ name: string; columns: number; columnSizeIn: string; beamRunFt: number; beamSizeIn: string; enteredBeamRunFt: number | null; enteredColumns: number | null }>;
  };
}

export interface HouseInput {
  frontFt: number | null | undefined;
  depthFt: number | null | undefined;
  structureType: "FRAMED" | "LOAD_BEARING" | null | undefined;
  foundation: ProjectFoundation | null | undefined;
  coverage: Pick<ProjectCoverage, "boundaryWall" | "boundaryHeightFt" | "boundaryThickness"> | null | undefined;
  floors: FloorWithRooms[];
  parapetHeightFt?: number;
  /** Columns per floor from the plan rule (project calculations), used when the roof card has no count. */
  columnsByLevel?: Partial<Record<FloorLevel, number | null>>;
}

// ─── Defaults (feet) ─────────────────────────────────────────────────────────

const IN = 1 / 12;
const EXT = 9 * IN;
const INT = 4.5 * IN;
const DEFAULT_FOUNDATION = { excavationDepthFt: 4, footingWidthFt: 2.5, footingThicknessIn: 12, plinthHeightFt: 1.5, dpcThicknessIn: 1.5, pccThicknessIn: 3 };
const DEFAULT_SLAB_IN = 5;
const PARAPET_FT = 3;
const SLAB_OVERHANG = 0.5;
const CHAJJA_FT = 1.5;
const SILL: Record<OpeningType, (wallH: number, h: number) => number> = {
  DOOR: () => 0,
  WINDOW: (wallH, h) => Math.max(0, Math.min(3, wallH - h - 1)),
  VENTILATOR: (wallH, h) => Math.max(0, wallH - h - 1),
};
const FILL: Record<OpeningType, BoxKind> = { DOOR: "door", WINDOW: "window", VENTILATOR: "ventilator" };
const WET: ReadonlySet<RoomType> = new Set(["ATTACHED_BATH", "POWDER_ROOM", "KITCHEN"]);

/** Shown for a room saved without any door or window: a standard door and a window (a vent in a bath). */
function defaultOpenings(type: RoomType): Array<{ type: OpeningType; widthFt: number; heightFt: number; quantity: number; side: null }> {
  const door = { type: "DOOR" as const, widthFt: 3, heightFt: 7, quantity: 1, side: null };
  if (type === "ATTACHED_BATH" || type === "POWDER_ROOM") return [{ ...door, widthFt: 2.5 }, { type: "VENTILATOR", widthFt: 2, heightFt: 1.5, quantity: 1, side: null }];
  if (type === "STORE") return [door];
  return [door, { type: "WINDOW", widthFt: 4, heightFt: 4, quantity: 1, side: null }];
}
/** Row bands, back (0) to road side (2). */
const BAND: Record<RoomType, number> = {
  MASTER_BEDROOM: 0,
  BEDROOM: 0,
  ATTACHED_BATH: 0,
  STORE: 1,
  STAIR: 1,
  KITCHEN: 1,
  TV_LOUNGE: 1,
  DINING: 1,
  POWDER_ROOM: 1,
  OTHER: 1,
  DRAWING_ROOM: 2,
  GARAGE: 2,
  TERRACE: 2,
};

// ─── Plan geometry ───────────────────────────────────────────────────────────

/** World directions: 0 = N (back, −z), 1 = E (+x), 2 = S (road, +z), 3 = W (−x). */
type Dir = 0 | 1 | 2 | 3;
const BASE: Record<WallSide, Dir> = { TOP: 0, RIGHT: 1, BOTTOM: 2, LEFT: 3 };
const dirOf = (side: WallSide, rot: number) => ((BASE[side] + rot) % 4) as Dir;

interface Rect {
  x: number;
  z: number;
  dx: number;
  dz: number;
}

export interface Placed extends Rect {
  room: Room;
  rot: number;
}

const sizeFor = (room: Room, rot: number) => (rot % 2 ? { dx: room.widthFt, dz: room.lengthFt } : { dx: room.lengthFt, dz: room.widthFt });
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.dx - 0.01 && b.x < a.x + a.dx - 0.01 && a.z < b.z + b.dz - 0.01 && b.z < a.z + a.dz - 0.01;
const byOrder = (a: Room, b: Room) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

const thicknessOf = (w: RoomWall | undefined, framed: boolean): number => {
  if (!w) return EXT;
  if (w.type === "OPEN") return 0;
  if (w.type === "DOUBLE") return ((w.thicknessIn ?? 9) + (w.cavityIn ?? 2) + (w.innerLeafIn ?? 4.5)) * IN;
  if (w.thicknessIn) return w.thicknessIn * IN;
  return w.type === "SHARED" ? (framed ? INT : EXT) : w.type === "PASSAGE" ? INT : EXT;
};

export interface FloorPlan {
  placed: Placed[];
  /** Passage / leftover floor inside the block. */
  fillers: Rect[];
  /** The closed block (row layout); null when placed from shared walls. */
  envelope: Rect | null;
  tied: number;
  packed: number;
}

/** Rooms placed from their shared walls (walls entered in the setup). */
function placeTied(rooms: Room[], framed: boolean): FloorPlan {
  const sorted = [...rooms].sort(byOrder);
  const byId = new Map(sorted.map((r) => [r.id, r]));
  const placed = new Map<string, Placed>();
  const tiedIds = new Set<string>();
  const components: Placed[][] = [];
  for (const start of sorted) {
    if (placed.has(start.id)) continue;
    const first: Placed = { room: start, rot: 0, x: 0, z: 0, ...sizeFor(start, 0) };
    placed.set(start.id, first);
    const comp = [first];
    const queue = [first];
    while (queue.length) {
      const a = queue.shift()!;
      for (const w of a.room.walls ?? []) {
        if (w.type !== "SHARED" || !w.sharedWithRoomId) continue;
        const other = byId.get(w.sharedWithRoomId);
        if (!other || placed.has(other.id)) continue;
        const dA = dirOf(w.side, a.rot);
        const bSide = w.sharedWithSide ?? (({ TOP: "BOTTOM", BOTTOM: "TOP", LEFT: "RIGHT", RIGHT: "LEFT" }) as const)[w.side];
        const rot = (((dA + 2) % 4) - BASE[bSide] + 4) % 4;
        const { dx, dz } = sizeFor(other, rot);
        const t = thicknessOf(w, framed);
        const spots: Rect[] = [];
        if (dA === 1 || dA === 3) {
          const x = dA === 1 ? a.x + a.dx + t : a.x - t - dx;
          for (const z of [a.z, a.z + a.dz - dz, a.z + (a.dz - dz) / 2]) spots.push({ x, z, dx, dz });
        } else {
          const z = dA === 2 ? a.z + a.dz + t : a.z - t - dz;
          for (const x of [a.x, a.x + a.dx - dx, a.x + (a.dx - dx) / 2]) spots.push({ x, z, dx, dz });
        }
        const spot = spots.find((s) => [...placed.values()].every((p) => !overlaps(s, p)));
        if (!spot) continue;
        const b: Placed = { room: other, rot, ...spot };
        placed.set(other.id, b);
        comp.push(b);
        queue.push(b);
        tiedIds.add(a.room.id).add(other.id);
      }
    }
    components.push(comp);
  }
  // Components side by side.
  let cursor = 0;
  for (const comp of components) {
    const minX = Math.min(...comp.map((p) => p.x));
    const minZ = Math.min(...comp.map((p) => p.z));
    for (const p of comp) {
      p.x += cursor - minX;
      p.z -= minZ;
    }
    cursor = Math.max(...comp.map((p) => p.x + p.dx)) + EXT * 2;
  }
  const all = [...placed.values()];
  return { placed: all, fillers: [], envelope: null, tied: tiedIds.size, packed: all.length - tiedIds.size };
}

/**
 * Rooms in rows inside a block `width` ft wide (inside the outer walls): back band first. Each room is
 * turned to fit the row; what is left over is a passage. The block grows wider for a room that does
 * not fit at all.
 */
function placeRows(rooms: Room[], width: number): FloorPlan {
  const order = [...rooms].sort((a, b) => BAND[a.type] - BAND[b.type] || byOrder(a, b));
  let W = Math.max(width, ...rooms.map((r) => Math.min(r.lengthFt, r.widthFt)));
  const rows: Placed[][] = [];
  let row: Placed[] = [];
  let x = 0;
  let band = order[0] ? BAND[order[0].type] : 0;
  const rowDepth = (r: Placed[]) => Math.max(0, ...r.map((p) => p.dz));
  for (const room of order) {
    const options = [0, 1].map((rot) => ({ rot, ...sizeFor(room, rot) }));
    const fits = (o: { dx: number }) => x + o.dx <= W + 0.01;
    // A new band starts a new row, so the drawing room really is at the front.
    if (row.length && BAND[room.type] !== band) {
      rows.push(row);
      row = [];
      x = 0;
    }
    band = BAND[room.type];
    let pick = options.filter(fits);
    if (!pick.length && row.length) {
      rows.push(row);
      row = [];
      x = 0;
      pick = options.filter(fits);
    }
    if (!pick.length) {
      const narrow = options.reduce((a, b) => (a.dx <= b.dx ? a : b));
      W = Math.max(W, narrow.dx);
      pick = [narrow];
    }
    const depth = rowDepth(row);
    const best = pick.reduce((a, b) => {
      if (!row.length) return b.dz < a.dz ? b : a; // shallow rows
      const score = (o: { dz: number }) => Math.abs(o.dz - depth);
      return score(b) < score(a) ? b : a;
    });
    row.push({ room, rot: best.rot, x, z: 0, dx: best.dx, dz: best.dz });
    x += best.dx + INT;
  }
  if (row.length) rows.push(row);

  const placed: Placed[] = [];
  const fillers: Rect[] = [];
  let z = 0;
  for (const r of rows) {
    const depth = rowDepth(r);
    for (const p of r) {
      p.z = z;
      placed.push(p);
      if (depth - p.dz > 1) fillers.push({ x: p.x, z: z + p.dz + INT, dx: p.dx, dz: depth - p.dz - INT });
    }
    const end = r[r.length - 1]!;
    const used = end.x + end.dx + INT;
    if (W - used > 1) fillers.push({ x: used, z, dx: W - used, dz: depth });
    else if (W - (end.x + end.dx) > 0.01) end.dx = W - end.x; // a sliver: the last room takes it
    z += depth + INT;
  }
  const D = Math.max(0, z - INT);
  return { placed, fillers, envelope: { x: 0, z: 0, dx: W, dz: D }, tied: 0, packed: placed.length };
}

/** A floor's plan: from the shared walls when they were entered, else rows in a block `width` wide. */
export function placeRooms(rooms: Room[], framed: boolean, width: number | null): FloorPlan {
  const hasPairs = rooms.some((r) => r.walls?.some((w) => w.type === "SHARED" && w.sharedWithRoomId));
  if (hasPairs) return placeTied(rooms, framed);
  const area = rooms.reduce((s, r) => s + r.lengthFt * r.widthFt, 0);
  return placeRows(rooms, width ?? Math.max(20, Math.round(Math.sqrt(area * 0.8))));
}

// ─── Walls, built per line ───────────────────────────────────────────────────

interface Hole {
  type: OpeningType;
  width: number;
  height: number;
  /** Start along the line (absolute). */
  at: number;
}

/** One wall band: along x (`alongX`, at z = `fixed` … fixed + thick) or along z (at x = fixed …). */
interface Line {
  kind: "wall" | "parapet";
  alongX: boolean;
  fixed: number;
  thick: number;
  height: number;
  /** +1 / −1: which way is outside (for sunshades); 0 inside the house. */
  out: number;
  spans: Array<[number, number]>;
  holes: Hole[];
}

class Lines {
  private map = new Map<string, Line>();
  add(l: Omit<Line, "spans" | "holes">, span: [number, number], holes: Hole[] = []) {
    if (span[1] - span[0] < 0.01 || l.thick <= 0) return;
    // Height in the key too: a terrace's low wall never merges into a full-height wall on the same line.
    const key = `${l.kind}|${l.alongX ? "x" : "z"}|${l.fixed.toFixed(2)}|${l.thick.toFixed(3)}|${l.height.toFixed(2)}`;
    const line = this.map.get(key) ?? { ...l, spans: [], holes: [] };
    line.spans.push(span);
    line.holes.push(...holes);
    line.height = Math.max(line.height, l.height);
    if (l.out) line.out = l.out;
    this.map.set(key, line);
  }
  all() {
    return [...this.map.values()];
  }
}

/** Holes spread evenly over [a, b]; widths shrink when they would not fit. */
function spread(a: number, b: number, holes: Array<Omit<Hole, "at">>): Hole[] {
  if (!holes.length) return [];
  const length = b - a;
  const total = holes.reduce((s, h) => s + h.width, 0);
  const scale = total > length * 0.8 ? (length * 0.8) / total : 1;
  const gap = (length - total * scale) / (holes.length + 1);
  let u = a + gap;
  return holes.map((h) => {
    const at = { ...h, width: h.width * scale, at: u };
    u += h.width * scale + gap;
    return at;
  });
}

const merge = (spans: Array<[number, number]>) => {
  const s = [...spans].sort((p, q) => p[0] - q[0]);
  const out: Array<[number, number]> = [];
  for (const [a, b] of s) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + 0.02) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
};

/** Boxes of the lines of one floor: solid pieces round the holes, a door / glass panel with a frame, sunshades. */
function buildLines(out: Box[], floor: number, baseY: number, lines: Line[], kindOf: (l: Line) => BoxKind = (l) => l.kind) {
  for (const l of lines) {
    const piece = (u: number, len: number, y: number, h: number, kind: BoxKind, inset = 0, t = l.thick) => {
      if (len <= 0.01 || h <= 0.01) return;
      out.push(l.alongX ? { kind, x: u, y: baseY + y, z: l.fixed + inset, w: len, h, d: t, floor } : { kind, x: l.fixed + inset, y: baseY + y, z: u, w: t, h, d: len, floor });
    };
    for (const [a, b] of merge(l.spans)) {
      let u = a;
      const holes = l.holes.filter((h) => h.at >= a - 0.01 && h.at + h.width <= b + 0.01).sort((p, q) => p.at - q.at);
      for (const hole of holes) {
        // Two rooms' openings on one shared wall: the later one moves along, or is left out if it no longer fits.
        const h = hole.at < u + 0.5 && u > a ? { ...hole, at: u + 0.75 } : hole;
        if (h.at + h.width > b - 0.25) continue;
        const sill = SILL[h.type](l.height, h.height);
        const top = Math.min(l.height, sill + h.height);
        piece(u, h.at - u, 0, l.height, kindOf(l));
        piece(h.at, h.width, 0, sill, kindOf(l));
        piece(h.at, h.width, top, l.height - top, kindOf(l));
        const panel = Math.min(l.thick, h.type === "DOOR" ? 0.15 : 0.06);
        const mid = (l.thick - panel) / 2;
        piece(h.at, h.width, sill, top - sill, FILL[h.type], mid, panel);
        if (h.type !== "DOOR") {
          // Frame round the glass.
          const f = 0.18;
          const ft = Math.min(l.thick, 0.3);
          piece(h.at, h.width, sill, f, "frame", (l.thick - ft) / 2, ft);
          piece(h.at, h.width, top - f, f, "frame", (l.thick - ft) / 2, ft);
          piece(h.at, f, sill, top - sill, "frame", (l.thick - ft) / 2, ft);
          piece(h.at + h.width - f, f, sill, top - sill, "frame", (l.thick - ft) / 2, ft);
        } else {
          piece(h.at - 0.12, 0.12, 0, top, "frame", (l.thick - 0.3) / 2, Math.min(l.thick, 0.3));
          piece(h.at + h.width, 0.12, 0, top, "frame", (l.thick - 0.3) / 2, Math.min(l.thick, 0.3));
        }
        // Sunshade (chajja) over outside windows.
        if (l.out && h.type !== "VENTILATOR") {
          const y = baseY + top + 0.25;
          const w = h.width + 1;
          const x0 = h.at - 0.5;
          if (l.alongX) out.push({ kind: "chajja", x: x0, y, z: l.out > 0 ? l.fixed + l.thick : l.fixed - CHAJJA_FT, w, h: 0.25, d: CHAJJA_FT, floor });
          else out.push({ kind: "chajja", x: l.out > 0 ? l.fixed + l.thick : l.fixed - CHAJJA_FT, y, z: x0, w: CHAJJA_FT, h: 0.25, d: w, floor });
        }
        u = h.at + h.width;
      }
      piece(u, b - u, 0, l.height, kindOf(l));
    }
  }
}

/** Rect a minus rect b (axis-aligned): up to four pieces. */
function subtract(a: Rect, b: Rect): Rect[] {
  if (!overlaps(a, b)) return [a];
  const out: Rect[] = [];
  const x0 = Math.max(a.x, b.x);
  const x1 = Math.min(a.x + a.dx, b.x + b.dx);
  if (b.z > a.z) out.push({ x: a.x, z: a.z, dx: a.dx, dz: b.z - a.z });
  if (b.z + b.dz < a.z + a.dz) out.push({ x: a.x, z: b.z + b.dz, dx: a.dx, dz: a.z + a.dz - (b.z + b.dz) });
  const z0 = Math.max(a.z, b.z);
  const z1 = Math.min(a.z + a.dz, b.z + b.dz);
  if (b.x > a.x) out.push({ x: a.x, z: z0, dx: x0 - a.x, dz: z1 - z0 });
  if (b.x + b.dx < a.x + a.dx) out.push({ x: x1, z: z0, dx: a.x + a.dx - x1, dz: z1 - z0 });
  return out.filter((r) => r.dx > 0.01 && r.dz > 0.01);
}

type Pt = { x: number; z: number };

/** Where columns can stand: the block corners and the wall junctions (room corners), on the wall centre lines. */
function junctions(rooms: Rect[], env: Rect | null, samples = true): Pt[] {
  const pts: Pt[] = [];
  const add = (x: number, z: number) => {
    if (!pts.some((q) => Math.abs(q.x - x) < 1.5 && Math.abs(q.z - z) < 1.5)) pts.push({ x, z });
  };
  const snapX = (x: number) => (env && Math.abs(x - env.x) < 1 ? env.x - EXT / 2 : env && Math.abs(x - (env.x + env.dx)) < 1 ? env.x + env.dx + EXT / 2 : x);
  const snapZ = (z: number) => (env && Math.abs(z - env.z) < 1 ? env.z - EXT / 2 : env && Math.abs(z - (env.z + env.dz)) < 1 ? env.z + env.dz + EXT / 2 : z);
  if (env) {
    for (const x of [env.x - EXT / 2, env.x + env.dx + EXT / 2]) for (const z of [env.z - EXT / 2, env.z + env.dz + EXT / 2]) add(x, z);
  }
  const g = INT / 2;
  for (const r of rooms) {
    for (const [x, z] of [[r.x - g, r.z - g], [r.x + r.dx + g, r.z - g], [r.x - g, r.z + r.dz + g], [r.x + r.dx + g, r.z + r.dz + g]] as const) add(snapX(x), snapZ(z));
  }
  if (!samples) return pts;
  // Along every room side too (every ~4 ft), so the count entered can always be placed on a wall.
  for (const r of rooms) {
    for (let x = r.x + 4; x < r.x + r.dx - 2; x += 4) {
      add(x, snapZ(r.z - g));
      add(x, snapZ(r.z + r.dz + g));
    }
    for (let z = r.z + 4; z < r.z + r.dz - 2; z += 4) {
      add(snapX(r.x - g), z);
      add(snapX(r.x + r.dx + g), z);
    }
  }
  // Along the outer walls too, so a long wall can carry columns between junctions.
  if (env && samples) {
    const x0 = env.x - EXT / 2, x1 = env.x + env.dx + EXT / 2, z0 = env.z - EXT / 2, z1 = env.z + env.dz + EXT / 2;
    for (let x = x0 + 4; x < x1 - 2; x += 4) {
      add(x, z0);
      add(x, z1);
    }
    for (let z = z0 + 4; z < z1 - 2; z += 4) {
      add(x0, z);
      add(x1, z);
    }
  }
  return pts;
}

/** A door / window that meets a column moves along its wall (after the column, else before it). */
function moveOpeningsOffColumns(lines: Line[], columns: Pt[], half: number) {
  for (const l of lines) {
    const spans = merge(l.spans);
    const on = columns.filter((c) => {
      const across = l.alongX ? c.z : c.x;
      return across > l.fixed - 0.6 && across < l.fixed + l.thick + 0.6;
    });
    if (!on.length) continue;
    for (const h of l.holes) {
      const span = spans.find(([a, b]) => h.at >= a - 0.01 && h.at + h.width <= b + 0.01);
      if (!span) continue;
      for (let pass = 0; pass < 3; pass++) {
        const hit = on.map((c) => (l.alongX ? c.x : c.z)).find((u) => h.at < u + half && h.at + h.width > u - half);
        if (hit === undefined) break;
        const after = hit + half;
        const before = hit - half - h.width;
        if (after + h.width <= span[1] - 0.25) h.at = after;
        else if (before >= span[0] + 0.25) h.at = before;
        else break;
      }
    }
  }
}

/** n points spread as far apart as possible: the four outer corners first, then always the spot farthest from those taken. */
function spreadPoints(cands: Pt[], n: number): Pt[] {
  const left = cands.filter((c, k) => cands.findIndex((q) => Math.abs(q.x - c.x) < 0.5 && Math.abs(q.z - c.z) < 0.5) === k);
  const chosen: Pt[] = [];
  const take = (k: number) => chosen.push(left.splice(k, 1)[0]!);
  const extreme = (f: (c: Pt) => number) => left.reduce((best, c, k) => (f(c) > f(left[best]!) ? k : best), 0);
  for (const f of [(c: Pt) => -c.x - c.z, (c: Pt) => c.x - c.z, (c: Pt) => -c.x + c.z, (c: Pt) => c.x + c.z]) {
    if (chosen.length >= n || !left.length) break;
    take(extreme(f));
  }
  while (chosen.length < n && left.length) {
    take(extreme((c) => Math.min(...chosen.map((q) => Math.hypot(q.x - c.x, q.z - c.z)))));
  }
  return chosen;
}

/** The plan rule when no count was entered: a column about every 15 ft each way. */
const gridColumns = (w: number, d: number) => (Math.ceil(w / 15) + 1) * (Math.ceil(d / 15) + 1);

/** A terrace's hole in the roof: out to the slab edge on the sides where it is on the block's edge. */
function terraceCut(tr: Rect, block: Rect): Rect {
  const reach = EXT + SLAB_OVERHANG + 0.01;
  const l = Math.abs(tr.x - block.x) < 0.05 ? reach : 0;
  const r = Math.abs(tr.x + tr.dx - (block.x + block.dx)) < 0.05 ? reach : 0;
  const b = Math.abs(tr.z - block.z) < 0.05 ? reach : 0;
  const f = Math.abs(tr.z + tr.dz - (block.z + block.dz)) < 0.05 ? reach : 0;
  return { x: tr.x - l, z: tr.z - b, dx: tr.dx + l + r, dz: tr.dz + b + f };
}

// ─── The whole house ─────────────────────────────────────────────────────────

const LEVEL_ORDER: Record<FloorLevel, number> = { BASEMENT: 0, GROUND: 1, FIRST: 2, SECOND: 3, THIRD: 4, MUMTY: 5 };

export function buildHouse(input: HouseInput): HouseModel {
  const framed = input.structureType !== "LOAD_BEARING";
  const f = input.foundation;
  const fnd = {
    type: f?.type ?? "STRIP",
    depth: f?.excavationDepthFt ?? DEFAULT_FOUNDATION.excavationDepthFt,
    footingW: f?.footingWidthFt ?? DEFAULT_FOUNDATION.footingWidthFt,
    footingT: (f?.footingThicknessIn ?? DEFAULT_FOUNDATION.footingThicknessIn) * IN,
    plinth: f?.plinthHeightFt ?? DEFAULT_FOUNDATION.plinthHeightFt,
    dpc: (f?.dpcThicknessIn ?? DEFAULT_FOUNDATION.dpcThicknessIn) * IN,
    pcc: (f?.pccThicknessIn ?? DEFAULT_FOUNDATION.pccThicknessIn) * IN,
    padL: f?.footingLengthFt ?? 4,
    pileD: (f?.pileDiameterIn ?? 18) * IN,
    pileDepth: f?.pileDepthFt ?? 20,
  };
  const known = Boolean(input.frontFt && input.depthFt);
  const floorsIn = [...input.floors].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.sortOrder - b.sortOrder);
  const groundAt = floorsIn.findIndex((fl) => fl.level === "GROUND");
  const groundIdx = groundAt >= 0 ? groundAt : Math.max(0, floorsIn.findIndex((fl) => fl.level !== "BASEMENT"));

  // Block width: the plot front less the outer walls (no side gaps on a Pakistani town plot).
  const blockW = input.frontFt ? input.frontFt - 2 * EXT : null;
  const plans = floorsIn.map((fl) => placeRooms(fl.rooms, framed, fl.level === "MUMTY" ? Math.min(blockW ?? 24, 24) : blockW));
  const outline = (p: FloorPlan): Rect | null =>
    p.envelope ??
    (p.placed.length
      ? (() => {
          const minX = Math.min(...p.placed.map((r) => r.x));
          const minZ = Math.min(...p.placed.map((r) => r.z));
          return { x: minX, z: minZ, dx: Math.max(...p.placed.map((r) => r.x + r.dx)) - minX, dz: Math.max(...p.placed.map((r) => r.z + r.dz)) - minZ };
        })()
      : null);
  const ref = outline(plans[groundIdx]?.placed.length ? plans[groundIdx]! : (plans.find((p) => p.placed.length) ?? { placed: [], fillers: [], envelope: null, tied: 0, packed: 0 }));
  const houseW = (ref?.dx ?? 20) + 2 * EXT;
  const houseD = (ref?.dz ?? 20) + 2 * EXT;
  const frontFt = input.frontFt ?? Math.ceil(houseW + 10);
  const depthFt = input.depthFt ?? Math.ceil(houseD + 20);
  // The block sits centred across the plot, a little off the back; the open space (lawn, car porch) is at the road side.
  const back = Math.max(0, Math.min(3, depthFt - houseD - 10));
  const originX = (frontFt - houseW) / 2 + EXT - (ref?.x ?? 0);
  const originZ = back + EXT - (ref?.z ?? 0);

  const slabT = (fl: FloorWithRooms) => (fl.roof?.thicknessIn ?? fl.slabSuggestion?.suggestedIn ?? DEFAULT_SLAB_IN) * IN;
  const baseYs: number[] = [];
  let y = fnd.plinth;
  floorsIn.forEach((fl, i) => {
    if (fl.level === "BASEMENT") baseYs[i] = fnd.plinth - slabT(fl) - fl.ceilingHeightFt;
    else {
      baseYs[i] = y;
      y += fl.ceilingHeightFt + slabT(fl);
    }
  });

  const boxes: Box[] = [];
  const labels: RoomLabel[] = [];
  const floors: HouseFloor[] = [];
  let tied = 0;
  let packed = 0;
  let assumedRooms = 0;
  let groundLines: Line[] = [];
  /** Column spots of the ground floor (the frame runs up from them) and the members drawn. */
  let groundSpots: Pt[] = [];
  let groundColumnCount = 0;
  const structureFloors: HouseModel["structure"]["floors"] = [];
  let topRoof: { i: number; rects: Rect[]; y: number; base: number } | null = null;

  plans.forEach((plan, i) => {
    const fl = floorsIn[i]!;
    const baseY = baseYs[i]!;
    const h = fl.ceilingHeightFt;
    tied += plan.tied;
    packed += plan.packed;
    floors.push({ level: fl.level, name: fl.name, baseY, heightFt: h, rooms: fl.rooms.length });
    if (!plan.placed.length) return;

    // Mumty: at the back-left of the roof; other floors on the ground floor's block.
    const ox = originX;
    const oz = originZ;
    const rect = (r: Rect): Rect => ({ x: r.x + ox, z: r.z + oz, dx: r.dx, dz: r.dz });
    const rooms = plan.placed.map((p) => ({ ...p, ...rect(p) }));
    const fillers = plan.fillers.map(rect);
    const env = plan.envelope ? rect(plan.envelope) : null;
    const lines = new Lines();
    const near = 0.05;

    // What is across one side of a room: another room, the outside, or (inside the block) a passage.
    const across = (p: Placed, d: Dir): { kind: "room" | "outside" | "inside"; gap: number } => {
      for (const q of rooms) {
        if (q === p) continue;
        const g =
          d === 0 ? p.z - (q.z + q.dz) : d === 2 ? q.z - (p.z + p.dz) : d === 1 ? q.x - (p.x + p.dx) : p.x - (q.x + q.dx);
        const overlap = d % 2 === 0 ? Math.min(p.x + p.dx, q.x + q.dx) - Math.max(p.x, q.x) : Math.min(p.z + p.dz, q.z + q.dz) - Math.max(p.z, q.z);
        if (g > -near && g < EXT + near && overlap > 1) return { kind: "room", gap: Math.max(g, INT) };
      }
      if (env) {
        const onEdge = d === 0 ? Math.abs(p.z - env.z) < near : d === 2 ? Math.abs(p.z + p.dz - (env.z + env.dz)) < near : d === 1 ? Math.abs(p.x + p.dx - (env.x + env.dx)) < near : Math.abs(p.x - env.x) < near;
        return { kind: onEdge ? "outside" : "inside", gap: onEdge ? EXT : INT };
      }
      return { kind: "outside", gap: EXT };
    };

    for (const p of rooms) {
      const room = p.room;
      const terrace = room.type === "TERRACE";
      labels.push({ text: room.name, x: p.x + p.dx / 2, y: baseY + 0.4, z: p.z + p.dz / 2, floor: i });
      boxes.push({ kind: WET.has(room.type) ? "wetFloor" : "floorFinish", x: p.x, y: baseY, z: p.z, w: p.dx, h: 0.08, d: p.dz, floor: i });

      const sides = ([0, 1, 2, 3] as Dir[]).map((d) => ({ d, ...across(p, d) }));
      const openings = new Map<Dir, Array<Omit<Hole, "at">>>();
      const push = (d: Dir, o: { type: OpeningType; widthFt: number; heightFt: number; quantity: number }) =>
        openings.set(d, [...(openings.get(d) ?? []), ...Array.from({ length: Math.max(1, o.quantity) }, () => ({ type: o.type, width: o.widthFt, height: o.heightFt }))]);
      const assumed = !room.openings.length && room.type !== "TERRACE" && room.type !== "STAIR";
      if (assumed) assumedRooms += 1;
      const given = assumed ? defaultOpenings(room.type) : room.openings;
      for (const o of given) {
        if (o.side) push(dirOf(o.side, p.rot), o);
        else {
          // Doors to a passage or the next room; windows / ventilators outside (the longest outside side).
          const want = o.type === "DOOR" ? ["inside", "room", "outside"] : ["outside", "inside", "room"];
          const pick = want.map((k) => sides.filter((s) => s.kind === k)).find((s) => s.length);
          // Windows: the road side first (the face of the house), else the longest side.
          const score = (s: { d: Dir }) => (s.d === 2 ? 1000 : 0) + (s.d % 2 === 0 ? p.dx : p.dz);
          const best = (pick ?? sides).reduce((a, b) => (o.type === "DOOR" ? (b.kind === "inside" && a.kind !== "inside" ? b : a) : score(b) > score(a) ? b : a));
          push(best.d, o);
        }
      }
      for (const s of sides) {
        const entered = room.walls?.find((w) => dirOf(w.side, p.rot) === s.d);
        if (entered?.type === "OPEN") continue;
        if (terrace && s.kind === "room") continue; // the room's own wall
        const outside = s.kind === "outside";
        const t = env ? s.gap : entered ? thicknessOf(entered, framed) : outside ? EXT : s.gap;
        const kind = "wall";
        const height = terrace ? PARAPET_FT : h;
        const alongX = s.d % 2 === 0;
        const fixed = s.d === 0 ? p.z - t : s.d === 2 ? p.z + p.dz : s.d === 1 ? p.x + p.dx : p.x - t;
        const [a, b] = alongX ? [p.x, p.x + p.dx] : [p.z, p.z + p.dz];
        // Outside corners: the N / S walls run over the corners.
        const span: [number, number] = alongX && outside && !env ? [a - t, b + t] : [a, b];
        const out = outside ? (s.d === 0 || s.d === 3 ? -1 : 1) : 0;
        lines.add({ kind, alongX, fixed, thick: t, height, out }, span, terrace ? [] : spread(a, b, openings.get(s.d) ?? []));
      }

      if (room.type === "STAIR") {
        const rise = h + slabT(fl);
        const steps = Math.max(2, Math.round(rise / (7 * IN)));
        const runX = p.dx >= p.dz;
        const run = (runX ? p.dx : p.dz) / steps;
        const width = Math.min((runX ? p.dz : p.dx) / 2, 4);
        for (let s = 0; s < steps; s++) {
          boxes.push(
            runX
              ? { kind: "stair", x: p.x + s * run, y: baseY, z: p.z, w: run, h: (rise * (s + 1)) / steps, d: width, floor: i }
              : { kind: "stair", x: p.x, y: baseY, z: p.z + s * run, w: width, h: (rise * (s + 1)) / steps, d: run, floor: i },
          );
        }
      }
    }
    for (const fr of fillers) boxes.push({ kind: "floorFinish", x: fr.x, y: baseY, z: fr.z, w: fr.dx, h: 0.08, d: fr.dz, floor: i });

    // The block's outer walls (also where a passage meets the outside), less the terrace stretches.
    if (env) {
      const terraces = rooms.filter((p) => p.room.type === "TERRACE");
      const outer = (alongX: boolean, fixed: number, a: number, b: number, out: number) => {
        let spans: Array<[number, number]> = [[a, b]];
        for (const tr of terraces) {
          const [ta, tb] = alongX ? [tr.x, tr.x + tr.dx] : [tr.z, tr.z + tr.dz];
          const touches = alongX ? Math.abs(fixed - (tr.z - EXT)) < near || Math.abs(fixed - (tr.z + tr.dz)) < near : Math.abs(fixed - (tr.x - EXT)) < near || Math.abs(fixed - (tr.x + tr.dx)) < near;
          if (!touches) continue;
          spans = spans.flatMap(([s0, s1]): Array<[number, number]> => (tb <= s0 || ta >= s1 ? [[s0, s1]] : ([[s0, ta], [tb, s1]] as Array<[number, number]>).filter(([q0, q1]) => q1 - q0 > EXT + 0.05)));
        }
        for (const s of spans) lines.add({ kind: "wall", alongX, fixed, thick: EXT, height: h, out }, s);
      };
      outer(true, env.z - EXT, env.x - EXT, env.x + env.dx + EXT, -1);
      outer(true, env.z + env.dz, env.x - EXT, env.x + env.dx + EXT, 1);
      outer(false, env.x - EXT, env.z, env.z + env.dz, -1);
      outer(false, env.x + env.dx, env.z, env.z + env.dz, 1);
      // Main door: in the middle of the front, on the ground floor.
      if (i === groundIdx) {
        const mid = env.x + env.dx / 2;
        const at = Math.max(env.x + 0.5, Math.min(env.x + env.dx - 4, mid - 1.75));
        lines.add({ kind: "wall", alongX: true, fixed: env.z + env.dz, thick: EXT, height: h, out: 1 }, [at, at + 3.5], [{ type: "DOOR", width: 3.5, height: 7, at }]);
      }
    }
    const built = lines.all();
    if (i === groundIdx) groundLines = built.filter((l) => l.kind === "wall");

    // Frame of a framed house: columns (the count on the roof card, else the plan rule) at the wall
    // junctions, and a beam on every wall line under the slab.
    const block = env ?? outline({ ...plan, placed: rooms } as FloorPlan);
    let columns = 0;
    let beamRun = 0;
    const cw = (fl.roof?.columnWidthIn ?? 9) * IN;
    const cd = (fl.roof?.columnDepthIn ?? 12) * IN;
    const bw = (fl.roof?.beamWidthIn ?? 9) * IN;
    const bd = (fl.roof?.beamDepthIn ?? 12) * IN;
    const tag = fl.level === "GROUND" ? "G" : fl.level === "BASEMENT" ? "B" : fl.level === "MUMTY" ? "M" : String(i - (floorsIn[0]?.level === "BASEMENT" ? 1 : 0));
    if (framed && block) {
      const want = fl.roof?.columnCount ?? input.columnsByLevel?.[fl.level] ?? gridColumns(block.dx, block.dz);
      const terraces = rooms.filter((q) => q.room.type === "TERRACE");
      const m = EXT + 1;
      const offTerrace = (c: Pt) => !terraces.some((q) => c.x > q.x - m && c.x < q.x + q.dx + m && c.z > q.z - m && c.z < q.z + q.dz + m);
      const inside = (c: Pt) => c.x > block.x - EXT - 0.1 && c.x < block.x + block.dx + EXT + 0.1 && c.z > block.z - EXT - 0.1 && c.z < block.z + block.dz + EXT + 0.1;
      // Columns stand on the grid of wall junctions (corners first); a door / window that would meet
      // one moves along instead. Upper floors stand on the ground floor's columns.
      const core = junctions(rooms, env, false).filter(offTerrace);
      const own = core.length >= want ? core : [...core, ...junctions(rooms, env, true).filter(offTerrace)];
      const cands = groundSpots.length && i > groundIdx ? [...groundSpots.filter((c) => inside(c) && offTerrace(c)), ...own] : own;
      const spots = spreadPoints(cands, want);
      if (i === groundIdx) {
        groundSpots = spots;
        groundColumnCount = spots.length;
      }
      spots.forEach((c, k) => boxes.push({ kind: "column", x: c.x - cw / 2, y: baseY, z: c.z - cd / 2, w: cw, h, d: cd, floor: i, part: `${tag}-C${k + 1}` }));
      columns = spots.length;
      moveOpeningsOffColumns(built, spots, Math.max(cw, cd) / 2 + 0.5);
      let k = 0;
      for (const l of built.filter((x) => x.kind === "wall")) {
        for (const [a, b] of merge(l.spans)) {
          const mid = l.fixed + l.thick / 2;
          k += 1;
          beamRun += b - a;
          boxes.push(
            l.alongX
              ? { kind: "beam", x: a, y: baseY + h - bd, z: mid - bw / 2, w: b - a, h: bd, d: bw, floor: i, part: `${tag}-B${k}` }
              : { kind: "beam", x: mid - bw / 2, y: baseY + h - bd, z: a, w: bw, h: bd, d: b - a, floor: i, part: `${tag}-B${k}` },
          );
        }
      }
    }
    buildLines(boxes, i, baseY, built);
    structureFloors.push({
      name: fl.name,
      columns,
      columnSizeIn: `${Math.round(cw * 12)}×${Math.round(cd * 12)}`,
      beamRunFt: Math.round(beamRun),
      beamSizeIn: `${Math.round(bw * 12)}×${Math.round(bd * 12)}`,
      enteredBeamRunFt: fl.roof?.beamRunFt ?? null,
      enteredColumns: fl.roof?.columnCount ?? null,
    });

    // Roof slab over the floor (not over a terrace), a little wider than the walls.
    const o = env ?? outline({ ...plan, placed: rooms } as FloorPlan)!;
    let slabRects: Rect[] = [{ x: o.x - EXT - SLAB_OVERHANG, z: o.z - EXT - SLAB_OVERHANG, dx: o.dx + 2 * (EXT + SLAB_OVERHANG), dz: o.dz + 2 * (EXT + SLAB_OVERHANG) }];
    for (const tr of rooms.filter((p) => p.room.type === "TERRACE")) slabRects = slabRects.flatMap((r) => subtract(r, terraceCut(tr, o)));
    const t = slabT(fl);
    for (const r of slabRects) boxes.push({ kind: "slab", x: r.x, y: baseY + h, z: r.z, w: r.dx, h: t, d: r.dz, floor: i });
    if (fl.level !== "BASEMENT" && fl.level !== "MUMTY" && (!topRoof || baseY > (topRoof as { base: number }).base)) {
      let roofRects: Rect[] = [{ x: o.x - EXT, z: o.z - EXT, dx: o.dx + 2 * EXT, dz: o.dz + 2 * EXT }];
      for (const tr of rooms.filter((p) => p.room.type === "TERRACE")) roofRects = roofRects.flatMap((r) => subtract(r, terraceCut(tr, o)));
      topRoof = { i, rects: roofRects, y: baseY + h + t, base: baseY };
    }
  });

  // Parapet (mundair) round the top roof.
  if (topRoof) {
    // Round the edge of the roof: each edge of a roof piece that no other piece continues.
    const { i: ti, rects, y: ry } = topRoof as { i: number; rects: Rect[]; y: number };
    const ph = input.parapetHeightFt ?? PARAPET_FT;
    const t = INT;
    const covered = (x: number, z: number) => rects.some((r) => x > r.x - 0.01 && x < r.x + r.dx + 0.01 && z > r.z - 0.01 && z < r.z + r.dz + 0.01);
    for (const r of rects) {
      const edges: Array<{ alongX: boolean; fixed: number; a: number; b: number; outside: (u: number) => [number, number] }> = [
        { alongX: true, fixed: r.z, a: r.x, b: r.x + r.dx, outside: (u) => [u, r.z - 0.2] },
        { alongX: true, fixed: r.z + r.dz - t, a: r.x, b: r.x + r.dx, outside: (u) => [u, r.z + r.dz + 0.2] },
        { alongX: false, fixed: r.x, a: r.z, b: r.z + r.dz, outside: (u) => [r.x - 0.2, u] },
        { alongX: false, fixed: r.x + r.dx - t, a: r.z, b: r.z + r.dz, outside: (u) => [r.x + r.dx + 0.2, u] },
      ];
      for (const e of edges) {
        // Walk the edge in about 1 ft cells; keep the stretches with no roof beyond them.
        const n = Math.max(1, Math.ceil(e.b - e.a));
        const step = (e.b - e.a) / n;
        let start: number | null = null;
        const flush = (end: number) => {
          if (start !== null && end - start > 0.05)
            boxes.push(e.alongX ? { kind: "parapet", x: start, y: ry, z: e.fixed, w: end - start, h: ph, d: t, floor: ti } : { kind: "parapet", x: e.fixed, y: ry, z: start, w: t, h: ph, d: end - start, floor: ti });
          start = null;
        };
        for (let k = 0; k < n; k++) {
          const u0 = e.a + k * step;
          const free = !covered(...e.outside(u0 + step / 2));
          if (free && start === null) start = u0;
          if (!free) flush(u0);
        }
        flush(e.b);
      }
    }
  }

  // Foundation under the ground floor walls; plinth wall above ground (always seen), DPC on top.
  const bottom = -fnd.depth;
  const plinthTop = fnd.plinth;
  let footings = 0;
  let piles = 0;
  let plinthBeamFt = 0;
  for (const l of groundLines) {
    for (const [a, b] of merge(l.spans)) {
      const len = b - a;
      const mid = l.fixed + l.thick / 2;
      const band = (kind: BoxKind, width: number, y0: number, hh: number) => {
        if (hh <= 0.01) return;
        boxes.push(l.alongX ? { kind, x: a, y: y0, z: mid - width / 2, w: len, h: hh, d: width, floor: null } : { kind, x: mid - width / 2, y: y0, z: a, w: width, h: hh, d: len, floor: null });
      };
      const masonryFrom = fnd.type === "STRIP" || fnd.type === "RAFT" ? bottom + fnd.pcc + fnd.footingT : -1;
      if (fnd.type === "STRIP") {
        band("pcc", fnd.footingW + 0.5, bottom, fnd.pcc);
        band("footing", fnd.footingW, bottom + fnd.pcc, fnd.footingT);
      }
      if (fnd.type !== "STRIP" && fnd.type !== "RAFT") {
        band("plinthBeam", Math.max(l.thick, 9 * IN), -1, 1);
        plinthBeamFt += len;
      }
      band("foundationWall", l.thick + (fnd.type === "STRIP" ? 4.5 * IN : 0), masonryFrom, 0 - masonryFrom);
      band("plinthWall", l.thick, 0, plinthTop - fnd.dpc);
      band("dpc", l.thick, plinthTop - fnd.dpc, fnd.dpc);
    }
  }
  const groundSlab = boxes.filter((b) => b.kind === "slab" && b.floor === groundIdx);
  if (groundSlab.length) {
    const minX = Math.min(...groundSlab.map((b) => b.x)) + SLAB_OVERHANG;
    const maxX = Math.max(...groundSlab.map((b) => b.x + b.w)) - SLAB_OVERHANG;
    const minZ = Math.min(...groundSlab.map((b) => b.z)) + SLAB_OVERHANG;
    const maxZ = Math.max(...groundSlab.map((b) => b.z + b.d)) - SLAB_OVERHANG;
    boxes.push({ kind: "plinthFill", x: minX + EXT, y: 0, z: minZ + EXT, w: maxX - minX - 2 * EXT, h: plinthTop - 0.1, d: maxZ - minZ - 2 * EXT, floor: null });
    if (fnd.type === "RAFT") {
      boxes.push({ kind: "pcc", x: minX - 0.5, y: bottom, z: minZ - 0.5, w: maxX - minX + 1, h: fnd.pcc, d: maxZ - minZ + 1, floor: null });
      boxes.push({ kind: "raft", x: minX, y: bottom + fnd.pcc, z: minZ, w: maxX - minX, h: fnd.footingT, d: maxZ - minZ, floor: null });
    }
    if (fnd.type === "ISOLATED" || fnd.type === "COMBINED" || fnd.type === "PILE") {
      // As many footings / piles as entered (isolated: one per column when not entered), under the columns.
      const groundRooms = boxes.filter((b) => (b.kind === "floorFinish" || b.kind === "wetFloor") && b.floor === groundIdx).map((b) => ({ x: b.x, z: b.z, dx: b.w, dz: b.d }));
      const env0 = { x: minX + EXT, z: minZ + EXT, dx: maxX - minX - 2 * EXT, dz: maxZ - minZ - 2 * EXT };
      const count = fnd.type === "PILE" ? (f?.pileCount ?? groundColumnCount) : (f?.footingCount ?? (groundColumnCount || gridColumns(env0.dx, env0.dz)));
      // Under the ground floor's columns first (a footing always carries a column); more than the
      // columns: the rest spread along the walls.
      const extra = count > groundSpots.length ? spreadPoints([...groundSpots, ...junctions(groundRooms, env0)], count).filter((c) => !groundSpots.includes(c)) : [];
      const spots = [...groundSpots.slice(0, count), ...extra].slice(0, count);
      footings = fnd.type === "PILE" ? 0 : spots.length;
      piles = fnd.type === "PILE" ? spots.length : 0;
      const cw = 12 * IN;
      spots.forEach((c, k) => {
        if (fnd.type === "PILE") {
          boxes.push({ kind: "pile", x: c.x - fnd.pileD / 2, y: bottom - fnd.pileDepth, z: c.z - fnd.pileD / 2, w: fnd.pileD, h: fnd.pileDepth, d: fnd.pileD, floor: null, part: `P-${k + 1}` });
          boxes.push({ kind: "footing", x: c.x - 1.5, y: bottom, z: c.z - 1.5, w: 3, h: fnd.footingT, d: 3, floor: null, part: `PC-${k + 1}` });
        } else {
          const pw = fnd.footingW || 4;
          boxes.push({ kind: "pcc", x: c.x - fnd.padL / 2 - 0.25, y: bottom, z: c.z - pw / 2 - 0.25, w: fnd.padL + 0.5, h: fnd.pcc, d: pw + 0.5, floor: null });
          boxes.push({ kind: "footing", x: c.x - fnd.padL / 2, y: bottom + fnd.pcc, z: c.z - pw / 2, w: fnd.padL, h: fnd.footingT, d: pw, floor: null, part: `F-${k + 1}` });
        }
        const from = bottom + (fnd.type === "PILE" ? fnd.footingT : fnd.pcc + fnd.footingT);
        boxes.push({ kind: "column", x: c.x - cw / 2, y: from, z: c.z - cw / 2, w: cw, h: 0 - from, d: cw, floor: null, part: `F-C${k + 1}` });
      });
    }
    // Paved drive from the gate to the house front.
    const frontZ = maxZ;
    if (depthFt - frontZ > 2) {
      const pw = Math.min(12, frontFt / 3);
      boxes.push({ kind: "paving", x: (frontFt - pw) / 2, y: 0, z: frontZ, w: pw, h: 0.05, d: depthFt - frontZ, floor: null });
    }
  }

  // Boundary wall with a gate in the middle of the front.
  if (input.coverage?.boundaryWall) {
    const bh = input.coverage.boundaryHeightFt ?? 7;
    const t = (input.coverage.boundaryThickness === "IN_4_5" ? 4.5 : 9) * IN;
    const gate = Math.min(12, frontFt / 3);
    const g0 = (frontFt - gate) / 2;
    // Where the house stands on the plot edge its own wall is the boundary: no second wall there.
    const house = groundSlab.length
      ? { x0: Math.min(...groundSlab.map((b) => b.x)) + SLAB_OVERHANG, x1: Math.max(...groundSlab.map((b) => b.x + b.w)) - SLAB_OVERHANG, z0: Math.min(...groundSlab.map((b) => b.z)) + SLAB_OVERHANG, z1: Math.max(...groundSlab.map((b) => b.z + b.d)) - SLAB_OVERHANG }
      : null;
    const side = (x: number, touches: boolean) => {
      const spans: Array<[number, number]> = touches && house ? [[0, house.z0], [house.z1, depthFt]] : [[0, depthFt]];
      for (const [a, b] of spans) if (b - a > 0.05) boxes.push({ kind: "boundary", x, y: 0, z: a, w: t, h: bh, d: b - a, floor: null });
    };
    if (!(house && house.z0 < t + 0.05)) boxes.push({ kind: "boundary", x: 0, y: 0, z: 0, w: frontFt, h: bh, d: t, floor: null });
    side(0, Boolean(house && house.x0 < t + 0.05));
    side(frontFt - t, Boolean(house && house.x1 > frontFt - t - 0.05));
    boxes.push(
      { kind: "boundary", x: 0, y: 0, z: depthFt - t, w: g0, h: bh, d: t, floor: null },
      { kind: "boundary", x: g0 + gate, y: 0, z: depthFt - t, w: frontFt - g0 - gate, h: bh, d: t, floor: null },
    );
  }

  boxes.push({ kind: "ground", x: -8, y: -0.05, z: -8, w: frontFt + 16, h: 0.05, d: depthFt + 8, floor: null });
  boxes.push({ kind: "road", x: -20, y: -0.06, z: depthFt + 4, w: frontFt + 40, h: 0.06, d: 16, floor: null });

  const bounds = boxes
    .filter((b) => b.kind !== "road" && b.kind !== "ground")
    .reduce(
      (acc, b) => ({
        minX: Math.min(acc.minX, b.x),
        maxX: Math.max(acc.maxX, b.x + b.w),
        minY: Math.min(acc.minY, b.y),
        maxY: Math.max(acc.maxY, b.y + b.h),
        minZ: Math.min(acc.minZ, b.z),
        maxZ: Math.max(acc.maxZ, b.z + b.d),
      }),
      { minX: 0, maxX: frontFt, minY: 0, maxY: 1, minZ: 0, maxZ: depthFt },
    );
  return {
    boxes,
    labels,
    floors,
    plot: { frontFt, depthFt, known },
    bounds,
    placement: { tied, packed, assumed: assumedRooms },
    structure: { foundation: { type: fnd.type, depthFt: fnd.depth, footings, piles, plinthBeamFt: Math.round(plinthBeamFt) }, floors: structureFloors },
  };
}

