"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Droplets, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Controller, FormProvider, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import {
  useCreateOpeningMutation,
  useCreateRoomMutation,
  useDeleteOpeningMutation,
  useDeleteRoomMutation,
  useUpdateOpeningMutation,
  useUpdateRoomMutation,
} from "@/api/services/projects.api";
import type { FloorWithRooms, Room } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { InlineAlert } from "@/components/common/InlineAlert";
import { StatusBadge } from "@/components/common/StatusBadge";
import { NumberInput } from "@/components/forms/NumberField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useLanguage } from "@/i18n/useT";
import { getErrorMessage } from "@/lib/apiErrors";
import { cn } from "@/lib/cn";
import { OPENING_LABEL, ROOM_TYPE_LABEL } from "../constants";
import { formatArea, isWetType, roomCalc } from "../utils/calc";
import { roomSchema } from "./schemas";

type Values = z.input<typeof roomSchema>;
type Output = z.output<typeof roomSchema>;

const toValues = (room: Room | null, floor: FloorWithRooms): Values => ({
  type: room?.type ?? "BEDROOM",
  name: room?.name ?? "",
  lengthFt: room?.lengthFt ?? null,
  widthFt: room?.widthFt ?? null,
  heightFt: room?.heightFt ?? floor.ceilingHeightFt,
  wetMode: room ? (room.isWetOverridden ? (room.isWet ? "wet" : "dry") : "auto") : "auto",
  openings: (room?.openings ?? []).map((o) => ({ id: o.id, type: o.type, widthFt: o.widthFt, heightFt: o.heightFt, quantity: o.quantity })),
});

function NumberCell({ name, label, unit, disabled, decimals = 2 }: { name: string; label: string; unit?: string; disabled?: boolean; decimals?: number }) {
  return (
    <Controller
      name={name}
      render={({ field, fieldState }) => (
        <NumberInput
          aria-label={label}
          value={field.value as number | null}
          onChange={field.onChange}
          onBlur={field.onBlur}
          unit={unit}
          decimals={decimals}
          disabled={disabled}
          aria-invalid={Boolean(fieldState.error) || undefined}
        />
      )}
    />
  );
}

/** Live "Floor · Wall · Openings · Net wall" line under the card. */
function LiveCalc() {
  const [lengthFt, widthFt, heightFt, openings] = useWatch({ name: ["lengthFt", "widthFt", "heightFt", "openings"] }) as [
    number | null,
    number | null,
    number | null,
    Values["openings"],
  ];
  const c = roomCalc({ lengthFt, widthFt, heightFt, openings: openings ?? [] });
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular" aria-live="polite">
      <span>
        Floor <strong className="text-foreground">{formatArea(c.floorAreaSqft)}</strong> sq ft
      </span>
      <span>
        Wall <strong className="text-foreground">{formatArea(c.grossWallAreaSqft)}</strong>
      </span>
      <span>
        Openings <strong className="text-foreground">−{formatArea(c.openingsAreaSqft)}</strong>
      </span>
      <span>
        Net wall <strong className="text-primary">{formatArea(c.netWallAreaSqft)}</strong>
      </span>
    </p>
  );
}

function WetBadge() {
  const [type, wetMode] = useWatch({ name: ["type", "wetMode"] }) as [string, Values["wetMode"]];
  const wet = wetMode === "auto" ? isWetType(type) : wetMode === "wet";
  return <StatusBadge tone={wet ? "info" : "neutral"} icon={wet ? Droplets : undefined} label={`${wet ? "Wet" : "Dry"}${wetMode === "auto" ? " (auto)" : ""}`} />;
}

/**
 * One room: type, name, L × W × H, wet/dry, openings mini-table. Existing rooms PATCH
 * and sync openings; a new room POSTs with its openings in one call.
 */
export function RoomCard({
  projectId,
  floor,
  room,
  disabled,
  onCancelNew,
}: {
  projectId: string;
  floor: FloorWithRooms;
  room: Room | null;
  disabled: boolean;
  onCancelNew?: () => void;
}) {
  const language = useLanguage();
  const run = useMutationToast();
  const [createRoom] = useCreateRoomMutation();
  const [updateRoom] = useUpdateRoomMutation();
  const [deleteRoom, { isLoading: deleting }] = useDeleteRoomMutation();
  const [createOpening] = useCreateOpeningMutation();
  const [updateOpening] = useUpdateOpeningMutation();
  const [deleteOpening] = useDeleteOpeningMutation();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useForm<Values, unknown, Output>({ resolver: zodResolver(roomSchema), values: toValues(room, floor) });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "openings" });
  const isNew = room === null;

  const onSubmit = async (v: Output) => {
    setFormError(null);
    setSaving(true);
    const isWet = v.wetMode === "auto" ? null : v.wetMode === "wet";
    try {
      if (isNew) {
        await createRoom({
          projectId,
          floorId: floor.id,
          body: {
            type: v.type,
            ...(v.name ? { name: v.name } : {}),
            lengthFt: v.lengthFt,
            widthFt: v.widthFt,
            heightFt: v.heightFt,
            ...(isWet !== null ? { isWet } : {}),
            openings: v.openings.map((o) => ({ type: o.type, widthFt: o.widthFt, heightFt: o.heightFt, quantity: o.quantity })),
          },
        }).unwrap();
        toast.success(`${v.name || ROOM_TYPE_LABEL[v.type]} added`);
        onCancelNew?.();
        return;
      }
      const dirty = form.formState.dirtyFields;
      if (dirty.type || dirty.name || dirty.lengthFt || dirty.widthFt || dirty.heightFt || dirty.wetMode) {
        await updateRoom({
          projectId,
          roomId: room.id,
          body: {
            type: v.type,
            ...(v.name ? { name: v.name } : {}),
            lengthFt: v.lengthFt,
            widthFt: v.widthFt,
            heightFt: v.heightFt,
            isWet,
          },
        }).unwrap();
      }
      const keptIds = new Set(v.openings.map((o) => o.id).filter(Boolean));
      for (const old of room.openings) {
        if (!keptIds.has(old.id)) await deleteOpening({ projectId, openingId: old.id }).unwrap();
      }
      for (const o of v.openings) {
        const body = { type: o.type, widthFt: o.widthFt, heightFt: o.heightFt, quantity: o.quantity };
        if (!o.id) await createOpening({ projectId, roomId: room.id, body }).unwrap();
        else {
          const old = room.openings.find((x) => x.id === o.id);
          if (old && (old.type !== o.type || old.widthFt !== o.widthFt || old.heightFt !== o.heightFt || old.quantity !== o.quantity)) {
            await updateOpening({ projectId, openingId: o.id, body }).unwrap();
          }
        }
      }
      toast.success(`${v.name || ROOM_TYPE_LABEL[v.type]} saved`);
    } catch (err) {
      setFormError(getErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  };

  const dirty = form.formState.isDirty;

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("space-y-4 rounded-xl border bg-card p-4 shadow-card", isNew && "border-primary/50 ring-1 ring-primary/30")}
        aria-label={isNew ? "New room" : `Room ${room.name}`}
      >
        <div className="flex flex-wrap items-start gap-3">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Controller
              name="type"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                  <SelectTrigger aria-label="Room type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROOM_TYPE_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Input aria-label="Room name" placeholder="Name (optional, e.g. Bedroom 2)" disabled={disabled} {...form.register("name")} />
          </div>
          <WetBadge />
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Length<span className="text-destructive">*</span>
            <NumberCell name="lengthFt" label="Length" unit="ft" disabled={disabled} />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Width<span className="text-destructive">*</span>
            <NumberCell name="widthFt" label="Width" unit="ft" disabled={disabled} />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Height<span className="text-destructive">*</span>
            <NumberCell name="heightFt" label="Height" unit="ft" disabled={disabled} />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Wet / dry
            <Controller
              name="wetMode"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                  <SelectTrigger aria-label="Wet or dry" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatic</SelectItem>
                    <SelectItem value="wet">Wet</SelectItem>
                    <SelectItem value="dry">Dry</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Openings</p>
          {fields.length ? (
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_90px_90px_70px_32px] items-center gap-2">
                  <Controller
                    name={`openings.${index}.type`}
                    control={form.control}
                    render={({ field: f }) => (
                      <Select value={f.value} onValueChange={f.onChange} disabled={disabled}>
                        <SelectTrigger size="sm" aria-label={`Opening ${index + 1} type`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(OPENING_LABEL).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <NumberCell name={`openings.${index}.widthFt`} label={`Opening ${index + 1} width`} unit="w" disabled={disabled} />
                  <NumberCell name={`openings.${index}.heightFt`} label={`Opening ${index + 1} height`} unit="h" disabled={disabled} />
                  <NumberCell name={`openings.${index}.quantity`} label={`Opening ${index + 1} quantity`} unit="×" decimals={0} disabled={disabled} />
                  <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} onClick={() => remove(index)} aria-label={`Remove opening ${index + 1}`}>
                    <X />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No doors or windows yet.</p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || fields.length >= 30}
            onClick={() => append({ type: "DOOR", widthFt: 3.5, heightFt: 7, quantity: 1 })}
          >
            <Plus data-icon="inline-start" />
            Add opening
          </Button>
        </div>

        {formError ? <InlineAlert>{formError}</InlineAlert> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <LiveCalc />
          {disabled ? null : (
            <div className="flex items-center gap-2">
              {isNew ? (
                <Button type="button" variant="ghost" size="sm" onClick={onCancelNew}>
                  Cancel
                </Button>
              ) : (
                <Button type="button" variant="ghost" size="icon-sm" className="text-danger" aria-label="Delete room" onClick={() => setConfirmDelete(true)}>
                  <Trash2 />
                </Button>
              )}
              <Button type="submit" size="sm" disabled={saving || (!isNew && !dirty)}>
                {saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
                {isNew ? "Add room" : "Save"}
              </Button>
            </div>
          )}
        </div>
      </form>
      {room ? (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Delete ${room.name}?`}
          description="Its doors and windows are removed too."
          confirmLabel="Delete room"
          loading={deleting}
          onConfirm={async () => {
            const ok = await run(() => deleteRoom({ projectId, roomId: room.id }).unwrap(), { success: `${room.name} deleted` });
            if (ok !== undefined) setConfirmDelete(false);
          }}
        />
      ) : null}
    </FormProvider>
  );
}
