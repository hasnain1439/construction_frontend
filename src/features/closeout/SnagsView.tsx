"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCheck, CircleDot, ClipboardCheck, Coins, Hammer, ListChecks, Pencil, Plus, RotateCcw, Trash2, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  useCreateSnagMutation,
  useDeleteSnagMutation,
  useFixSnagMutation,
  useGetSnagQuery,
  useGetSnagsQuery,
  useReopenSnagMutation,
  useSetSnagCostMutation,
  useUpdateSnagMutation,
  useVerifySnagMutation,
} from "@/api/services/closeout.api";
import { useGetSubcontractsQuery } from "@/api/services/labor.api";
import { useGetSubcontractorsQuery, useGetWorkersQuery } from "@/api/services/masterData.api";
import { useGetFloorsQuery } from "@/api/services/projects.api";
import { COST_ATTRIBUTIONS, SNAG_STATUSES, type Snag, type SnagStatus } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan, usePermissions } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions, type RowAction } from "@/components/common/RowActions";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { AttachmentField } from "@/components/forms/AttachmentField";
import { DateField } from "@/components/forms/DateField";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { RadioCards } from "@/components/forms/RadioCards";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/button";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { formatDate, todayPK } from "@/lib/dates";
import { costSchema, fixSchema, reopenSchema, snagSchema, type CostValues, type FixValues, type ReopenValues, type SnagValues } from "./schemas";
import { CostBadge, PhotoStrip, SNAG_EDIT_STATUSES, SnagStatusBadge } from "./shared";

type Dialog = { kind: "edit" | "fix" | "reopen" | "cost" | "verify"; snag: Snag } | null;

/** Project → Documents & Closeout → Snag List: log, assign, fix, verify, and decide who pays. */
export function SnagsView({ projectId }: { projectId: string }) {
  const t = useT();
  const canCreate = useCan("closeout.snag.create");
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("closeout.snags.crumb")}
      editableStatuses={SNAG_EDIT_STATUSES}
      actions={(project) => (canCreate && SNAG_EDIT_STATUSES.includes(project.status) ? <NewSnagButton projectId={projectId} /> : null)}
    >
      {(project) => <SnagsList projectId={projectId} editable={SNAG_EDIT_STATUSES.includes(project.status)} />}
    </ProjectPageShell>
  );
}

function NewSnagButton({ projectId }: { projectId: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        {t("closeout.snags.add")}
      </Button>
      <SnagFormSlideOver projectId={projectId} snag={null} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function SnagsList({ projectId, editable }: { projectId: string; editable: boolean }) {
  const t = useT();
  const { can, canSee } = usePermissions();
  const seesMoney = canSee("amounts");
  const [status, setStatus] = useState<"" | SnagStatus>("");
  const [assignee, setAssignee] = useState<"" | "WORKER" | "SUBCONTRACTOR">("");
  const [period, setPeriod] = useState<"" | "defect" | "before" | "overdue">("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const query = {
    projectId,
    page,
    limit: 25,
    ...(status ? { status } : {}),
    ...(assignee ? { assigneeType: assignee } : {}),
    ...(period === "defect" ? { defectPeriod: "true" as const } : period === "before" ? { defectPeriod: "false" as const } : period === "overdue" ? { overdue: "true" as const } : {}),
    ...(q ? { q } : {}),
  };
  const list = useGetSnagsQuery(query);
  const [open, setOpen] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [remove] = useDeleteSnagMutation();
  const run = useMutationToast();
  const s = list.data?.summary;
  const filtered = Boolean(status || assignee || period || q);

  const actionsOf = (snag: Snag): RowAction[] => {
    const manage = editable && can("closeout.snag.manage");
    return [
      { label: t("common.view"), icon: ListChecks, onSelect: () => setOpen(snag.id) },
      { label: t("closeout.snags.fix"), icon: Wrench, hidden: !(editable && can("closeout.snag.create") && snag.status === "OPEN"), onSelect: () => setDialog({ kind: "fix", snag }) },
      { label: t("closeout.snags.verify"), icon: CheckCheck, hidden: !(manage && snag.status === "FIXED"), onSelect: () => setDialog({ kind: "verify", snag }) },
      { label: t("closeout.snags.reopen"), icon: RotateCcw, hidden: !(manage && snag.status !== "OPEN"), onSelect: () => setDialog({ kind: "reopen", snag }) },
      { label: t("common.edit"), icon: Pencil, hidden: !(manage && snag.status !== "VERIFIED"), onSelect: () => setDialog({ kind: "edit", snag }) },
      { label: t("closeout.snags.cost"), icon: Coins, hidden: !(can("closeout.snag.manage") && seesMoney), onSelect: () => setDialog({ kind: "cost", snag }) },
      {
        label: t("closeout.snags.delete"),
        icon: Trash2,
        destructive: true,
        separatorBefore: true,
        hidden: !(manage && snag.status === "OPEN" && snag.cost.attribution === "NONE"),
        confirm: {
          title: t("closeout.snags.deleteTitle", { code: snag.code }),
          description: t("closeout.snags.deleteBody"),
          confirmLabel: t("common.delete"),
          tone: "danger",
          onConfirm: async () => {
            await run(() => remove(snag.id).unwrap(), { success: t("closeout.snags.deleted") });
          },
        },
      },
    ];
  };

  const columns: Column<Snag>[] = [
    { id: "code", header: "#", sortValue: (r) => r.number, cell: (r) => <span className="tabular font-medium" dir="ltr">{r.code}</span>, className: "w-20" },
    {
      id: "snag",
      header: t("closeout.snags.colSnag"),
      cell: (r) => (
        <div className="min-w-0 space-y-0.5">
          <p dir="auto" className="font-medium">{r.description}</p>
          <p className="text-xs text-muted-foreground">{[r.room ? `${r.room.name} · ${r.room.floor}` : null, r.location].filter(Boolean).join(" — ")}</p>
          {r.inDefectPeriod ? <StatusBadge tone="info" label={t("closeout.snags.defectPeriod")} /> : null}
        </div>
      ),
    },
    {
      id: "photos",
      header: t("closeout.snags.colPhotos"),
      cell: (r) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{t("closeout.snags.photoCount", { before: r.beforePhotos.length, after: r.afterPhotos.length })}</span>
      ),
    },
    {
      id: "assignee",
      header: t("closeout.snags.colAssignee"),
      sortValue: (r) => r.assignee?.name ?? "",
      cell: (r) => (r.assignee ? r.assignee.name : <span className="text-muted-foreground">{t("closeout.snags.unassigned")}</span>),
    },
    {
      id: "target",
      header: t("closeout.snags.colTarget"),
      sortValue: (r) => r.targetDate ?? "",
      cell: (r) =>
        r.targetDate ? (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {formatDate(r.targetDate)}
            {r.overdue ? <StatusBadge tone="danger" icon={AlertTriangle} label={t("closeout.snags.overdue")} /> : null}
          </span>
        ) : (
          "—"
        ),
    },
    { id: "status", header: t("closeout.snags.colStatus"), sortValue: (r) => r.status, cell: (r) => <SnagStatusBadge status={r.status} /> },
    {
      id: "cost",
      header: t("closeout.snags.colCost"),
      cell: (r) =>
        r.cost.attribution === "NONE" ? (
          "—"
        ) : (
          <span className="inline-flex flex-col items-start gap-1">
            <CostBadge attribution={r.cost.attribution} />
            {seesMoney ? <MoneyText paisa={r.cost.amountPaisa} /> : null}
          </span>
        ),
    },
    { ...ACTIONS_COLUMN, cell: (r) => <RowActions name={r.code} actions={actionsOf(r)} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("closeout.snags.kpiOpen")} value={s?.open ?? 0} icon={CircleDot} tone="warning" loading={list.isLoading} hint={s?.defectPeriodOpen ? t("closeout.snags.defectHint", { n: s.defectPeriodOpen }) : undefined} />
        <KpiCard label={t("closeout.snags.kpiFixed")} value={s?.fixed ?? 0} icon={Hammer} loading={list.isLoading} />
        <KpiCard label={t("closeout.snags.kpiVerified")} value={s?.verified ?? 0} icon={ClipboardCheck} tone="success" loading={list.isLoading} />
        {seesMoney ? (
          <KpiCard
            label={t("closeout.snags.kpiRework")}
            value={<MoneyText paisa={s?.reworkPaisa} />}
            icon={Coins}
            tone="danger"
            loading={list.isLoading}
            hint={
              <span>
                {t("closeout.snags.kpiDeductions")}: <MoneyText paisa={s?.deductionPaisa} />
              </span>
            }
          />
        ) : (
          <KpiCard label={t("closeout.snags.kpiOverdue")} value={s?.overdue ?? 0} icon={AlertTriangle} tone="danger" loading={list.isLoading} />
        )}
      </div>
      <FilterBar onClear={() => (setStatus(""), setAssignee(""), setPeriod(""), setQ(""), setPage(1))} canClear={filtered}>
        <FilterSelect
          label={t("closeout.snags.filterStatus")}
          value={status}
          onChange={(v) => (setStatus(v as "" | SnagStatus), setPage(1))}
          options={SNAG_STATUSES.map((v) => ({ value: v, label: t(`closeout.snagStatus.${v}`) }))}
        />
        <FilterSelect
          label={t("closeout.snags.filterAssignee")}
          value={assignee}
          onChange={(v) => (setAssignee(v as "" | "WORKER" | "SUBCONTRACTOR"), setPage(1))}
          options={[
            { value: "WORKER", label: t("closeout.snags.assigneeWorker") },
            { value: "SUBCONTRACTOR", label: t("closeout.snags.assigneeSub") },
          ]}
        />
        <FilterSelect
          label={t("closeout.snags.filterPeriod")}
          value={period}
          onChange={(v) => (setPeriod(v as typeof period), setPage(1))}
          options={[
            { value: "overdue", label: t("closeout.snags.overdueOnly") },
            { value: "defect", label: t("closeout.snags.defectOnly") },
            { value: "before", label: t("closeout.snags.beforeHandover") },
          ]}
        />
        <SearchInput value={q} onChange={(v) => (setQ(v), setPage(1))} placeholder={t("closeout.snags.search")} className="min-w-48 flex-1" />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={list.data?.items}
          columns={columns}
          getRowId={(r) => r.id}
          loading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          onRowClick={(r) => setOpen(r.id)}
          pagination={list.data ? { page, pageSize: 25, total: list.data.meta.total, onPageChange: setPage } : undefined}
          empty={filtered ? { icon: Wrench, title: t("closeout.snags.noMatch") } : { icon: Wrench, title: t("closeout.snags.noSnags"), description: t("closeout.snags.noSnagsDesc") }}
        />
      </SectionCard>
      <SnagDetailSlideOver snagId={open} onClose={() => setOpen(null)} />
      <SnagFormSlideOver projectId={projectId} snag={dialog?.kind === "edit" ? dialog.snag : null} open={dialog?.kind === "edit"} onOpenChange={(o) => (!o ? setDialog(null) : undefined)} />
      <FixSlideOver snag={dialog?.kind === "fix" ? dialog.snag : null} onClose={() => setDialog(null)} />
      <ReopenSlideOver snag={dialog?.kind === "reopen" ? dialog.snag : null} onClose={() => setDialog(null)} />
      <CostSlideOver projectId={projectId} snag={dialog?.kind === "cost" ? dialog.snag : null} onClose={() => setDialog(null)} />
      <VerifyDialog snag={dialog?.kind === "verify" ? dialog.snag : null} onClose={() => setDialog(null)} />
    </div>
  );
}

function VerifyDialog({ snag, onClose }: { snag: Snag | null; onClose: () => void }) {
  const t = useT();
  const [verify, { isLoading }] = useVerifySnagMutation();
  const run = useMutationToast();
  return (
    <ConfirmDialog
      open={Boolean(snag)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={snag ? t("closeout.snags.verifyTitle", { code: snag.code }) : ""}
      description={t("closeout.snags.verifyBody")}
      confirmLabel={t("closeout.snags.verify")}
      loading={isLoading}
      onConfirm={async () => {
        if (!snag) return;
        const r = await run(() => verify({ id: snag.id, body: {} }).unwrap(), { success: t("closeout.snags.verified") });
        if (r) onClose();
      }}
    />
  );
}

/** Photos before / after, who logged / fixed / verified it, and who pays. */
function SnagDetailSlideOver({ snagId, onClose }: { snagId: string | null; onClose: () => void }) {
  const t = useT();
  const { canSee } = usePermissions();
  const detail = useGetSnagQuery(snagId ?? "", { skip: !snagId });
  const s = detail.data;
  const line = (key: "closeout.snags.loggedBy" | "closeout.snags.fixedBy" | "closeout.snags.verifiedBy", who: { name: string } | null, at: string | null) =>
    at ? <p className="text-xs text-muted-foreground">{t(key, { name: who?.name ?? "—", date: formatDate(at.slice(0, 10)) })}</p> : null;
  return (
    <SlideOver open={Boolean(snagId)} onOpenChange={(o) => (!o ? onClose() : undefined)} title={s ? t("closeout.snags.detail", { code: s.code }) : t("closeout.snags.crumb")} description={s?.description}>
      {detail.isFetching && !s ? (
        <CardsSkeleton count={3} height="h-20" />
      ) : detail.error ? (
        <ErrorState error={detail.error} onRetry={detail.refetch} />
      ) : s ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <SnagStatusBadge status={s.status} />
            {s.inDefectPeriod ? <StatusBadge tone="info" label={t("closeout.snags.defectPeriod")} /> : null}
            {s.overdue ? <StatusBadge tone="danger" label={t("closeout.snags.overdue")} /> : null}
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t("closeout.snags.room")}</dt>
              <dd>{s.room ? `${s.room.name} · ${s.room.floor}` : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("closeout.snags.location")}</dt>
              <dd>{s.location ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("closeout.qaFixes.assignedTo")}</dt>
              <dd>{s.assignee?.name ?? t("closeout.snags.unassigned")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("closeout.snags.targetDate")}</dt>
              <dd>{s.targetDate ? formatDate(s.targetDate) : "—"}</dd>
            </div>
          </dl>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t("closeout.snags.before")}</h3>
            <PhotoStrip photos={s.beforePhotos} label={t("closeout.snags.before")} />
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t("closeout.snags.after")}</h3>
            <PhotoStrip photos={s.afterPhotos} label={t("closeout.snags.after")} />
            {s.fixNote ? <p className="text-sm whitespace-pre-line">{s.fixNote}</p> : null}
          </section>
          <section className="space-y-1">
            {line("closeout.snags.loggedBy", s.createdBy, s.createdAt)}
            {line("closeout.snags.fixedBy", s.fixedBy, s.fixedAt)}
            {line("closeout.snags.verifiedBy", s.verifiedBy, s.verifiedAt)}
            {s.reopenCount ? <p className="text-xs text-warning">{t("closeout.snags.reopenedTimes", { n: s.reopenCount, reason: s.lastReopenReason ?? "—" })}</p> : null}
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t("closeout.snags.cost")}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <CostBadge attribution={s.cost.attribution} />
              {canSee("amounts") && s.cost.attribution !== "NONE" ? <MoneyText paisa={s.cost.amountPaisa} /> : null}
            </div>
            {s.cost.note ? <p dir="auto" className="text-sm text-muted-foreground">{s.cost.note}</p> : null}
          </section>
        </div>
      ) : null}
    </SlideOver>
  );
}

/** Log a snag (room / location, photo, assignee, target date) or edit / reassign one. */
function SnagFormSlideOver({ projectId, snag, open, onOpenChange }: { projectId: string; snag: Snag | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const floors = useGetFloorsQuery(projectId, { skip: !open });
  const workers = useGetWorkersQuery({ limit: 100, isActive: "true" }, { skip: !open });
  const subs = useGetSubcontractorsQuery({ limit: 100 }, { skip: !open });
  const [create, creating] = useCreateSnagMutation();
  const [update, updating] = useUpdateSnagMutation();
  const busy = creating.isLoading || updating.isLoading;
  const run = useMutationToast();
  const rooms = useMemo(() => (floors.data?.floors ?? []).flatMap((f) => f.rooms.map((r) => ({ value: r.id, label: `${r.name} · ${f.name}` }))), [floors.data]);
  const form = useForm<SnagValues>({
    resolver: zodResolver(snagSchema),
    values: {
      roomId: snag?.roomId ?? null,
      location: snag?.location ?? "",
      description: snag?.description ?? "",
      photo1: null,
      photo2: null,
      assigneeType: snag?.assignee?.type ?? "NONE",
      workerId: snag?.assignee?.type === "WORKER" ? snag.assignee.id : null,
      subcontractorId: snag?.assignee?.type === "SUBCONTRACTOR" ? snag.assignee.id : null,
      targetDate: snag?.targetDate ?? "",
    },
  });
  const type = useWatch({ control: form.control, name: "assigneeType" });
  const onSubmit = async (v: SnagValues) => {
    const photos = [v.photo1, v.photo2].filter(Boolean).map((p) => p!.id);
    if (snag) {
      const r = await run(
        () =>
          update({
            id: snag.id,
            body: {
              roomId: v.roomId,
              location: v.location?.trim() || null,
              description: v.description.trim(),
              ...(photos.length ? { beforePhotoIds: [...snag.beforePhotos.map((p) => p.id), ...photos].slice(0, 10) } : {}),
              workerId: v.assigneeType === "WORKER" ? v.workerId : null,
              subcontractorId: v.assigneeType === "SUBCONTRACTOR" ? v.subcontractorId : null,
              targetDate: v.targetDate || null,
            },
          }).unwrap(),
        { success: t("closeout.snags.saved"), setError: form.setError, codeFields: { LOCATION_REQUIRED: "location", INVALID_ROOM: "roomId", INVALID_ASSIGNEE: "workerId" } },
      );
      if (r) onOpenChange(false);
      return;
    }
    const r = await run(
      () =>
        create({
          projectId,
          body: {
            ...(v.roomId ? { roomId: v.roomId } : {}),
            ...(v.location?.trim() ? { location: v.location.trim() } : {}),
            description: v.description.trim(),
            beforePhotoIds: photos,
            ...(v.assigneeType === "WORKER" && v.workerId ? { workerId: v.workerId } : {}),
            ...(v.assigneeType === "SUBCONTRACTOR" && v.subcontractorId ? { subcontractorId: v.subcontractorId } : {}),
            ...(v.targetDate ? { targetDate: v.targetDate } : {}),
          },
        }).unwrap(),
      { success: (s) => t("closeout.snags.created", { code: s.code }), setError: form.setError, codeFields: { LOCATION_REQUIRED: "location", INVALID_ROOM: "roomId", INVALID_ASSIGNEE: "workerId" } },
    );
    if (r) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={snag ? t("closeout.snags.editTitle", { code: snag.code }) : t("closeout.snags.newTitle")}
      description={snag ? undefined : t("closeout.snags.newDesc")}
      busy={busy}
      footer={<FormActions formId="snag-form" submitLabel={t("closeout.snags.save")} loading={busy} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="snag-form">
        <SelectField name="roomId" label={t("closeout.snags.room")} options={rooms} noneLabel={t("closeout.snags.noRoom")} placeholder={t("closeout.snags.noRoom")} />
        <TextField name="location" label={t("closeout.snags.location")} hint={t("closeout.snags.locationHint")} maxLength={200} />
        <TextareaField name="description" label={t("closeout.snags.description")} required rows={3} />
        <AttachmentField name="photo1" label={t("closeout.snags.photo1")} kind="SITE_PHOTO" />
        <AttachmentField name="photo2" label={t("closeout.snags.photo2")} kind="SITE_PHOTO" />
        <SegmentedField
          name="assigneeType"
          label={t("closeout.snags.assignTo")}
          options={[
            { value: "NONE", label: t("closeout.snags.assignNone") },
            { value: "WORKER", label: t("closeout.snags.assignWorker") },
            { value: "SUBCONTRACTOR", label: t("closeout.snags.assignSub") },
          ]}
        />
        {type === "WORKER" ? (
          <SelectField name="workerId" label={t("closeout.snags.worker")} required options={(workers.data?.items ?? []).filter((w) => w.isActive !== false).map((w) => ({ value: w.id, label: w.name }))} />
        ) : null}
        {type === "SUBCONTRACTOR" ? (
          <SelectField name="subcontractorId" label={t("closeout.snags.subcontractor")} required options={(subs.data?.items ?? []).filter((x) => x.isActive).map((x) => ({ value: x.id, label: x.name }))} />
        ) : null}
        <DateField name="targetDate" label={t("closeout.snags.targetDate")} min={todayPK()} />
      </Form>
    </SlideOver>
  );
}

function FixSlideOver({ snag, onClose }: { snag: Snag | null; onClose: () => void }) {
  const t = useT();
  const [fix, { isLoading }] = useFixSnagMutation();
  const run = useMutationToast();
  const form = useForm<FixValues>({ resolver: zodResolver(fixSchema), values: { photo: null, note: "" } });
  const onSubmit = async (v: FixValues) => {
    if (!snag) return;
    const r = await run(() => fix({ id: snag.id, body: { ...(v.photo ? { afterPhotoIds: [v.photo.id] } : {}), ...(v.note ? { note: v.note } : {}) } }).unwrap(), {
      success: t("closeout.snags.fixed"),
      setError: form.setError,
    });
    if (r) onClose();
  };
  return (
    <SlideOver
      open={Boolean(snag)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={snag ? t("closeout.snags.fixTitle", { code: snag.code }) : ""}
      description={t("closeout.snags.fixDesc")}
      busy={isLoading}
      footer={<FormActions formId="fix-form" submitLabel={t("closeout.snags.fix")} loading={isLoading} onCancel={onClose} />}
    >
      <Form form={form} onSubmit={onSubmit} id="fix-form">
        <AttachmentField name="photo" label={t("closeout.snags.afterPhoto")} kind="SITE_PHOTO" />
        <TextareaField name="note" label={t("closeout.snags.fixNote")} rows={3} />
      </Form>
    </SlideOver>
  );
}

function ReopenSlideOver({ snag, onClose }: { snag: Snag | null; onClose: () => void }) {
  const t = useT();
  const [reopen, { isLoading }] = useReopenSnagMutation();
  const run = useMutationToast();
  const form = useForm<ReopenValues>({ resolver: zodResolver(reopenSchema), values: { reason: "" } });
  const onSubmit = async (v: ReopenValues) => {
    if (!snag) return;
    const r = await run(() => reopen({ id: snag.id, body: { reason: v.reason.trim() } }).unwrap(), { success: t("closeout.snags.reopened"), setError: form.setError });
    if (r) onClose();
  };
  return (
    <SlideOver
      open={Boolean(snag)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={snag ? t("closeout.snags.reopenTitle", { code: snag.code }) : ""}
      description={t("closeout.snags.reopenDesc")}
      busy={isLoading}
      footer={<FormActions formId="reopen-form" submitLabel={t("closeout.snags.reopen")} loading={isLoading} onCancel={onClose} />}
    >
      <Form form={form} onSubmit={onSubmit} id="reopen-form">
        <TextareaField name="reason" label={t("closeout.snags.reason")} required rows={3} />
      </Form>
    </SlideOver>
  );
}

/** Who pays: rework (project cost), sub-contractor deduction, change order, or nobody. */
function CostSlideOver({ projectId, snag, onClose }: { projectId: string; snag: Snag | null; onClose: () => void }) {
  const t = useT();
  const { can } = usePermissions();
  const subcontracts = useGetSubcontractsQuery({ projectId }, { skip: !snag || !can("labor.team.view") });
  const [save, { isLoading }] = useSetSnagCostMutation();
  const run = useMutationToast();
  const form = useForm<CostValues>({
    resolver: zodResolver(costSchema),
    values: {
      attribution: snag?.cost.attribution ?? "NONE",
      amountPaisa: snag?.cost.amountPaisa && snag.cost.amountPaisa !== "0" ? snag.cost.amountPaisa : null,
      subcontractAssignmentId: snag?.cost.subcontractAssignmentId ?? null,
      note: snag?.cost.note ?? "",
    },
  });
  const attribution = useWatch({ control: form.control, name: "attribution" });
  const onSubmit = async (v: CostValues) => {
    if (!snag) return;
    const r = await run(
      () =>
        save({
          id: snag.id,
          body: {
            attribution: v.attribution,
            ...(v.attribution !== "NONE" && v.amountPaisa ? { amountPaisa: v.amountPaisa } : {}),
            ...(v.attribution === "SUBCONTRACTOR_DEDUCTION" && v.subcontractAssignmentId ? { subcontractAssignmentId: v.subcontractAssignmentId } : {}),
            ...(v.note ? { note: v.note } : {}),
          },
        }).unwrap(),
      {
        success: (s) => t("closeout.snags.costSaved", { label: t(`closeout.attribution.${s.cost.attribution}`) }),
        setError: form.setError,
        codeFields: { AMOUNT_REQUIRED: "amountPaisa", NO_SUBCONTRACT_ASSIGNMENT: "subcontractAssignmentId", INVALID_ASSIGNMENT: "subcontractAssignmentId" },
      },
    );
    if (r) onClose();
  };
  const rows = Array.isArray(subcontracts.data) ? subcontracts.data : [];
  return (
    <SlideOver
      open={Boolean(snag)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={snag ? t("closeout.snags.costTitle", { code: snag.code }) : ""}
      description={t("closeout.snags.costDesc")}
      busy={isLoading}
      footer={<FormActions formId="cost-form" submitLabel={t("common.save")} loading={isLoading} onCancel={onClose} />}
    >
      <Form form={form} onSubmit={onSubmit} id="cost-form">
        <RadioCards
          name="attribution"
          label={t("closeout.snags.cost")}
          options={COST_ATTRIBUTIONS.map((a) => ({ value: a, title: t(`closeout.attribution.${a}`), description: t(`closeout.attributionHint.${a}`) }))}
        />
        {attribution !== "NONE" ? <MoneyField name="amountPaisa" label={t("closeout.snags.amount")} required={attribution !== "CHANGE_ORDER"} /> : null}
        {attribution === "SUBCONTRACTOR_DEDUCTION" ? (
          <SelectField
            name="subcontractAssignmentId"
            label={t("closeout.snags.subcontract")}
            noneLabel={t("closeout.snags.subcontractDefault")}
            placeholder={t("closeout.snags.subcontractDefault")}
            options={rows.map((g) => ({ value: g.id, label: `${g.subcontractor.name} — ${g.scope}` }))}
          />
        ) : null}
        <TextareaField name="note" label={t("closeout.snags.costNote")} rows={2} />
      </Form>
    </SlideOver>
  );
}
