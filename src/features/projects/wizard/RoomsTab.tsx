"use client";

import { BrickWall, Copy, DoorOpen, Plus } from "lucide-react";
import { useState } from "react";
import { useAutoFloorWallsMutation, useCopyFloorMutation, useGetFloorsQuery } from "@/api/services/projects.api";
import type { FloorWithRooms } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SectionCard } from "@/components/common/SectionCard";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useEnumT, useT } from "@/i18n/useT";
import { formatArea } from "../utils/calc";
import { RoomCard } from "./RoomCard";
import { useWizard } from "./WizardContext";

function CopyFloorDialog({
  projectId,
  source,
  floors,
  open,
  onOpenChange,
}: {
  projectId: string;
  source: FloorWithRooms;
  floors: FloorWithRooms[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copy, { isLoading }] = useCopyFloorMutation();
  const run = useMutationToast();
  const [targetId, setTargetId] = useState("");
  const [replace, setReplace] = useState(false);
  const target = floors.find((f) => f.id === targetId);
  const targetHasRooms = Boolean(target?.rooms.length);
  const t = useT();
  const te = useEnumT();
  const floorName = (f: FloorWithRooms) => te("projectFloorLevel", f.level, f.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{t("projects.rooms.copyTitle", { floor: floorName(source) })}</DialogTitle>
          <DialogDescription>{t("projects.rooms.copyDesc", { n: source.rooms.length })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="copy-target">{t("projects.rooms.copyTo")}</Label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger id="copy-target" className="w-full">
              <SelectValue placeholder={t("projects.rooms.chooseFloor")} />
            </SelectTrigger>
            <SelectContent>
              {floors
                .filter((f) => f.id !== source.id)
                .map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {t("projects.rooms.floorOption", { floor: floorName(f), n: f.rooms.length })}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {targetHasRooms ? (
            <div className="space-y-2">
              <InlineAlert tone="warning">{t("projects.rooms.alreadyHasRooms", { floor: target ? floorName(target) : "" })}</InlineAlert>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={replace} onCheckedChange={(c) => setReplace(c === true)} />
                {t("projects.rooms.replaceRooms")}
              </label>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!targetId || isLoading || (targetHasRooms && !replace)}
            onClick={async () => {
              const ok = await run(() => copy({ projectId, floorId: source.id, body: { targetFloorId: targetId, replace } }).unwrap(), {
                success: t("projects.rooms.copied", { floor: target ? floorName(target) : "" }),
              });
              if (ok) {
                setTargetId("");
                setReplace(false);
                onOpenChange(false);
              }
            }}
          >
            {t("projects.rooms.copyRooms")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Tab 5 — rooms per floor; each card saves on its own (marks the step complete). */
export function RoomsTab() {
  const { projectId, project, locked } = useWizard();
  const { data, isLoading, error, refetch } = useGetFloorsQuery(projectId ?? "", { skip: !projectId });
  const [floorId, setFloorId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoWalls, { isLoading: autoSaving }] = useAutoFloorWallsMutation();
  const run = useMutationToast();
  const t = useT();
  const te = useEnumT();
  if (!projectId) return null;

  if (isLoading) return <CardsSkeleton count={2} height="h-64" />;
  if (error && !data) {
    return (
      <SectionCard>
        <ErrorState error={error} onRetry={refetch} />
      </SectionCard>
    );
  }
  const floors = data?.floors ?? [];
  if (!floors.length) {
    return (
      <SectionCard>
        <EmptyState icon={DoorOpen} title={t("projects.section.noFloors")} description={t("projects.rooms.noFloorsDesc")} />
      </SectionCard>
    );
  }
  const floor = floors.find((f) => f.id === floorId) ?? floors.find((f) => f.level === "GROUND") ?? floors[0];
  const covered = project?.coverage?.coveredAreaSqft ?? null;
  const roomArea = data?.totals.totalFloorAreaSqft ?? 0;
  const mismatch = covered && roomArea ? Math.abs(roomArea - covered) / covered > 0.15 : false;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={floor.id}
            onValueChange={(id) => {
              setFloorId(id);
              setAdding(false);
            }}
          >
            <TabsList className="h-10!">
              {floors.map((f) => (
                <TabsTrigger key={f.id} value={f.id} className="px-3">
                  {te("projectFloorLevel", f.level, f.name)}
                  <span className="text-xs text-muted-foreground tabular">{f.rooms.length}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {!locked ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={!floor.rooms.length} onClick={() => setAutoOpen(true)}>
                <BrickWall data-icon="inline-start" />
                {t("projects.rooms.autoWalls")}
              </Button>
              <Button variant="outline" disabled={!floor.rooms.length || floors.length < 2} onClick={() => setCopyOpen(true)}>
                <Copy data-icon="inline-start" />
                {t("projects.rooms.copyFloor")}
              </Button>
              <Button onClick={() => setAdding(true)} disabled={adding}>
                <Plus data-icon="inline-start" />
                {t("projects.rooms.addRoom")}
              </Button>
            </div>
          ) : null}
        </div>
        {adding ? (
          <RoomCard
            key={`new-${floor.id}`}
            projectId={projectId}
            floor={floor}
            room={null}
            structure={project?.structure?.structureType ?? null}
            disabled={false}
            onCancelNew={() => setAdding(false)}
          />
        ) : null}
        {floor.rooms.length ? (
          floor.rooms.map((room) => (
            <RoomCard key={room.id} projectId={projectId} floor={floor} room={room} structure={project?.structure?.structureType ?? null} disabled={locked} />
          ))
        ) : !adding ? (
          <SectionCard>
            <EmptyState
              compact
              icon={DoorOpen}
              title={t("projects.rooms.noRoomsYet", { floor: te("projectFloorLevel", floor.level, floor.name) })}
              description={t("projects.rooms.addRoomDesc")}
              action={
                !locked ? (
                  <Button onClick={() => setAdding(true)}>
                    <Plus data-icon="inline-start" />
                    {t("projects.rooms.addRoom")}
                  </Button>
                ) : undefined
              }
            />
          </SectionCard>
        ) : null}
      </div>
      <aside className="xl:sticky xl:top-0 xl:self-start">
        <SectionCard title={t("projects.rooms.summary")}>
          <div className="space-y-3 text-sm">
            <ul className="space-y-2">
              {floors.map((f) => (
                <li key={f.id} className="flex justify-between gap-2">
                  <span>{te("projectFloorLevel", f.level, f.name)}</span>
                  <span className="text-muted-foreground tabular">
                    {t(f.calculations.rooms === 1 ? "projects.rooms.floorSummaryOne" : "projects.rooms.floorSummary", { n: f.calculations.rooms, area: formatArea(f.calculations.totalFloorAreaSqft) })}
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t pt-3">
              <p className="flex justify-between">
                <span>{t("projects.rooms.roomArea")}</span>
                <strong className="tabular">{t("projects.unit.sqftValue", { n: formatArea(roomArea) })}</strong>
              </p>
              <p className="flex justify-between">
                <span>{t("projects.coverage.coveredArea")}</span>
                <strong className="tabular">{covered ? t("projects.unit.sqftValue", { n: formatArea(covered) }) : "—"}</strong>
              </p>
              <p className="flex justify-between text-muted-foreground">
                <span>{t("projects.rooms.netWallArea")}</span>
                <span className="tabular">{t("projects.unit.sqftValue", { n: formatArea(data?.totals.netWallAreaSqft) })}</span>
              </p>
              <p className="flex justify-between text-muted-foreground">
                <span>{t("projects.section.wetRooms")}</span>
                <span className="tabular">{data?.totals.wetRooms ?? 0}</span>
              </p>
            </div>
            {mismatch ? (
              <InlineAlert tone="warning">
                {t("projects.rooms.mismatch", { rooms: formatArea(roomArea), covered: formatArea(covered) })}
              </InlineAlert>
            ) : null}
          </div>
        </SectionCard>
      </aside>
      <CopyFloorDialog projectId={projectId} source={floor} floors={floors} open={copyOpen} onOpenChange={setCopyOpen} />
      <ConfirmDialog
        open={autoOpen}
        onOpenChange={setAutoOpen}
        title={t("projects.rooms.autoWallsTitle", { floor: te("projectFloorLevel", floor.level, floor.name) })}
        description={t("projects.rooms.autoWallsDesc")}
        confirmLabel={t("projects.rooms.autoWallsConfirm")}
        tone="default"
        loading={autoSaving}
        onConfirm={async () => {
          const ok = await run(() => autoWalls({ projectId, floorId: floor.id, body: { replace: false } }).unwrap(), { success: t("projects.rooms.autoWallsDone") });
          if (ok !== undefined) setAutoOpen(false);
        }}
      />
    </div>
  );
}
