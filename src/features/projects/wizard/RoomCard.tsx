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
import { useEnumT, useLanguage, useT } from "@/i18n/useT";
import { getErrorMessage } from "@/lib/apiErrors";
import { cn } from "@/lib/cn";
import { OPENING_TYPES, ROOM_TYPES } from "../constants";
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
  const t = useT();
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular" aria-live="polite">
      <span>
        {t("projects.room.floor")} <strong className="text-foreground">{formatArea(c.floorAreaSqft)}</strong> {t("projects.unit.sqft")}
      </span>
      <span>
        {t("projects.room.wall")} <strong className="text-foreground">{formatArea(c.grossWallAreaSqft)}</strong>
      </span>
      <span>
        {t("projects.mode.openings")} <strong className="text-foreground">−{formatArea(c.openingsAreaSqft)}</strong>
      </span>
      <span>
        {t("projects.mode.netWall")} <strong className="text-primary">{formatArea(c.netWallAreaSqft)}</strong>
      </span>
    </p>
  );
}

function WetBadge() {
  const [type, wetMode] = useWatch({ name: ["type", "wetMode"] }) as [string, Values["wetMode"]];
  const wet = wetMode === "auto" ? isWetType(type) : wetMode === "wet";
  const t = useT();
  const label = wetMode === "auto" ? t(wet ? "projects.room.wetAuto" : "projects.room.dryAuto") : t(wet ? "projects.mode.wet" : "projects.mode.dry");
  return <StatusBadge tone={wet ? "info" : "neutral"} icon={wet ? Droplets : undefined} label={label} />;
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
  const t = useT();
  const te = useEnumT();
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
        toast.success(t("projects.room.added", { name: v.name || te("projectRoomType", v.type) }));
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
      toast.success(t("projects.room.saved", { name: v.name || te("projectRoomType", v.type) }));
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
        aria-label={isNew ? t("projects.room.newRoom") : t("projects.room.roomAria", { name: room.name })}
      >
        <div className="flex flex-wrap items-start gap-3">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Controller
              name="type"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                  <SelectTrigger aria-label={t("projects.room.roomType")} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {te("projectRoomType", value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Input aria-label={t("projects.room.roomName")} placeholder={t("projects.room.namePlaceholder")} disabled={disabled} {...form.register("name")} />
          </div>
          <WetBadge />
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            {t("projects.room.length")}<span className="text-destructive">*</span>
            <NumberCell name="lengthFt" label={t("projects.room.length")} unit={t("projects.unit.ft")} disabled={disabled} />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            {t("projects.room.width")}<span className="text-destructive">*</span>
            <NumberCell name="widthFt" label={t("projects.room.width")} unit={t("projects.unit.ft")} disabled={disabled} />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            {t("projects.room.height")}<span className="text-destructive">*</span>
            <NumberCell name="heightFt" label={t("projects.room.height")} unit={t("projects.unit.ft")} disabled={disabled} />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            {t("projects.room.wetDry")}
            <Controller
              name="wetMode"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                  <SelectTrigger aria-label={t("projects.room.wetOrDry")} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t("projects.room.automatic")}</SelectItem>
                    <SelectItem value="wet">{t("projects.mode.wet")}</SelectItem>
                    <SelectItem value="dry">{t("projects.mode.dry")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">{t("projects.mode.openings")}</p>
          {fields.length ? (
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_90px_90px_70px_32px] items-center gap-2">
                  <Controller
                    name={`openings.${index}.type`}
                    control={form.control}
                    render={({ field: f }) => (
                      <Select value={f.value} onValueChange={f.onChange} disabled={disabled}>
                        <SelectTrigger size="sm" aria-label={t("projects.room.openingType", { n: index + 1 })} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPENING_TYPES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {te("projectOpeningType", value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <NumberCell name={`openings.${index}.widthFt`} label={t("projects.room.openingWidth", { n: index + 1 })} unit={t("projects.unit.width")} disabled={disabled} />
                  <NumberCell name={`openings.${index}.heightFt`} label={t("projects.room.openingHeight", { n: index + 1 })} unit={t("projects.unit.height")} disabled={disabled} />
                  <NumberCell name={`openings.${index}.quantity`} label={t("projects.room.openingQty", { n: index + 1 })} unit="×" decimals={0} disabled={disabled} />
                  <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} onClick={() => remove(index)} aria-label={t("projects.room.removeOpening", { n: index + 1 })}>
                    <X />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("projects.room.noOpenings")}</p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || fields.length >= 30}
            onClick={() => append({ type: "DOOR", widthFt: 3.5, heightFt: 7, quantity: 1 })}
          >
            <Plus data-icon="inline-start" />
            {t("projects.room.addOpening")}
          </Button>
        </div>

        {formError ? <InlineAlert>{formError}</InlineAlert> : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <LiveCalc />
          {disabled ? null : (
            <div className="flex items-center gap-2">
              {isNew ? (
                <Button type="button" variant="ghost" size="sm" onClick={onCancelNew}>
                  {t("common.cancel")}
                </Button>
              ) : (
                <Button type="button" variant="ghost" size="icon-sm" className="text-danger" aria-label={t("projects.room.deleteRoom")} onClick={() => setConfirmDelete(true)}>
                  <Trash2 />
                </Button>
              )}
              <Button type="submit" size="sm" disabled={saving || (!isNew && !dirty)}>
                {saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
                {isNew ? t("projects.rooms.addRoom") : t("common.save")}
              </Button>
            </div>
          )}
        </div>
      </form>
      {room ? (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={t("projects.room.deleteTitle", { name: room.name })}
          description={t("projects.room.deleteDesc")}
          confirmLabel={t("projects.room.deleteRoom")}
          loading={deleting}
          onConfirm={async () => {
            const ok = await run(() => deleteRoom({ projectId, roomId: room.id }).unwrap(), { success: t("projects.room.deleted", { name: room.name }) });
            if (ok !== undefined) setConfirmDelete(false);
          }}
        />
      ) : null}
    </FormProvider>
  );
}
