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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { CameraView, ViewOptions } from "@/components/house3d/House3DCanvas";
import { useT, type TranslationKey } from "@/i18n/useT";
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
  ["slab", "projects.model3d.partSlab"],
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
          })
        : null,
    [floorsQuery.data, project],
  );
  const [upTo, setUpTo] = useState<number | null>(null);
  const [options, setOptions] = useState({ foundation: false, roofs: true, boundary: true, labels: true });
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
  const shown: ViewOptions = { ...options, upTo: upTo ?? last };
  const set = (k: keyof typeof options) => (v: boolean) => setOptions((o) => ({ ...o, [k]: v }));
  const move = (v: CameraView) => setView((s) => ({ view: v, key: s.key + 1 }));

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <div className="space-y-3">
        {unsupported ? (
          <InlineAlert tone="warning">{t("projects.model3d.noWebgl")}</InlineAlert>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <House3DCanvas model={model} options={shown} view={view.view} viewKey={view.key} onUnsupported={onUnsupported} className="h-[560px] w-full" />
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
        {!model.plot.known ? <InlineAlert tone="info">{t("projects.model3d.noPlot")}</InlineAlert> : null}
      </div>

      <div className="space-y-4">
        <SectionCard title={t("projects.model3d.show")}>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="model3d-floors">{t("projects.model3d.floors")}</Label>
              <Select value={String(upTo ?? last)} onValueChange={(v) => setUpTo(Number(v))}>
                <SelectTrigger id="model3d-floors" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {model.floors.map((f, i) => (
                    <SelectItem key={`${f.level}-${i}`} value={String(i)}>
                      {i === last ? t("projects.model3d.allFloors") : t("projects.model3d.upTo", { name: f.name })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ToggleRow id="model3d-roofs" label={t("projects.model3d.roofs")} checked={options.roofs} onChange={set("roofs")} />
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
