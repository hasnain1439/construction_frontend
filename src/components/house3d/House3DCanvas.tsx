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
const NO_SHADOW = new Set<BoxKind>(["ground", "road", "paving", "floorFinish", "wetFloor", "window", "ventilator"]);
const ROUGHNESS: Partial<Record<BoxKind, number>> = { window: 0.08, ventilator: 0.1, door: 0.6, frame: 0.5, road: 0.95, ground: 1 };

export interface ViewOptions {
  /** Floors shown: index into model.floors, up to and including this one. */
  upTo: number;
  foundation: boolean;
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
  className,
}: {
  model: HouseModel;
  options: ViewOptions;
  view: CameraView;
  /** Bump to move the camera to `view` again. */
  viewKey: number;
  onUnsupported: () => void;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const apply = useRef<((o: ViewOptions) => void) | null>(null);
  const moveCamera = useRef<((v: CameraView) => void) | null>(null);
  const latest = useRef(options);

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
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -radius * 1.3;
    sc.right = radius * 1.3;
    sc.top = radius * 1.3;
    sc.bottom = -radius * 1.3;
    sc.near = 1;
    sc.far = radius * 6;
    sun.shadow.bias = -0.0008;
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
          color: PART_COLOR[kind],
          roughness: ROUGHNESS[kind] ?? 0.88,
          metalness: GLASS.has(kind) ? 0.1 : 0,
          transparent: GLASS.has(kind) || kind === "ground",
          opacity: GLASS.has(kind) ? 0.4 : 1,
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
        const floorShown = p.floor === null || p.floor <= o.upTo;
        let visible = floorShown;
        // Names only where they can be read: the top floor shown, when its roof is off.
        if (p.kind === "label") visible = o.labels && p.floor === o.upTo && !o.roofs;
        else if (FOUNDATION.has(p.kind)) visible = o.foundation;
        else if (p.kind === "boundary") visible = o.boundary;
        else if (ROOF.has(p.kind)) visible = floorShown && (o.roofs || p.floor! < o.upTo);
        p.object.visible = visible;
      }
      groundMaterial.opacity = o.foundation ? 0.3 : 1;
      groundMaterial.depthWrite = !o.foundation;
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
