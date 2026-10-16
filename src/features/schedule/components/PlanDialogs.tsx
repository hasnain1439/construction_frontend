"use client";

import { CalendarRange, Calculator, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useGenerateScheduleMutation, useReplanScheduleMutation } from "@/api/services/schedule.api";
import type { ScheduleDetail } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useLanguage, useT } from "@/i18n/useT";
import { getErrorMessage } from "@/lib/apiErrors";
import { todayPK } from "@/lib/dates";
import { projectHref } from "@/lib/navigation";

/** "Approve an estimate first" with a link to Planning → Estimate. */
export function NeedEstimateAlert({ projectId }: { projectId: string }) {
  const t = useT();
  return (
    <InlineAlert
      tone="warning"
      title={t("schedule.empty.needEstimateTitle")}
      action={
        <Button asChild size="sm" variant="outline">
          <Link href={projectHref(projectId, "/planning/estimate")}>
            <Calculator data-icon="inline-start" />
            {t("schedule.empty.openEstimate")}
          </Link>
        </Button>
      }
    >
      {t("schedule.empty.needEstimateDesc")}
    </InlineAlert>
  );
}

const clampTeams = (value: string) => Math.min(6, Math.max(1, Math.round(Number(value) || 1)));

/** No schedule yet: generate it from the APPROVED estimate (409 NO_APPROVED_ESTIMATE → link to the estimate). */
export function ScheduleEmpty({
  detail,
  projectId,
  canGenerate,
}: {
  detail: ScheduleDetail;
  projectId: string;
  canGenerate: boolean;
}) {
  const t = useT();
  const language = useLanguage();
  const [generate, { isLoading }] = useGenerateScheduleMutation();
  const run = useMutationToast();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(detail.project.startDate ?? todayPK());
  const [teams, setTeams] = useState("1");
  const [note, setNote] = useState("");
  const [needEstimate, setNeedEstimate] = useState(!detail.canGenerate);
  const [dateError, setDateError] = useState<string | null>(null);

  const submit = async () => {
    setDateError(null);
    const result = await run(
      () =>
        generate({
          projectId,
          body: { startDate, teams: clampTeams(teams), ...(note.trim() ? { note: note.trim() } : {}) },
        }).unwrap(),
      {
        success: (r) => t("schedule.generate.done", { n: r.milestones.length }),
        onError: (code, error) => {
          if (code === "NO_APPROVED_ESTIMATE") {
            setNeedEstimate(true);
            setOpen(false);
            return true;
          }
          if (code === "NO_START_DATE" || code === "VALIDATION_ERROR") {
            setDateError(getErrorMessage(error, language));
            return true;
          }
          return false;
        },
      },
    );
    if (result) setOpen(false);
  };

  return (
    <SectionCard>
      <EmptyState
        icon={CalendarRange}
        title={canGenerate ? t("schedule.empty.title") : t("schedule.empty.waitTitle")}
        description={t("schedule.empty.desc")}
        action={
          needEstimate ? (
            <NeedEstimateAlert projectId={projectId} />
          ) : canGenerate ? (
            <Button onClick={() => setOpen(true)}>
              <CalendarRange data-icon="inline-start" />
              {t("schedule.generate.action")}
            </Button>
          ) : null
        }
      />
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="default"
        title={t("schedule.generate.title")}
        description={t("schedule.generate.desc", { rev: detail.approvedEstimate?.revision ?? "—" })}
        confirmLabel={t("schedule.generate.action")}
        confirmDisabled={!startDate}
        loading={isLoading}
        onConfirm={submit}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="gen-start">{t("schedule.generate.startDate")}</Label>
            <Input
              id="gen-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-invalid={dateError ? true : undefined}
              aria-describedby={dateError ? "gen-start-error" : undefined}
            />
            {dateError ? (
              <p id="gen-start-error" className="text-xs text-danger">
                {dateError}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gen-teams">{t("schedule.generate.teams")}</Label>
            <Input
              id="gen-teams"
              type="number"
              min={1}
              max={6}
              className="w-24"
              value={teams}
              onChange={(e) => setTeams(e.target.value)}
              aria-describedby="gen-teams-hint"
            />
            <p id="gen-teams-hint" className="text-xs text-muted-foreground">
              {t("schedule.generate.teamsHint")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gen-note">{t("field.noteOptional")}</Label>
            <Textarea
              id="gen-note"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
      </ConfirmDialog>
    </SectionCard>
  );
}

/** Re-plan (from today by default); the baseline never changes. */
export function ReplanButton({ projectId, teams: currentTeams }: { projectId: string; teams: number }) {
  const t = useT();
  const [replan, { isLoading }] = useReplanScheduleMutation();
  const run = useMutationToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [fromToday, setFromToday] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [teams, setTeams] = useState(String(currentTeams));
  const [refreshBlocked, setRefreshBlocked] = useState(false);

  const submit = async () => {
    const result = await run(
      () =>
        replan({
          projectId,
          body: { note: note.trim(), fromToday, refreshQuantities: refresh, teams: clampTeams(teams) },
        }).unwrap(),
      {
        success: (r) => t("schedule.replan.done", { n: r.schedule?.version ?? "" }),
        onError: (code) => {
          if (code !== "NO_APPROVED_ESTIMATE") return false;
          setRefreshBlocked(true);
          return true;
        },
      },
    );
    if (result) {
      setOpen(false);
      setNote("");
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <RefreshCw data-icon="inline-start" />
        {t("schedule.replan.action")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="default"
        title={t("schedule.replan.title")}
        description={t("schedule.replan.desc")}
        confirmLabel={t("schedule.replan.action")}
        confirmDisabled={note.trim().length < 3}
        loading={isLoading}
        onConfirm={submit}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="replan-note">{t("schedule.replan.note")}</Label>
            <Textarea
              id="replan-note"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-required
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={fromToday}
              onCheckedChange={(v) => setFromToday(v === true)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">{t("schedule.replan.fromToday")}</span>
              <span className="block text-xs text-muted-foreground">
                {t("schedule.replan.fromTodayHint")}
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={refresh} onCheckedChange={(v) => setRefresh(v === true)} className="mt-0.5" />
            <span>
              <span className="font-medium">{t("schedule.replan.refresh")}</span>
              <span className="block text-xs text-muted-foreground">{t("schedule.replan.refreshHint")}</span>
            </span>
          </label>
          {refreshBlocked && refresh ? <NeedEstimateAlert projectId={projectId} /> : null}
          <div className="space-y-1.5">
            <Label htmlFor="replan-teams">{t("schedule.replan.teams")}</Label>
            <Input
              id="replan-teams"
              type="number"
              min={1}
              max={6}
              className="w-24"
              value={teams}
              onChange={(e) => setTeams(e.target.value)}
            />
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
}
