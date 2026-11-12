import { describe, expect, it } from "vitest";
import type { FloorWithRooms, Room, RoomWall, WallSide } from "@/api/types";
import { buildHouse, placeRooms } from "@/lib/house3d/layout";

const wall = (side: WallSide, type: RoomWall["type"] = "EXTERNAL", partner?: { id: string; side: WallSide }): RoomWall => ({
  side,
  type,
  thicknessIn: null,
  innerLeafIn: null,
  cavityIn: null,
  sharedWithRoomId: partner?.id ?? null,
  sharedWithSide: partner?.side ?? null,
  existing: false,
});

const room = (id: string, name: string, lengthFt: number, widthFt: number, extra: Partial<Room> = {}): Room => ({
  id,
  floorId: "f1",
  type: "BEDROOM",
  name,
  lengthFt,
  widthFt,
  heightFt: 10,
  isWet: false,
  isWetOverridden: false,
  sortOrder: 0,
  openings: [],
  walls: null,
  calculations: { floorAreaSqft: 0, grossWallAreaSqft: 0, netWallAreaSqft: 0, openingsAreaSqft: 0 },
  ...extra,
});

const floor = (level: FloorWithRooms["level"], rooms: Room[], extra: Partial<FloorWithRooms> = {}): FloorWithRooms => ({
  id: `fl-${level}`,
  level,
  name: level,
  ceilingHeightFt: 10,
  sortOrder: 0,
  roof: null,
  calculations: { rooms: rooms.length, totalFloorAreaSqft: 0, netWallAreaSqft: 0, wetRooms: 0 },
  rooms,
  ...extra,
});

// Bedroom (12 × 10) shares its RIGHT wall with the lounge's LEFT wall.
const bedroom = room("a", "Bedroom", 12, 10, {
  sortOrder: 0,
  walls: [wall("TOP"), wall("RIGHT", "SHARED", { id: "b", side: "LEFT" }), wall("BOTTOM"), wall("LEFT")],
  openings: [
    { id: "o1", type: "WINDOW", widthFt: 4, heightFt: 4, quantity: 1, side: "TOP" },
    { id: "o2", type: "DOOR", widthFt: 3, heightFt: 7, quantity: 1, side: "RIGHT" },
  ],
});
const lounge = room("b", "Lounge", 16, 14, {
  sortOrder: 1,
  walls: [wall("TOP"), wall("RIGHT"), wall("BOTTOM"), wall("LEFT", "SHARED", { id: "a", side: "RIGHT" })],
});

describe("house 3D: placing rooms", () => {
  it("a room sharing a wall sits right next to it, the shared wall's thickness apart", () => {
    const { placed, tied, packed } = placeRooms([bedroom, lounge], true, null);
    const a = placed.find((p) => p.room.id === "a")!;
    const b = placed.find((p) => p.room.id === "b")!;
    expect(b.x).toBeCloseTo(a.x + 12 + 4.5 / 12);
    expect(b.z).toBe(a.z);
    expect({ tied, packed }).toEqual({ tied: 2, packed: 0 });
  });

  it("a partner side that does not face it turns the other room", () => {
    // The lounge's TOP is the shared side: it is turned so its TOP faces the bedroom (west).
    const turned = room("b", "Lounge", 16, 14, { walls: [wall("TOP", "SHARED", { id: "a", side: "RIGHT" }), wall("RIGHT"), wall("BOTTOM"), wall("LEFT")] });
    const a2 = { ...bedroom, walls: [wall("TOP"), wall("RIGHT", "SHARED", { id: "b", side: "TOP" }), wall("BOTTOM"), wall("LEFT")] };
    const b = placeRooms([a2, turned], true, null).placed.find((p) => p.room.id === "b")!;
    expect(b.rot % 2).toBe(1);
    expect([b.dx, b.dz]).toEqual([14, 16]);
  });

  it("rooms tied to nothing are packed in rows within the plot front", () => {
    const rooms = [room("x", "A", 20, 10), room("y", "B", 20, 10, { sortOrder: 1 }), room("z", "C", 20, 10, { sortOrder: 2 })];
    const { placed, packed } = placeRooms(rooms, true, 45);
    expect(packed).toBe(3);
    const zs = placed.map((p) => p.z);
    expect(new Set(zs).size).toBe(2); // two in the first row, one in the second
  });
});

describe("house 3D: the model", () => {
  const model = buildHouse({
    frontFt: 35,
    depthFt: 70,
    structureType: "FRAMED",
    foundation: null,
    coverage: { boundaryWall: true, boundaryHeightFt: 7, boundaryThickness: "IN_9" },
    floors: [floor("GROUND", [bedroom, lounge]), floor("FIRST", [room("c", "Upstairs", 12, 10)])],
  });

  it("floors stack: ground on the plinth, first on the ground floor slab", () => {
    expect(model.floors.map((f) => f.level)).toEqual(["GROUND", "FIRST"]);
    expect(model.floors[0]!.baseY).toBeCloseTo(1.5);
    expect(model.floors[1]!.baseY).toBeCloseTo(1.5 + 10 + 5 / 12);
  });

  it("doors and windows are holes in the walls with a panel in them; rooms saved without any get a standard pair", () => {
    const kinds = model.boxes.map((b) => b.kind);
    // Bedroom: its own window + door; lounge and the upstairs room: an assumed door + window each.
    expect(kinds.filter((k) => k === "window")).toHaveLength(3);
    expect(kinds.filter((k) => k === "door")).toHaveLength(3);
    expect(model.placement.assumed).toBe(2);
    const win = model.boxes.find((b) => b.kind === "window")!;
    expect(win.y).toBeCloseTo(1.5 + 3); // sill 3 ft above the floor
    expect(win.h).toBeCloseTo(4);
    // The shared wall is drawn once (by one room), with the bedroom's door in it.
    const door = model.boxes.find((b) => b.kind === "door")!;
    expect(door.h).toBeCloseTo(7);
  });

  it("foundation below the ground, plinth and DPC, slab, parapet and the boundary wall with a gate", () => {
    const of = (k: string) => model.boxes.filter((b) => b.kind === k);
    expect(of("footing").length).toBeGreaterThan(0);
    expect(Math.min(...of("pcc").map((b) => b.y))).toBeCloseTo(-4);
    expect(of("dpc").every((b) => Math.abs(b.y + b.h - 1.5) < 0.01)).toBe(true);
    expect(of("slab")).toHaveLength(2);
    expect(of("parapet")).toHaveLength(4);
    expect(of("boundary")).toHaveLength(5);
    expect(of("column").length).toBeGreaterThan(0);
    expect(model.bounds.minY).toBeLessThan(0);
    expect(model.labels.map((l) => l.text)).toEqual(["Bedroom", "Lounge", "Upstairs"]);
  });

  it("no plot size: the plot is sized round the house; no rooms: just the ground", () => {
    const loose = buildHouse({ frontFt: null, depthFt: null, structureType: "LOAD_BEARING", foundation: null, coverage: null, floors: [floor("GROUND", [room("x", "A", 20, 15)])] });
    expect(loose.plot.known).toBe(false);
    expect(loose.plot.frontFt).toBeGreaterThan(20);
    expect(loose.boxes.some((b) => b.kind === "column")).toBe(false);
    const empty = buildHouse({ frontFt: 30, depthFt: 60, structureType: "FRAMED", foundation: null, coverage: null, floors: [] });
    expect(empty.boxes.map((b) => b.kind)).toEqual(["ground", "road"]);
  });
});

describe("house 3D: no shared walls entered (the usual case)", () => {
  const rows = buildHouse({
    frontFt: 35,
    depthFt: 65,
    structureType: "FRAMED",
    foundation: null,
    coverage: { boundaryWall: true, boundaryHeightFt: 7, boundaryThickness: "IN_9" },
    floors: [
      floor("GROUND", [
        room("d", "Drawing", 16, 14, { type: "DRAWING_ROOM", sortOrder: 0 }),
        room("m", "Master", 16, 14, { type: "MASTER_BEDROOM", sortOrder: 1 }),
        room("b", "Bath", 8, 6, { type: "ATTACHED_BATH", sortOrder: 2 }),
        room("k", "Kitchen", 12, 10, { type: "KITCHEN", sortOrder: 3 }),
      ]),
    ],
  });

  it("one closed block the plot's width: bedrooms at the back, the drawing room at the road side", () => {
    const labelOf = (name: string) => rows.labels.find((l) => l.text === name)!;
    expect(labelOf("Master").z).toBeLessThan(labelOf("Kitchen").z);
    expect(labelOf("Kitchen").z).toBeLessThan(labelOf("Drawing").z);
    const walls = rows.boxes.filter((b) => b.kind === "wall");
    expect(Math.min(...walls.map((w) => w.x))).toBeCloseTo(0);
    expect(Math.max(...walls.map((w) => w.x + w.w))).toBeCloseTo(35);
  });

  it("walls are not doubled, there is a main door at the front, and the boundary wall stops where the house stands", () => {
    const walls = rows.boxes.filter((b) => b.kind === "wall");
    const keys = walls.map((w) => [w.x, w.y, w.z, w.w, w.h, w.d].map((v) => v.toFixed(2)).join(","));
    expect(new Set(keys).size).toBe(keys.length);
    const doors = rows.boxes.filter((b) => b.kind === "door");
    const front = Math.max(...walls.map((w) => w.z + w.d));
    expect(doors.some((d) => Math.abs(d.z + d.d / 2 - (front - 9 / 24)) < 0.2)).toBe(true);
    // The house is the plot's full width, so the side boundary walls run only beside the open parts.
    const sideWalls = rows.boxes.filter((b) => b.kind === "boundary" && b.w < 1);
    expect(sideWalls.length).toBeGreaterThan(0);
    expect(sideWalls.every((b) => b.z + b.d <= Math.min(...walls.map((w) => w.z)) + 0.01 || b.z >= front - 0.01)).toBe(true);
  });
});

describe("house 3D: the structure follows the setup", () => {
  const rooms = [room("d", "Drawing", 16, 14, { type: "DRAWING_ROOM" }), room("m", "Master", 16, 14, { type: "MASTER_BEDROOM", sortOrder: 1 }), room("k", "Kitchen", 12, 10, { type: "KITCHEN", sortOrder: 2 })];
  const fnd = (over: Record<string, unknown>) =>
    ({ type: "ISOLATED", excavationDepthFt: 5, footingWidthFt: 4, footingThicknessIn: 15, plinthHeightFt: 2, dpcThicknessIn: 1.5, footingCount: 9, footingLengthFt: 4, pileCount: null, pileDiameterIn: null, pileDepthFt: null, masonry: "BRICK", pccMix: "1:4:8", pccThicknessIn: 3, ...over }) as never;
  const house = (foundation: never, roof: Record<string, unknown> | null = null) =>
    buildHouse({ frontFt: 35, depthFt: 65, structureType: "FRAMED", foundation, coverage: null, floors: [floor("GROUND", rooms, { roof: roof as never })] });

  it("isolated: as many footings as entered, at the depth entered, each with its name", () => {
    const m = house(fnd({}));
    const pads = m.boxes.filter((b) => b.kind === "footing");
    expect(pads).toHaveLength(9);
    expect(pads.map((p) => p.part)).toEqual(Array.from({ length: 9 }, (_, k) => `F-${k + 1}`));
    expect(Math.min(...m.boxes.filter((b) => b.kind === "pcc").map((b) => b.y))).toBeCloseTo(-5);
    expect(m.structure.foundation).toMatchObject({ type: "ISOLATED", depthFt: 5, footings: 9, piles: 0 });
    expect(m.structure.foundation.plinthBeamFt).toBeGreaterThan(0);
  });

  it("pile: as many piles as entered; strip: footings run under the walls (no pads)", () => {
    const piles = house(fnd({ type: "PILE", pileCount: 14, pileDiameterIn: 18, pileDepthFt: 25 }));
    expect(piles.boxes.filter((b) => b.kind === "pile")).toHaveLength(14);
    const strip = house(fnd({ type: "STRIP", footingCount: null }));
    expect(strip.structure.foundation.footings).toBe(0);
    expect(strip.boxes.filter((b) => b.kind === "footing").every((b) => !b.part)).toBe(true);
  });

  it("columns: the count and size on the roof card; a beam on every wall line under the slab", () => {
    const m = house(fnd({}), { columnCount: 10, columnWidthIn: 12, columnDepthIn: 18, beamWidthIn: 9, beamDepthIn: 15 });
    const cols = m.boxes.filter((b) => b.kind === "column" && b.floor === 0);
    expect(cols).toHaveLength(10);
    expect(cols[0]!.part).toBe("G-C1");
    expect([cols[0]!.w, cols[0]!.d]).toEqual([1, 1.5]);
    const beams = m.boxes.filter((b) => b.kind === "beam");
    expect(beams.length).toBeGreaterThan(4);
    expect(beams.every((b) => Math.abs(b.y + b.h - (2 + 10)) < 0.01 && Math.abs(b.h - 15 / 12) < 0.01)).toBe(true);
    expect(m.structure.floors[0]).toMatchObject({ columns: 10, columnSizeIn: "12×18", beamSizeIn: "9×15" });
  });
});

describe("house 3D: columns keep out of doors and windows", () => {
  it("no column stands in a door or window opening", () => {
    const withOpenings = (r: Room): Room => ({
      ...r,
      openings: [
        { id: `${r.id}-d`, type: "DOOR", widthFt: 3, heightFt: 7, quantity: 1, side: null },
        { id: `${r.id}-w`, type: "WINDOW", widthFt: 5, heightFt: 4, quantity: 2, side: null },
      ],
    });
    const m = buildHouse({
      frontFt: 35,
      depthFt: 65,
      structureType: "FRAMED",
      foundation: null,
      coverage: null,
      floors: [
        floor("GROUND", [room("d", "Drawing", 16, 14, { type: "DRAWING_ROOM" }), room("m", "Master", 16, 14, { type: "MASTER_BEDROOM", sortOrder: 1 }), room("k", "Kitchen", 12, 10, { type: "KITCHEN", sortOrder: 2 })].map(withOpenings), {
          roof: { columnCount: 16 } as never,
        }),
      ],
    });
    const hit = (a: { x: number; z: number; w: number; d: number }, b: { x: number; z: number; w: number; d: number }) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;
    const columns = m.boxes.filter((b) => b.kind === "column" && b.floor === 0);
    const openings = m.boxes.filter((b) => (b.kind === "door" || b.kind === "window") && b.floor === 0);
    expect(columns.length).toBeGreaterThan(4);
    expect(columns.filter((c) => openings.some((o) => hit(c, o)))).toEqual([]);
  });
});
