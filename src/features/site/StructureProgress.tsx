"use client";

import { Box as BoxIcon, CheckCircle2, Hammer, Save } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMarkStructureProgressMutation, useGetStructureProgressQuery } from "@/api/services/progress.api";
import { useGetFloorsQuery } from "@/api/services/projects.api";
import type { ProjectDetail, StructurePartStatus } from "@/api/types";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROGRESS_COLOR, type PartProgress } from "@/components/house3d/House3DCanvas";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT, type TranslationKey } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { todayPK } from "@/lib/dates";
import { houseOf } from "@/lib/house3d/fromProject";
import { trackedParts, type BoxKind, type HouseModel, type TrackedPart } from "@/lib/house3d/layout";
import { projectHref } from "@/lib/navigation";

export type Mark = StructurePartStatus | "NOT_STARTED";
/** Not started → in progress → done → not started. */
export const nextMark = (m: Mark): Mark => (m === "NOT_STARTED" ? "IN_PROGRESS" : m === "IN_PROGRESS" ? "DONE" : "NOT_STARTED");

const KIND_LABEL: Partial<Record<BoxKind, TranslationKey>> = {
  pcc: "projects.model3d.partPcc",
  footing: "projects.model3d.partFooting",
  pile: "projects.model3d.partPile",
  raft: "projects.progress.raft",
  foundationWall: "projects.model3d.partFoundationWall",
  plinthBeam: "projects.progress.plinthBeam",
  dpc: "projects.model3d.partDpc",
  plinthFill: "projects.model3d.partPlinthFill",
  column: "projects.model3d.partColumn",
  beam: "projects.model3d.partBeam",
  wall: "projects.model3d.partWall",
  slab: "projects.model3d.partSlab",
  stair: "projects.model3d.partStair",
};
const KIND_ORDER: BoxKind[] = ["pcc", "footing", "pile", "raft", "foundationWall", "plinthBeam", "dpc", "plinthFill", "column", "beam", "wall", "stair", "slab"];

/** The saved marks as a part → status map (the 3D colours). */
export function useSavedProgress(projectId: string, skip = false): PartProgress {
  const q = useGetStructureProgressQuery(projectId, { skip });
  return useMemo(() => Object.fromEntries((q.data?.parts ?? []).map((p) => [p.partId, p.status])), [q.data]);
}

/** The 3D model of a project (null while the floors load). */
export function useHouseModel(project: ProjectDetail): HouseModel | null {
  const floors = useGetFloorsQuery(project.id);
  return useMemo(() => (floors.data ? houseOf(project, floors.data) : null), [floors.data, project]);
}

/** Parts grouped by the foundation / each floor, then by kind (footings, columns, beams, walls, slab …). */
function grouped(model: HouseModel) {
  const parts = trackedParts(model);
  const groups: Array<{ key: string; title: string | null; floor: number | null; kinds: Array<{ kind: BoxKind; parts: TrackedPart[] }> }> = [];
  const keys: Array<"foundation" | number> = ["foundation", ...model.floors.map((_, i) => i)];
  for (const g of keys) {
    const inGroup = parts.filter((p) => p.group === g);
    if (!inGroup.length) continue;
    const kinds = KIND_ORDER.map((kind) => ({ kind, parts: inGroup.filter((p) => p.kind === kind) })).filter((k) => k.parts.length);
    groups.push({ key: String(g), title: g === "foundation" ? null : model.floors[g]!.name, floor: g === "foundation" ? null : g, kinds });
  }
  return groups;
}

/** Chips of every part, coloured by its mark; a click moves it to the next mark. */
export function PartsPicker({ model, marks, onToggle, disabled }: { model: HouseModel; marks: Record<string, Mark>; onToggle: (partId: string) => void; disabled?: boolean }) {
  const t = useT();
  const groups = useMemo(() => grouped(model), [model]);
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.key} className="space-y-2">
          <p className="text-sm font-semibold">{g.title ?? t("projects.model3d.foundationTab")}</p>
          {g.kinds.map((k) => (
            <div key={k.kind} className="space-y-1">
              <p className="text-xs text-muted-foreground">{KIND_LABEL[k.kind] ? t(KIND_LABEL[k.kind]!) : k.kind}</p>
              <div className="flex flex-wrap gap-1.5">
                {k.parts.map((p) => {
                  const m = marks[p.id] ?? "NOT_STARTED";
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggle(p.id)}
                      aria-pressed={m !== "NOT_STARTED"}
                      title={t(`projects.progress.mark.${m}`)}
                      className={cn("rounded-md border px-2 py-1 font-mono text-xs transition-colors disabled:opacity-60", m === "NOT_STARTED" && "bg-background hover:bg-muted")}
                      style={m === "NOT_STARTED" ? undefined : { background: PROGRESS_COLOR[m], borderColor: PROGRESS_COLOR[m], color: "#fff" }}
                    >
                      {p.id}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ProgressLegend() {
  const t = useT();
  return (
    <ul className="flex flex-wrap gap-3 text-xs">
      {(["NOT_STARTED", "IN_PROGRESS", "DONE"] as const).map((m) => (
        <li key={m} className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border" style={m === "NOT_STARTED" ? undefined : { background: PROGRESS_COLOR[m], borderColor: PROGRESS_COLOR[m] }} aria-hidden />
          {t(`projects.progress.mark.${m}`)}
        </li>
      ))}
    </ul>
  );
}

/** Mark the day's structure work: date, the parts (click to move them along), save. */
export function MarkStructureSheet({ project, open, onOpenChange }: { project: ProjectDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const run = useMutationToast();
  const model = useHouseModel(project);
  const saved = useSavedProgress(project.id, !open);
  const [date, setDate] = useState(todayPK());
  const [pending, setPending] = useState<Record<string, Mark>>({});
  const [mark, marking] = useMarkStructureProgressMutation();
  const marks = { ...saved, ...pending };
  const changed = Object.keys(pending).filter((k) => (saved[k] ?? "NOT_STARTED") !== pending[k]);
  const close = (next: boolean) => {
    if (!next) setPending({});
    onOpenChange(next);
  };
  const save = async () => {
    const res = await run(() => mark({ projectId: project.id, body: { date, parts: changed.map((partId) => ({ partId, status: pending[partId]! })) } }).unwrap(), { success: () => t("projects.progress.saved", { n: changed.length }) });
    if (res) close(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={close}
      title={t("projects.progress.markTitle")}
      description={t("projects.progress.markDesc")}
      size="lg"
      busy={marking.isLoading}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{t("projects.progress.changed", { n: changed.length })}</span>
          <Button type="button" onClick={() => void save()} disabled={!changed.length || marking.isLoading}>
            <Save data-icon="inline-start" />
            {t("projects.progress.save")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-6">
        <div className="max-w-48 space-y-1">
          <Label htmlFor="progress-date">{t("projects.progress.date")}</Label>
          <Input id="progress-date" type="date" value={date} max={todayPK()} onChange={(e) => setDate(e.target.value || todayPK())} />
        </div>
        <ProgressLegend />
        <p className="text-xs text-muted-foreground">{t("projects.progress.howTo")}</p>
        {model ? <PartsPicker model={model} marks={marks} onToggle={(id) => setPending((p) => ({ ...p, [id]: nextMark(marks[id] ?? "NOT_STARTED") }))} /> : null}
      </div>
    </SlideOver>
  );
}

/** Daily logs: the structure work so far, and "Mark today's work". */
export function StructureWorkCard({ project }: { project: ProjectDetail }) {
  const t = useT();
  const canMark = useCan("dailylog.log.create") && (project.status === "ACTIVE" || project.status === "CLOSEOUT");
  const model = useHouseModel(project);
  const q = useGetStructureProgressQuery(project.id);
  const [open, setOpen] = useState(false);
  const total = model ? trackedParts(model).length : 0;
  if (model && !total) return null;
  return (
    <SectionCard
      title={t("projects.progress.title")}
      description={t("projects.progress.cardDesc")}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`${projectHref(project.id, "/overview/3d")}?progress=1`}>
              <BoxIcon data-icon="inline-start" />
              {t("projects.progress.see3d")}
            </Link>
          </Button>
          {canMark ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Hammer data-icon="inline-start" />
              {t("projects.progress.markToday")}
            </Button>
          ) : null}
        </div>
      }
    >
      <p className="flex flex-wrap items-center gap-3 text-sm" data-testid="progress-counts">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="size-4" style={{ color: PROGRESS_COLOR.DONE }} aria-hidden />
          {t("projects.progress.doneOf", { done: q.data?.done ?? 0, total })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ background: PROGRESS_COLOR.IN_PROGRESS }} aria-hidden />
          {t("projects.progress.inProgressN", { n: q.data?.inProgress ?? 0 })}
        </span>
      </p>
      <MarkStructureSheet project={project} open={open} onOpenChange={setOpen} />
    </SectionCard>
  );
}
