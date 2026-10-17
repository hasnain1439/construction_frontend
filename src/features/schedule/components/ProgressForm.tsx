"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useUpdateMilestoneProgressMutation } from "@/api/services/schedule.api";
import type { Milestone, MilestoneProgressBody, MilestoneStatus, ProgressWarning } from "@/api/types";
import { DateField } from "@/components/forms/DateField";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { NumberField } from "@/components/forms/NumberField";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { TextareaField } from "@/components/forms/TextareaField";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useStatusT, useT } from "@/i18n/useT";
import { msg } from "@/i18n/message";
import { todayPK } from "@/lib/dates";
import { nextStatuses, progressSchema, type ProgressValues } from "../schemas";

/** Text of a progress warning (never blocks the save). */
export function useWarningText() {
  const t = useT();
  return (w: ProgressWarning) =>
    w.code === "PREDECESSOR_NOT_DONE"
      ? t("schedule.progress.warnPredecessor", { names: w.details.milestones.map((m) => m.name).join(", ") })
      : t("schedule.progress.warnUnpaid", {
          stage: w.details.billingStage.label,
          invoices: w.details.stages.map((s) => s.invoiceNumber).join(", "),
        });
}

/** Site progress for one milestone: progress %, status (BLOCKED needs a note), date, note. */
export function ProgressForm({ milestone, projectId }: { milestone: Milestone; projectId: string }) {
  const t = useT();
  const ts = useStatusT();
  const warningText = useWarningText();
  const today = todayPK();
  const [save, { isLoading }] = useUpdateMilestoneProgressMutation();
  const run = useMutationToast();
  const schema = useMemo(() => progressSchema(milestone, today), [milestone, today]);
  const statuses = nextStatuses(milestone);
  const form = useForm<ProgressValues, unknown, ProgressValues>({
    resolver: zodResolver(schema),
    values: { progressPercent: milestone.progressPercent, status: "", date: today, note: "" },
  });
  const status = useWatch({ control: form.control, name: "status" });

  const onSubmit = async (v: ProgressValues) => {
    const body: MilestoneProgressBody = {
      ...(v.progressPercent !== null && v.progressPercent !== milestone.progressPercent
        ? { progressPercent: v.progressPercent }
        : {}),
      ...(v.status ? { status: v.status as MilestoneStatus } : {}),
      ...(v.note ? { note: v.note } : {}),
      date: v.date,
    };
    const result = await run(() => save({ id: milestone.id, projectId, body }).unwrap(), {
      success: t("schedule.progress.saved"),
      setError: form.setError,
      codeFields: { DATE_IN_FUTURE: "date" },
      onError: (code) => {
        if (code !== "NOTE_REQUIRED") return false;
        form.setError("note", { type: "server", message: msg("schedule.progress.noteRequired") });
        return true;
      },
    });
    if (result) {
      for (const w of result.warnings) toast.warning(warningText(w));
      form.reset({ progressPercent: result.milestone.progressPercent, status: "", date: today, note: "" });
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} id="milestone-progress-form" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          name="progressPercent"
          label={t("schedule.progress.percent")}
          unit="%"
          decimals={0}
          disabled={milestone.status === "DONE"}
        />
        <DateField
          name="date"
          label={t("schedule.progress.date")}
          hint={t("schedule.progress.dateHint")}
          max={today}
          required
        />
      </div>
      {statuses.length ? (
        <SegmentedField<string>
          name="status"
          label={t("schedule.progress.status")}
          options={[
            { value: "", label: t("schedule.progress.keepStatus") },
            ...statuses.map((s) => ({ value: s, label: ts("milestone", s) })),
          ]}
        />
      ) : null}
      <TextareaField
        name="note"
        label={status === "BLOCKED" ? t("schedule.progress.noteBlocked") : t("schedule.progress.note")}
        required={status === "BLOCKED"}
        rows={2}
        maxLength={500}
      />
      <FormActions submitLabel={t("schedule.progress.save")} loading={isLoading} />
    </Form>
  );
}
