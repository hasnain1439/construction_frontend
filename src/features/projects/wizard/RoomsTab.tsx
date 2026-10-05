"use client";

import { Copy, DoorOpen, Plus } from "lucide-react";
import { useState } from "react";
import { useCopyFloorMutation, useGetFloorsQuery } from "@/api/services/projects.api";
import type { FloorWithRooms } from "@/api/types";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Copy {source.name}</DialogTitle>
          <DialogDescription>Copies all {source.rooms.length} rooms with their doors and windows. Heights follow the target floor.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="copy-target">Copy to</Label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger id="copy-target" className="w-full">
              <SelectValue placeholder="Choose a floor" />
            </SelectTrigger>
            <SelectContent>
              {floors
                .filter((f) => f.id !== source.id)
                .map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} ({f.rooms.length} rooms)
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {targetHasRooms ? (
            <div className="space-y-2">
              <InlineAlert tone="warning">{target?.name} already has rooms.</InlineAlert>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={replace} onCheckedChange={(c) => setReplace(c === true)} />
                Replace its rooms
              </label>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!targetId || isLoading || (targetHasRooms && !replace)}
            onClick={async () => {
              const ok = await run(() => copy({ projectId, floorId: source.id, body: { targetFloorId: targetId, replace } }).unwrap(), {
                success: `Rooms copied to ${target?.name}`,
              });
              if (ok) {
                setTargetId("");
                setReplace(false);
                onOpenChange(false);
              }
            }}
          >
            Copy rooms
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
        <EmptyState icon={DoorOpen} title="No floors yet" description="Add floors in tab 3 (Plot & Structure) first." />
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
                  {f.name}
                  <span className="text-xs text-muted-foreground tabular">{f.rooms.length}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {!locked ? (
            <div className="flex gap-2">
              <Button variant="outline" disabled={!floor.rooms.length || floors.length < 2} onClick={() => setCopyOpen(true)}>
                <Copy data-icon="inline-start" />
                Copy floor
              </Button>
              <Button onClick={() => setAdding(true)} disabled={adding}>
                <Plus data-icon="inline-start" />
                Add room
              </Button>
            </div>
          ) : null}
        </div>
        {adding ? <RoomCard key={`new-${floor.id}`} projectId={projectId} floor={floor} room={null} disabled={false} onCancelNew={() => setAdding(false)} /> : null}
        {floor.rooms.length ? (
          floor.rooms.map((room) => <RoomCard key={room.id} projectId={projectId} floor={floor} room={room} disabled={locked} />)
        ) : !adding ? (
          <SectionCard>
            <EmptyState
              compact
              icon={DoorOpen}
              title={`No rooms on the ${floor.name.toLowerCase()} yet`}
              description="Add each room with its size and doors / windows."
              action={
                !locked ? (
                  <Button onClick={() => setAdding(true)}>
                    <Plus data-icon="inline-start" />
                    Add room
                  </Button>
                ) : undefined
              }
            />
          </SectionCard>
        ) : null}
      </div>
      <aside className="xl:sticky xl:top-0 xl:self-start">
        <SectionCard title="Summary">
          <div className="space-y-3 text-sm">
            <ul className="space-y-2">
              {floors.map((f) => (
                <li key={f.id} className="flex justify-between gap-2">
                  <span>{f.name}</span>
                  <span className="text-muted-foreground tabular">
                    {f.calculations.rooms} rooms · {formatArea(f.calculations.totalFloorAreaSqft)} sq ft
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t pt-3">
              <p className="flex justify-between">
                <span>Room area</span>
                <strong className="tabular">{formatArea(roomArea)} sq ft</strong>
              </p>
              <p className="flex justify-between">
                <span>Covered area</span>
                <strong className="tabular">{covered ? `${formatArea(covered)} sq ft` : "—"}</strong>
              </p>
              <p className="flex justify-between text-muted-foreground">
                <span>Net wall area</span>
                <span className="tabular">{formatArea(data?.totals.netWallAreaSqft)} sq ft</span>
              </p>
              <p className="flex justify-between text-muted-foreground">
                <span>Wet rooms</span>
                <span className="tabular">{data?.totals.wetRooms ?? 0}</span>
              </p>
            </div>
            {mismatch ? (
              <InlineAlert tone="warning">
                Room areas total {formatArea(roomArea)} sq ft but covered area is {formatArea(covered)} sq ft — check walls and passages.
              </InlineAlert>
            ) : null}
          </div>
        </SectionCard>
      </aside>
      <CopyFloorDialog projectId={projectId} source={floor} floors={floors} open={copyOpen} onOpenChange={setCopyOpen} />
    </div>
  );
}
