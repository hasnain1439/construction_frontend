"use client";

import { useEffect, useRef } from "react";
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
}) {
  const host = useRef<HTMLDivElement>(null);
  const apply = useRef<((o: ViewOptions) => void) | null>(null);
  const moveCamera = useRef<((v: CameraView) => void) | null>(null);
  const latest = useRef(options);
  const describeRef = useRef(describe);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
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
    for (const box of model.boxes) {
      const mesh = new THREE.Mesh(geometry, materialOf(box.kind));
      mesh.scale.set(Math.max(box.w, 0.01), Math.max(box.h, 0.01), Math.max(box.d, 0.01));
      mesh.position.set(box.x + box.w / 2, box.y + box.h / 2, box.z + box.d / 2);
      mesh.castShadow = !NO_SHADOW.has(box.kind);
      mesh.receiveShadow = !GLASS.has(box.kind);
      scene.add(mesh);
      if (box.part) mesh.userData = { kind: box.kind, part: box.part };
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
          // The foundation alone: everything below the plinth, with the ground made see-through.
          visible = p.floor === null && p.kind !== "boundary";
        } else if (typeof o.show === "number") {
          visible = (p.floor === o.show && (o.walls || !WALLISH.has(p.kind as BoxKind)) && (o.roofs || !ROOF.has(p.kind as BoxKind))) || SITE.has(p.kind as BoxKind);
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
    };
    apply.current(latest.current);

    const fovDistance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
    moveCamera.current = (v: CameraView) => {
      controls.target.copy(centre);
      if (v === "top") camera.position.set(centre.x, centre.y + fovDistance * 1.05, centre.z + 0.01);
      else if (v === "front") camera.position.set(centre.x, centre.y + radius * 0.25, centre.z + fovDistance * 1.05);
      else camera.position.copy(centre).add(new THREE.Vector3(0.62, 0.48, 0.62).normalize().multiplyScalar(fovDistance * 0.95));
      controls.update();
    };
    moveCamera.current("corner");

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
  }, [model, onUnsupported]);

  useEffect(() => {
    describeRef.current = describe;
  }, [describe]);

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
