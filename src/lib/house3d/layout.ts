/**
 * House 3D — turns what the project setup holds (plot, foundation, floors, rooms with their walls and
 * openings, boundary wall) into plain boxes in feet, for the 3D view (components/house3d). No three.js
 * here: this file is pure and unit-tested.
 *
 * Axes: x along the plot front (left → right), z from the back of the plot (0) to the road (depthFt),
 * y up from the natural ground (0). Rooms have no saved position, so they are placed from their
 * shared walls: a room that shares its RIGHT wall with another sits right next to it (turned so the
 * two shared sides face each other). Rooms not tied to others are packed in rows. The result is an
 * approximation of the plan — sizes, heights, walls, doors and windows are the real ones.
 */
import type { FloorLevel, FloorWithRooms, OpeningType, ProjectCoverage, ProjectFoundation, Room, RoomWall, WallSide, WallType } from "@/api/types";

export type BoxKind =
  | "ground"
  | "pcc"
  | "footing"
  | "foundationWall"
  | "raft"
  | "pile"
  | "plinthFill"
  | "plinthBeam"
  | "dpc"
  | "wall"
  | "column"
  | "slab"
  | "parapet"
  | "stair"
  | "door"
  | "window"
  | "ventilator"
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
  /** Rooms placed next to the room they share a wall with / packed because nothing ties them. */
  placement: { tied: number; packed: number };
}

export interface HouseInput {
  frontFt: number | null | undefined;
  depthFt: number | null | undefined;
  structureType: "FRAMED" | "LOAD_BEARING" | null | undefined;
  foundation: ProjectFoundation | null | undefined;
  coverage: Pick<ProjectCoverage, "boundaryWall" | "boundaryHeightFt" | "boundaryThickness"> | null | undefined;
  floors: FloorWithRooms[];
  parapetHeightFt?: number;
}

// ─── Defaults (feet) ─────────────────────────────────────────────────────────

const IN = 1 / 12;
const DEFAULT_FOUNDATION = { excavationDepthFt: 4, footingWidthFt: 2.5, footingThicknessIn: 12, plinthHeightFt: 1.5, dpcThicknessIn: 1.5, pccThicknessIn: 3 };
const DEFAULT_SLAB_IN = 5;
const PARAPET_FT = 3;
const PARAPET_THICK = 4.5 * IN;
const GAP = 9 * IN; // between rooms that are not tied (an external wall each side would overlap)
const SILL: Record<OpeningType, (wallH: number, h: number) => number> = {
  DOOR: () => 0,
  WINDOW: (wallH, h) => Math.max(0, Math.min(3, wallH - h - 1)),
  VENTILATOR: (wallH, h) => Math.max(0, wallH - h - 1),
};
const FILL: Record<OpeningType, BoxKind> = { DOOR: "door", WINDOW: "window", VENTILATOR: "ventilator" };

// ─── Directions ──────────────────────────────────────────────────────────────

/** World directions: 0 = N (back, −z), 1 = E (+x), 2 = S (road, +z), 3 = W (−x). */
type Dir = 0 | 1 | 2 | 3;
const BASE: Record<WallSide, Dir> = { TOP: 0, RIGHT: 1, BOTTOM: 2, LEFT: 3 };
const dirOf = (side: WallSide, rot: number) => ((BASE[side] + rot) % 4) as Dir;

const defaultThickness = (type: WallType, framed: boolean) => (type === "SHARED" ? (framed ? 4.5 : 9) : type === "PASSAGE" ? 4.5 : 9) * IN;
const thicknessOf = (w: RoomWall | undefined, framed: boolean) => {
  if (!w) return 9 * IN;
  if (w.type === "OPEN") return 0;
  if (w.type === "DOUBLE") return ((w.thicknessIn ?? 9) + (w.cavityIn ?? 2) + (w.innerLeafIn ?? 4.5)) * IN;
  return w.thicknessIn ? w.thicknessIn * IN : defaultThickness(w.type, framed);
};

interface Placed {
  room: Room;
  rot: number;
  x: number;
  z: number;
  dx: number;
  dz: number;
}

const sizeFor = (room: Room, rot: number) => (rot % 2 ? { dx: room.widthFt, dz: room.lengthFt } : { dx: room.lengthFt, dz: room.widthFt });
const overlaps = (a: { x: number; z: number; dx: number; dz: number }, b: { x: number; z: number; dx: number; dz: number }) =>
  a.x < b.x + b.dx - 0.01 && b.x < a.x + a.dx - 0.01 && a.z < b.z + b.dz - 0.01 && b.z < a.z + a.dz - 0.01;

// ─── Placing the rooms of one floor ──────────────────────────────────────────

/** Rooms of a floor in plan, the room-to-room pairings that were honoured, and the floor outline. */
export function placeRooms(rooms: Room[], framed: boolean, maxRowFt: number | null) {
  const sorted = [...rooms].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const byId = new Map(sorted.map((r) => [r.id, r]));
  const placed = new Map<string, Placed>();
  const tiedPairs = new Set<string>();
  const components: Placed[][] = [];

  for (const start of sorted) {
    if (placed.has(start.id)) continue;
    const comp: Placed[] = [];
    const first: Placed = { room: start, rot: 0, x: 0, z: 0, ...sizeFor(start, 0) };
    placed.set(start.id, first);
    comp.push(first);
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
        const candidates: Array<{ x: number; z: number }> = [];
        if (dA === 1 || dA === 3) {
          const x = dA === 1 ? a.x + a.dx + t : a.x - t - dx;
          for (const z of [a.z, a.z + a.dz - dz, a.z + (a.dz - dz) / 2]) candidates.push({ x, z });
        } else {
          const z = dA === 2 ? a.z + a.dz + t : a.z - t - dz;
          for (const x of [a.x, a.x + a.dx - dx, a.x + (a.dx - dx) / 2]) candidates.push({ x, z });
        }
        const spot = candidates.find((c) => [...placed.values()].every((p) => !overlaps({ ...c, dx, dz }, p)));
        if (!spot) continue; // packed on its own later
        const b: Placed = { room: other, rot, ...spot, dx, dz };
        placed.set(other.id, b);
        comp.push(b);
        queue.push(b);
        tiedPairs.add([a.room.id, other.id].sort().join("|"));
      }
    }
    components.push(comp);
  }

  // Pack the components in rows, each one moved to start at (cursor, row).
  let cursorX = 0;
  let rowZ = 0;
  let rowDepth = 0;
  for (const comp of components) {
    const minX = Math.min(...comp.map((p) => p.x));
    const minZ = Math.min(...comp.map((p) => p.z));
    const w = Math.max(...comp.map((p) => p.x + p.dx)) - minX;
    const d = Math.max(...comp.map((p) => p.z + p.dz)) - minZ;
    if (maxRowFt && cursorX > 0 && cursorX + w > maxRowFt) {
      cursorX = 0;
      rowZ += rowDepth + GAP;
      rowDepth = 0;
    }
    for (const p of comp) {
      p.x += cursorX - minX;
      p.z += rowZ - minZ;
    }
    cursorX += w + GAP;
    rowDepth = Math.max(rowDepth, d);
  }
  const all = [...placed.values()];
  const tied = all.filter((p) => [...tiedPairs].some((k) => k.includes(p.room.id))).length;
  return { placed: all, tiedPairs, tied, packed: all.length - tied };
}

// ─── Walls with their openings ───────────────────────────────────────────────

interface Hole {
  type: OpeningType;
  width: number;
  height: number;
}

/** Holes of one wall, spread evenly; widths are shrunk when they would not fit. */
function spread(length: number, holes: Hole[]) {
  if (!holes.length) return [];
  const total = holes.reduce((s, h) => s + h.width, 0);
  const scale = total > length * 0.85 ? (length * 0.85) / total : 1;
  const gap = (length - total * scale) / (holes.length + 1);
  let u = gap;
  return holes.map((h) => {
    const at = { ...h, width: h.width * scale, u };
    u += h.width * scale + gap;
    return at;
  });
}

/**
 * Boxes of one straight wall from (x0, z0) running `length` ft along +x (`alongX`) or +z, `thick` ft
 * thick on the positive side, `height` ft tall from `baseY`: solid pieces around the holes, and a
 * door / glass panel in each hole.
 */
function wallWithHoles(out: Box[], floor: number, x0: number, z0: number, alongX: boolean, length: number, thick: number, baseY: number, height: number, holes: Hole[], kind: BoxKind = "wall") {
  const seg = (u: number, len: number, y: number, h: number, k: BoxKind, inset = 0, t = thick) => {
    if (len <= 0.001 || h <= 0.001) return;
    out.push(alongX ? { kind: k, x: x0 + u, y: baseY + y, z: z0 + inset, w: len, h, d: t, floor } : { kind: k, x: x0 + inset, y: baseY + y, z: z0 + u, w: t, h, d: len, floor });
  };
  let u = 0;
  for (const h of spread(length, holes)) {
    const sill = SILL[h.type](height, h.height);
    const top = Math.min(height, sill + h.height);
    seg(u, h.u - u, 0, height, kind);
    seg(h.u, h.width, 0, sill, kind);
    seg(h.u, h.width, top, height - top, kind);
    const panel = Math.min(thick, h.type === "DOOR" ? 0.15 : 0.08);
    seg(h.u, h.width, sill, top - sill, FILL[h.type], (thick - panel) / 2, panel);
    u = h.u + h.width;
  }
  seg(u, length - u, 0, height, kind);
}

const holesOf = (room: Room, side: WallSide) =>
  room.openings.filter((o) => o.side === side).flatMap((o) => Array.from({ length: Math.max(1, o.quantity) }, () => ({ type: o.type, width: o.widthFt, height: o.heightFt })));

/** Openings saved without a wall go on a sensible one: doors inside (shared / passage), windows outside. */
function unplacedSide(room: Room, type: OpeningType): WallSide {
  const walls = room.walls ?? [];
  const inner = walls.find((w) => w.type === "SHARED" || w.type === "PASSAGE")?.side;
  const outer = walls.find((w) => w.type === "EXTERNAL" || w.type === "DOUBLE" || w.type === "BOUNDARY")?.side;
  if (type === "DOOR") return inner ?? outer ?? "BOTTOM";
  return outer ?? walls.find((w) => w.type !== "OPEN")?.side ?? "TOP";
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

  const boxes: Box[] = [];
  const labels: RoomLabel[] = [];
  const floors: HouseFloor[] = [];
  let tied = 0;
  let packed = 0;

  // Plans first (to size the plot when it was not entered).
  const plans = floorsIn.map((fl) => placeRooms(fl.rooms, framed, input.frontFt ?? null));
  const outline = (pl: (typeof plans)[number]) =>
    pl.placed.length
      ? { minX: Math.min(...pl.placed.map((p) => p.x)), maxX: Math.max(...pl.placed.map((p) => p.x + p.dx)), minZ: Math.min(...pl.placed.map((p) => p.z)), maxZ: Math.max(...pl.placed.map((p) => p.z + p.dz)) }
      : null;
  const groundAt = floorsIn.findIndex((fl) => fl.level === "GROUND");
  const groundIdx = groundAt >= 0 ? groundAt : Math.max(0, floorsIn.findIndex((fl) => fl.level !== "BASEMENT"));
  const withRooms = plans[groundIdx]?.placed.length ? plans[groundIdx] : plans.find((p) => p.placed.length);
  const ref = withRooms ? outline(withRooms) : null;
  const houseW = ref ? ref.maxX - ref.minX : 20;
  const houseD = ref ? ref.maxZ - ref.minZ : 20;
  const frontFt = input.frontFt ?? Math.ceil(houseW + 10);
  const depthFt = input.depthFt ?? Math.ceil(houseD + 20);
  // The house sits centred across the plot, 5 ft from the back (the open space — lawn, porch — is at the road side).
  const back = Math.min(5, Math.max(0, depthFt - houseD - 1));

  // Floor heights: basement under the plinth, then each storey on the slab of the one below.
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

  /** Wall lines of the ground floor (whole length, holes ignored): the foundation runs under them. */
  const groundWalls: Array<{ x: number; z: number; alongX: boolean; length: number; thick: number }> = [];
  const columns = new Map<string, { x: number; z: number }>();
  let topRoof: { i: number; minX: number; maxX: number; minZ: number; maxZ: number; y: number } | null = null;

  plans.forEach((plan, i) => {
    const fl = floorsIn[i]!;
    const o = outline(plan);
    tied += plan.tied;
    packed += plan.packed;
    floors.push({ level: fl.level, name: fl.name, baseY: baseYs[i]!, heightFt: fl.ceilingHeightFt, rooms: fl.rooms.length });
    if (!o) return;
    // Upper floors line up with the ground floor's back-left corner; everything centred on the plot.
    const shiftX = (frontFt - houseW) / 2 - (ref?.minX ?? 0);
    const shiftZ = back - (ref?.minZ ?? 0);
    const baseY = baseYs[i]!;
    const floorBoxes: Box[] = [];
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

    for (const p of plan.placed) {
      const room = p.room;
      const rx = p.x + shiftX;
      const rz = p.z + shiftZ;
      const h = room.heightFt || fl.ceilingHeightFt;
      labels.push({ text: room.name, x: rx + p.dx / 2, y: baseY + 0.6, z: rz + p.dz / 2, floor: i });

      const sides: WallSide[] = ["TOP", "RIGHT", "BOTTOM", "LEFT"];
      const extraHoles = new Map<WallSide, Hole[]>();
      for (const op of room.openings.filter((x) => !x.side)) {
        const s = unplacedSide(room, op.type);
        extraHoles.set(s, [...(extraHoles.get(s) ?? []), ...Array.from({ length: Math.max(1, op.quantity) }, () => ({ type: op.type, width: op.widthFt, height: op.heightFt }))]);
      }
      for (const side of sides) {
        const w = room.walls?.find((x) => x.side === side);
        const t = thicknessOf(w, framed);
        if (t === 0) continue;
        const holes = [...holesOf(room, side), ...(extraHoles.get(side) ?? [])];
        if (w?.type === "SHARED" && w.sharedWithRoomId) {
          const pair = [room.id, w.sharedWithRoomId].sort().join("|");
          if (plan.tiedPairs.has(pair)) {
            if (room.id > w.sharedWithRoomId) continue; // the other room draws it, with these holes too
            const partner = fl.rooms.find((r) => r.id === w.sharedWithRoomId);
            if (partner && w.sharedWithSide) holes.push(...holesOf(partner, w.sharedWithSide));
          }
        }
        const d = dirOf(side, p.rot);
        // Walls wrap the room: N / S run along x (extended over the corners), E / W along z.
        const line =
          d === 0 ? { x: rx - t, z: rz - t, alongX: true, length: p.dx + 2 * t, thick: t }
          : d === 2 ? { x: rx - t, z: rz + p.dz, alongX: true, length: p.dx + 2 * t, thick: t }
          : d === 1 ? { x: rx + p.dx, z: rz, alongX: false, length: p.dz, thick: t }
          : { x: rx - t, z: rz, alongX: false, length: p.dz, thick: t };
        wallWithHoles(floorBoxes, i, line.x, line.z, line.alongX, line.length, t, baseY, h, holes);
        if (i === groundIdx) groundWalls.push(line);
        minX = Math.min(minX, rx - t);
        maxX = Math.max(maxX, rx + p.dx + t);
        minZ = Math.min(minZ, rz - t);
        maxZ = Math.max(maxZ, rz + p.dz + t);
      }
      minX = Math.min(minX, rx);
      maxX = Math.max(maxX, rx + p.dx);
      minZ = Math.min(minZ, rz);
      maxZ = Math.max(maxZ, rz + p.dz);

      // Stairs: steps of about 7″ rising along the room's longer side to the next floor.
      if (room.type === "STAIR") {
        const rise = fl.ceilingHeightFt + slabT(fl);
        const steps = Math.max(2, Math.round(rise / (7 * IN)));
        const runX = p.dx >= p.dz;
        const run = (runX ? p.dx : p.dz) / steps;
        const width = Math.min(runX ? p.dz : p.dx, 4);
        for (let s = 0; s < steps; s++) {
          floorBoxes.push(
            runX
              ? { kind: "stair", x: rx + s * run, y: baseY, z: rz, w: run, h: (rise * (s + 1)) / steps, d: width, floor: i }
              : { kind: "stair", x: rx, y: baseY, z: rz + s * run, w: width, h: (rise * (s + 1)) / steps, d: run, floor: i },
          );
        }
      }
      // Columns of a framed house at the room corners (one per corner, shared corners once).
      if (framed && fl.level !== "MUMTY") {
        for (const [cx, cz] of [[rx, rz], [rx + p.dx, rz], [rx, rz + p.dz], [rx + p.dx, rz + p.dz]] as const) {
          columns.set(`${i}:${Math.round(cx)}:${Math.round(cz)}`, { x: cx, z: cz });
        }
      }
    }
    for (const [key, c] of columns) {
      if (!key.startsWith(`${i}:`)) continue;
      const cw = (fl.roof?.columnWidthIn ?? 9) * IN + 2 * IN;
      floorBoxes.push({ kind: "column", x: c.x - cw / 2, y: baseY, z: c.z - cw / 2, w: cw, h: fl.ceilingHeightFt, d: cw, floor: i });
    }

    // Slab (lenter) over the floor.
    const t = slabT(fl);
    floorBoxes.push({ kind: "slab", x: minX, y: baseY + fl.ceilingHeightFt, z: minZ, w: maxX - minX, h: t, d: maxZ - minZ, floor: i });
    if (fl.level !== "BASEMENT" && fl.level !== "MUMTY" && (!topRoof || baseY > topRoof.y)) topRoof = { i, minX, maxX, minZ, maxZ, y: baseY + fl.ceilingHeightFt + t };
    boxes.push(...floorBoxes);
  });

  // Parapet (mundair) round the top roof.
  if (topRoof) {
    const r = topRoof as { i: number; minX: number; maxX: number; minZ: number; maxZ: number; y: number };
    const ph = input.parapetHeightFt ?? PARAPET_FT;
    const t = PARAPET_THICK;
    boxes.push(
      { kind: "parapet", x: r.minX, y: r.y, z: r.minZ, w: r.maxX - r.minX, h: ph, d: t, floor: r.i },
      { kind: "parapet", x: r.minX, y: r.y, z: r.maxZ - t, w: r.maxX - r.minX, h: ph, d: t, floor: r.i },
      { kind: "parapet", x: r.minX, y: r.y, z: r.minZ, w: t, h: ph, d: r.maxZ - r.minZ, floor: r.i },
      { kind: "parapet", x: r.maxX - t, y: r.y, z: r.minZ, w: t, h: ph, d: r.maxZ - r.minZ, floor: r.i },
    );
  }

  // Foundation under the ground floor walls (or the basement's), plinth and DPC.
  const bottom = -fnd.depth;
  const gFloor = floorsIn[groundIdx];
  const footprint = boxes.filter((b) => b.kind === "slab" && b.floor === groundIdx)[0];
  if (gFloor && footprint) {
    const plinthTop = fnd.plinth;
    for (const w of groundWalls) {
      const { alongX, thick } = w;
      const len = w.length;
      const cx = alongX ? w.x : w.x + thick / 2;
      const cz = alongX ? w.z + thick / 2 : w.z;
      const band = (kind: BoxKind, width: number, y0: number, h: number) =>
        boxes.push(alongX ? { kind, x: cx, y: y0, z: cz - width / 2, w: len, h, d: width, floor: null } : { kind, x: cx - width / 2, y: y0, z: cz, w: width, h, d: len, floor: null });
      if (fnd.type === "STRIP") {
        band("pcc", fnd.footingW + 0.5, bottom, fnd.pcc);
        band("footing", fnd.footingW, bottom + fnd.pcc, fnd.footingT);
        band("foundationWall", thick + 4.5 * IN, bottom + fnd.pcc + fnd.footingT, plinthTop - fnd.dpc - (bottom + fnd.pcc + fnd.footingT));
      } else {
        band("foundationWall", thick, fnd.type === "RAFT" ? bottom + fnd.pcc + fnd.footingT : -1, plinthTop - fnd.dpc - (fnd.type === "RAFT" ? bottom + fnd.pcc + fnd.footingT : -1));
        if (fnd.type !== "RAFT") band("plinthBeam", thick, plinthTop - fnd.dpc - 1, 1);
      }
      band("dpc", thick, plinthTop - fnd.dpc, fnd.dpc);
    }
    if (fnd.type === "RAFT") {
      boxes.push({ kind: "pcc", x: footprint.x - 0.5, y: bottom, z: footprint.z - 0.5, w: footprint.w + 1, h: fnd.pcc, d: footprint.d + 1, floor: null });
      boxes.push({ kind: "raft", x: footprint.x, y: bottom + fnd.pcc, z: footprint.z, w: footprint.w, h: fnd.footingT, d: footprint.d, floor: null });
    }
    if (fnd.type === "ISOLATED" || fnd.type === "COMBINED" || fnd.type === "PILE") {
      for (const [key, c] of columns) {
        if (!key.startsWith(`${groundIdx}:`)) continue;
        if (fnd.type === "PILE") {
          boxes.push({ kind: "pile", x: c.x - fnd.pileD / 2, y: bottom - fnd.pileDepth, z: c.z - fnd.pileD / 2, w: fnd.pileD, h: fnd.pileDepth, d: fnd.pileD, floor: null });
          boxes.push({ kind: "footing", x: c.x - 1.5, y: bottom, z: c.z - 1.5, w: 3, h: fnd.footingT, d: 3, floor: null });
        } else {
          const pw = fnd.footingW || 4;
          boxes.push({ kind: "pcc", x: c.x - fnd.padL / 2 - 0.25, y: bottom, z: c.z - pw / 2 - 0.25, w: fnd.padL + 0.5, h: fnd.pcc, d: pw + 0.5, floor: null });
          boxes.push({ kind: "footing", x: c.x - fnd.padL / 2, y: bottom + fnd.pcc, z: c.z - pw / 2, w: fnd.padL, h: fnd.footingT, d: pw, floor: null });
        }
        const cw = 12 * IN;
        boxes.push({ kind: "column", x: c.x - cw / 2, y: bottom + fnd.pcc + fnd.footingT, z: c.z - cw / 2, w: cw, h: plinthTop - (bottom + fnd.pcc + fnd.footingT), d: cw, floor: null });
      }
    }
    // Earth filled inside the plinth, under each ground floor room.
    for (const b of boxes.filter((x) => x.kind === "slab" && x.floor === groundIdx)) {
      boxes.push({ kind: "plinthFill", x: b.x + 0.4, y: 0, z: b.z + 0.4, w: b.w - 0.8, h: plinthTop - 0.05, d: b.d - 0.8, floor: null });
    }
  }

  // Boundary wall with a gate in the middle of the front.
  if (input.coverage?.boundaryWall) {
    const h = input.coverage.boundaryHeightFt ?? 7;
    const t = (input.coverage.boundaryThickness === "IN_4_5" ? 4.5 : 9) * IN;
    const gate = Math.min(12, frontFt / 3);
    const g0 = (frontFt - gate) / 2;
    boxes.push(
      { kind: "boundary", x: 0, y: 0, z: 0, w: frontFt, h, d: t, floor: null },
      { kind: "boundary", x: 0, y: 0, z: 0, w: t, h, d: depthFt, floor: null },
      { kind: "boundary", x: frontFt - t, y: 0, z: 0, w: t, h, d: depthFt, floor: null },
      { kind: "boundary", x: 0, y: 0, z: depthFt - t, w: g0, h, d: t, floor: null },
      { kind: "boundary", x: g0 + gate, y: 0, z: depthFt - t, w: frontFt - g0 - gate, h, d: t, floor: null },
    );
  }

  boxes.push({ kind: "ground", x: -5, y: -0.05, z: -5, w: frontFt + 10, h: 0.05, d: depthFt + 10, floor: null });

  const bounds = boxes.reduce(
    (acc, b) => ({
      minX: Math.min(acc.minX, b.x),
      maxX: Math.max(acc.maxX, b.x + b.w),
      minY: Math.min(acc.minY, b.y),
      maxY: Math.max(acc.maxY, b.y + b.h),
      minZ: Math.min(acc.minZ, b.z),
      maxZ: Math.max(acc.maxZ, b.z + b.d),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity },
  );
  return { boxes, labels, floors, plot: { frontFt, depthFt, known }, bounds, placement: { tied, packed } };
}
