"use client";

import { Ban, CheckCheck, FileCheck2, Pencil, Play, Receipt, RotateCcw, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  useApproveChangeOrderMutation,
  useBillChangeOrderMutation,
  useChangeOrderStepMutation,
  useDeleteChangeOrderMutation,
  useGetChangeOrderPdfMutation,
  useGetChangeOrderQuery,
  useRejectChangeOrderMutation,
} from "@/api/services/changeOrders.api";
import { PROOF_TYPES, type ChangeOrderBillingMode, type ChangeOrderDetail, type ChangeOrderProofType } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FileUpload, type UploadedFile } from "@/components/common/FileUpload";
import { InfoList } from "@/components/common/InfoList";
import { MoneyText } from "@/components/common/MoneyText";
import { PdfActions } from "@/components/common/PdfActions";
import { usePermissions } from "@/components/common/PermissionGate";
import { QtyUnitText } from "@/components/common/QtyText";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoStrip } from "@/features/closeout/shared";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT, type TranslationKey } from "@/i18n/useT";
import { formatDate, todayPK } from "@/lib/dates";
import { projectHref } from "@/lib/navigation";
import { allowedActions, proofProblem, type ChangeOrderAction } from "./calc";
import { ChangeOrderStatusBadge, CO_EDIT_STATUSES, SignedMoney, StatusStepper } from "./shared";

/** Project → Change Orders → one change order: stepper, items at cost / owner price, proof, billing, slip PDF. */
export function ChangeOrderDetailView({ projectId, changeOrderId }: { projectId: string; changeOrderId: string }) {
  const t = useT();
  const detail = useGetChangeOrderQuery(changeOrderId);
  return (
    <ProjectPageShell projectId={projectId} crumb={detail.data ? t("changeOrders.detail.crumb", { code: detail.data.code }) : t("changeOrders.list.crumb")}>
      {(project) => (
        <QueryState query={detail} skeleton={<CardsSkeleton count={3} height="h-40" />}>
          {(co) => <ChangeOrderDetailBody co={co} projectId={projectId} editable={CO_EDIT_STATUSES.includes(project.status)} phone={project.client?.phone ?? null} />}
        </QueryState>
      )}
    </ProjectPageShell>
  );
}

const ACTION_ICON: Record<ChangeOrderAction, typeof Send> = {
  edit: Pencil,
  delete: Trash2,
  send: Send,
  approve: FileCheck2,
  reject: Ban,
  reopen: RotateCcw,
  start: Play,
  complete: CheckCheck,
  bill: Receipt,
};

export function ChangeOrderDetailBody({ co, projectId, editable, phone }: { co: ChangeOrderDetail; projectId: string; editable: boolean; phone?: string | null }) {
  const t = useT();
  const router = useRouter();
  const { can, canSee } = usePermissions();
  const [dialog, setDialog] = useState<"approve" | "reject" | "bill" | "delete" | null>(null);
  const [step, { isLoading: stepping }] = useChangeOrderStepMutation();
  const [loadPdf] = useGetChangeOrderPdfMutation();
  const run = useMutationToast();
  const actions = editable ? allowedActions(co.status, can, { onInvoice: Boolean(co.invoice) }) : [];
  const seesPrice = canSee("rates") || canSee("amounts");

  const doStep = (s: "send" | "reopen" | "start" | "complete", success: TranslationKey) => run(() => step({ id: co.id, step: s }).unwrap(), { success: t(success) });
  const onAction = (a: ChangeOrderAction) => {
    if (a === "edit") router.push(projectHref(projectId, `/change-orders/${co.id}/edit`));
    else if (a === "send") void doStep("send", "changeOrders.actions.sent");
    else if (a === "reopen") void doStep("reopen", "changeOrders.actions.reopened");
    else if (a === "start") void doStep("start", "changeOrders.actions.started");
    else if (a === "complete") void doStep("complete", "changeOrders.actions.completed");
    else setDialog(a);
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title={`${co.code} · ${co.title}`}
        description={co.description ?? undefined}
        actions={
          <span className="inline-flex flex-wrap items-center gap-2">
            <ChangeOrderStatusBadge status={co.status} />
          </span>
        }
      >
        <div className="space-y-4">
          <StatusStepper status={co.status} />
          {actions.length ? (
            <div className="flex flex-wrap gap-2" data-testid="co-actions">
              {actions.map((a) => {
                const Icon = ACTION_ICON[a];
                return (
                  <Button key={a} type="button" size="sm" variant={a === "delete" || a === "reject" ? "destructive-soft" : a === "approve" || a === "bill" ? "default" : "outline"} disabled={stepping} onClick={() => onAction(a)}>
                    <Icon data-icon="inline-start" />
                    {t(a === "delete" ? "changeOrders.actions.delete" : `changeOrders.actions.${a}`)}
                  </Button>
                );
              })}
            </div>
          ) : null}
          {seesPrice ? <PdfActions load={() => loadPdf(co.id).unwrap()} title={t("changeOrders.detail.slipTitle", { code: co.code })} phone={phone} /> : null}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <SectionCard title={t("changeOrders.detail.items")} flush>
          {co.lines.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-start">{t("changeOrders.builder.item")}</th>
                    <th className="px-4 py-2 text-end">{t("changeOrders.builder.qty")}</th>
                    {canSee("rates") ? <th className="px-4 py-2 text-end">{t("changeOrders.builder.rate")}</th> : null}
                    {seesPrice ? <th className="px-4 py-2 text-end">{t("changeOrders.builder.priceRate")}</th> : null}
                    {seesPrice ? <th className="px-4 py-2 text-end">{t("changeOrders.builder.price")}</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {co.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-2">
                        <p dir="auto" className="font-medium">{l.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {t(`changeOrders.kind.${l.kind}`)} · {t(`changeOrders.rateSource.${l.rateSource}`)}
                        </p>
                      </td>
                      <td className="px-4 py-2 text-end whitespace-nowrap">
                        <QtyUnitText quantity={l.quantity} unit={l.unit} />
                      </td>
                      {canSee("rates") ? (
                        <td className="px-4 py-2 text-end">
                          <MoneyText paisa={l.ratePaisa} />
                        </td>
                      ) : null}
                      {seesPrice ? (
                        <td className="px-4 py-2 text-end">
                          <MoneyText paisa={l.priceRatePaisa} />
                        </td>
                      ) : null}
                      {seesPrice ? (
                        <td className="px-4 py-2 text-end">
                          <MoneyText paisa={l.priceAmountPaisa} />
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-6 py-4 text-sm text-muted-foreground">{t("changeOrders.detail.noItems")}</p>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title={t("changeOrders.detail.money")}>
            <InfoList
              columns={1}
              items={[
                { label: t("changeOrders.detail.cost"), value: <MoneyText paisa={co.costPaisa} />, hidden: co.costPaisa === undefined },
                { label: t("changeOrders.detail.markup", { percent: co.markupPercent ?? 0 }), value: <MoneyText paisa={co.markupPaisa} />, hidden: co.markupPaisa === undefined },
                { label: co.type === "DEDUCTION" ? t("changeOrders.detail.deduction") : t("changeOrders.detail.total"), value: <SignedMoney paisa={co.totalPaisa} className="font-semibold" /> },
                { label: t("changeOrders.detail.time"), value: co.daysImpact ? t("changeOrders.detail.daysValue", { n: co.daysImpact }) : t("changeOrders.detail.noDays") },
                { label: t("changeOrders.detail.milestones"), value: co.affectedMilestones.map((m) => m.name).join(", ") || "—" },
              ]}
            />
          </SectionCard>
          <SectionCard title={t("changeOrders.detail.proof")}>
            <div className="space-y-2 text-sm">
              {co.proofType ? <p className="font-medium">{t(`changeOrders.proof.${co.proofType}`)}</p> : <p className="text-muted-foreground">{t("changeOrders.detail.proofNone")}</p>}
              {co.proofNote ? <p>{co.proofNote}</p> : null}
              {co.proofFiles.length ? <PhotoStrip photos={co.proofFiles.map((f) => ({ id: f.id, mimeType: f.mimeType, url: f.url, thumbUrl: f.thumbUrl ?? f.url }))} size="sm" label={t("changeOrders.detail.proof")} /> : null}
              {co.approvedOn ? <p className="text-xs text-muted-foreground">{t("changeOrders.detail.approvedOn", { date: formatDate(co.approvedOn), name: co.approvedBy?.name ?? "—" })}</p> : null}
              {co.rejectionReason ? <p className="text-xs text-danger">{t("changeOrders.detail.rejectedReason", { reason: co.rejectionReason })}</p> : null}
            </div>
          </SectionCard>
          <SectionCard title={t("changeOrders.detail.billing")}>
            <p className="text-sm">
              {co.invoice
                ? co.invoice.number
                  ? t("changeOrders.detail.onInvoice", { number: co.invoice.number })
                  : t("changeOrders.detail.onDraftInvoice", { type: co.invoice.type })
                : co.billingMode === "NEXT_STAGE"
                  ? t("changeOrders.detail.waitingStage")
                  : t("changeOrders.detail.notBilled")}
            </p>
            {co.invoice && can("billing.invoice.view") ? (
              <Link className="text-sm underline" href={projectHref(projectId, "/billing/invoices")}>
                {t("changeOrders.detail.billing")}
              </Link>
            ) : null}
          </SectionCard>
          <SectionCard title={t("changeOrders.detail.source")}>
            <div className="space-y-2 text-sm">
              <p>{t(`changeOrders.source.${co.source}`)}</p>
              {co.siteInstruction ? (
                <>
                  <p className="font-medium">{t("changeOrders.detail.fromInstruction", { code: co.siteInstruction.code })}</p>
                  <p>{co.siteInstruction.note}</p>
                  <PhotoStrip photos={co.siteInstruction.photos} size="sm" label={t("changeOrders.instructions.photo")} />
                </>
              ) : null}
              {co.snag ? <p className="font-medium">{t("changeOrders.detail.fromSnag", { code: co.snag.code })}</p> : null}
              <p className="text-xs text-muted-foreground">{t("changeOrders.detail.createdBy", { name: co.createdBy?.name ?? "—", date: formatDate(co.createdAt.slice(0, 10)) })}</p>
            </div>
          </SectionCard>
        </div>
      </div>

      <ApproveDialog co={co} open={dialog === "approve"} onClose={() => setDialog(null)} canBill={can("changeorder.manage")} />
      <RejectDialog co={co} open={dialog === "reject"} onClose={() => setDialog(null)} />
      <BillDialog co={co} open={dialog === "bill"} onClose={() => setDialog(null)} />
      <DeleteDialog co={co} open={dialog === "delete"} onClose={() => setDialog(null)} onDeleted={() => router.push(projectHref(projectId, "/change-orders"))} />
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

const PROBLEM_KEY = {
  PROOF_REQUIRED: "changeOrders.actions.needsProof",
  PROOF_NOTE_REQUIRED: "changeOrders.actions.needsNote",
  PROOF_FILE_REQUIRED: "changeOrders.actions.needsFile",
} as const;

export function ApproveDialog({ co, open, onClose, canBill }: { co: ChangeOrderDetail; open: boolean; onClose: () => void; canBill: boolean }) {
  const t = useT();
  const [approve, { isLoading }] = useApproveChangeOrderMutation();
  const run = useMutationToast();
  const [proofType, setProofType] = useState<ChangeOrderProofType | "">(co.proofType ?? "");
  const [note, setNote] = useState(co.proofNote ?? "");
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [date, setDate] = useState(todayPK());
  const [mode, setMode] = useState<ChangeOrderBillingMode | "">("");
  const problem = proofProblem(proofType || null, note, co.proofFiles.length + (file ? 1 : 0));
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={t("changeOrders.actions.approveTitle", { code: co.code })}
      description={t("changeOrders.actions.approveDesc")}
      confirmLabel={t("changeOrders.actions.approve")}
      loading={isLoading}
      confirmDisabled={problem !== null}
      onConfirm={async () => {
        const r = await run(
          () =>
            approve({
              id: co.id,
              body: {
                approvedOn: date,
                ...(proofType ? { proofType } : {}),
                ...(note.trim() ? { proofNote: note.trim() } : {}),
                ...(file ? { proofAttachmentIds: [...co.proofFiles.map((f) => f.id), file.id] } : {}),
                ...(mode ? { billingMode: mode } : {}),
              },
            }).unwrap(),
          { success: t("changeOrders.actions.approved") },
        );
        if (r) onClose();
      }}
    >
      <div className="space-y-3">
        <Field label={t("changeOrders.builder.proofType")}>
          <SegmentedControl<ChangeOrderProofType>
            value={proofType || undefined}
            onChange={setProofType}
            ariaLabel={t("changeOrders.builder.proofType")}
            size="sm"
            options={PROOF_TYPES.map((p) => ({ value: p, label: t(`changeOrders.proof.${p}`) }))}
          />
        </Field>
        {proofType === "VERBAL" ? (
          <Field label={t("changeOrders.builder.proofNote")} htmlFor="approve-note">
            <Textarea id="approve-note" rows={2} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
          </Field>
        ) : proofType ? (
          <FileUpload kind="SITE_PHOTO" value={file} onChange={(f) => setFile(f)} label={t("changeOrders.builder.proofFile")} />
        ) : null}
        <Field label={t("changeOrders.actions.approvedOnDate")} htmlFor="approve-date">
          <Input id="approve-date" type="date" dir="ltr" value={date} max={todayPK()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {canBill ? (
          <Field label={t("changeOrders.actions.billingNow")}>
            <SegmentedControl<ChangeOrderBillingMode>
              value={mode || undefined}
              onChange={setMode}
              ariaLabel={t("changeOrders.actions.billingNow")}
              size="sm"
              options={(["NEXT_STAGE", "VARIATION"] as const).map((m) => ({ value: m, label: t(`changeOrders.billingMode.${m}`) }))}
            />
          </Field>
        ) : null}
        {problem ? (
          <p className="text-xs text-warning" role="status">
            {t(PROBLEM_KEY[problem])}
          </p>
        ) : null}
      </div>
    </ConfirmDialog>
  );
}

function RejectDialog({ co, open, onClose }: { co: ChangeOrderDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const [reject, { isLoading }] = useRejectChangeOrderMutation();
  const run = useMutationToast();
  const [reason, setReason] = useState("");
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      tone="danger"
      title={t("changeOrders.actions.rejectTitle", { code: co.code })}
      confirmLabel={t("changeOrders.actions.reject")}
      loading={isLoading}
      confirmDisabled={reason.trim().length < 3}
      onConfirm={async () => {
        const r = await run(() => reject({ id: co.id, body: { reason: reason.trim() } }).unwrap(), { success: t("changeOrders.actions.rejected") });
        if (r) onClose();
      }}
    >
      <Field label={t("changeOrders.actions.rejectReason")} htmlFor="reject-reason">
        <Textarea id="reject-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </ConfirmDialog>
  );
}

function BillDialog({ co, open, onClose }: { co: ChangeOrderDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const [bill, { isLoading }] = useBillChangeOrderMutation();
  const run = useMutationToast();
  const [mode, setMode] = useState<ChangeOrderBillingMode>(co.type === "DEDUCTION" ? "NEXT_STAGE" : (co.billingMode ?? "NEXT_STAGE"));
  const [notes, setNotes] = useState("");
  const modes: ChangeOrderBillingMode[] = co.type === "DEDUCTION" ? ["NEXT_STAGE"] : ["NEXT_STAGE", "VARIATION"];
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={t("changeOrders.actions.billTitle", { code: co.code })}
      description={t("changeOrders.actions.billDesc")}
      confirmLabel={t("changeOrders.actions.bill")}
      loading={isLoading}
      onConfirm={async () => {
        const r = await run(() => bill({ id: co.id, body: { mode, ...(notes.trim() ? { notes: notes.trim() } : {}) } }).unwrap(), {
          success: (res) => (res.invoice?.type === "VARIATION" ? t("changeOrders.actions.billedVariation") : t("changeOrders.actions.billedStage")),
        });
        if (r) onClose();
      }}
    >
      <div className="space-y-3">
        <SegmentedControl<ChangeOrderBillingMode>
          value={mode}
          onChange={setMode}
          ariaLabel={t("changeOrders.actions.billingNow")}
          size="sm"
          options={modes.map((m) => ({ value: m, label: t(`changeOrders.billingMode.${m}`) }))}
        />
        <p className="text-xs text-muted-foreground">{t(`changeOrders.billingModeHint.${mode}`)}</p>
        {mode === "VARIATION" ? (
          <Field label={t("changeOrders.actions.billNotes")} htmlFor="bill-notes">
            <Input id="bill-notes" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        ) : null}
      </div>
    </ConfirmDialog>
  );
}

function DeleteDialog({ co, open, onClose, onDeleted }: { co: ChangeOrderDetail; open: boolean; onClose: () => void; onDeleted: () => void }) {
  const t = useT();
  const [remove, { isLoading }] = useDeleteChangeOrderMutation();
  const run = useMutationToast();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      tone="danger"
      title={t("changeOrders.actions.deleteTitle", { code: co.code })}
      description={t("changeOrders.actions.deleteBody")}
      confirmLabel={t("changeOrders.actions.delete")}
      loading={isLoading}
      onConfirm={async () => {
        const r = await run(() => remove(co.id).unwrap(), { success: t("changeOrders.actions.deleted") });
        if (r) onDeleted();
      }}
    />
  );
}
