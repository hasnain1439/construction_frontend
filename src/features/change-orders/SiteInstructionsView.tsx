"use client";

import { Ban, CircleDot, ClipboardCheck, MessageSquareText, Plus, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConvertSiteInstructionMutation, useCreateSiteInstructionMutation, useDismissSiteInstructionMutation, useGetSiteInstructionsQuery } from "@/api/services/changeOrders.api";
import type { SiteInstruction, SiteInstructionStatus } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FileUpload, type UploadedFile } from "@/components/common/FileUpload";
import { KpiCard } from "@/components/common/KpiCard";
import { usePermissions } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions, type RowAction } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { projectHref } from "@/lib/navigation";
import type { StatusTone } from "@/lib/status";
import { CO_EDIT_STATUSES } from "./shared";

const TONE: Record<SiteInstructionStatus, StatusTone> = { NEW: "warning", CONVERTED: "success", DISMISSED: "neutral" };

/** Project → Change Orders → Site instructions: the owner's requests from site, turned into CO drafts or dismissed. */
export function SiteInstructionsView({ projectId }: { projectId: string }) {
  const t = useT();
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("changeOrders.instructions.crumb")}
      actions={(project) =>
        can("changeorder.instruction.create") && CO_EDIT_STATUSES.includes(project.status) ? (
          <>
            <Button onClick={() => setOpen(true)}>
              <Plus data-icon="inline-start" />
              {t("changeOrders.instructions.new")}
            </Button>
            <NewInstructionSlideOver projectId={projectId} open={open} onOpenChange={setOpen} />
          </>
        ) : null
      }
    >
      {(project) => <SiteInstructionsList projectId={projectId} editable={CO_EDIT_STATUSES.includes(project.status)} />}
    </ProjectPageShell>
  );
}

export function SiteInstructionsList({ projectId, editable }: { projectId: string; editable: boolean }) {
  const t = useT();
  const router = useRouter();
  const { can } = usePermissions();
  const list = useGetSiteInstructionsQuery({ projectId });
  const [convert, { isLoading: converting }] = useConvertSiteInstructionMutation();
  const [dismiss, { isLoading: dismissing }] = useDismissSiteInstructionMutation();
  const [converting1, setConverting1] = useState<SiteInstruction | null>(null);
  const [dismissing1, setDismissing1] = useState<SiteInstruction | null>(null);
  const [reason, setReason] = useState("");
  const run = useMutationToast();
  const office = editable && can("changeorder.create");
  const s = list.data?.summary;

  const actionsOf = (si: SiteInstruction): RowAction[] => [
    { label: t("changeOrders.instructions.convert"), icon: Wand2, hidden: !(office && si.status === "NEW"), onSelect: () => setConverting1(si) },
    { label: t("changeOrders.instructions.dismiss"), icon: Ban, destructive: true, hidden: !(office && si.status === "NEW"), onSelect: () => setDismissing1(si) },
  ];

  const columns: Column<SiteInstruction>[] = [
    { id: "code", header: t("changeOrders.instructions.colCode"), sortValue: (r) => r.number, cell: (r) => <span className="tabular font-medium" dir="ltr">{r.code}</span>, className: "w-24" },
    {
      id: "note",
      header: t("changeOrders.instructions.colNote"),
      cell: (r) => (
        <div className="space-y-1">
          <p>{r.note}</p>
          {r.changeOrder ? (
            <Link className="text-xs underline" href={projectHref(projectId, `/change-orders/${r.changeOrder.id}`)}>
              {t("changeOrders.instructions.linked", { code: r.changeOrder.code })}
            </Link>
          ) : null}
          {r.dismissReason ? <p className="text-xs text-muted-foreground">{r.dismissReason}</p> : null}
        </div>
      ),
    },
    { id: "photos", header: t("changeOrders.instructions.colPhotos"), cell: (r) => <span className="text-xs text-muted-foreground">{t("changeOrders.instructions.photoCount", { n: r.photos.length })}</span> },
    {
      id: "by",
      header: t("changeOrders.instructions.colBy"),
      cell: (r) => (
        <span className="text-sm">
          {r.createdBy?.name ?? "—"} · {formatDate(r.createdAt.slice(0, 10))}
        </span>
      ),
    },
    { id: "status", header: t("changeOrders.instructions.colStatus"), cell: (r) => <StatusBadge tone={TONE[r.status]} label={t(`changeOrders.siStatus.${r.status}`)} /> },
    { ...ACTIONS_COLUMN, cell: (r) => <RowActions name={r.code} actions={actionsOf(r)} /> },
  ];

  return (
    <div className="space-y-4">
      {!can("changeorder.instruction.view") ? <p className="text-sm text-muted-foreground">{t("changeOrders.instructions.ownOnly")}</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label={t("changeOrders.instructions.kpiNew")} value={s?.new ?? 0} icon={CircleDot} tone="warning" loading={list.isLoading} />
        <KpiCard label={t("changeOrders.instructions.kpiConverted")} value={s?.converted ?? 0} icon={ClipboardCheck} tone="success" loading={list.isLoading} />
        <KpiCard label={t("changeOrders.instructions.kpiDismissed")} value={s?.dismissed ?? 0} icon={Ban} loading={list.isLoading} />
      </div>
      <SectionCard flush>
        <DataTable
          rows={list.data?.items}
          columns={columns}
          getRowId={(r) => r.id}
          loading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          empty={{ icon: MessageSquareText, title: t("changeOrders.instructions.empty"), description: t("changeOrders.instructions.emptyDesc") }}
        />
      </SectionCard>
      <ConfirmDialog
        open={Boolean(converting1)}
        onOpenChange={(o) => (!o ? setConverting1(null) : undefined)}
        title={converting1 ? t("changeOrders.instructions.convertTitle", { code: converting1.code }) : ""}
        tone="default"
        description={t("changeOrders.instructions.convertDesc")}
        confirmLabel={t("changeOrders.instructions.convert")}
        loading={converting}
        onConfirm={async () => {
          if (!converting1) return;
          const co = await run(() => convert({ id: converting1.id, body: {} }).unwrap(), { success: (r) => t("changeOrders.instructions.converted", { code: r.code }) });
          if (co) {
            setConverting1(null);
            router.push(projectHref(projectId, `/change-orders/${co.id}/edit`));
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(dismissing1)}
        onOpenChange={(o) => (!o ? (setDismissing1(null), setReason("")) : undefined)}
        tone="danger"
        title={dismissing1 ? t("changeOrders.instructions.dismissTitle", { code: dismissing1.code }) : ""}
        confirmLabel={t("changeOrders.instructions.dismiss")}
        loading={dismissing}
        confirmDisabled={reason.trim().length < 3}
        onConfirm={async () => {
          if (!dismissing1) return;
          const r = await run(() => dismiss({ id: dismissing1.id, body: { reason: reason.trim() } }).unwrap(), { success: t("changeOrders.instructions.dismissed") });
          if (r) {
            setDismissing1(null);
            setReason("");
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="si-reason">{t("changeOrders.instructions.dismissReason")}</Label>
          <Textarea id="si-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </ConfirmDialog>
    </div>
  );
}

function NewInstructionSlideOver({ projectId, open, onOpenChange }: { projectId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const [create, { isLoading }] = useCreateSiteInstructionMutation();
  const run = useMutationToast();
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<UploadedFile | null>(null);
  const close = () => {
    setNote("");
    setPhoto(null);
    onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={(o) => (!o ? close() : undefined)}
      title={t("changeOrders.instructions.newTitle")}
      busy={isLoading}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={note.trim().length < 3 || isLoading}
            onClick={async () => {
              const r = await run(() => create({ projectId, body: { note: note.trim(), ...(photo ? { photoIds: [photo.id] } : {}) } }).unwrap(), {
                success: (si) => t("changeOrders.instructions.created", { code: si.code }),
              });
              if (r) close();
            }}
          >
            {t("common.save")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="si-note">{t("changeOrders.instructions.note")}</Label>
          <Textarea id="si-note" rows={3} maxLength={1000} value={note} placeholder={t("changeOrders.instructions.notePlaceholder")} onChange={(e) => setNote(e.target.value)} />
        </div>
        <FileUpload kind="SITE_PHOTO" value={photo} onChange={(f) => setPhoto(f)} label={t("changeOrders.instructions.photo")} />
      </div>
    </SlideOver>
  );
}
