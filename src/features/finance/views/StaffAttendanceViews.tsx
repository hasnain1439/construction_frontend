"use client";

import { BriefcaseBusiness, CalendarCheck, CheckCheck, Pencil, Plus, Save, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useCreateStaffDesignationMutation,
  useDeleteStaffDesignationMutation,
  useGetStaffAttendanceDayQuery,
  useGetStaffAttendanceMonthQuery,
  useGetStaffDesignationsQuery,
  useMarkStaffAttendanceMutation,
  useRenameStaffDesignationMutation,
} from "@/api/services/staff.api";
import { STAFF_ATTENDANCE_STATUSES, type StaffAttendanceMonth, type StaffAttendanceStatus, type StaffDesignation } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { KpiCard } from "@/components/common/KpiCard";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useT, type TranslationKey } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatDate, formatMonth, todayPK } from "@/lib/dates";

const STATUS_LABEL: Record<StaffAttendanceStatus, TranslationKey> = {
  PRESENT: "cashSite.staff.status_PRESENT",
  ABSENT: "cashSite.staff.status_ABSENT",
  HALF_DAY: "cashSite.staff.status_HALF_DAY",
  LEAVE: "cashSite.staff.status_LEAVE",
};
const STATUS_SHORT: Record<StaffAttendanceStatus, TranslationKey> = {
  PRESENT: "cashSite.staff.short_PRESENT",
  ABSENT: "cashSite.staff.short_ABSENT",
  HALF_DAY: "cashSite.staff.short_HALF_DAY",
  LEAVE: "cashSite.staff.short_LEAVE",
};
const STATUS_TONE: Record<StaffAttendanceStatus, string> = {
  PRESENT: "bg-success/15 text-success",
  ABSENT: "bg-danger/15 text-danger",
  HALF_DAY: "bg-warning/15 text-warning",
  LEAVE: "bg-info/15 text-info",
};

function useCanManageStaff() {
  const readOnly = useReadOnly();
  return useCan("finance.staff.manage") && !readOnly;
}

// ─── Mark attendance ─────────────────────────────────────────────────────────

/** Office Staff → Mark attendance: everyone for one day, then one Save. */
export function AttendanceMarkView() {
  const t = useT();
  const canManage = useCanManageStaff();
  const [date, setDate] = useState(todayPK);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= todayPK();
  const query = useGetStaffAttendanceDayQuery(date, { skip: !valid });
  const [mark, { isLoading: saving }] = useMarkStaffAttendanceMutation();
  const run = useMutationToast();
  // Changes not saved yet, per staff member (undefined = as saved).
  const [edits, setEdits] = useState<Record<string, StaffAttendanceStatus | null>>({});
  const rows = useMemo(() => query.data?.rows ?? [], [query.data]);
  const statusOf = (id: string, saved: StaffAttendanceStatus | null) => (id in edits ? edits[id]! : saved);
  const changed = rows.filter((r) => r.staff.id in edits && edits[r.staff.id] !== r.status);
  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, LEAVE: 0, none: 0 };
    for (const r of rows) {
      const s = r.staff.id in edits ? edits[r.staff.id]! : r.status;
      if (s) c[s] += 1;
      else c.none += 1;
    }
    return c;
  }, [rows, edits]);

  const pickDate = (d: string) => {
    setDate(d);
    setEdits({});
  };
  const setOne = (id: string, s: StaffAttendanceStatus | null) => setEdits((e) => ({ ...e, [id]: s }));
  const allPresent = () =>
    setEdits((e) => {
      const next = { ...e };
      for (const r of rows) if (!(r.staff.id in e ? e[r.staff.id] : r.status)) next[r.staff.id] = "PRESENT";
      return next;
    });
  const save = async () => {
    if (!changed.length) return;
    const ok = await run(() => mark({ date, entries: changed.map((r) => ({ staffId: r.staff.id, status: edits[r.staff.id] ?? null })) }).unwrap(), {
      success: t("cashSite.staff.attendanceSaved"),
    });
    if (ok) setEdits({});
  };

  return (
    <>
      <PageHeader
        title={t("cashSite.staff.markTitle")}
        description={t("cashSite.staff.markDesc")}
        breadcrumbs={[{ label: t("cashSite.staff.officeStaff") }, { label: t("cashSite.staff.markTitle") }]}
        actions={
          canManage ? (
            <>
              <Button variant="outline" onClick={allPresent} disabled={!counts.none}>
                <CheckCheck data-icon="inline-start" />
                {t("cashSite.staff.allPresent")}
              </Button>
              <Button onClick={() => void save()} disabled={!changed.length || saving}>
                <Save data-icon="inline-start" />
                {t("cashSite.staff.saveAttendance")}
              </Button>
            </>
          ) : null
        }
      />
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="attendance-date">{t("field.date")}</Label>
            <Input id="attendance-date" type="date" className="w-48" value={date} max={todayPK()} onChange={(e) => pickDate(e.target.value)} />
          </div>
          {changed.length ? <p className="pb-2 text-sm text-warning">{t("cashSite.staff.unsaved", { n: changed.length })}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {STAFF_ATTENDANCE_STATUSES.map((s) => (
            <KpiCard key={s} label={t(STATUS_LABEL[s])} icon={CalendarCheck} loading={query.isLoading} value={String(counts[s])} />
          ))}
          <KpiCard label={t("cashSite.staff.notMarked")} icon={Users} loading={query.isLoading} value={String(counts.none)} />
        </div>
        <SectionCard flush title={formatDate(date)}>
          {query.isLoading ? null : rows.length ? (
            <ul className="divide-y">
              {rows.map((r) => {
                const current = statusOf(r.staff.id, r.status);
                return (
                  <li key={r.staff.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{r.staff.name}</p>
                      {r.staff.designation ? <p className="text-xs text-muted-foreground">{r.staff.designation}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label={r.staff.name}>
                      {STAFF_ATTENDANCE_STATUSES.map((s) => (
                        <Button
                          key={s}
                          type="button"
                          size="sm"
                          variant={current === s ? "default" : "outline"}
                          aria-pressed={current === s}
                          disabled={!canManage}
                          onClick={() => setOne(r.staff.id, current === s ? null : s)}
                        >
                          {t(STATUS_LABEL[s])}
                        </Button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title={t("cashSite.staff.attendanceEmpty")} icon={Users} compact />
          )}
        </SectionCard>
      </div>
    </>
  );
}

// ─── Attendance report ───────────────────────────────────────────────────────

type MonthRow = StaffAttendanceMonth["rows"][number];

/** Office Staff → Attendance report: a month for everyone, day by day, with totals. */
export function AttendanceReportView() {
  const t = useT();
  const [month, setMonth] = useState(() => todayPK().slice(0, 7));
  const query = useGetStaffAttendanceMonthQuery({ month }, { skip: !/^\d{4}-\d{2}$/.test(month) });
  const days = query.data?.daysInMonth ?? 0;

  const columns: Column<MonthRow>[] = [
    {
      id: "name",
      header: t("field.name"),
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-medium">{r.staff.name}</p>
          {r.staff.designation ? <p className="text-xs text-muted-foreground">{r.staff.designation}</p> : null}
        </div>
      ),
    },
    ...STAFF_ATTENDANCE_STATUSES.map((s) => ({
      id: s,
      header: t(STATUS_LABEL[s]),
      align: "right" as const,
      cell: (r: MonthRow) => r.totals[s === "PRESENT" ? "present" : s === "ABSENT" ? "absent" : s === "HALF_DAY" ? "halfDay" : "leave"],
    })),
    {
      id: "days",
      header: t("cashSite.staff.dayByDay"),
      cell: (r) => (
        <div className="flex flex-wrap gap-0.5" aria-label={t("cashSite.staff.dayByDay")}>
          {Array.from({ length: days }, (_, i) => {
            const iso = `${month}-${String(i + 1).padStart(2, "0")}`;
            const s = r.days[iso];
            return (
              <span
                key={iso}
                title={`${formatDate(iso)}: ${s ? t(STATUS_LABEL[s]) : t("cashSite.staff.notMarked")}`}
                className={cn("grid size-5 place-items-center rounded text-[10px] font-semibold", s ? STATUS_TONE[s] : "bg-muted text-muted-foreground")}
              >
                {s ? t(STATUS_SHORT[s]) : i + 1}
              </span>
            );
          })}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("cashSite.staff.reportTitle")}
        description={t("cashSite.staff.reportDesc")}
        breadcrumbs={[{ label: t("cashSite.staff.officeStaff") }, { label: t("cashSite.staff.reportTitle") }]}
      />
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="attendance-month">{t("cashSite.staff.month")}</Label>
          <Input id="attendance-month" type="month" className="w-48" value={month} max={todayPK().slice(0, 7)} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <SectionCard flush title={month ? formatMonth(month) : undefined}>
          <DataTable
            rows={query.data?.rows}
            columns={columns}
            getRowId={(r) => r.staff.id}
            loading={query.isLoading || query.isFetching}
            error={query.error}
            onRetry={query.refetch}
            empty={{ title: t("cashSite.staff.attendanceEmpty"), icon: Users }}
          />
        </SectionCard>
      </div>
    </>
  );
}

// ─── Designations ────────────────────────────────────────────────────────────

const MAX_NAME = 60;

function RenameDesignation({ designation, onClose }: { designation: StaffDesignation; onClose: () => void }) {
  const t = useT();
  const [rename, { isLoading }] = useRenameStaffDesignationMutation();
  const run = useMutationToast();
  const [name, setName] = useState(designation.name);
  const trimmed = name.trim();
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("cashSite.staff.renameDesignationTitle", { name: designation.name })}
      description={t("cashSite.staff.renameDesignationHint")}
      confirmLabel={t("common.save")}
      loading={isLoading}
      confirmDisabled={trimmed.length < 2 || trimmed === designation.name}
      onConfirm={async () => {
        const ok = await run(() => rename({ id: designation.id, name: trimmed }).unwrap(), { success: t("cashSite.staff.designationRenamed") });
        if (ok) onClose();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="designation-rename">{t("cashSite.staff.designationName")}</Label>
        <Input id="designation-rename" value={name} maxLength={MAX_NAME} autoFocus onChange={(e) => setName(e.target.value)} />
      </div>
    </ConfirmDialog>
  );
}

/** Office Staff → Designations: the company's own list of jobs, picked when adding staff. */
export function DesignationsView() {
  const t = useT();
  const canManage = useCanManageStaff();
  const query = useGetStaffDesignationsQuery();
  const [create, { isLoading: adding }] = useCreateStaffDesignationMutation();
  const [remove, { isLoading: removing }] = useDeleteStaffDesignationMutation();
  const run = useMutationToast();
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<StaffDesignation | null>(null);
  const [deleting, setDeleting] = useState<StaffDesignation | null>(null);
  const trimmed = name.trim();

  const add = async () => {
    if (trimmed.length < 2) return;
    const ok = await run(() => create({ name: trimmed }).unwrap(), { success: t("cashSite.staff.designationAdded", { name: trimmed }) });
    if (ok) setName("");
  };

  return (
    <>
      <PageHeader
        title={t("cashSite.staff.designationsTitle")}
        description={t("cashSite.staff.designationsDesc")}
        breadcrumbs={[{ label: t("cashSite.staff.officeStaff") }, { label: t("cashSite.staff.designationsTitle") }]}
      />
      <SectionCard className="max-w-2xl">
        <div className="space-y-4">
          {canManage ? (
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void add();
              }}
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor="designation-new">{t("cashSite.staff.newDesignation")}</Label>
                <Input id="designation-new" value={name} maxLength={MAX_NAME} placeholder={t("cashSite.staff.designationPlaceholder")} onChange={(e) => setName(e.target.value)} />
              </div>
              <Button type="submit" disabled={trimmed.length < 2 || adding}>
                <Plus data-icon="inline-start" />
                {t("common.add")}
              </Button>
            </form>
          ) : null}
          <QueryState query={query}>
            {(rows) =>
              rows.length ? (
                <ul className="divide-y rounded-xl border">
                  {rows.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{t("cashSite.staff.staffCount", { n: d.staffCount ?? 0 })}</p>
                      </div>
                      {canManage ? (
                        <RowActions
                          name={d.name}
                          actions={[
                            { label: t("cashSite.staff.renameDesignation"), icon: Pencil, onSelect: () => setRenaming(d) },
                            { label: t("common.delete"), icon: Trash2, destructive: true, onSelect: () => setDeleting(d) },
                          ]}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title={t("cashSite.staff.noDesignations")} icon={BriefcaseBusiness} compact />
              )
            }
          </QueryState>
        </div>
      </SectionCard>
      {renaming ? <RenameDesignation key={renaming.id} designation={renaming} onClose={() => setRenaming(null)} /> : null}
      {deleting ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          tone="danger"
          title={t("cashSite.staff.deleteDesignationTitle", { name: deleting.name })}
          description={t("cashSite.staff.deleteDesignationDesc")}
          confirmLabel={t("common.delete")}
          loading={removing}
          onConfirm={async () => {
            const ok = await run(() => remove(deleting.id).unwrap(), { success: t("cashSite.staff.designationDeleted", { name: deleting.name }) });
            if (ok) setDeleting(null);
          }}
        />
      ) : null}
    </>
  );
}
