"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useGetStructureProgressQuery } from "@/api/services/progress.api";
import { useGetFloorsQuery, useGetProjectQuery } from "@/api/services/projects.api";
import type { Capture, PartProgress, ViewOptions } from "@/components/house3d/House3DCanvas";
import { useT } from "@/i18n/useT";
import { houseOf } from "@/lib/house3d/fromProject";

// three.js runs in the browser only.
const House3DCanvas = dynamic(() => import("@/components/house3d/House3DCanvas").then((m) => m.House3DCanvas), { ssr: false });

export interface Shot {
  title: string;
  dataUrl: string;
}

const WHOLE: ViewOptions = { show: "all", upTo: 99, foundation: false, walls: true, roofs: true, boundary: true, labels: false };
const FOUNDATION: ViewOptions = { show: "foundation", upTo: 0, foundation: true, walls: true, roofs: false, boundary: false, labels: false };
const FRAME: ViewOptions = { show: "all", upTo: 99, foundation: true, walls: false, roofs: false, boundary: false, labels: false };

/**
 * Renders the project's house off screen and takes the pictures for the project file: the whole
 * house, the foundation and — when parts are marked — the frame coloured by progress. Calls `onDone`
 * once ([] when there is no 3D: no rooms, no WebGL, or it takes too long).
 */
export function Capture3D({ projectId, onDone }: { projectId: string; onDone: (shots: Shot[]) => void }) {
  const t = useT();
  const project = useGetProjectQuery(projectId);
  const floors = useGetFloorsQuery(projectId);
  const progress = useGetStructureProgressQuery(projectId);
  const capture = useRef<Capture | null>(null);
  const done = useRef(false);
  const finish = useCallback(
    (shots: Shot[]) => {
      if (done.current) return;
      done.current = true;
      onDone(shots);
    },
    [onDone],
  );
  const model = useMemo(() => (project.data && floors.data ? houseOf(project.data, floors.data) : null), [project.data, floors.data]);
  const colours = useMemo<PartProgress | undefined>(() => (progress.data?.parts.length ? Object.fromEntries(progress.data.parts.map((p) => [p.partId, p.status])) : undefined), [progress.data]);
  const rooms = model ? model.floors.reduce((s, f) => s + f.rooms, 0) : 0;

  // Nothing to draw, or the data failed: no pictures.
  useEffect(() => {
    if (project.isError || floors.isError || (model && !rooms)) finish([]);
  }, [project.isError, floors.isError, model, rooms, finish]);

  // Once the scene is up (a few frames for the materials and shadows), take the pictures.
  useEffect(() => {
    if (!model || !rooms || progress.isLoading) return;
    const timer = setTimeout(() => {
      const take = capture.current;
      if (!take) return finish([]);
      const last = model.floors.length - 1;
      const shots: Shot[] = [];
      const add = (title: string, o: ViewOptions) => {
        const url = take({ ...o, upTo: Math.min(o.upTo, last) });
        if (url && url.length > 1000) shots.push({ title, dataUrl: url });
      };
      add(t("projects.progress.shotHouse"), WHOLE);
      if (model.boxes.some((b) => b.floor === null && b.kind !== "ground" && b.kind !== "road" && b.kind !== "paving" && b.kind !== "boundary")) add(t("projects.progress.shotFoundation"), FOUNDATION);
      if (colours) add(t("projects.progress.shotProgress"), FRAME);
      finish(shots);
    }, 1200);
    const giveUp = setTimeout(() => finish([]), 8000);
    return () => {
      clearTimeout(timer);
      clearTimeout(giveUp);
    };
  }, [model, rooms, progress.isLoading, colours, t, finish]);

  if (!model || !rooms) return null;
  return (
    <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, width: 1200, height: 750, pointerEvents: "none" }}>
      <House3DCanvas model={model} options={WHOLE} view="corner" viewKey={0} onUnsupported={() => finish([])} progress={colours} captureRef={capture} className="h-[750px] w-[1200px]" />
    </div>
  );
}
