"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileSignature, KeyRound, PencilLine } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  useCompleteHandoverMutation,
  useGetHandoverCertificateMutation,
  useGetHandoverQuery,
  useSetHandoverItemMutation,
  useSignOffHandoverMutation,
} from "@/api/services/closeout.api";
import type { Handover, HandoverItem, ProjectDetail } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ErrorState } from "@/components/common/ErrorState";
import { InlineAlert } from "@/components/common/InlineAlert";
import { PdfActions } from "@/components/common/PdfActions";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { AttachmentField } from "@/components/forms/AttachmentField";
import { CheckboxField } from "@/components/forms/CheckboxField";
import { DateField } from "@/components/forms/DateField";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatDate, todayPK } from "@/lib/dates";
import { projectHref } from "@/lib/navigation";
import { completeSchema, itemSchema, signOffSchema, type CompleteValues, type ItemValues, type SignOffValues } from "./schemas";
import { HANDOVER_EDIT_STATUSES, PhotoStrip } from "./shared";

/** "2026-04-15" + 6 months (day clamped to the month end) — mirrors the API. */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))).toISOString().slice(0, 10);
}

/** Project → Documents & Closeout → Handover: checklist, owner sign-off, completion, certificate. */
export function HandoverView({ projectId }: { projectId: string }) {
  const t = useT();
  return (
    <ProjectPageShell projectId={projectId} crumb={t("closeout.handover.crumb")}>
      {(project) => <HandoverBody project={project} />}
    </ProjectPageShell>
  );
}

export function HandoverBody({ project }: { project: ProjectDetail }) {
  const t = useT();
  const q = useGetHandoverQuery(project.id);
  if (q.isLoading) return <CardsSkeleton count={3} height="h-40" />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const h = q.data;
  const editable = HANDOVER_EDIT_STATUSES.includes(h.projectStatus);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0 space-y-4">
        <Checklist projectId={project.id} handover={h} editable={editable} />
      </div>
      <div className="min-w-0 space-y-4">
        {h.handedOverAt ? (
          <InlineAlert tone="success" title={t("closeout.handover.handedOver", { date: formatDate(h.handedOverAt) })}>
            {h.retentionDueDate ? t("closeout.handover.defectPeriod", { months: h.defectPeriodMonths, date: formatDate(h.retentionDueDate) }) : null}
          </InlineAlert>
        ) : null}
        <SignOffCard project={project} handover={h} editable={editable} />
        {h.projectStatus === "CLOSEOUT" ? <CompleteCard projectId={project.id} handover={h} /> : null}
        <SectionCard title={t("closeout.handover.certificate")} description={t("closeout.handover.certificateDesc")}>
          {h.signOff ? <CertificateActions projectId={project.id} phone={project.client?.phone ?? null} /> : <p className="text-sm text-muted-foreground">{t("closeout.handover.certificateNeedsSignOff")}</p>}
        </SectionCard>
      </div>
    </div>
  );
}

function CertificateActions({ projectId, phone }: { projectId: string; phone: string | null }) {
  const t = useT();
  const [load] = useGetHandoverCertificateMutation();
  return <PdfActions load={() => load(projectId).unwrap()} title={t("closeout.handover.certificate")} phone={phone} />;
}

function Checklist({ projectId, handover, editable }: { projectId: string; handover: Handover; editable: boolean }) {
  const t = useT();
  const canManage = useCan("closeout.handover.manage");
  const [setItem, { isLoading }] = useSetHandoverItemMutation();
  const run = useMutationToast();
  const [editing, setEditing] = useState<HandoverItem | null>(null);
  const done = handover.items.filter((i) => i.done).length;
  const can = editable && canManage;
  return (
    <SectionCard
      title={t("closeout.handover.checklist")}
      description={t("closeout.handover.checklistDesc")}
      actions={<StatusBadge tone={done === handover.items.length ? "success" : "warning"} label={t("closeout.handover.progress", { done, total: handover.items.length })} />}
      flush
    >
      <ul className="divide-y">
        {handover.items.map((item) => (
          <li key={item.key} className="flex flex-wrap items-start gap-3 px-6 py-4" data-testid={`item-${item.key}`}>
            <Checkbox
              checked={item.done}
              disabled={!can || isLoading}
              aria-label={t(`closeout.item.${item.key}`)}
              onCheckedChange={(checked) => void run(() => setItem({ projectId, key: item.key, body: { done: checked === true } }).unwrap(), { success: t("closeout.handover.itemSaved") })}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className={cn("flex items-center gap-2 font-medium", item.done && "text-success")}>
                {t(`closeout.item.${item.key}`)}
              </p>
              {item.note ? <p className="text-sm text-muted-foreground">{item.note}</p> : null}
              {item.attachments.length ? <PhotoStrip photos={item.attachments} size="sm" label={t(`closeout.item.${item.key}`)} /> : null}
              {item.doneAt ? <p className="text-xs text-muted-foreground">{t("closeout.handover.doneBy", { name: item.doneBy?.name ?? "—", date: formatDate(item.doneAt.slice(0, 10)) })}</p> : null}
            </div>
            {can ? (
              <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>
                <PencilLine data-icon="inline-start" />
                {t("closeout.handover.details")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {!editable ? <p className="px-6 pb-4 text-xs text-muted-foreground">{t("closeout.handover.lockedHint")}</p> : null}
      <ItemSlideOver projectId={projectId} item={editing} onClose={() => setEditing(null)} />
    </SectionCard>
  );
}

function ItemSlideOver({ projectId, item, onClose }: { projectId: string; item: HandoverItem | null; onClose: () => void }) {
  const t = useT();
  const [setItem, { isLoading }] = useSetHandoverItemMutation();
  const run = useMutationToast();
  const form = useForm<ItemValues>({ resolver: zodResolver(itemSchema), values: { note: item?.note ?? "", photo: null } });
  const onSubmit = async (v: ItemValues) => {
    if (!item) return;
    const r = await run(
      () =>
        setItem({
          projectId,
          key: item.key,
          // Adding a note or photo never ticks the item (QA-A-19): it keeps its done state.
          body: { done: item.done, note: v.note ?? "", ...(v.photo ? { attachmentIds: [...item.attachments.map((a) => a.id), v.photo.id].slice(0, 10) } : {}) },
        }).unwrap(),
      { success: t("closeout.handover.itemSaved"), setError: form.setError },
    );
    if (r) onClose();
  };
  return (
    <SlideOver
      open={Boolean(item)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={item ? t(`closeout.item.${item.key}`) : ""}
      busy={isLoading}
      footer={<FormActions formId="item-form" submitLabel={t("common.save")} loading={isLoading} onCancel={onClose} />}
    >
      <Form form={form} onSubmit={onSubmit} id="item-form">
        <TextareaField name="note" label={t("closeout.handover.itemNote")} rows={3} />
        <AttachmentField name="photo" label={t("closeout.handover.itemPhoto")} kind="DOCUMENT" />
      </Form>
    </SlideOver>
  );
}

function SignOffCard({ project, handover, editable }: { project: ProjectDetail; handover: Handover; editable: boolean }) {
  const t = useT();
  const canManage = useCan("closeout.handover.manage");
  const [open, setOpen] = useState(false);
  const s = handover.signOff;
  return (
    <SectionCard
      title={t("closeout.handover.signOff")}
      description={t("closeout.handover.signOffDesc")}
      actions={
        editable && canManage ? (
          <Button size="sm" variant={s ? "outline" : "default"} onClick={() => setOpen(true)}>
            <FileSignature data-icon="inline-start" />
            {s ? t("closeout.handover.changeSignOff") : t("closeout.handover.recordSignOff")}
          </Button>
        ) : null
      }
    >
      {s ? (
        <div className="space-y-2">
          <p className="font-medium">{t("closeout.handover.signedBy", { name: s.ownerName, date: formatDate(s.signedOn) })}</p>
          {s.note ? <p className="text-sm text-muted-foreground">{s.note}</p> : null}
          {s.signature ? <PhotoStrip photos={[s.signature]} label={t("closeout.handover.signature")} /> : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("closeout.handover.signOffMissing")}</p>
      )}
      <SignOffSlideOver project={project} handover={handover} open={open} onOpenChange={setOpen} />
    </SectionCard>
  );
}

function SignOffSlideOver({ project, handover, open, onOpenChange }: { project: ProjectDetail; handover: Handover; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const [save, { isLoading }] = useSignOffHandoverMutation();
  const run = useMutationToast();
  const form = useForm<SignOffValues>({
    resolver: zodResolver(signOffSchema),
    values: { ownerName: handover.signOff?.ownerName ?? project.client?.name ?? "", signedOn: handover.signOff?.signedOn ?? todayPK(), signature: null, note: handover.signOff?.note ?? "" },
  });
  const onSubmit = async (v: SignOffValues) => {
    const r = await run(
      () =>
        save({
          projectId: project.id,
          body: { ownerName: v.ownerName.trim(), signedOn: v.signedOn, ...(v.signature ? { signatureAttachmentId: v.signature.id } : {}), ...(v.note ? { note: v.note } : {}) },
        }).unwrap(),
      { success: t("closeout.handover.signOffSaved"), setError: form.setError, codeFields: { FUTURE_DATE: "signedOn", INVALID_ATTACHMENT: "signature" } },
    );
    if (r) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={t("closeout.handover.signOff")}
      description={t("closeout.handover.signOffDesc")}
      busy={isLoading}
      footer={<FormActions formId="signoff-form" submitLabel={t("closeout.handover.recordSignOff")} loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="signoff-form">
        <TextField name="ownerName" label={t("closeout.handover.ownerName")} required maxLength={120} />
        <DateField name="signedOn" label={t("closeout.handover.signedOn")} required max={todayPK()} />
        <AttachmentField name="signature" label={t("closeout.handover.signature")} kind="SITE_PHOTO" />
        <TextareaField name="note" label={t("closeout.handover.note")} rows={2} />
      </Form>
    </SlideOver>
  );
}

function CompleteCard({ projectId, handover }: { projectId: string; handover: Handover }) {
  const t = useT();
  const canComplete = useCan({ allPermissions: ["closeout.handover.manage", "projects.project.manage"] });
  const [complete, { isLoading }] = useCompleteHandoverMutation();
  const run = useMutationToast();
  const [confirm, setConfirm] = useState<CompleteValues | null>(null);
  const form = useForm<CompleteValues>({ resolver: zodResolver(completeSchema), values: { handoverDate: todayPK(), acceptOpenSnags: false } });
  const accept = useWatch({ control: form.control, name: "acceptOpenSnags" });
  const date = useWatch({ control: form.control, name: "handoverDate" });
  const blocked = handover.blockers.length > 0 || (handover.openSnags > 0 && !accept);
  return (
    <SectionCard title={t("closeout.handover.complete")} description={t("closeout.handover.completeDesc")}>
      {!canComplete ? (
        <p className="text-sm text-muted-foreground">{t("closeout.handover.noPermission")}</p>
      ) : (
        <Form form={form} onSubmit={(v) => setConfirm(v)} id="complete-form">
          {handover.blockers.length ? (
            <InlineAlert tone="warning">
              <ul className="list-disc space-y-0.5 ps-4">
                {handover.blockers.map((b) => (
                  <li key={b}>{t(`closeout.blocker.${b}`)}</li>
                ))}
              </ul>
            </InlineAlert>
          ) : null}
          {handover.openSnags > 0 ? (
            <InlineAlert
              tone="warning"
              title={t("closeout.handover.openSnags", { n: handover.openSnags })}
              action={
                <Button size="sm" variant="outline" asChild>
                  <Link href={projectHref(projectId, "/documents/snags")}>{t("closeout.handover.openSnagsLink")}</Link>
                </Button>
              }
            />
          ) : null}
          <DateField name="handoverDate" label={t("closeout.handover.handoverDate")} required max={todayPK()} />
          {handover.openSnags > 0 ? <CheckboxField name="acceptOpenSnags" label={t("closeout.handover.acceptOpenSnags", { n: handover.openSnags })} /> : null}
          <Button type="submit" disabled={blocked || isLoading}>
            <KeyRound data-icon="inline-start" />
            {t("closeout.handover.complete")}
          </Button>
        </Form>
      )}
      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(o) => (!o ? setConfirm(null) : undefined)}
        title={t("closeout.handover.completeTitle")}
        description={t("closeout.handover.completeBody", { date: date ? formatDate(addMonths(date, handover.defectPeriodMonths)) : "—", months: handover.defectPeriodMonths })}
        confirmLabel={t("closeout.handover.complete")}
        loading={isLoading}
        onConfirm={async () => {
          if (!confirm) return;
          const r = await run(() => complete({ projectId, body: { handoverDate: confirm.handoverDate, acceptOpenSnags: confirm.acceptOpenSnags } }).unwrap(), {
            success: t("closeout.handover.completed"),
          });
          if (r) setConfirm(null);
        }}
      />
    </SectionCard>
  );
}
