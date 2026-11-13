"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { PART_COLOR } from "@/lib/house3d/colors";
import type { BoxKind, HouseModel } from "@/lib/house3d/layout";

const GLASS = new Set<BoxKind>(["window", "ventilator"]);
/** Below the ground: shown with "Foundation". */
const FOUNDATION = new Set<BoxKind>(["pcc", "footing", "foundationWall", "raft", "pile", "plinthFill", "plinthBeam"]);
const ROOF = new Set<BoxKind>(["slab", "parapet"]);
/** Masonry and its openings: hidden with "Walls" off, so the frame (columns, beams, slabs) shows. */
const WALLISH = new Set<BoxKind>(["wall", "door", "window", "ventilator", "frame", "chajja", "parapet"]);
const SITE = new Set<BoxKind>(["ground", "road", "paving"]);
const NO_SHADOW = new Set<BoxKind>(["ground", "road", "paving", "floorFinish", "wetFloor", "window", "ventilator"]);
const ROUGHNESS: Partial<Record<BoxKind, number>> = { window: 0.08, ventilator: 0.1, door: 0.6, frame: 0.5, road: 0.95, ground: 1 };

export interface ViewOptions {
  /** "all": the house up to floor `upTo`; "foundation": the foundation alone; a number: that floor alone. */
  show: "all" | "foundation" | number;
  /** Floors shown with show "all": index into model.floors, up to and including this one. */
  upTo: number;
  foundation: boolean;
  walls: boolean;
  roofs: boolean;
  boundary: boolean;
  labels: boolean;
}

export type CameraView = "corner" | "top" | "front";

/** Progress colours: done = green, in progress = amber (the rest keeps its material colour). */
export const PROGRESS_COLOR = { DONE: "#2f9e5b", IN_PROGRESS: "#e2a72e" } as const;
export type PartProgress = Record<string, keyof typeof PROGRESS_COLOR>;
/** Takes a picture of the scene as it is shown (JPEG data URL), or null when WebGL failed. */
export type Capture = (options?: ViewOptions) => string | null;

/** A soft sky: light at the horizon, blue above. */
function skyTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#8fb6dc");
    grad.addColorStop(0.65, "#dbe8f2");
    grad.addColorStop(1, "#f3efe7");
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * The 3D scene of a house model (three.js): orbit with the mouse / a finger, scroll or pinch to zoom.
 * Rebuilt when the model changes; the options only switch parts on / off.
 */
export function House3DCanvas({
  model,
  options,
  view,
  viewKey,
  onUnsupported,
  describe,
  className,
  progress,
  onPick,
  captureRef,
}: {
  model: HouseModel;
  options: ViewOptions;
  view: CameraView;
  /** Bump to move the camera to `view` again. */
  viewKey: number;
  onUnsupported: () => void;
  /** Text shown when hovering a structural member, e.g. "Column G-C4". */
  describe?: (kind: BoxKind, part: string) => string;
  className?: string;
  /** Colour the parts by their progress (done / in progress); undefined = the normal colours. */
  progress?: PartProgress;
  /** A click (not a drag) on a named part. */
  onPick?: (part: string, kind: BoxKind) => void;
  /** Filled with a function that takes a picture of the scene (the project file). */
  captureRef?: MutableRefObject<Capture | null>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const apply = useRef<((o: ViewOptions) => void) | null>(null);
  const moveCamera = useRef<((v: CameraView) => void) | null>(null);
  const latest = useRef(options);
  const describeRef = useRef(describe);
  const pickRef = useRef(onPick);
  const paint = useRef<((p: PartProgress | undefined) => void) | null>(null);
  const progressRef = useRef(progress);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      // preserveDrawingBuffer: the picture for the project file reads the canvas after a render.
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch {
      onUnsupported();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const labelRenderer = new CSS2DRenderer();
    Object.assign(labelRenderer.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
    el.appendChild(labelRenderer.domElement);

    const b = model.bounds;
    const centre = new THREE.Vector3((b.minX + b.maxX) / 2, Math.max(0, b.maxY) / 3, (b.minZ + b.maxZ) / 2);
    const radius = Math.max(15, Math.hypot(b.maxX - b.minX, Math.max(b.maxY, 0) - Math.min(b.minY, 0), b.maxZ - b.minZ) / 2);

    const scene = new THREE.Scene();
    const sky = skyTexture();
    scene.background = sky;
    scene.fog = new THREE.Fog(0xe9eef2, radius * 5, radius * 14);
    scene.add(new THREE.HemisphereLight(0xdfeeff, 0x8a7a63, 1.0));
    const sun = new THREE.DirectionalLight(0xfff3e0, 2.2);
    sun.position.set(centre.x - radius * 1.2, radius * 2.2, centre.z + radius * 1.6);
    sun.target.position.copy(centre);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const sc = sun.shadow.camera;
    sc.left = -radius * 1.3;
    sc.right = radius * 1.3;
    sc.top = radius * 1.3;
    sc.bottom = -radius * 1.3;
    sc.near = 1;
    sc.far = radius * 6;
    sun.shadow.bias = -0.002;
    sun.shadow.normalBias = 0.45;
    scene.add(sun, sun.target);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.3, radius * 30);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49 + (model.bounds.minY < 0 ? 0.35 : 0);
    controls.minDistance = 5;
    controls.maxDistance = radius * 8;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const materials = new Map<BoxKind, THREE.MeshStandardMaterial>();
    const materialOf = (kind: BoxKind) => {
      let m = materials.get(kind);
      if (!m) {
        m = new THREE.MeshStandardMaterial({
          // With the walls on, columns and beams are plastered like the wall: no stripes on the face.
          color: PART_COLOR[kind],
          roughness: ROUGHNESS[kind] ?? 0.88,
          metalness: GLASS.has(kind) ? 0.1 : 0,
          transparent: GLASS.has(kind) || kind === "ground" || kind === "plinthFill",
          // The plinth fill is see-through, so the footings and beams under it can be counted.
          opacity: GLASS.has(kind) ? 0.4 : kind === "plinthFill" ? 0.35 : 1,
          depthWrite: kind !== "plinthFill",
          // Closed boxes: casting from the back faces stops the speckled self-shadow on walls.
          shadowSide: THREE.BackSide,
        });
        materials.set(kind, m);
      }
      return m;
    };
    const groundMaterial = materialOf("ground");

    const list: { object: THREE.Object3D; kind: BoxKind | "label"; floor: number | null }[] = [];
    const parts: Array<{ mesh: THREE.Mesh; kind: BoxKind; part: string }> = [];
    const progressMaterials = new Map<string, THREE.MeshStandardMaterial>();
    const progressMaterial = (status: keyof typeof PROGRESS_COLOR) => {
      let m = progressMaterials.get(status);
      if (!m) {
        m = new THREE.MeshStandardMaterial({ color: PROGRESS_COLOR[status], roughness: 0.7, shadowSide: THREE.BackSide });
        progressMaterials.set(status, m);
      }
      return m;
    };
    for (const box of model.boxes) {
      const mesh = new THREE.Mesh(geometry, materialOf(box.kind));
      mesh.scale.set(Math.max(box.w, 0.01), Math.max(box.h, 0.01), Math.max(box.d, 0.01));
      mesh.position.set(box.x + box.w / 2, box.y + box.h / 2, box.z + box.d / 2);
      mesh.castShadow = !NO_SHADOW.has(box.kind);
      mesh.receiveShadow = !GLASS.has(box.kind);
      scene.add(mesh);
      if (box.part) {
        mesh.userData = { kind: box.kind, part: box.part };
        parts.push({ mesh, kind: box.kind, part: box.part });
      }
      list.push({ object: mesh, kind: box.kind, floor: box.floor });
    }
    for (const l of model.labels) {
      const tag = document.createElement("span");
      tag.textContent = l.text;
      Object.assign(tag.style, {
        background: "rgba(255,255,255,0.88)",
        color: "#1f2328",
        font: "500 11px system-ui, sans-serif",
        padding: "2px 6px",
        borderRadius: "6px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
        whiteSpace: "nowrap",
      });
      const obj = new CSS2DObject(tag);
      obj.position.set(l.x, l.y, l.z);
      scene.add(obj);
      list.push({ object: obj, kind: "label", floor: l.floor });
    }

    apply.current = (o: ViewOptions) => {
      for (const p of list) {
        let visible: boolean;
        if (p.kind === "label") {
          const floorOn = o.show === "all" ? p.floor === o.upTo : p.floor === o.show;
          visible = o.labels && floorOn && !o.roofs;
        } else if (o.show === "foundation") {
          // The foundation alone: nothing of the house above, no ground, road or boundary wall.
          visible = p.floor === null && !SITE.has(p.kind as BoxKind) && p.kind !== "boundary";
        } else if (typeof o.show === "number") {
          // One floor alone.
          visible = p.floor === o.show && (o.walls || !WALLISH.has(p.kind as BoxKind)) && (o.roofs || !ROOF.has(p.kind as BoxKind));
        } else {
          const floorShown = p.floor === null || p.floor <= o.upTo;
          visible = floorShown;
          if (FOUNDATION.has(p.kind as BoxKind)) visible = o.foundation;
          else if (p.kind === "boundary") visible = o.boundary;
          else if (ROOF.has(p.kind as BoxKind)) visible = floorShown && (o.roofs || p.floor! < o.upTo) && (o.walls || p.kind !== "parapet");
          else if (WALLISH.has(p.kind as BoxKind)) visible = floorShown && o.walls;
        }
        p.object.visible = visible;
      }
      const frameColor = o.walls ? PART_COLOR.wall : PART_COLOR.column;
      materialOf("column").color.set(frameColor);
      materialOf("beam").color.set(o.walls ? PART_COLOR.wall : PART_COLOR.beam);
      const seeThrough = o.show === "foundation" || (o.show === "all" && o.foundation);
      groundMaterial.opacity = seeThrough ? 0.3 : 1;
      groundMaterial.depthWrite = !seeThrough;
      // A new part chosen: the camera goes to it.
      const key = String(o.show);
      if (key !== shownKey) {
        shownKey = key;
        focus = focusOf(o.show);
        moveCamera.current?.(lastView);
      }
    };

    /** Centre and size of what is shown: the whole house, the foundation or one floor. */
    const focusOf = (show: ViewOptions["show"]) => {
      const part = model.boxes.filter((x) =>
        show === "all" ? !SITE.has(x.kind) : show === "foundation" ? x.floor === null && !SITE.has(x.kind) && x.kind !== "boundary" : x.floor === show,
      );
      if (!part.length) return { centre, radius };
      const lo = new THREE.Vector3(Math.min(...part.map((x) => x.x)), Math.min(...part.map((x) => x.y)), Math.min(...part.map((x) => x.z)));
      const hi = new THREE.Vector3(Math.max(...part.map((x) => x.x + x.w)), Math.max(...part.map((x) => x.y + x.h)), Math.max(...part.map((x) => x.z + x.d)));
      const c = lo.clone().add(hi).multiplyScalar(0.5);
      if (show === "all") c.y = Math.max(0, hi.y) / 3;
      return { centre: c, radius: Math.max(10, lo.distanceTo(hi) / 2) };
    };
    let shownKey = String(latest.current.show);
    let focus = focusOf(latest.current.show);
    let lastView: CameraView = "corner";

    moveCamera.current = (v: CameraView) => {
      lastView = v;
      const { centre: c, radius: r } = focus;
      const dist = r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
      controls.target.copy(c);
      if (v === "top") camera.position.set(c.x, c.y + dist * 1.05, c.z + 0.01);
      else if (v === "front") camera.position.set(c.x, c.y + r * 0.25, c.z + dist * 1.05);
      else camera.position.copy(c).add(new THREE.Vector3(0.62, 0.48, 0.62).normalize().multiplyScalar(dist * 0.95));
      controls.update();
    };
    apply.current(latest.current);
    moveCamera.current("corner");

    paint.current = (p: PartProgress | undefined) => {
      for (const x of parts) {
        const status = p?.[x.part];
        x.mesh.material = status ? progressMaterial(status) : materialOf(x.kind);
      }
    };
    paint.current(progressRef.current);

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(el);

    // Hover a column / beam / footing: its name.
    const tip = document.createElement("div");
    Object.assign(tip.style, { position: "absolute", pointerEvents: "none", display: "none", background: "rgba(20,22,26,0.88)", color: "#fff", font: "500 12px system-ui, sans-serif", padding: "3px 8px", borderRadius: "6px", whiteSpace: "nowrap" });
    el.appendChild(tip);
    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(scene.children, false).find((h) => h.object.visible && (h.object as THREE.Mesh).isMesh);
      const data = hit?.object.userData as { kind?: BoxKind; part?: string } | undefined;
      if (data?.part && data.kind && describeRef.current) {
        tip.textContent = describeRef.current(data.kind, data.part);
        tip.style.left = `${e.clientX - rect.left + 12}px`;
        tip.style.top = `${e.clientY - rect.top + 12}px`;
        tip.style.display = "block";
      } else tip.style.display = "none";
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      const start = down;
      down = null;
      if (!start || !pickRef.current || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(scene.children, false).find((h) => h.object.visible && (h.object as THREE.Mesh).isMesh && (h.object.userData as { part?: string }).part);
      const data = hit?.object.userData as { kind?: BoxKind; part?: string } | undefined;
      if (data?.part && data.kind) pickRef.current(data.part, data.kind);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    if (captureRef) {
      captureRef.current = (o?: ViewOptions) => {
        if (o) {
          apply.current?.(o);
          moveCamera.current?.(lastView);
        }
        controls.update();
        renderer.render(scene, camera);
        const url = renderer.domElement.toDataURL("image/jpeg", 0.85);
        if (o) apply.current?.(latest.current);
        return url;
      };
    }

    let frame = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      if (captureRef) captureRef.current = null;
      for (const m of progressMaterials.values()) m.dispose();
      paint.current = null;
      observer?.disconnect();
      controls.dispose();
      geometry.dispose();
      sky.dispose();
      for (const m of materials.values()) m.dispose();
      renderer.dispose();
      el.replaceChildren();
      apply.current = null;
      moveCamera.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- captureRef is a stable ref object
  }, [model, onUnsupported]);

  useEffect(() => {
    describeRef.current = describe;
  }, [describe]);

  useEffect(() => {
    pickRef.current = onPick;
  }, [onPick]);

  // Colour by progress.
  useEffect(() => {
    progressRef.current = progress;
    paint.current?.(progress);
  }, [progress]);

  // Switch parts on / off.
  useEffect(() => {
    latest.current = options;
    apply.current?.(options);
  }, [options]);

  useEffect(() => {
    if (viewKey > 0) moveCamera.current?.(view);
  }, [view, viewKey]);

  return <div ref={host} className={className} style={{ position: "relative", touchAction: "none" }} />;
}
