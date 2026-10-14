"use client";

import {
  CalendarCheck,
  HardHat,
  Lock,
  Pencil,
  Plus,
  Ruler,
  Save,
  Timer,
  Trash2,
  Undo2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useGetAttendanceQuery,
  useGetProjectWorkersQuery,
  useGetSubcontractsQuery,
  useGetTodayAttendanceQuery,
  useMarkAttendanceMutation,
  useRemoveProjectWorkerMutation,
  useUpdateProjectWorkerMutation,
} from "@/api/services/labor.api";
import type { AttendanceStatus, ProjectWorker, SubcontractAssignment } from "@/api/types";
import { AttendanceGrid, type AttendanceGridRow, type HazriMark } from "@/components/common/AttendanceGrid";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { usePermissions } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { LateSyncBadge } from "@/components/common/LateSyncBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { WeekPicker } from "@/components/common/WeekPicker";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatDate, todayPK } from "@/lib/dates";
import { useWorkerTypeName } from "@/hooks/useWorkerTypes";
import { formatPKR, sumPaisa } from "@/lib/money";
import { projectHref } from "@/lib/navigation";
import { addDays, formatWeekRange, weekDates, type WeekDayName } from "@/lib/weeks";
import {
  AdvanceSlideOver,
  AssignSubcontractSlideOver,
  AssignWorkerSlideOver,
  MeasurementSlideOver,
  useIsMunshi,
} from "../components/LaborSlideOvers";
import { useLaborLabels } from "../options";
import { useT, type TranslationKey } from "@/i18n/useT";

const STATUS_TEXT: Record<AttendanceStatus, TranslationKey> = {
  FULL: "labor.hazri.fullDay",
  HALF: "labor.hazri.halfDay",
  ABSENT: "labor.hazri.absent",
};

// ─── Team on Site ───────────────────────────────────────────────────────────

function RateDialog({ worker, onClose }: { worker: ProjectWorker | null; onClose: () => void }) {
  const t = useT();
  const [value, setValue] = useState<string | null>(null);
  const [update, { isLoading }] = useUpdateProjectWorkerMutation();
  const run = useMutationToast();
  if (!worker) return null;
  const save = async () => {
    if (!value) return;
    const ok = await run(() => update({ id: worker.id, body: { dailyRatePaisa: value } }).unwrap(), {
      success: t("labor.team.rateSaved", { name: worker.worker.name, rate: formatPKR(value) }),
    });
    if (ok) onClose();
  };
  return (
    <Dialog open onOpenChange={(open) => (!open && !isLoading ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("labor.team.rateTitle", { name: worker.worker.name })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="rate-input">{t("labor.team.ratePerDay")}</Label>
          <MoneyInput
            id="rate-input"
            value={value ?? worker.dailyRatePaisa}
            onChange={setValue}
            suffix={t("labor.common.perDay")}
          />
          <p className="text-xs text-muted-foreground">
            {t("labor.team.rateHint", { rate: formatPKR(worker.defaultRatePaisa) })}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void save()} disabled={!value || isLoading}>
            {t("labor.team.saveRate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TeamOnSiteView({ projectId }: { projectId: string }) {
  const t = useT();
  const labels = useLaborLabels();
  const typeName = useWorkerTypeName();
  const { can } = usePermissions();
  const office = can("labor.team.edit");
  const canAssign = can("labor.team.create");
  const canSubcontract = can("labor.subcontract.create");
  const munshi = useIsMunshi();
  const workers = useGetProjectWorkersQuery({ projectId });
  const subs = useGetSubcontractsQuery({ projectId });
  const today = useGetTodayAttendanceQuery(projectId);
  const [remove, { isLoading: removing }] = useRemoveProjectWorkerMutation();
  const run = useMutationToast();
  const [open, setOpen] = useState<"worker" | "sub" | "peshgi" | "measure" | null>(null);
  const [rateFor, setRateFor] = useState<ProjectWorker | null>(null);
  const [removeFor, setRemoveFor] = useState<ProjectWorker | null>(null);
  const [peshgiFor, setPeshgiFor] = useState<string | undefined>();
  const [measureFor, setMeasureFor] = useState<string | undefined>();

  const active = (workers.data ?? []).filter((w) => w.isActive);
  const marks = new Map((today.data?.workers ?? []).map((w) => [w.worker.id, w.status]));
  const lateToday = new Set((today.data?.workers ?? []).filter((w) => w.lateSync).map((w) => w.worker.id));

  const workerColumns: Column<ProjectWorker>[] = [
    {
      id: "name",
      header: t("field.worker"),
      sortValue: (w) => w.worker.name,
      cell: (w) => (
        <div>
          <p className="font-medium">{w.worker.name}</p>
          <p className="text-xs text-muted-foreground">
            <bdi>{typeName(w.worker.type)}</bdi>
          </p>
        </div>
      ),
    },
    {
      id: "rate",
      header: t("labor.common.rateDay"),
      align: "right",
      sortValue: (w) => Number(w.dailyRatePaisa),
      cell: (w) => (
        <span className="inline-flex items-center gap-2">
          <MoneyText paisa={w.dailyRatePaisa} />
          {w.rateOverridden ? <StatusBadge tone="info" label={t("labor.team.projectRate")} /> : null}
        </span>
      ),
    },
    { id: "since", header: t("labor.team.since"), cell: (w) => formatDate(w.startDate) },
    {
      id: "today",
      header: t("common.today"),
      cell: (w) => {
        const s = marks.get(w.worker.id);
        return !w.isActive ? (
          <StatusBadge tone="neutral" label={t("labor.team.left", { date: formatDate(w.endDate) })} />
        ) : s ? (
          <span className="inline-flex flex-wrap gap-1">
            <StatusBadge
              tone={s === "ABSENT" ? "danger" : s === "HALF" ? "warning" : "success"}
              label={t(STATUS_TEXT[s])}
            />
            {lateToday.has(w.worker.id) ? <LateSyncBadge /> : null}
          </span>
        ) : (
          <span className="text-muted-foreground">{t("labor.team.notMarked")}</span>
        );
      },
    },
    {
      ...ACTIONS_COLUMN,
      cell: (w) =>
        w.isActive ? (
          <RowActions
            name={w.worker.name}
            actions={[
              {
                label: t("field.peshgi"),
                icon: Wallet,
                onSelect: () => {
                  setPeshgiFor(w.worker.id);
                  setOpen("peshgi");
                },
              },
              { label: t("labor.team.changeRate"), icon: Pencil, hidden: !office, onSelect: () => setRateFor(w) },
              { label: t("action.remove"), icon: Trash2, destructive: true, separatorBefore: true, hidden: !office, onSelect: () => setRemoveFor(w) },
            ]}
          />
        ) : null,
    },
  ];

  const subColumns: Column<SubcontractAssignment>[] = [
    {
      id: "name",
      header: t("field.subcontractor"),
      cell: (s) => (
        <div>
          <p className="font-medium">{s.subcontractor.name}</p>
          <p className="text-xs text-muted-foreground">{s.scope}</p>
        </div>
      ),
    },
    { id: "paid", header: t("field.paid"), cell: (s) => labels.rateType(s.rateType) },
    {
      id: "rate",
      header: t("labor.team.rateValue"),
      align: "right",
      hidden: munshi,
      cell: (s) =>
        s.rateType === "LUMPSUM" ? (
          <MoneyText paisa={s.contractValuePaisa ?? undefined} />
        ) : (
          <span>
            <MoneyText paisa={s.ratePaisa ?? undefined} /> {t("labor.common.perUnit", { unit: labels.unit(s.unit) })}
          </span>
        ),
    },
    {
      id: "progress",
      header: t("field.progress"),
      align: "right",
      cell: (s) => (s.rateType === "LUMPSUM" ? `${s.progressPercent}%` : "—"),
    },
    { id: "status", header: t("field.status"), cell: (s) => <StatusBadge domain="active" value={s.isActive} /> },
    {
      ...ACTIONS_COLUMN,
      cell: (s) =>
        s.isActive && s.rateType !== "LUMPSUM" ? (
          <RowActions
            name={s.subcontractor.name}
            actions={[
              {
                label: t("labor.team.measure"),
                icon: Ruler,
                onSelect: () => {
                  setMeasureFor(s.id);
                  setOpen("measure");
                },
              },
            ]}
          />
        ) : null,
    },
  ];

  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("labor.team.crumb")}
      actions={(project) =>
        project.status === "ACTIVE" || project.status === "CLOSEOUT" ? (
          <>
            {canAssign ? (
              <Button onClick={() => setOpen("worker")}>
                <UserPlus data-icon="inline-start" />
                {t("labor.team.assignWorker")}
              </Button>
            ) : null}
            {canSubcontract ? (
              <Button variant="outline" onClick={() => setOpen("sub")}>
                <Plus data-icon="inline-start" />
                {t("labor.assignSub.submit")}
              </Button>
            ) : null}
          </>
        ) : null
      }
    >
      {(project) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label={t("labor.team.kpiWorkers")} icon={Users} value={active.length} loading={workers.isLoading} />
            <KpiCard
              label={t("labor.team.kpiHazri")}
              icon={CalendarCheck}
              value={today.data ? `${today.data.full + today.data.half} / ${today.data.assigned}` : "—"}
              hint={
                today.data ? t("labor.team.kpiHazriHint", { unmarked: today.data.unmarked, absent: today.data.absent }) : undefined
              }
              loading={today.isLoading}
              tone={today.data?.unmarked ? "warning" : "success"}
            />
            <KpiCard
              label={t("labor.team.kpiWageBill")}
              icon={Wallet}
              value={formatPKR(sumPaisa(active.map((w) => w.dailyRatePaisa)))}
              hint={t("labor.team.kpiWageBillHint")}
              loading={workers.isLoading}
            />
            <KpiCard
              label={t("labor.common.subContracts")}
              icon={HardHat}
              value={(subs.data ?? []).filter((s) => s.isActive).length}
              loading={subs.isLoading}
            />
          </div>
          <SectionCard
            flush
            title={t("labor.team.dailyWorkers")}
            actions={
              <Button size="sm" variant="outline" asChild>
                <Link href={projectHref(project.id, "/labor/hazri")}>
                  <CalendarCheck data-icon="inline-start" />
                  {t("labor.team.hazriRegister")}
                </Link>
              </Button>
            }
          >
            <DataTable
              rows={workers.data}
              getRowId={(w) => w.id}
              loading={workers.isLoading}
              error={workers.error}
              onRetry={workers.refetch}
              columns={workerColumns}
              empty={{
                title: t("labor.team.emptyTitle"),
                description: t("labor.team.emptyDesc"),
                icon: Users,
              }}
            />
          </SectionCard>
          <SectionCard
            flush
            title={t("labor.common.subContracts")}
            description={
              munshi ? t("labor.team.munshiSubsDesc") : undefined
            }
          >
            <DataTable
              rows={subs.data}
              getRowId={(s) => s.id}
              loading={subs.isLoading}
              error={subs.error}
              onRetry={subs.refetch}
              columns={subColumns}
              empty={{ title: t("labor.common.noSubContractsYet"), icon: HardHat, compact: true }}
            />
          </SectionCard>
          <AssignWorkerSlideOver
            open={open === "worker"}
            onOpenChange={(o) => setOpen(o ? "worker" : null)}
            projectId={project.id}
          />
          <AssignSubcontractSlideOver
            open={open === "sub"}
            onOpenChange={(o) => setOpen(o ? "sub" : null)}
            projectId={project.id}
          />
          {open === "peshgi" ? (
            <AdvanceSlideOver
              open
              onOpenChange={(o) => setOpen(o ? "peshgi" : null)}
              projectId={project.id}
              defaultWorkerId={peshgiFor}
            />
          ) : null}
          {open === "measure" ? (
            <MeasurementSlideOver
              open
              onOpenChange={(o) => setOpen(o ? "measure" : null)}
              projectId={project.id}
              defaultAssignmentId={measureFor}
            />
          ) : null}
          {rateFor ? <RateDialog worker={rateFor} onClose={() => setRateFor(null)} /> : null}
          <ConfirmDialog
            open={!!removeFor}
            onOpenChange={(o) => (!o ? setRemoveFor(null) : undefined)}
            title={t("labor.team.removeTitle", { name: removeFor?.worker.name ?? "" })}
            description={t("labor.team.removeDesc")}
            confirmLabel={t("action.remove")}
            loading={removing}
            onConfirm={async () => {
              const r = await run(() => remove(removeFor!.id).unwrap());
              if (r) {
                toast.success(r.removed ? t("labor.team.removed") : t("labor.team.takenOff"));
                setRemoveFor(null);
              }
            }}
          />
        </>
      )}
    </ProjectPageShell>
  );
}

// ─── Hazri register ─────────────────────────────────────────────────────────

/** Munshis fill hazri for the last 7 days only (the server enforces it too). */
const MUNSHI_DAYS_BACK = 7;

export function HazriView({ projectId }: { projectId: string }) {
  const t = useT();
  const typeName = useWorkerTypeName();
  const munshi = useIsMunshi();
  const [week, setWeek] = useState<string | null>(null);
  const grid = useGetAttendanceQuery({ projectId, ...(week ? { from: week, to: addDays(week, 6) } : {}) });
  const today = useGetTodayAttendanceQuery(projectId);
  const [mark, { isLoading: saving }] = useMarkAttendanceMutation();
  const run = useMutationToast();
  const [pending, setPending] = useState<Record<string, Record<string, HazriMark>>>({});
  const [overtime, setOvertime] = useState(false);

  const weekStart = week ?? grid.data?.from ?? null;
  const weekDay = (grid.data?.weekStart ?? "MONDAY") as WeekDayName;
  const dates = weekStart ? weekDates(weekStart) : [];
  const locked = grid.data?.weeks.find((w) => w.weekStart === weekStart && w.locked);
  const todayDate = todayPK();
  const oldest = munshi ? addDays(todayDate, -MUNSHI_DAYS_BACK) : "0000-00-00";
  const canEdit = (date: string) => !locked && date <= todayDate && date >= oldest;
  const changes = Object.values(pending).reduce((n, days) => n + Object.keys(days).length, 0);
  const [addBefore = "", addAfter = ""] = t("labor.hazri.addThemIn").split("{link}");

  const rows: AttendanceGridRow[] = useMemo(
    () =>
      (grid.data?.workers ?? []).map((w) => ({
        id: w.worker.id,
        name: w.worker.name,
        subtitle: `${typeName(w.worker.type)} · ${formatPKR(w.dailyRatePaisa)}`,
        days: { ...w.days, ...(pending[w.worker.id] ?? {}) },
      })),
    [grid.data, pending, typeName],
  );

  const onChange = (workerId: string, date: string, value: HazriMark) =>
    setPending((p) => ({ ...p, [workerId]: { ...(p[workerId] ?? {}), [date]: value } }));

  /** Everyone on site not yet marked today → present. */
  const markToday = () => {
    const ids = (today.data?.workers ?? []).filter((w) => w.status === null).map((w) => w.worker.id);
    if (!ids.length) {
      toast.info(t("labor.hazri.everyoneMarked"));
      return;
    }
    setPending((p) => {
      const next = { ...p };
      for (const id of ids)
        next[id] = { ...(next[id] ?? {}), [todayDate]: { status: "FULL", overtimeHours: 0 } };
      return next;
    });
    if (weekStart && !dates.includes(todayDate)) setWeek(null);
  };

  const save = async () => {
    const byDate = new Map<
      string,
      Array<{ workerId: string; status: AttendanceStatus; overtimeHours: number }>
    >();
    for (const [workerId, days] of Object.entries(pending)) {
      for (const [date, m] of Object.entries(days))
        byDate.set(date, [
          ...(byDate.get(date) ?? []),
          { workerId, status: m.status, overtimeHours: m.overtimeHours },
        ]);
    }
    for (const [date, entries] of [...byDate.entries()].sort()) {
      const ok = await run(() =>
        mark({ projectId, body: { date, entries, deviceCreatedAt: new Date().toISOString() } }).unwrap(),
      );
      if (!ok) return;
      setPending((p) => {
        const next: typeof p = {};
        for (const [w, days] of Object.entries(p)) {
          const rest = Object.fromEntries(Object.entries(days).filter(([d]) => d !== date));
          if (Object.keys(rest).length) next[w] = rest;
        }
        return next;
      });
    }
    toast.success(t("labor.hazri.saved"));
  };

  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("labor.hazri.crumb")}
      actions={(project) =>
        project.status === "ACTIVE" || project.status === "CLOSEOUT" ? (
          <Button variant="outline" onClick={markToday} disabled={!today.data?.assigned}>
            <CalendarCheck data-icon="inline-start" />
            {t("labor.hazri.markToday")}
          </Button>
        ) : null
      }
    >
      {(project) => (
        <>
          {today.data ? (
            <div className="flex flex-wrap gap-2" aria-label={t("common.today")}>
              <StatusBadge tone="success" label={t("labor.hazri.nFull", { n: today.data.full })} />
              <StatusBadge tone="warning" label={t("labor.hazri.nHalf", { n: today.data.half })} />
              <StatusBadge tone="danger" label={t("labor.hazri.nAbsent", { n: today.data.absent })} />
              <StatusBadge
                tone={today.data.unmarked ? "info" : "neutral"}
                label={t("labor.hazri.nNotMarked", { n: today.data.unmarked })}
              />
              {!today.data.workingDay ? <StatusBadge tone="neutral" label={t("labor.hazri.notWorkingDay")} /> : null}
            </div>
          ) : null}
          <SectionCard
            flush
            title={weekStart ? formatWeekRange(weekStart) : t("labor.hazri.title")}
            description={t("labor.hazri.howTo")}
          >
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-3">
                {weekStart ? (
                  <WeekPicker
                    value={weekStart}
                    weekStartDay={weekDay}
                    onChange={(w) => {
                      if (changes && !window.confirm(t("labor.hazri.discardConfirm"))) return;
                      setPending({});
                      setWeek(w);
                    }}
                  />
                ) : null}
                <label className="inline-flex items-center gap-2 text-sm">
                  <Switch checked={overtime} onCheckedChange={setOvertime} aria-label={t("labor.hazri.overtime")} />
                  <Timer className="size-4 text-muted-foreground" aria-hidden />
                  {t("labor.hazri.overtime")}
                </label>
              </div>
              {locked ? (
                <InlineAlert
                  tone="warning"
                  title={locked.status === "APPROVED" ? t("labor.hazri.lockedApproved") : t("labor.hazri.lockedWaiting")}
                >
                  <span className="inline-flex items-center gap-1">
                    <Lock className="size-3.5" aria-hidden /> {t("labor.hazri.lockedBody")}
                  </span>{" "}
                  <Link
                    className="underline"
                    href={projectHref(project.id, `/labor/settlements/${locked.settlementId}`)}
                  >
                    {t("labor.hazri.openSettlement")}
                  </Link>
                </InlineAlert>
              ) : munshi ? (
                <p className="text-xs text-muted-foreground">
                  {t("labor.hazri.munshiDays", { n: MUNSHI_DAYS_BACK })}
                </p>
              ) : null}
              {grid.isLoading ? (
                <CardsSkeleton count={1} height="h-72" />
              ) : rows.length === 0 ? (
                <InlineAlert tone="info" title={t("labor.hazri.noWorkers")}>
                  {addBefore}
                  <Link className="underline" href={projectHref(project.id, "/labor/team")}>
                    {t("labor.team.crumb")}
                  </Link>
                  {addAfter}
                </InlineAlert>
              ) : (
                <AttendanceGrid
                  dates={dates}
                  rows={rows}
                  onChange={onChange}
                  canEdit={canEdit}
                  overtimeMode={overtime}
                  workingDays={undefined}
                  today={todayDate}
                />
              )}
            </div>
          </SectionCard>
          {changes ? (
            <div className="sticky bottom-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-card">
              <p className="text-sm">
                {changes === 1 ? t("labor.hazri.unsavedOne") : t("labor.hazri.unsavedMany", { n: changes })}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPending({})} disabled={saving}>
                  <Undo2 data-icon="inline-start" />
                  {t("action.discard")}
                </Button>
                <Button onClick={() => void save()} disabled={saving}>
                  <Save data-icon="inline-start" />
                  {t("labor.hazri.save")}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </ProjectPageShell>
  );
}
