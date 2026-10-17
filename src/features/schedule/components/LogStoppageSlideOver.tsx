"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CloudRain,
  Factory,
  Hand,
  PackageX,
  PartyPopper,
  UsersRound,
  CircleHelp,
  Plus,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useCreateStoppageMutation } from "@/api/services/schedule.api";
import type { StoppageBody, StoppageReason } from "@/api/types";
import { SlideOver } from "@/components/common/SlideOver";
import { AttachmentField } from "@/components/forms/AttachmentField";
import { DateField } from "@/components/forms/DateField";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { useFieldError } from "@/components/forms/FormField";
import { RadioCards } from "@/components/forms/RadioCards";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { TextareaField } from "@/components/forms/TextareaField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useEnumT, useT } from "@/i18n/useT";
import { formatDate, todayPK } from "@/lib/dates";
import {
  noteRequired,
  photoRequired,
  stoppageSchema,
  type StoppageOutput,
  type StoppageValues,
} from "../schemas";

export const STOPPAGE_REASONS: { value: StoppageReason; icon: typeof CloudRain }[] = [
  { value: "RAIN", icon: CloudRain },
  { value: "SMOG_BAN", icon: Factory },
  { value: "HOLIDAY", icon: PartyPopper },
  { value: "OWNER_HOLD", icon: Hand },
  { value: "MATERIAL_SHORT", icon: PackageX },
  { value: "LABOUR_SHORT", icon: UsersRound },
  { value: "OTHER", icon: CircleHelp },
];

/** Separate days: a date input + "Add day", shown as removable chips. */
function DayList({ value, onChange }: { value: string[]; onChange: (dates: string[]) => void }) {
  const t = useT();
  const [day, setDay] = useState("");
  const error = useFieldError("dates");
  return (
    <div className="space-y-2">
      <Label htmlFor="stoppage-day">{t("schedule.log.day")}</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id="stoppage-day"
          type="date"
          className="w-44"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!day}
          onClick={() => {
            if (day && !value.includes(day)) onChange([...value, day].sort());
            setDay("");
          }}
        >
          <Plus data-icon="inline-start" />
          {t("schedule.log.addDay")}
        </Button>
      </div>
      {value.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((d) => (
            <li
              key={d}
              className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs"
            >
              {formatDate(d)}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== d))}
                aria-label={t("schedule.log.removeDay", { date: formatDate(d) })}
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

/** Log stoppage days (PENDING until the PM approves): photo required except HOLIDAY, note required for OTHER. */
export function LogStoppageSlideOver({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}) {
  const t = useT();
  const te = useEnumT();
  const today = todayPK();
  const [create, { isLoading }] = useCreateStoppageMutation();
  const run = useMutationToast();
  const schema = useMemo(() => stoppageSchema(today), [today]);
  const form = useForm<StoppageValues, unknown, StoppageOutput>({
    resolver: zodResolver(schema),
    defaultValues: { mode: "range", from: today, to: today, dates: [], reason: null, photo: null, note: "" },
  });
  const mode = useWatch({ control: form.control, name: "mode" });
  const reason = useWatch({ control: form.control, name: "reason" });
  const dates = useWatch({ control: form.control, name: "dates" });

  const onSubmit = async (v: StoppageOutput) => {
    const body: StoppageBody = {
      ...(v.mode === "range" ? { from: v.from, to: v.to } : { dates: v.dates }),
      reason: v.reason!,
      ...(v.note ? { note: v.note } : {}),
      ...(v.photo ? { photoAttachmentIds: [v.photo.id] } : {}),
    };
    const result = await run(() => create({ projectId, body }).unwrap(), {
      success: t("schedule.log.saved"),
      setError: form.setError,
      codeFields: {
        PHOTO_REQUIRED: "photo",
        NOTE_REQUIRED: "note",
        DATE_TOO_FAR: v.mode === "range" ? "to" : "dates",
        STOPPAGE_OVERLAP: v.mode === "range" ? "from" : "dates",
      },
    });
    if (result) {
      // QA-B-22: a stoppage on an off day counts 0 working days — say so instead of accepting it silently.
      if (result.warning === "NO_WORKING_DAYS") toast.warning(t("schedule.log.noWorkingDays"));
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t("schedule.log.title")}
      description={t("schedule.log.desc")}
      busy={isLoading}
      footer={
        <FormActions
          formId="stoppage-form"
          submitLabel={t("schedule.log.save")}
          loading={isLoading}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id="stoppage-form">
        <SegmentedField<"range" | "list">
          name="mode"
          label={t("schedule.log.mode")}
          options={[
            { value: "range", label: t("schedule.log.modeRange") },
            { value: "list", label: t("schedule.log.modeList") },
          ]}
        />
        {mode === "range" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField name="from" label={t("schedule.log.from")} required />
            <DateField name="to" label={t("schedule.log.to")} required />
          </div>
        ) : (
          <DayList
            value={dates ?? []}
            onChange={(d) =>
              form.setValue("dates", d, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })
            }
          />
        )}
        <RadioCards<StoppageReason>
          name="reason"
          label={t("schedule.log.reason")}
          required
          columns={2}
          options={STOPPAGE_REASONS.map((r) => ({
            value: r.value,
            title: te("stoppageReason", r.value),
            icon: r.icon,
          }))}
        />
        {photoRequired(reason) || !reason ? (
          <AttachmentField
            name="photo"
            label={t("schedule.log.photo")}
            kind="SITE_PHOTO"
            required={photoRequired(reason)}
            hint={t("schedule.log.photoHint")}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t("schedule.log.photoNotNeeded")}</p>
        )}
        <TextareaField
          name="note"
          label={noteRequired(reason) ? t("schedule.log.noteOther") : t("schedule.log.note")}
          required={noteRequired(reason)}
          rows={2}
          maxLength={500}
        />
      </Form>
    </SlideOver>
  );
}
