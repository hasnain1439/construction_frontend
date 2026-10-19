"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ExternalLink, FileUp, FolderArchive, History, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  useAddRevisionMutation,
  useCreateDrawingMutation,
  useDeleteDrawingMutation,
  useGetDrawingQuery,
  useGetDrawingsQuery,
  useUpdateDrawingMutation,
  useUpdateRevisionMutation,
} from "@/api/services/closeout.api";
import { DRAWING_FOLDERS, type Drawing, type DrawingFolder, type DrawingRevision } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { useCan } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { AttachmentField } from "@/components/forms/AttachmentField";
import { DateField } from "@/components/forms/DateField";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/button";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { formatDate, todayPK } from "@/lib/dates";
import { drawingSchema, revisionSchema, type DrawingValues, type RevisionValues } from "./schemas";
import { DRAWING_EDIT_STATUSES } from "./shared";

/** Project → Documents & Closeout → Drawings: folders, latest revision, full revision history. */
export function DrawingsView({ projectId }: { projectId: string }) {
  const t = useT();
  const canManage = useCan("closeout.drawing.manage");
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("closeout.drawings.crumb")}
      editableStatuses={DRAWING_EDIT_STATUSES}
      actions={(project) =>
        canManage && DRAWING_EDIT_STATUSES.includes(project.status) ? <AddDrawingButton projectId={projectId} /> : null
      }
    >
      {(project) => <DrawingsList projectId={projectId} editable={canManage && DRAWING_EDIT_STATUSES.includes(project.status)} />}
    </ProjectPageShell>
  );
}

function AddDrawingButton({ projectId }: { projectId: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        {t("closeout.drawings.add")}
      </Button>
      <DrawingFormSlideOver projectId={projectId} drawing={null} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function DrawingsList({ projectId, editable }: { projectId: string; editable: boolean }) {
  const t = useT();
  const [folder, setFolder] = useState<"" | DrawingFolder>("");
  const [q, setQ] = useState("");
  const list = useGetDrawingsQuery({ projectId, ...(folder ? { folder } : {}), ...(q ? { q } : {}) });
  const [historyOf, setHistoryOf] = useState<string | null>(null);
  const [revisionFor, setRevisionFor] = useState<string | null>(null);
  const [editing, setEditing] = useState<Drawing | null>(null);
  const [remove] = useDeleteDrawingMutation();
  const run = useMutationToast();
  const counts = useMemo(() => new Map((list.data?.folders ?? []).map((f) => [f.folder, f.count])), [list.data]);

  const columns: Column<Drawing>[] = [
    {
      id: "title",
      header: t("closeout.drawings.colDrawing"),
      sortValue: (d) => d.title,
      cell: (d) => (
        <div className="min-w-0">
          <p className="font-medium">{d.title}</p>
          {d.number ? (
            <p className="text-xs text-muted-foreground" dir="ltr">
              {d.number}
            </p>
          ) : null}
        </div>
      ),
    },
    { id: "folder", header: t("closeout.drawings.colFolder"), sortValue: (d) => d.folder, cell: (d) => t(`closeout.folder.${d.folder}`) },
    {
      id: "latest",
      header: t("closeout.drawings.colLatest"),
      cell: (d) =>
        d.latest ? (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className="tabular font-medium">{t("closeout.drawings.revision", { n: d.latest.revisionNo })}</span>
            <StatusBadge tone="success" label={t("closeout.drawings.latest")} />
          </span>
        ) : null,
    },
    {
      id: "approved",
      header: t("closeout.drawings.colApproved"),
      sortValue: (d) => d.latest?.approvedAt ?? "",
      cell: (d) =>
        d.latest?.approvedAt ? formatDate(d.latest.approvedAt) : <span className="text-muted-foreground">{t("closeout.drawings.notApproved")}</span>,
    },
    { id: "revisions", header: t("closeout.drawings.colRevisions"), align: "right", sortValue: (d) => d.revisionCount, cell: (d) => <span className="tabular">{d.revisionCount}</span> },
    { id: "updated", header: t("closeout.drawings.colUpdated"), sortValue: (d) => d.updatedAt, cell: (d) => formatDate(d.updatedAt.slice(0, 10)) },
    {
      ...ACTIONS_COLUMN,
      cell: (d) => (
        <RowActions
          name={d.title}
          actions={[
            { label: t("closeout.drawings.history"), icon: History, onSelect: () => setHistoryOf(d.id) },
            ...(d.latest?.file ? [{ label: t("closeout.drawings.openFile"), icon: ExternalLink, href: d.latest.file.url }] : []),
            { label: t("closeout.drawings.uploadRevision"), icon: FileUp, hidden: !editable, onSelect: () => setRevisionFor(d.id) },
            { label: t("closeout.drawings.edit"), icon: Pencil, hidden: !editable, onSelect: () => setEditing(d) },
            {
              label: t("closeout.drawings.delete"),
              icon: Trash2,
              destructive: true,
              hidden: !editable,
              separatorBefore: true,
              confirm: {
                title: t("closeout.drawings.deleteTitle"),
                description: t("closeout.drawings.deleteBody"),
                confirmLabel: t("common.delete"),
                tone: "danger",
                onConfirm: async () => {
                  await run(() => remove(d.id).unwrap(), { success: t("closeout.drawings.deleted") });
                },
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <FilterBar onClear={() => (setFolder(""), setQ(""))} canClear={Boolean(folder || q)}>
        <FilterSelect
          label={t("closeout.drawings.folderLabel")}
          value={folder}
          onChange={(v) => setFolder(v as "" | DrawingFolder)}
          allLabel={t("closeout.drawings.allFolders")}
          options={DRAWING_FOLDERS.map((f) => ({ value: f, label: `${t(`closeout.folder.${f}`)} (${counts.get(f) ?? 0})` }))}
        />
        <SearchInput value={q} onChange={setQ} placeholder={t("closeout.drawings.search")} className="min-w-48 flex-1" />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={list.data?.items}
          columns={columns}
          getRowId={(d) => d.id}
          loading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          onRowClick={(d) => setHistoryOf(d.id)}
          empty={{ icon: FolderArchive, title: t("closeout.drawings.noDrawings"), description: t("closeout.drawings.noDrawingsDesc") }}
        />
      </SectionCard>
      <RevisionHistorySlideOver drawingId={historyOf} editable={editable} onClose={() => setHistoryOf(null)} onUpload={(id) => setRevisionFor(id)} />
      <RevisionFormSlideOver drawingId={revisionFor} onClose={() => setRevisionFor(null)} />
      <DrawingFormSlideOver projectId={projectId} drawing={editing} open={Boolean(editing)} onOpenChange={(o) => (!o ? setEditing(null) : undefined)} />
    </div>
  );
}

/** Every revision, newest first: latest / superseded, file, approval, who uploaded it. */
function RevisionHistorySlideOver({ drawingId, editable, onClose, onUpload }: { drawingId: string | null; editable: boolean; onClose: () => void; onUpload: (id: string) => void }) {
  const t = useT();
  const detail = useGetDrawingQuery(drawingId ?? "", { skip: !drawingId });
  const [approve, { isLoading }] = useUpdateRevisionMutation();
  const run = useMutationToast();
  const d = detail.data;
  return (
    <SlideOver
      open={Boolean(drawingId)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={d ? d.title : t("closeout.drawings.history")}
      description={t("closeout.drawings.historyDesc")}
      footer={
        editable && d ? (
          <Button onClick={() => onUpload(d.id)}>
            <FileUp data-icon="inline-start" />
            {t("closeout.drawings.uploadRevision")}
          </Button>
        ) : undefined
      }
    >
      {detail.isFetching && !d ? (
        <CardsSkeleton count={2} height="h-24" />
      ) : detail.error ? (
        <ErrorState error={detail.error} onRetry={detail.refetch} />
      ) : d ? (
        <ol className="space-y-3">
          {d.revisions.map((r: DrawingRevision) => (
            <li key={r.id} className="space-y-2 rounded-xl border p-4" data-testid={`revision-${r.revisionNo}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  <span className="tabular font-semibold">{t("closeout.drawings.revision", { n: r.revisionNo })}</span>
                  <StatusBadge tone={r.isLatest ? "success" : "neutral"} label={t(r.isLatest ? "closeout.drawings.latest" : "closeout.drawings.superseded")} />
                </span>
                {r.file ? (
                  <Button size="sm" variant="outline" asChild>
                    <a href={r.file.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink data-icon="inline-start" />
                      {t("closeout.drawings.openFile")}
                    </a>
                  </Button>
                ) : null}
              </div>
              <p className="text-sm">
                {r.approvedAt ? t("closeout.drawings.approvedOn", { date: formatDate(r.approvedAt) }) : <span className="text-muted-foreground">{t("closeout.drawings.notApproved")}</span>}
              </p>
              {r.notes ? <p dir="auto" className="text-sm whitespace-pre-line text-muted-foreground">{r.notes}</p> : null}
              <p className="text-xs text-muted-foreground">
                {t("closeout.drawings.uploadedBy", { name: r.uploadedBy?.name ?? "—", date: formatDate(r.createdAt.slice(0, 10)) })}
              </p>
              {/* Only the latest revision can be approved; a superseded one is history (QA-C-23). */}
              {editable && r.isLatest && !r.approvedAt ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isLoading}
                  onClick={() => void run(() => approve({ revisionId: r.id, body: { approvedAt: todayPK() } }).unwrap(), { success: t("closeout.drawings.approved") })}
                >
                  <CheckCircle2 data-icon="inline-start" />
                  {t("closeout.drawings.approveToday")}
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </SlideOver>
  );
}

function RevisionFormSlideOver({ drawingId, onClose }: { drawingId: string | null; onClose: () => void }) {
  const t = useT();
  const [add, { isLoading }] = useAddRevisionMutation();
  const run = useMutationToast();
  const form = useForm<RevisionValues>({ resolver: zodResolver(revisionSchema), values: { file: null, approvedAt: "", notes: "" } });
  const onSubmit = async (v: RevisionValues) => {
    if (!drawingId || !v.file) return;
    const r = await run(
      () => add({ id: drawingId, body: { attachmentId: v.file!.id, ...(v.approvedAt ? { approvedAt: v.approvedAt } : {}), ...(v.notes ? { notes: v.notes } : {}) } }).unwrap(),
      { success: (d) => t("closeout.drawings.revisionAdded", { n: d.latest?.revisionNo ?? 0 }), setError: form.setError, codeFields: { INVALID_ATTACHMENT: "file" } },
    );
    if (r) onClose();
  };
  return (
    <SlideOver
      open={Boolean(drawingId)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={t("closeout.drawings.uploadRevision")}
      description={t("closeout.drawings.uploadRevisionDesc")}
      busy={isLoading}
      footer={<FormActions formId="revision-form" submitLabel={t("closeout.drawings.saveRevision")} loading={isLoading} onCancel={onClose} />}
    >
      <Form form={form} onSubmit={onSubmit} id="revision-form">
        <AttachmentField name="file" label={t("closeout.drawings.file")} kind="DOCUMENT" required />
        <DateField name="approvedAt" label={t("closeout.drawings.approvedAt")} max={todayPK()} />
        <TextareaField name="notes" label={t("closeout.drawings.revisionNotes")} rows={3} />
      </Form>
    </SlideOver>
  );
}

/** New drawing (with its first file) or edit folder / title / number / notes. */
function DrawingFormSlideOver({ projectId, drawing, open, onOpenChange }: { projectId: string; drawing: Drawing | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const [create, creating] = useCreateDrawingMutation();
  const [update, updating] = useUpdateDrawingMutation();
  const busy = creating.isLoading || updating.isLoading;
  const run = useMutationToast();
  const form = useForm<DrawingValues>({
    resolver: zodResolver(drawingSchema),
    values: {
      folder: drawing?.folder ?? "ARCHITECTURAL",
      title: drawing?.title ?? "",
      number: drawing?.number ?? "",
      notes: drawing?.notes ?? "",
      file: null,
      approvedAt: "",
      revisionNotes: "",
    },
  });
  const onSubmit = async (v: DrawingValues) => {
    const base = { folder: v.folder, title: v.title.trim() };
    if (drawing) {
      const r = await run(() => update({ id: drawing.id, body: { ...base, number: v.number?.trim() || null, notes: v.notes?.trim() || null } }).unwrap(), {
        success: t("closeout.drawings.saved"),
        setError: form.setError,
      });
      if (r) onOpenChange(false);
      return;
    }
    if (!v.file) {
      form.setError("file", { message: t("closeout.drawings.file") });
      return;
    }
    const r = await run(
      () =>
        create({
          projectId,
          body: {
            ...base,
            ...(v.number?.trim() ? { number: v.number.trim() } : {}),
            ...(v.notes?.trim() ? { notes: v.notes.trim() } : {}),
            revision: { attachmentId: v.file!.id, ...(v.approvedAt ? { approvedAt: v.approvedAt } : {}), ...(v.revisionNotes?.trim() ? { notes: v.revisionNotes.trim() } : {}) },
          },
        }).unwrap(),
      { success: t("closeout.drawings.created"), setError: form.setError, codeFields: { INVALID_ATTACHMENT: "file" } },
    );
    if (r) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={drawing ? t("closeout.drawings.edit") : t("closeout.drawings.add")}
      busy={busy}
      footer={<FormActions formId="drawing-form" submitLabel={t("closeout.drawings.save")} loading={busy} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="drawing-form">
        <SelectField name="folder" label={t("closeout.drawings.folderLabel")} required options={DRAWING_FOLDERS.map((f) => ({ value: f, label: t(`closeout.folder.${f}`) }))} />
        <TextField name="title" label={t("closeout.drawings.title")} required maxLength={200} />
        <TextField name="number" label={t("closeout.drawings.number")} hint={t("closeout.drawings.numberHint")} maxLength={40} dir="ltr" />
        <TextareaField name="notes" label={t("closeout.drawings.notes")} rows={2} />
        {drawing ? null : (
          <>
            <AttachmentField name="file" label={t("closeout.drawings.file")} kind="DOCUMENT" required />
            <DateField name="approvedAt" label={t("closeout.drawings.approvedAt")} max={todayPK()} />
            <TextareaField name="revisionNotes" label={t("closeout.drawings.revisionNotes")} rows={2} />
          </>
        )}
      </Form>
    </SlideOver>
  );
}
