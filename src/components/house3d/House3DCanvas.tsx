"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { PART_COLOR } from "@/lib/house3d/colors";
import type { BoxKind, HouseModel } from "@/lib/house3d/layout";

const SEE_THROUGH = new Set<BoxKind>(["window", "ventilator"]);
const OUTLINED = new Set<BoxKind>(["wall", "slab", "parapet", "boundary", "column"]);
const FOUNDATION = new Set<BoxKind>(["pcc", "footing", "foundationWall", "raft", "pile", "plinthFill", "plinthBeam", "dpc"]);
const ROOF = new Set<BoxKind>(["slab", "parapet"]);

export interface ViewOptions {
  /** Floors shown: index into model.floors, up to and including this one. */
  upTo: number;
  foundation: boolean;
  roofs: boolean;
  boundary: boolean;
  labels: boolean;
}

export type CameraView = "corner" | "top" | "front";

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
    renderer.setClearColor(0xdfe9f3);
    el.appendChild(renderer.domElement);
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.inset = "0";
    labelRenderer.domElement.style.pointerEvents = "none";
    el.appendChild(labelRenderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(-40, 80, 60);
    scene.add(sun);

    const b = model.bounds;
    const centre = new THREE.Vector3((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);
    const size = Math.max(b.maxX - b.minX, b.maxZ - b.minZ, b.maxY - b.minY, 20);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.5, size * 20);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.95;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x3a3a3a, transparent: true, opacity: 0.25 });
    const materials = new Map<BoxKind, THREE.MeshStandardMaterial>();
    const materialOf = (kind: BoxKind) => {
      let m = materials.get(kind);
      if (!m) {
        m = new THREE.MeshStandardMaterial({
          color: PART_COLOR[kind],
          roughness: 0.85,
          transparent: SEE_THROUGH.has(kind) || kind === "ground",
          opacity: SEE_THROUGH.has(kind) ? 0.45 : 1,
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
      if (OUTLINED.has(box.kind)) mesh.add(new THREE.LineSegments(edges, lineMaterial));
      scene.add(mesh);
      list.push({ object: mesh, kind: box.kind, floor: box.floor });
    }
    for (const l of model.labels) {
      const tag = document.createElement("span");
      tag.textContent = l.text;
      tag.className = "rounded bg-background/85 px-1.5 py-0.5 text-[11px] font-medium text-foreground shadow-sm";
      const obj = new CSS2DObject(tag);
      obj.position.set(l.x, l.y, l.z);
      scene.add(obj);
      list.push({ object: obj, kind: "label", floor: l.floor });
    }
    apply.current = (o: ViewOptions) => {
      for (const p of list) {
        const floorShown = p.floor === null || p.floor <= o.upTo;
        let visible = floorShown;
        if (p.kind === "label") visible = floorShown && o.labels;
        else if (FOUNDATION.has(p.kind)) visible = o.foundation;
        else if (p.kind === "boundary") visible = o.boundary;
        else if (ROOF.has(p.kind)) visible = floorShown && (o.roofs || p.floor! < o.upTo);
        p.object.visible = visible;
      }
      groundMaterial.opacity = o.foundation ? 0.35 : 1;
      groundMaterial.depthWrite = !o.foundation;
    };
    apply.current(latest.current);

    moveCamera.current = (v: CameraView) => {
      controls.target.copy(centre).setY(Math.max(0, (b.maxY + 0) / 3));
      if (v === "top") camera.position.set(centre.x, size * 1.6, centre.z + 0.01);
      else if (v === "front") camera.position.set(centre.x, size * 0.35, b.maxZ + size * 1.1);
      else camera.position.set(b.maxX + size * 0.7, size * 0.8, b.maxZ + size * 0.9);
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
      edges.dispose();
      lineMaterial.dispose();
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
