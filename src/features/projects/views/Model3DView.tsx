"use client";

import { Box as BoxIcon, Camera, Info } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useGetFloorsQuery } from "@/api/services/projects.api";
import type { ProjectDetail } from "@/api/types";
import { EmptyState } from "@/components/common/EmptyState";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SectionCard } from "@/components/common/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { CameraView, ViewOptions } from "@/components/house3d/House3DCanvas";
import { useEnumT, useT, type TranslationKey } from "@/i18n/useT";
import { PART_COLOR } from "@/lib/house3d/colors";
import { buildHouse, type BoxKind } from "@/lib/house3d/layout";
import { wizardHref } from "../utils/links";
import { ProjectPageShell } from "./ProjectModeViews";

// three.js runs in the browser only.
const House3DCanvas = dynamic(() => import("@/components/house3d/House3DCanvas").then((m) => m.House3DCanvas), {
  ssr: false,
  loading: () => <Skeleton className="h-[560px] w-full rounded-xl" />,
});

const LEGEND: Array<[BoxKind, TranslationKey]> = [
  ["foundationWall", "projects.model3d.partFoundationWall"],
  ["footing", "projects.model3d.partFooting"],
  ["pcc", "projects.model3d.partPcc"],
  ["dpc", "projects.model3d.partDpc"],
  ["plinthFill", "projects.model3d.partPlinthFill"],
  ["wall", "projects.model3d.partWall"],
  ["column", "projects.model3d.partColumn"],
  ["beam", "projects.model3d.partBeam"],
  ["slab", "projects.model3d.partSlab"],
  ["chajja", "projects.model3d.partChajja"],
  ["plinthWall", "projects.model3d.partPlinth"],
  ["floorFinish", "projects.model3d.partFloor"],
  ["stair", "projects.model3d.partStair"],
  ["door", "projects.model3d.partDoor"],
  ["window", "projects.model3d.partWindow"],
  ["boundary", "projects.model3d.partBoundary"],
];

function ToggleRow({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** The house in 3D from the project setup: plot, foundation, floors, rooms, walls, doors and windows. */
function Model3D({ project }: { project: ProjectDetail }) {
  const t = useT();
  const te = useEnumT();
  const floorsQuery = useGetFloorsQuery(project.id);
  const model = useMemo(
    () =>
      floorsQuery.data
        ? buildHouse({
            frontFt: project.plot?.frontFt,
            depthFt: project.plot?.depthFt,
            structureType: project.structure?.structureType,
            foundation: project.foundation,
            coverage: project.coverage,
            floors: floorsQuery.data.floors,
            columnsByLevel: Object.fromEntries((project.calculations?.footprints?.floors ?? []).map((f) => [f.level, f.columns])),
          })
        : null,
    [floorsQuery.data, project],
  );
  // "all:<i>" = the house up to floor i; "foundation" = the foundation alone; "only:<i>" = floor i alone.
  const [show, setShow] = useState<string | null>(null);
  const [options, setOptions] = useState({ foundation: false, roofs: true, walls: true, boundary: true, labels: true });
  const describe = useCallback(
    (kind: BoxKind, part: string) => {
      const name: Partial<Record<BoxKind, TranslationKey>> = {
        column: "projects.model3d.partColumn",
        beam: "projects.model3d.partBeam",
        footing: "projects.model3d.partFooting",
        pile: "projects.model3d.partPile",
      };
      return `${name[kind] ? t(name[kind]!) : kind} ${part}`;
    },
    [t],
  );
  const [view, setView] = useState<{ view: CameraView; key: number }>({ view: "corner", key: 0 });
  const [unsupported, setUnsupported] = useState(false);
  const onUnsupported = useCallback(() => setUnsupported(true), []);

  if (floorsQuery.isLoading || !model) return <Skeleton className="h-[560px] w-full rounded-xl" />;
  const rooms = model.floors.reduce((s, f) => s + f.rooms, 0);
  if (!rooms) {
    return (
      <EmptyState
        icon={BoxIcon}
        title={t("projects.model3d.emptyTitle")}
        description={t("projects.model3d.emptyDesc")}
        action={
          <Button asChild>
            <Link href={wizardHref(project.id, 5)}>{t("projects.model3d.addRooms")}</Link>
          </Button>
        }
      />
    );
  }
  const last = model.floors.length - 1;
  const mode = show ?? `all:${last}`;
  const shown: ViewOptions = {
    ...options,
    show: mode === "foundation" ? "foundation" : mode.startsWith("only:") ? Number(mode.slice(5)) : "all",
    upTo: mode.startsWith("all:") ? Number(mode.slice(4)) : last,
  };
  const s = model.structure;
  // One floor alone opens without its slab (rooms and names show); the whole house with its roofs.
  const pick = (value: string) => {
    setShow(value);
    setOptions((o) => ({ ...o, roofs: !value.startsWith("only:") }));
  };
  const set = (k: keyof typeof options) => (v: boolean) => setOptions((o) => ({ ...o, [k]: v }));
  const move = (v: CameraView) => setView((s) => ({ view: v, key: s.key + 1 }));

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <div className="space-y-3">
        {unsupported ? (
          <InlineAlert tone="warning">{t("projects.model3d.noWebgl")}</InlineAlert>
        ) : (
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("projects.model3d.show")}>
            {[
              { value: `all:${last}`, label: t("projects.model3d.wholeHouse") },
              { value: "foundation", label: t("projects.model3d.foundationTab") },
              ...model.floors.map((f, i) => ({ value: `only:${i}`, label: f.name })),
            ].map((o) => (
              <Button key={o.value} size="sm" variant={mode === o.value ? "default" : "outline"} aria-pressed={mode === o.value} onClick={() => pick(o.value)}>
                {o.label}
              </Button>
            ))}
          </div>
        )}
        {unsupported ? null : (
          <div className="overflow-hidden rounded-xl border">
            <House3DCanvas model={model} options={shown} view={view.view} viewKey={view.key} onUnsupported={onUnsupported} describe={describe} className="h-[560px] w-full" />
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t("projects.model3d.howTo")}</p>
        {model.placement.packed ? (
          <InlineAlert tone="info">
            {t("projects.model3d.packedNote", { n: model.placement.packed })}{" "}
            <Link className="underline" href={wizardHref(project.id, 5)}>
              {t("projects.model3d.setWalls")}
            </Link>
          </InlineAlert>
        ) : null}
        {model.placement.assumed ? <InlineAlert tone="info">{t("projects.model3d.assumedNote", { n: model.placement.assumed })}</InlineAlert> : null}
        {!model.plot.known ? <InlineAlert tone="info">{t("projects.model3d.noPlot")}</InlineAlert> : null}
      </div>

      <div className="space-y-4">
        <SectionCard title={t("projects.model3d.show")}>
          <div className="space-y-3">
            <ToggleRow id="model3d-roofs" label={t("projects.model3d.roofs")} checked={options.roofs} onChange={set("roofs")} />
            <ToggleRow id="model3d-walls" label={t("projects.model3d.walls")} checked={options.walls} onChange={set("walls")} />
            <ToggleRow id="model3d-foundation" label={t("projects.model3d.foundation")} checked={options.foundation} onChange={set("foundation")} />
            <ToggleRow id="model3d-boundary" label={t("projects.model3d.boundary")} checked={options.boundary} onChange={set("boundary")} />
            <ToggleRow id="model3d-labels" label={t("projects.model3d.labels")} checked={options.labels} onChange={set("labels")} />
          </div>
        </SectionCard>
        <SectionCard title={t("projects.model3d.camera")}>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => move("corner")}>
              <Camera data-icon="inline-start" />
              {t("projects.model3d.viewCorner")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => move("front")}>
              {t("projects.model3d.viewFront")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => move("top")}>
              {t("projects.model3d.viewTop")}
            </Button>
          </div>
        </SectionCard>
        <SectionCard title={t("projects.model3d.structure")}>
          <ul className="space-y-1 text-sm">
            <li>
              {t("projects.model3d.foundationLine", { type: te("projectFoundationType", s.foundation.type), depth: s.foundation.depthFt })}
              {s.foundation.footings ? ` · ${t("projects.model3d.footingsLine", { n: s.foundation.footings })}` : ""}
              {s.foundation.piles ? ` · ${t("projects.model3d.pilesLine", { n: s.foundation.piles })}` : ""}
              {s.foundation.plinthBeamFt ? ` · ${t("projects.model3d.plinthBeamLine", { ft: s.foundation.plinthBeamFt })}` : ""}
            </li>
            {s.floors
              .filter((f) => f.columns)
              .map((f) => (
                <li key={f.name}>
                  {t("projects.model3d.frameLine", { name: f.name, columns: f.columns, size: f.columnSizeIn, beams: f.beamRunFt, beamSize: f.beamSizeIn })}
                  {f.enteredBeamRunFt !== null && f.enteredBeamRunFt !== f.beamRunFt ? (
                    <span className="block text-xs text-muted-foreground">{t("projects.model3d.enteredBeams", { ft: f.enteredBeamRunFt })}</span>
                  ) : null}
                </li>
              ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{t("projects.model3d.hoverHint")}</p>
        </SectionCard>
        <SectionCard title={t("projects.model3d.legend")}>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            {LEGEND.map(([kind, key]) => (
              <li key={kind} className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-sm border" style={{ background: PART_COLOR[kind] }} aria-hidden />
                {t(key)}
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title={t("projects.model3d.summary")}>
          <ul className="space-y-1 text-sm">
            <li>{t("projects.model3d.plotLine", { front: model.plot.frontFt, depth: model.plot.depthFt })}</li>
            {model.floors.map((f, i) => (
              <li key={`${f.level}-${i}`}>{t("projects.model3d.floorLine", { name: f.name, rooms: f.rooms, height: f.heightFt })}</li>
            ))}
          </ul>
          <p className="mt-3 flex gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t("projects.model3d.approxNote")}
          </p>
        </SectionCard>
      </div>
    </div>
  );
}

/** Project → 3D view. */
export function ProjectModel3DView({ projectId }: { projectId: string }) {
  const t = useT();
  return (
    <ProjectPageShell projectId={projectId} crumb={t("projects.model3d.title")}>
      {(project) => <Model3D project={project} />}
    </ProjectPageShell>
  );
}
