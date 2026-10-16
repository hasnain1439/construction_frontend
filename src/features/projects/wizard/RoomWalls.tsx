"use client";

import { BrickWall, X } from "lucide-react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { Room, StructureType, WallSide, WallType } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useEnumT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { defaultWallThickness, sideLength, WALL_SIDES, WALL_THICKNESSES, WALL_TYPES } from "../utils/roof";

/** One side in the room form. */
export interface WallRow {
  side: WallSide;
  type: WallType;
  thicknessIn: number | null;
  innerLeafIn: number | null;
  cavityIn: number | null;
  sharedWithRoomId: string | null;
  existing: boolean;
}

/** Four EXTERNAL 9″ sides — what "Set walls" starts from. */
export const externalRows = (): WallRow[] =>
  WALL_SIDES.map((side) => ({ side, type: "EXTERNAL", thicknessIn: 9, innerLeafIn: null, cavityIn: null, sharedWithRoomId: null, existing: false }));

/** Saved walls → form rows (null = not entered). */
export const wallsToRows = (walls: Room["walls"]): WallRow[] | null =>
  walls
    ? WALL_SIDES.map((side) => {
        const w = walls.find((x) => x.side === side);
        return {
          side,
          type: w?.type ?? "EXTERNAL",
          thicknessIn: w?.thicknessIn ?? null,
          innerLeafIn: w?.innerLeafIn ?? null,
          cavityIn: w?.cavityIn ?? null,
          sharedWithRoomId: w?.sharedWithRoomId ?? null,
          existing: w?.existing ?? false,
        };
      })
    : null;

/** Form rows → `walls` of PUT /rooms/:id/walls (fields that don't apply left out; the API pairs the shared sides). */
export const rowsToBody = (rows: WallRow[]) =>
  rows.map((w) => ({
    side: w.side,
    type: w.type,
    ...(w.type !== "OPEN" && w.thicknessIn !== null ? { thicknessIn: w.thicknessIn } : {}),
    ...(w.type === "DOUBLE" ? { innerLeafIn: w.innerLeafIn ?? 4.5, cavityIn: w.cavityIn ?? 2 } : {}),
    ...(w.type === "SHARED" ? { sharedWithRoomId: w.sharedWithRoomId } : {}),
    ...(w.type === "PARTY" ? { existing: w.existing } : {}),
  }));

/** Wall colour by type (tokens, so dark mode follows). */
const TYPE_STROKE: Record<WallType, string> = {
  EXTERNAL: "text-foreground",
  SHARED: "text-primary",
  PARTY: "text-warning",
  DOUBLE: "text-success",
  OPEN: "text-muted-foreground",
  PASSAGE: "text-muted-foreground",
};

/** Plan of the room: a square whose four sides are coloured / dashed by wall type. Not mirrored in RTL (it is a drawing). */
function WallsDiagram({ rows, label }: { rows: WallRow[]; label: string }) {
  const at = (side: WallSide) => rows.find((r) => r.side === side)!;
  const line = (side: WallSide, x1: number, y1: number, x2: number, y2: number) => {
    const w = at(side);
    return (
      <line
        key={side}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="currentColor"
        strokeLinecap="round"
        className={TYPE_STROKE[w.type]}
        strokeWidth={w.type === "OPEN" ? 1.5 : w.type === "DOUBLE" ? 6 : (w.thicknessIn ?? 9) >= 9 ? 4.5 : 2.5}
        strokeDasharray={w.type === "OPEN" ? "3 3" : w.type === "PASSAGE" ? "8 3" : undefined}
        data-side={side}
        data-type={w.type}
      />
    );
  };
  return (
    <svg viewBox="0 0 64 64" className="size-16 shrink-0" role="img" aria-label={label} data-testid="walls-diagram">
      {line("TOP", 8, 8, 56, 8)}
      {line("RIGHT", 56, 8, 56, 56)}
      {line("BOTTOM", 8, 56, 56, 56)}
      {line("LEFT", 8, 8, 8, 56)}
    </svg>
  );
}

/**
 * The "Walls" section of a room card (`walls` in the room form): four rows — side and its length,
 * wall type, thickness, the room it is shared with (SHARED) or "already built" (PARTY). Null =
 * not entered; "Set walls" starts from four external 9″ walls. The API pairs a shared side with
 * the other room's side on save, so each shared wall is counted once.
 */
export function RoomWalls({
  otherRooms,
  structure,
  disabled,
}: {
  otherRooms: Array<{ id: string; name: string }>;
  structure: StructureType | null | undefined;
  disabled: boolean;
}) {
  const t = useT();
  const te = useEnumT();
  const { setValue, control } = useFormContext();
  const [rows, lengthFt, widthFt, name] = useWatch({ name: ["walls", "lengthFt", "widthFt", "name"] }) as [WallRow[] | null, number | null, number | null, string];
  const ft = (n: number | null) => (n === null ? "—" : t("projects.unit.ftValue", { n }));

  if (!rows) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2" data-testid="walls-section">
        <p className="text-xs text-muted-foreground">{t("projects.walls.notEntered")}</p>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setValue("walls", externalRows(), { shouldDirty: true })}>
          <BrickWall data-icon="inline-start" />
          {t("projects.walls.set")}
        </Button>
      </div>
    );
  }

  const onTypeChange = (index: number, next: WallType) => {
    setValue(`walls.${index}.type`, next, { shouldDirty: true });
    setValue(`walls.${index}.thicknessIn`, defaultWallThickness(next, structure), { shouldDirty: true });
    setValue(`walls.${index}.innerLeafIn`, next === "DOUBLE" ? 4.5 : null, { shouldDirty: true });
    setValue(`walls.${index}.cavityIn`, next === "DOUBLE" ? 2 : null, { shouldDirty: true });
    if (next !== "SHARED") setValue(`walls.${index}.sharedWithRoomId`, null, { shouldDirty: true });
    if (next !== "PARTY") setValue(`walls.${index}.existing`, false, { shouldDirty: true });
  };

  return (
    <div className="space-y-2" data-testid="walls-section">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase">{t("projects.walls.title")}</p>
        <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => setValue("walls", null, { shouldDirty: true })}>
          <X data-icon="inline-start" />
          {t("projects.walls.clear")}
        </Button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <WallsDiagram rows={rows} label={t("projects.walls.diagram", { name: name || t("projects.room.newRoom") })} />
        <div className="flex-1 space-y-2">
          {rows.map((row, index) => {
            const sideName = te("projectWallSide", row.side);
            return (
              <div key={row.side} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[110px_1fr_120px_1fr]" data-side={row.side}>
                <p className="text-sm">
                  <span className="font-medium">{sideName}</span>{" "}
                  <span className="text-xs text-muted-foreground tabular">{ft(sideLength(row.side, { lengthFt, widthFt }))}</span>
                </p>
                <Controller
                  name={`walls.${index}.type`}
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => onTypeChange(index, v as WallType)} disabled={disabled}>
                      <SelectTrigger size="sm" aria-label={t("projects.walls.typeAria", { side: sideName })} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WALL_TYPES.map((value) => (
                          <SelectItem key={value} value={value} disabled={value === "SHARED" && !otherRooms.length}>
                            {te("projectWallType", value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {row.type === "OPEN" ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : row.type === "DOUBLE" ? (
                  <span className="text-xs text-muted-foreground tabular">
                    {t("projects.walls.doubleValue", { outer: row.thicknessIn ?? 9, cavity: row.cavityIn ?? 2, inner: row.innerLeafIn ?? 4.5 })}
                  </span>
                ) : (
                  <Controller
                    name={`walls.${index}.thicknessIn`}
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value === null ? "" : String(field.value)} onValueChange={(v) => field.onChange(Number(v))} disabled={disabled}>
                        <SelectTrigger size="sm" aria-label={t("projects.walls.thicknessAria", { side: sideName })} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[...new Set([...WALL_THICKNESSES, ...(field.value ? [field.value as number] : [])])].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {t("projects.walls.thicknessValue", { n })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
                {row.type === "SHARED" ? (
                  <Controller
                    name={`walls.${index}.sharedWithRoomId`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={disabled}>
                        <SelectTrigger
                          size="sm"
                          aria-label={t("projects.walls.sharedWithAria", { side: sideName })}
                          aria-invalid={Boolean(fieldState.error) || undefined}
                          className="w-full"
                        >
                          <SelectValue placeholder={t("projects.walls.chooseRoom")} />
                        </SelectTrigger>
                        <SelectContent>
                          {otherRooms.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                ) : row.type === "PARTY" ? (
                  <Controller
                    name={`walls.${index}.existing`}
                    control={control}
                    render={({ field }) => (
                      <label className="flex items-center gap-2 text-xs">
                        <Switch
                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                          aria-label={t("projects.walls.existingAria", { side: sideName })}
                        />
                        {t("projects.walls.existing")}
                      </label>
                    )}
                  />
                ) : (
                  <span className={cn("hidden sm:block")} />
                )}
              </div>
            );
          })}
        </div>
      </div>
      {rows.some((r) => r.type === "SHARED") ? <p className="text-xs text-muted-foreground">{t("projects.walls.pairHint")}</p> : null}
    </div>
  );
}
