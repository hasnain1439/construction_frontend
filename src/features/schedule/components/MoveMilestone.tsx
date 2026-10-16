"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useUpdateMilestoneMutation } from "@/api/services/schedule.api";
import type { Milestone, MilestoneEditResult } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useLanguage, useT } from "@/i18n/useT";
import { getErrorMessage } from "@/lib/apiErrors";
import { formatDate } from "@/lib/dates";

interface Pending {
  milestone: Milestone;
  date: string | null;
  preview: MilestoneEditResult;
}

/**
 * Moving a milestone's start (Gantt drag or the panel's date field): first a dry run shows which
 * successors move and the new planned end, then "Save new dates" saves it (schedule.plan.manage).
 */
export function useMoveMilestone(projectId: string) {
  const t = useT();
  const language = useLanguage();
  const [update, { isLoading }] = useUpdateMilestoneMutation();
  const run = useMutationToast();
  const [pending, setPending] = useState<Pending | null>(null);
  const [checking, setChecking] = useState(false);

  const request = async (milestone: Milestone, date: string | null) => {
    setChecking(true);
    try {
      const preview = await update({
        id: milestone.id,
        projectId,
        body: { startNoEarlierThan: date, dryRun: true },
      }).unwrap();
      setPending({ milestone, date, preview });
    } catch (error) {
      toast.error(getErrorMessage(error, language));
    } finally {
      setChecking(false);
    }
  };

  const confirm = async () => {
    if (!pending) return;
    const ok = await run(
      () =>
        update({ id: pending.milestone.id, projectId, body: { startNoEarlierThan: pending.date } }).unwrap(),
      { success: t("schedule.shift.saved") },
    );
    if (ok) setPending(null);
  };

  const others = pending ? pending.preview.shifted.filter((s) => s.id !== pending.milestone.id) : [];
  const end = pending?.preview.plannedEnd;

  const dialog = (
    <ConfirmDialog
      open={Boolean(pending)}
      onOpenChange={(o) => !o && setPending(null)}
      tone="default"
      title={t("schedule.shift.title", { name: pending?.milestone.name ?? "" })}
      description={
        pending?.date
          ? t("schedule.shift.desc", { date: formatDate(pending.date) })
          : t("schedule.shift.clearDesc")
      }
      confirmLabel={t("schedule.shift.confirm")}
      loading={isLoading}
      onConfirm={confirm}
    >
      <div className="space-y-3 text-sm" data-testid="shift-preview">
        {others.length ? (
          <>
            <p className="font-medium">{t("schedule.shift.moves")}</p>
            <div className="max-h-56 overflow-y-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-start font-medium">{t("schedule.shift.colMilestone")}</th>
                    <th className="px-2 py-1.5 text-start font-medium">{t("schedule.shift.colStart")}</th>
                    <th className="px-2 py-1.5 text-start font-medium">{t("schedule.shift.colEnd")}</th>
                  </tr>
                </thead>
                <tbody>
                  {others.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-2 py-1.5">
                        <bdi>{s.name}</bdi>
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(s.plannedStart.to)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(s.plannedEnd.to)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">{t("schedule.shift.none")}</p>
        )}
        {end && end.from !== end.to ? (
          <p className="font-medium">
            {t("schedule.shift.endChange", { from: formatDate(end.from), to: formatDate(end.to) })}
          </p>
        ) : null}
      </div>
    </ConfirmDialog>
  );

  return { request, checking, dialog };
}
