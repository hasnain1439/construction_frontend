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
import { useCan } from "@/components/common/PermissionGate";
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
import { rateTypeLabel, workerTypeLabel } from "../options";

const OFFICE = { roles: ["THEKEDAR", "PM"] } as const;
const STATUS_TEXT: Record<AttendanceStatus, string> = {
  FULL: "Full day",
  HALF: "Half day",
  ABSENT: "Absent",
};

// ─── Team on Site ───────────────────────────────────────────────────────────

function RateDialog({ worker, onClose }: { worker: ProjectWorker | null; onClose: () => void }) {
  const [value, setValue] = useState<string | null>(null);
  const [update, { isLoading }] = useUpdateProjectWorkerMutation();
  const run = useMutationToast();
  if (!worker) return null;
  const save = async () => {
    if (!value) return;
    const ok = await run(() => update({ id: worker.id, body: { dailyRatePaisa: value } }).unwrap(), {
      success: `${worker.worker.name}: ${formatPKR(value)} / day`,
    });
    if (ok) onClose();
  };
  return (
    <Dialog open onOpenChange={(open) => (!open && !isLoading ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rate for {worker.worker.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="rate-input">Per day on this project</Label>
          <MoneyInput
            id="rate-input"
            value={value ?? worker.dailyRatePaisa}
            onChange={setValue}
            suffix="/ day"
          />
          <p className="text-xs text-muted-foreground">
            Normal rate {formatPKR(worker.defaultRatePaisa)}. Applies to settlements generated from now on.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={!value || isLoading}>
            Save rate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TeamOnSiteView({ projectId }: { projectId: string }) {
  const office = useCan(OFFICE);
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
      header: "Worker",
      sortValue: (w) => w.worker.name,
      cell: (w) => (
        <div>
          <p className="font-medium">{w.worker.name}</p>
          <p className="text-xs text-muted-foreground">{workerTypeLabel(w.worker.type)}</p>
        </div>
      ),
    },
    {
      id: "rate",
      header: "Rate / day",
      align: "right",
      sortValue: (w) => Number(w.dailyRatePaisa),
      cell: (w) => (
        <span className="inline-flex items-center gap-2">
          <MoneyText paisa={w.dailyRatePaisa} />
          {w.rateOverridden ? <StatusBadge tone="info" label="Project rate" /> : null}
        </span>
      ),
    },
    { id: "since", header: "Since", cell: (w) => formatDate(w.startDate) },
    {
      id: "today",
      header: "Today",
      cell: (w) => {
        const s = marks.get(w.worker.id);
        return !w.isActive ? (
          <StatusBadge tone="neutral" label={`Left ${formatDate(w.endDate)}`} />
        ) : s ? (
          <span className="inline-flex flex-wrap gap-1">
            <StatusBadge
              tone={s === "ABSENT" ? "danger" : s === "HALF" ? "warning" : "success"}
              label={STATUS_TEXT[s]}
            />
            {lateToday.has(w.worker.id) ? <LateSyncBadge /> : null}
          </span>
        ) : (
          <span className="text-muted-foreground">Not marked</span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (w) =>
        w.isActive ? (
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setPeshgiFor(w.worker.id);
                setOpen("peshgi");
              }}
            >
              <Wallet data-icon="inline-start" />
              Peshgi
            </Button>
            {office ? (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Change rate for ${w.worker.name}`}
                  onClick={() => setRateFor(w)}
                >
                  <Pencil aria-hidden />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${w.worker.name}`}
                  onClick={() => setRemoveFor(w)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </>
            ) : null}
          </div>
        ) : null,
    },
  ];

  const subColumns: Column<SubcontractAssignment>[] = [
    {
      id: "name",
      header: "Sub-contractor",
      cell: (s) => (
        <div>
          <p className="font-medium">{s.subcontractor.name}</p>
          <p className="text-xs text-muted-foreground">{s.scope}</p>
        </div>
      ),
    },
    { id: "paid", header: "Paid", cell: (s) => rateTypeLabel(s.rateType) },
    {
      id: "rate",
      header: "Rate / value",
      align: "right",
      hidden: munshi,
      cell: (s) =>
        s.rateType === "LUMPSUM" ? (
          <MoneyText paisa={s.contractValuePaisa ?? undefined} />
        ) : (
          <span>
            <MoneyText paisa={s.ratePaisa ?? undefined} /> / {s.unit}
          </span>
        ),
    },
    {
      id: "progress",
      header: "Progress",
      align: "right",
      cell: (s) => (s.rateType === "LUMPSUM" ? `${s.progressPercent}%` : "—"),
    },
    { id: "status", header: "Status", cell: (s) => <StatusBadge domain="active" value={s.isActive} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (s) =>
        s.isActive && s.rateType !== "LUMPSUM" ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setMeasureFor(s.id);
              setOpen("measure");
            }}
          >
            <Ruler data-icon="inline-start" />
            Measure
          </Button>
        ) : null,
    },
  ];

  return (
    <ProjectPageShell
      projectId={projectId}
      crumb="Team on Site"
      actions={(project) =>
        project.status === "ACTIVE" || project.status === "CLOSEOUT" ? (
          <>
            <Button onClick={() => setOpen("worker")}>
              <UserPlus data-icon="inline-start" />
              Assign worker
            </Button>
            {office ? (
              <Button variant="outline" onClick={() => setOpen("sub")}>
                <Plus data-icon="inline-start" />
                Add sub-contract
              </Button>
            ) : null}
          </>
        ) : null
      }
    >
      {(project) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Workers on site" icon={Users} value={active.length} loading={workers.isLoading} />
            <KpiCard
              label="Hazri today"
              icon={CalendarCheck}
              value={today.data ? `${today.data.full + today.data.half} / ${today.data.assigned}` : "—"}
              hint={
                today.data ? `${today.data.unmarked} not marked · ${today.data.absent} absent` : undefined
              }
              loading={today.isLoading}
              tone={today.data?.unmarked ? "warning" : "success"}
            />
            <KpiCard
              label="Daily wage bill"
              icon={Wallet}
              value={formatPKR(sumPaisa(active.map((w) => w.dailyRatePaisa)))}
              hint="All workers present"
              loading={workers.isLoading}
            />
            <KpiCard
              label="Sub-contracts"
              icon={HardHat}
              value={(subs.data ?? []).filter((s) => s.isActive).length}
              loading={subs.isLoading}
            />
          </div>
          <SectionCard
            flush
            title="Daily-wage workers"
            actions={
              <Button size="sm" variant="outline" asChild>
                <Link href={projectHref(project.id, "/labor/hazri")}>
                  <CalendarCheck data-icon="inline-start" />
                  Hazri register
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
                title: "Nobody on this site yet",
                description: "Assign workers to start marking hazri.",
                icon: Users,
              }}
            />
          </SectionCard>
          <SectionCard
            flush
            title="Sub-contracts"
            description={
              munshi ? "Record measurements for piece-rate work; the office verifies them." : undefined
            }
          >
            <DataTable
              rows={subs.data}
              getRowId={(s) => s.id}
              loading={subs.isLoading}
              error={subs.error}
              onRetry={subs.refetch}
              columns={subColumns}
              empty={{ title: "No sub-contracts yet", icon: HardHat, compact: true }}
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
            title={`Remove ${removeFor?.worker.name ?? ""} from this site?`}
            description="Someone with hazri or peshgi here is only taken off (kept in the history)."
            confirmLabel="Remove"
            loading={removing}
            onConfirm={async () => {
              const r = await run(() => remove(removeFor!.id).unwrap());
              if (r) {
                toast.success(r.removed ? "Removed from the site" : "Taken off the site (history kept)");
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

  const rows: AttendanceGridRow[] = useMemo(
    () =>
      (grid.data?.workers ?? []).map((w) => ({
        id: w.worker.id,
        name: w.worker.name,
        subtitle: `${workerTypeLabel(w.worker.type)} · ${formatPKR(w.dailyRatePaisa)}`,
        days: { ...w.days, ...(pending[w.worker.id] ?? {}) },
      })),
    [grid.data, pending],
  );

  const onChange = (workerId: string, date: string, value: HazriMark) =>
    setPending((p) => ({ ...p, [workerId]: { ...(p[workerId] ?? {}), [date]: value } }));

  /** Everyone on site not yet marked today → present. */
  const markToday = () => {
    const ids = (today.data?.workers ?? []).filter((w) => w.status === null).map((w) => w.worker.id);
    if (!ids.length) {
      toast.info("Everyone is already marked for today");
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
    toast.success("Hazri saved");
  };

  return (
    <ProjectPageShell
      projectId={projectId}
      crumb="Hazri Register"
      actions={(project) =>
        project.status === "ACTIVE" || project.status === "CLOSEOUT" ? (
          <Button variant="outline" onClick={markToday} disabled={!today.data?.assigned}>
            <CalendarCheck data-icon="inline-start" />
            Mark today present
          </Button>
        ) : null
      }
    >
      {(project) => (
        <>
          {today.data ? (
            <div className="flex flex-wrap gap-2" aria-label="Today">
              <StatusBadge tone="success" label={`${today.data.full} full`} />
              <StatusBadge tone="warning" label={`${today.data.half} half`} />
              <StatusBadge tone="danger" label={`${today.data.absent} absent`} />
              <StatusBadge
                tone={today.data.unmarked ? "info" : "neutral"}
                label={`${today.data.unmarked} not marked`}
              />
              {!today.data.workingDay ? <StatusBadge tone="neutral" label="Not a working day" /> : null}
            </div>
          ) : null}
          <SectionCard
            flush
            title={weekStart ? formatWeekRange(weekStart) : "Hazri"}
            description="Tap a box: P full day → ½ half day → A absent. Keys F, H, A also work."
          >
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-3">
                {weekStart ? (
                  <WeekPicker
                    value={weekStart}
                    weekStartDay={weekDay}
                    onChange={(w) => {
                      if (changes && !window.confirm("Discard unsaved hazri changes?")) return;
                      setPending({});
                      setWeek(w);
                    }}
                  />
                ) : null}
                <label className="inline-flex items-center gap-2 text-sm">
                  <Switch checked={overtime} onCheckedChange={setOvertime} aria-label="Overtime" />
                  <Timer className="size-4 text-muted-foreground" aria-hidden />
                  Overtime
                </label>
              </div>
              {locked ? (
                <InlineAlert
                  tone="warning"
                  title={`This week is ${locked.status === "APPROVED" ? "approved" : "waiting for approval"}`}
                >
                  <span className="inline-flex items-center gap-1">
                    <Lock className="size-3.5" aria-hidden /> Hazri is locked. To change it the office returns
                    the settlement.
                  </span>{" "}
                  <Link
                    className="underline"
                    href={projectHref(project.id, `/labor/settlements/${locked.settlementId}`)}
                  >
                    Open settlement
                  </Link>
                </InlineAlert>
              ) : munshi ? (
                <p className="text-xs text-muted-foreground">
                  You can fill the last {MUNSHI_DAYS_BACK} days. Older days are fixed by the office.
                </p>
              ) : null}
              {grid.isLoading ? (
                <CardsSkeleton count={1} height="h-72" />
              ) : rows.length === 0 ? (
                <InlineAlert tone="info" title="No workers on this site">
                  Add them in{" "}
                  <Link className="underline" href={projectHref(project.id, "/labor/team")}>
                    Team on Site
                  </Link>{" "}
                  first.
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
                <span className="font-semibold">{changes}</span> unsaved{" "}
                {changes === 1 ? "change" : "changes"}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPending({})} disabled={saving}>
                  <Undo2 data-icon="inline-start" />
                  Discard
                </Button>
                <Button onClick={() => void save()} disabled={saving}>
                  <Save data-icon="inline-start" />
                  Save hazri
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </ProjectPageShell>
  );
}
