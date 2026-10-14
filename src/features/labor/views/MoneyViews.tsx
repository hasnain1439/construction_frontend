"use client";

import { BadgeAlert, Banknote, BookOpen, CalendarRange, CheckCheck, CircleDollarSign, FileSpreadsheet, HandCoins, Minus, Pencil, Percent, Plus, Ruler, Send, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useAdjustSettlementLineMutation,
  useApproveSettlementMutation,
  useGenerateSettlementMutation,
  useGetAdvancesQuery,
  useGetMeasurementsQuery,
  useGetProjectSettlementsQuery,
  useGetSettlementQuery,
  useGetSubcontractAccountsQuery,
  useGetSubcontractLedgerQuery,
  usePaySettlementMutation,
  useRejectMeasurementMutation,
  useReturnSettlementMutation,
  useSubmitSettlementMutation,
  useVerifyMeasurementMutation,
} from "@/api/services/labor.api";
import type { Advance, LaborPaidFrom, Settlement, SettlementLine, SubcontractAccountRow, WorkMeasurement } from "@/api/types";
import { ApprovalActions } from "@/components/common/ApprovalActions";
import { DataTable, type Column } from "@/components/common/DataTable";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { useApprovalLimitHint, usePermissions } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StatusTimeline, type TimelineStep } from "@/components/common/StatusTimeline";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { WeekPicker } from "@/components/common/WeekPicker";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatDate } from "@/lib/dates";
import { formatPKR, formatPKRShort, sumPaisa } from "@/lib/money";
import { projectHref } from "@/lib/navigation";
import { formatQty } from "@/lib/quantity";
import { currentWeekStart, formatWeekRange } from "@/lib/weeks";
import { AdvanceSlideOver, DeductionSlideOver, MeasurementSlideOver, ProgressSlideOver, SubPaymentSlideOver, useIsMunshi } from "../components/LaborSlideOvers";
import { useLaborLabels } from "../options";
import { useStatusT, useT } from "@/i18n/useT";

const isOpen = (status: string) => status === "ACTIVE" || status === "CLOSEOUT";

// ─── Work measurements ──────────────────────────────────────────────────────

export function MeasurementsView({ projectId }: { projectId: string }) {
  const t = useT();
  const ts = useStatusT();
  const { can, canSee } = usePermissions();
  const limitHint = useApprovalLimitHint();
  const office = can("labor.measurement.approve");
  const seesValue = canSee("rates");
  const [status, setStatus] = useState<"RECORDED" | "VERIFIED" | "REJECTED" | "ALL">("ALL");
  const list = useGetMeasurementsQuery({ projectId, limit: 100, ...(status !== "ALL" ? { status } : {}) });
  const [verify, { isLoading: verifying }] = useVerifyMeasurementMutation();
  const [reject, { isLoading: rejecting }] = useRejectMeasurementMutation();
  const run = useMutationToast();
  const [open, setOpen] = useState(false);
  const columns: Column<WorkMeasurement>[] = [
    { id: "date", header: t("field.date"), sortValue: (m) => m.date, cell: (m) => formatDate(m.date) },
    {
      id: "sub",
      header: t("field.subcontractor"),
      cell: (m) => (
        <div>
          <p className="font-medium">{m.assignment.subcontractor.name}</p>
          <p className="text-xs text-muted-foreground">{m.description}</p>
        </div>
      ),
    },
    { id: "qty", header: t("field.quantity"), align: "right", cell: (m) => <span className="tabular">{formatQty(m.quantity, m.unit)}</span> },
    { id: "value", header: t("field.value"), align: "right", hidden: !seesValue, cell: (m) => <MoneyText paisa={m.valuePaisa} /> },
    { id: "status", header: t("field.status"), cell: (m) => <StatusBadge domain="measurement" value={m.status} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      hidden: !office,
      cell: (m) =>
        m.status === "RECORDED" ? (
          <ApprovalActions
            size="sm"
            approveBlockedReason={limitHint("labor.measurement.approve", m.valuePaisa)}
            decline="reject"
            approveLabel={t("labor.measurements.verify")}
            approving={verifying}
            declining={rejecting}
            onApprove={() => run(() => verify(m.id).unwrap(), { success: t("labor.measurements.verified") })}
            onDecline={async (note) => {
              const ok = await run(() => reject({ id: m.id, note }).unwrap(), { success: t("labor.measurements.rejected") });
              if (!ok) throw new Error("failed");
            }}
          />
        ) : m.note ? (
          <span className="text-xs text-muted-foreground">“{m.note}”</span>
        ) : null,
    },
  ];
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("labor.measurements.crumb")}
      actions={(p) =>
        isOpen(p.status) ? (
          <Button onClick={() => setOpen(true)}>
            <Ruler data-icon="inline-start" />
            {t("labor.measurements.record")}
          </Button>
        ) : null
      }
    >
      {(project) => (
        <>
          {list.data?.meta.pendingCount ? (
            <InlineAlert tone="warning" title={list.data.meta.pendingCount === 1 ? t("labor.measurements.pendingOne") : t("labor.measurements.pendingMany", { n: list.data.meta.pendingCount })}>
              {office ? t("labor.measurements.officeHint") : t("labor.measurements.munshiHint")}
            </InlineAlert>
          ) : null}
          <SectionCard
            flush
            title={t("labor.measurements.title")}
            actions={
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="w-40" aria-label={t("field.status")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("common.all")}</SelectItem>
                  <SelectItem value="RECORDED">{ts("measurement", "RECORDED")}</SelectItem>
                  <SelectItem value="VERIFIED">{ts("measurement", "VERIFIED")}</SelectItem>
                  <SelectItem value="REJECTED">{ts("measurement", "REJECTED")}</SelectItem>
                </SelectContent>
              </Select>
            }
          >
            <DataTable rows={list.data?.items} getRowId={(m) => m.id} loading={list.isLoading} error={list.error} onRetry={list.refetch} columns={columns} empty={{ title: t("labor.measurements.empty"), icon: Ruler }} />
          </SectionCard>
          {open ? <MeasurementSlideOver open onOpenChange={setOpen} projectId={project.id} /> : null}
        </>
      )}
    </ProjectPageShell>
  );
}

// ─── Peshgi ─────────────────────────────────────────────────────────────────

export function PeshgiView({ projectId }: { projectId: string }) {
  const t = useT();
  const ts = useStatusT();
  const labels = useLaborLabels();
  const [status, setStatus] = useState<"OUTSTANDING" | "PARTLY_ADJUSTED" | "ADJUSTED" | "ALL">("ALL");
  const list = useGetAdvancesQuery({ projectId, limit: 100, ...(status !== "ALL" ? { status } : {}) });
  const week = currentWeekStart();
  const thisWeek = sumPaisa((list.data?.items ?? []).filter((a) => a.date >= week).map((a) => a.amountPaisa));
  const [open, setOpen] = useState(false);
  const columns: Column<Advance>[] = [
    { id: "date", header: t("field.date"), sortValue: (a) => a.date, cell: (a) => formatDate(a.date) },
    {
      id: "payee",
      header: t("labor.common.paidTo"),
      cell: (a) => (
        <div>
          <p className="font-medium">{a.worker?.name ?? a.assignment?.subcontractor.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{a.payeeType === "WORKER" ? t("field.worker") : t("labor.peshgi.subContractScope", { scope: a.assignment?.scope ?? "" })}</p>
        </div>
      ),
    },
    { id: "amount", header: t("field.amount"), align: "right", sortValue: (a) => Number(a.amountPaisa), cell: (a) => <MoneyText paisa={a.amountPaisa} className="font-medium" /> },
    { id: "out", header: t("field.outstanding"), align: "right", cell: (a) => <MoneyText paisa={a.outstandingPaisa} /> },
    { id: "from", header: t("field.paidFrom"), cell: (a) => labels.paidFrom(a.paidFrom) },
    { id: "status", header: t("field.status"), cell: (a) => <StatusBadge domain="advance" value={a.status} /> },
    { id: "note", header: t("field.note"), cell: (a) => <span className="text-sm text-muted-foreground">{a.note ?? ""}</span> },
  ];
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("field.peshgi")}
      actions={(p) =>
        isOpen(p.status) ? (
          <Button onClick={() => setOpen(true)}>
            <HandCoins data-icon="inline-start" />
            {t("labor.peshgi.give")}
          </Button>
        ) : null
      }
    >
      {(project) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label={t("labor.peshgi.kpiOutstanding")} icon={HandCoins} tone="warning" value={formatPKRShort(list.data?.meta.outstandingPaisa ?? "0")} loading={list.isLoading} />
            <KpiCard label={t("labor.peshgi.kpiThisWeek")} icon={CalendarRange} value={formatPKRShort(thisWeek)} loading={list.isLoading} />
            <KpiCard label={t("labor.peshgi.kpiTotal")} icon={Wallet} value={formatPKRShort(list.data?.meta.totalPaisa ?? "0")} loading={list.isLoading} />
          </div>
          <SectionCard
            flush
            title={t("labor.peshgi.register")}
            description={t("labor.peshgi.registerDesc")}
            actions={
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="w-44" aria-label={t("field.status")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("common.all")}</SelectItem>
                  <SelectItem value="OUTSTANDING">{ts("advance", "OUTSTANDING")}</SelectItem>
                  <SelectItem value="PARTLY_ADJUSTED">{ts("advance", "PARTLY_ADJUSTED")}</SelectItem>
                  <SelectItem value="ADJUSTED">{ts("advance", "ADJUSTED")}</SelectItem>
                </SelectContent>
              </Select>
            }
          >
            <DataTable rows={list.data?.items} getRowId={(a) => a.id} loading={list.isLoading} error={list.error} onRetry={list.refetch} columns={columns} empty={{ title: t("labor.peshgi.empty"), icon: HandCoins }} />
          </SectionCard>
          {open ? <AdvanceSlideOver open onOpenChange={setOpen} projectId={project.id} /> : null}
        </>
      )}
    </ProjectPageShell>
  );
}

// ─── Settlements ────────────────────────────────────────────────────────────

export function SettlementsView({ projectId }: { projectId: string }) {
  const t = useT();
  const router = useRouter();
  const list = useGetProjectSettlementsQuery({ projectId, limit: 50 });
  const [generate, { isLoading }] = useGenerateSettlementMutation();
  const run = useMutationToast();
  const [week, setWeek] = useState(() => currentWeekStart());
  const columns: Column<Settlement>[] = [
    { id: "week", header: t("labor.common.week"), sortValue: (s) => s.weekStart, cell: (s) => <span className="font-medium">{formatWeekRange(s.weekStart)}</span> },
    { id: "workers", header: t("field.workers"), align: "right", cell: (s) => s.workers },
    { id: "gross", header: t("field.wages"), align: "right", cell: (s) => <MoneyText paisa={s.grossPaisa} /> },
    { id: "peshgi", header: t("labor.common.peshgiCut"), align: "right", cell: (s) => <MoneyText paisa={s.advancePaisa} /> },
    { id: "net", header: t("labor.common.toPay"), align: "right", cell: (s) => <MoneyText paisa={s.netPaisa} className="font-semibold" /> },
    { id: "paid", header: t("field.paid"), align: "right", cell: (s) => <MoneyText paisa={s.paidPaisa} /> },
    { id: "status", header: t("field.status"), cell: (s) => <StatusBadge domain="settlement" value={s.status} label={s.status === "APPROVED" && s.fullyPaid ? t("field.paid") : undefined} /> },
  ];
  return (
    <ProjectPageShell projectId={projectId} crumb={t("labor.settlements.crumb")}>
      {(project) => (
        <>
          {isOpen(project.status) ? (
            <SectionCard title={t("labor.settlements.makeTitle")} description={t("labor.settlements.makeDesc")}>
              <div className="flex flex-wrap items-center gap-3">
                <WeekPicker value={week} onChange={setWeek} />
                <Button
                  disabled={isLoading}
                  onClick={async () => {
                    const s = await run(() => generate({ projectId: project.id, weekStart: week }).unwrap(), { success: (r) => t("labor.settlements.generated", { week: formatWeekRange(r.weekStart), amount: formatPKR(r.netPaisa) }) });
                    if (s) router.push(projectHref(project.id, `/labor/settlements/${s.id}`));
                  }}
                >
                  <FileSpreadsheet data-icon="inline-start" />
                  {t("labor.settlements.generate")}
                </Button>
              </div>
            </SectionCard>
          ) : null}
          <SectionCard flush title={t("labor.settlements.title")}>
            <DataTable
              rows={list.data?.items}
              getRowId={(s) => s.id}
              loading={list.isLoading}
              error={list.error}
              onRetry={list.refetch}
              columns={columns}
              onRowClick={(s) => router.push(projectHref(project.id, `/labor/settlements/${s.id}`))}
              empty={{ title: t("labor.common.noSettlementsYet"), description: t("labor.settlements.emptyDesc"), icon: FileSpreadsheet }}
            />
          </SectionCard>
        </>
      )}
    </ProjectPageShell>
  );
}

function AdjustLineDialog({ settlementId, line, onClose }: { settlementId: string; line: SettlementLine; onClose: () => void }) {
  const t = useT();
  const [amount, setAmount] = useState<string | null>(line.advanceAdjustedPaisa);
  const [note, setNote] = useState(line.overrideNote ?? "");
  const [adjust, { isLoading }] = useAdjustSettlementLineMutation();
  const run = useMutationToast();
  const valid = amount !== null && note.trim().length >= 3;
  return (
    <Dialog open onOpenChange={(o) => (!o && !isLoading ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("labor.adjust.title", { name: line.worker.name })}</DialogTitle>
          <DialogDescription>{t("labor.adjust.description", { amount: formatPKR(line.grossPaisa) })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="adj-amount">{t("labor.adjust.amountLabel")}</Label>
            <MoneyInput id="adj-amount" value={amount} onChange={setAmount} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adj-note">{t("field.reason")}</Label>
            <Textarea id="adj-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("labor.adjust.reasonPlaceholder")} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!valid || isLoading}
            onClick={async () => {
              const ok = await run(() => adjust({ id: settlementId, lineId: line.id, body: { advanceAdjustedPaisa: amount!, note: note.trim() } }).unwrap(), { success: t("labor.adjust.updated") });
              if (ok) onClose();
            }}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayDialog({ settlement, lines, onClose }: { settlement: Settlement; lines: SettlementLine[]; onClose: () => void }) {
  const t = useT();
  const { paidFromOptions } = useLaborLabels();
  const munshi = useIsMunshi();
  const [paidFrom, setPaidFrom] = useState<LaborPaidFrom>(munshi ? "SITE_CASH" : "OFFICE_CASH");
  const [pay, { isLoading }] = usePaySettlementMutation();
  const run = useMutationToast();
  const total = sumPaisa(lines.map((l) => l.netPaisa));
  return (
    <Dialog open onOpenChange={(o) => (!o && !isLoading ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{lines.length === 1 ? t("labor.pay.titleOne") : t("labor.pay.titleMany", { n: lines.length })}</DialogTitle>
          <DialogDescription>{t("labor.pay.totalLine", { week: formatWeekRange(settlement.weekStart), amount: formatPKR(total) })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>{t("field.paidFrom")}</Label>
          {munshi ? (
            <p className="text-sm">{t("labor.pay.yourSiteCash")}</p>
          ) : (
            <Select value={paidFrom} onValueChange={(v) => setPaidFrom(v as LaborPaidFrom)}>
              <SelectTrigger aria-label={t("field.paidFrom")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paidFromOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={isLoading}
            onClick={async () => {
              const ok = await run(() => pay({ id: settlement.id, body: { lineIds: lines.map((l) => l.id), paidFrom } }).unwrap(), { success: t("labor.pay.paid", { amount: formatPKR(total) }) });
              if (ok) onClose();
            }}
          >
            <Banknote data-icon="inline-start" />
            {t("labor.pay.payAmount", { amount: formatPKR(total) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SettlementDetailView({ projectId, settlementId }: { projectId: string; settlementId: string }) {
  const t = useT();
  const ts = useStatusT();
  const labels = useLaborLabels();
  const { can } = usePermissions();
  const limitHint = useApprovalLimitHint();
  const office = can("labor.settlement.approve");
  const canAdjust = can("labor.settlement.edit");
  const canPrepare = can("labor.settlement.create");
  const q = useGetSettlementQuery(settlementId);
  const [generate, { isLoading: regenerating }] = useGenerateSettlementMutation();
  const [submit, { isLoading: submitting }] = useSubmitSettlementMutation();
  const [approve, { isLoading: approving }] = useApproveSettlementMutation();
  const [ret, { isLoading: returning }] = useReturnSettlementMutation();
  const run = useMutationToast();
  const [adjusting, setAdjusting] = useState<SettlementLine | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState<SettlementLine[] | null>(null);

  const s = q.data;
  const lines = s?.lines ?? [];
  const editable = s?.status === "DRAFT" || s?.status === "RETURNED";
  const payable = s?.status === "APPROVED";
  const unpaid = lines.filter((l) => l.paymentStatus === "UNPAID");

  const columns: Column<SettlementLine>[] = [
    ...(payable
      ? [
          {
            id: "pick",
            header: "",
            cell: (l: SettlementLine) =>
              l.paymentStatus === "UNPAID" ? (
                <Checkbox
                  aria-label={t("labor.settlement.selectWorker", { name: l.worker.name })}
                  checked={selected.has(l.id)}
                  onCheckedChange={(c) =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (c) next.add(l.id);
                      else next.delete(l.id);
                      return next;
                    })
                  }
                />
              ) : null,
          } satisfies Column<SettlementLine>,
        ]
      : []),
    { id: "worker", header: t("field.worker"), sortValue: (l) => l.worker.name, cell: (l) => <span className="font-medium">{l.worker.name}</span> },
    {
      id: "days",
      header: t("labor.common.days"),
      align: "right",
      cell: (l) => (
        <span className="tabular" title={t("labor.settlement.daysSplit", { full: l.fullDays, half: l.halfDays })}>
          {l.daysWorked}
        </span>
      ),
    },
    { id: "rate", header: t("field.rate"), align: "right", cell: (l) => <MoneyText paisa={l.dailyRatePaisa} /> },
    { id: "ot", header: t("labor.settlement.ot"), align: "right", cell: (l) => (l.overtimeHours ? <span title={t("labor.settlement.hours", { n: l.overtimeHours })}><MoneyText paisa={l.overtimePaisa} /></span> : "—") },
    { id: "gross", header: t("field.wages"), align: "right", cell: (l) => <MoneyText paisa={l.grossPaisa} /> },
    {
      id: "peshgi",
      header: t("field.peshgi"),
      align: "right",
      cell: (l) => (
        <span className="inline-flex items-center justify-end gap-1">
          {l.advanceAdjustedPaisa !== "0" ? <>−<MoneyText paisa={l.advanceAdjustedPaisa} /></> : "—"}
          {l.advanceOverride ? <span title={l.overrideNote ?? ""} className="text-xs text-primary">{t("labor.settlement.overrideSet")}</span> : null}
          {editable && canAdjust ? (
            <Button size="icon" variant="ghost" className="size-7" aria-label={t("labor.settlement.changePeshgiFor", { name: l.worker.name })} onClick={() => setAdjusting(l)}>
              <Pencil aria-hidden />
            </Button>
          ) : null}
        </span>
      ),
    },
    { id: "net", header: t("labor.common.toPay"), align: "right", cell: (l) => <MoneyText paisa={l.netPaisa} className="font-semibold" /> },
    { id: "pay", header: t("field.payment"), cell: (l) => (payable ? <StatusBadge domain="linePayment" value={l.paymentStatus} label={l.paymentStatus === "PAID" ? t("labor.settlement.paidVia", { from: labels.paidFrom(l.paidFrom) }) : undefined} /> : null) },
  ];

  const steps: TimelineStep[] = s
    ? [
        { label: t("labor.settlement.stepGenerated"), state: "done", at: s.createdAt, by: s.createdBy?.name },
        s.status === "RETURNED"
          ? { label: ts("settlement", "RETURNED"), state: "returned", note: s.returnComment }
          : { label: t("labor.settlement.stepSubmitted"), state: s.submittedAt ? "done" : "current", at: s.submittedAt, by: s.submittedBy?.name },
        { label: ts("settlement", "APPROVED"), state: s.approvedAt ? "done" : s.status === "SUBMITTED" ? "current" : "pending", at: s.approvedAt, by: s.approvedBy?.name },
        { label: t("field.paid"), state: s.fullyPaid ? "done" : payable ? "current" : "pending" },
      ]
    : [];

  return (
    <ProjectPageShell projectId={projectId} crumb={t("labor.settlement.crumb")} title={s ? t("labor.settlement.title", { week: formatWeekRange(s.weekStart) }) : undefined}>
      {(project) =>
        q.isLoading || !s ? (
          <CardsSkeleton count={2} height="h-40" />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge domain="settlement" value={s.status} />
                <Link className="text-sm text-primary underline-offset-4 hover:underline" href={projectHref(project.id, "/labor/settlements")}>
                  {t("labor.settlement.allWeeks")}
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {editable && canPrepare && isOpen(project.status) ? (
                  <>
                    <Button variant="outline" disabled={regenerating} onClick={() => run(() => generate({ projectId: project.id, weekStart: s.weekStart }).unwrap(), { success: t("labor.settlement.recalculated") })}>
                      <FileSpreadsheet data-icon="inline-start" />
                      {t("labor.settlement.recalculate")}
                    </Button>
                    <Button disabled={submitting || !lines.length} onClick={() => run(() => submit(s.id).unwrap(), { success: t("labor.settlement.submitted") })}>
                      <Send data-icon="inline-start" />
                      {t("labor.settlement.submit")}
                    </Button>
                  </>
                ) : null}
                {s.status === "SUBMITTED" && office ? (
                  <ApprovalActions
                    approveBlockedReason={limitHint("labor.settlement.approve", s.netPaisa)}
                    approving={approving}
                    declining={returning}
                    onApprove={() => run(() => approve(s.id).unwrap(), { success: t("labor.settlement.approved") })}
                    onDecline={async (comment) => {
                      const ok = await run(() => ret({ id: s.id, comment }).unwrap(), { success: t("labor.settlement.returned") });
                      if (!ok) throw new Error("failed");
                    }}
                  />
                ) : null}
                {payable && unpaid.length ? (
                  <>
                    <Button variant="outline" disabled={!selected.size} onClick={() => setPaying(unpaid.filter((l) => selected.has(l.id)))}>
                      <CheckCheck data-icon="inline-start" />
                      {t("labor.settlement.paySelected", { n: selected.size })}
                    </Button>
                    <Button onClick={() => setPaying(unpaid)}>
                      <Banknote data-icon="inline-start" />
                      {t("labor.settlement.payAll")}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            {s.status === "RETURNED" && s.returnComment ? (
              <InlineAlert tone="warning" title={t("labor.settlement.returnedTitle")}>
                {t("labor.settlement.returnedBody", { comment: s.returnComment })}
              </InlineAlert>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label={t("labor.settlement.workersDays")} icon={CalendarRange} value={`${s.workers} / ${s.daysWorked}`} />
              <KpiCard label={t("field.wages")} icon={CircleDollarSign} value={formatPKRShort(s.grossPaisa)} />
              <KpiCard label={t("labor.common.peshgiCut")} icon={Minus} tone="warning" value={formatPKRShort(s.advancePaisa)} />
              <KpiCard label={payable ? t("labor.settlement.stillToPay") : t("labor.common.toPay")} icon={Wallet} tone={payable && s.unpaidPaisa === "0" ? "success" : "primary"} value={formatPKRShort(payable ? s.unpaidPaisa : s.netPaisa)} hint={payable ? t("labor.settlement.paidHint", { amount: formatPKR(s.paidPaisa) }) : undefined} />
            </div>
            <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
              <SectionCard flush title={t("labor.settlement.lines")}>
                <DataTable rows={lines} getRowId={(l) => l.id} columns={columns} empty={{ title: t("labor.settlement.nobodyWorked"), compact: true }} />
              </SectionCard>
              <SectionCard title={t("field.status")}>
                <StatusTimeline steps={steps} />
              </SectionCard>
            </div>
            {adjusting ? <AdjustLineDialog settlementId={s.id} line={adjusting} onClose={() => setAdjusting(null)} /> : null}
            {paying ? (
              <PayDialog
                settlement={s}
                lines={paying}
                onClose={() => {
                  setPaying(null);
                  setSelected(new Set());
                }}
              />
            ) : null}
          </>
        )
      }
    </ProjectPageShell>
  );
}

// ─── Sub-contractor accounts ────────────────────────────────────────────────

function LedgerSlideOver({ row, onClose }: { row: SubcontractAccountRow; onClose: () => void }) {
  const t = useT();
  const labels = useLaborLabels();
  const ledger = useGetSubcontractLedgerQuery(row.id);
  return (
    <SlideOver open onOpenChange={(o) => (!o ? onClose() : undefined)} size="lg" title={t("labor.ledger.title", { name: row.subcontractor.name })} description={row.scope}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {(
            [
              [t("labor.common.workValue"), row.account.valuePaisa],
              [t("labor.common.retentionHeld"), row.account.retentionHeldPaisa],
              [t("field.paid"), row.account.paidPaisa],
              [t("labor.common.deductions"), row.account.deductionsPaisa],
              [t("field.balanceDue"), row.account.balanceDuePaisa],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <MoneyText paisa={v} className="font-semibold" />
            </div>
          ))}
        </div>
        <DataTable
          rows={ledger.data?.entries}
          getRowId={(e) => e.id}
          loading={ledger.isLoading}
          error={ledger.error}
          onRetry={ledger.refetch}
          columns={[
            { id: "date", header: t("field.date"), cell: (e) => formatDate(e.occurredAt) },
            { id: "type", header: t("field.entry"), cell: (e) => <span className="text-sm">{labels.ledgerEntry(e.type)}</span> },
            { id: "note", header: t("labor.common.detail"), cell: (e) => <span className="text-xs text-muted-foreground">{e.note ?? ""}</span> },
            { id: "amount", header: t("field.amount"), align: "right", cell: (e) => <MoneyText paisa={e.amountPaisa} className={e.amountPaisa.startsWith("-") ? "text-danger" : "text-success"} /> },
            { id: "running", header: t("labor.ledger.running"), align: "right", cell: (e) => <MoneyText paisa={e.runningPaisa} /> },
          ]}
          empty={{ title: t("labor.ledger.empty"), compact: true }}
        />
      </div>
    </SlideOver>
  );
}

export function SubcontractAccountsView({ projectId }: { projectId: string }) {
  const t = useT();
  const labels = useLaborLabels();
  const { can } = usePermissions();
  const owner = can("labor.subcontract.manage");
  const canPay = can("labor.subcontractpayment.create");
  const canProgress = can("labor.subcontract.edit");
  const accounts = useGetSubcontractAccountsQuery(projectId);
  const [action, setAction] = useState<{ kind: "ledger" | "pay" | "deduct" | "progress"; row: SubcontractAccountRow } | null>(null);
  const columns: Column<SubcontractAccountRow>[] = [
    {
      id: "sub",
      header: t("field.subcontractor"),
      sortValue: (r) => r.subcontractor.name,
      cell: (r) => (
        <div>
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {r.subcontractor.name}
            {r.account.overpaid ? <StatusBadge tone="danger" icon={BadgeAlert} label={t("labor.common.overpaid", { amount: formatPKR(r.account.overpaidPaisa) })} /> : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {r.scope} · {labels.rateType(r.rateType)}
            {r.pendingMeasurements ? ` · ${t("labor.accounts.toVerify", { n: r.pendingMeasurements })}` : ""}
          </p>
        </div>
      ),
    },
    {
      id: "done",
      header: t("labor.accounts.done"),
      align: "right",
      cell: (r) => (r.rateType === "LUMPSUM" ? `${r.progressPercent}%` : r.verifiedQty !== null ? formatQty(r.verifiedQty, r.unit) : "—"),
    },
    { id: "value", header: t("field.value"), align: "right", cell: (r) => <MoneyText paisa={r.account.valuePaisa} /> },
    { id: "ret", header: t("field.retention"), align: "right", cell: (r) => <MoneyText paisa={r.account.retentionHeldPaisa} /> },
    { id: "paid", header: t("field.paid"), align: "right", cell: (r) => <MoneyText paisa={r.account.paidPaisa} /> },
    { id: "due", header: t("field.balanceDue"), align: "right", sortValue: (r) => Number(r.account.balanceDuePaisa), cell: (r) => <MoneyText paisa={r.account.balanceDuePaisa} className={r.account.overpaid ? "font-semibold text-danger" : "font-semibold"} /> },
    {
      ...ACTIONS_COLUMN,
      cell: (r) => (
        <RowActions
          name={r.subcontractor.name}
          actions={[
            { label: t("labor.common.ledger"), icon: BookOpen, onSelect: () => setAction({ kind: "ledger", row: r }) },
            { label: t("field.progress"), icon: Percent, hidden: !(canProgress && r.isActive && r.rateType === "LUMPSUM"), onSelect: () => setAction({ kind: "progress", row: r }) },
            { label: t("field.pay"), icon: Banknote, hidden: !canPay, onSelect: () => setAction({ kind: "pay", row: r }) },
            { label: t("labor.common.deduct"), icon: Minus, hidden: !owner, onSelect: () => setAction({ kind: "deduct", row: r }) },
          ]}
        />
      ),
    },
  ];
  const close = () => setAction(null);
  return (
    <ProjectPageShell projectId={projectId} crumb={t("labor.accounts.crumb")}>
      {() => (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label={t("labor.common.workValue")} icon={CircleDollarSign} value={formatPKRShort(accounts.data?.totals.valuePaisa ?? "0")} loading={accounts.isLoading} />
            <KpiCard label={t("field.paid")} icon={Banknote} value={formatPKRShort(accounts.data?.totals.paidPaisa ?? "0")} loading={accounts.isLoading} />
            <KpiCard label={t("labor.common.retentionHeld")} icon={Wallet} value={formatPKRShort(accounts.data?.totals.retentionHeldPaisa ?? "0")} loading={accounts.isLoading} />
            <KpiCard
              label={t("field.balanceDue")}
              icon={Plus}
              value={formatPKRShort(accounts.data?.totals.balanceDuePaisa ?? "0")}
              hint={accounts.data?.totals.overpaidCount ? t("labor.accounts.overpaidCount", { n: accounts.data.totals.overpaidCount }) : undefined}
              tone={accounts.data?.totals.overpaidCount ? "danger" : "primary"}
              loading={accounts.isLoading}
            />
          </div>
          <SectionCard flush title={t("labor.accounts.title")} description={t("labor.accounts.description")}>
            <DataTable rows={accounts.data?.items} getRowId={(r) => r.id} loading={accounts.isLoading} error={accounts.error} onRetry={accounts.refetch} columns={columns} empty={{ title: t("labor.accounts.empty"), icon: Pencil }} />
          </SectionCard>
          {action?.kind === "ledger" ? <LedgerSlideOver row={action.row} onClose={close} /> : null}
          {action?.kind === "pay" ? <SubPaymentSlideOver open onOpenChange={(o) => (!o ? close() : undefined)} row={action.row} /> : null}
          {action?.kind === "deduct" ? <DeductionSlideOver open onOpenChange={(o) => (!o ? close() : undefined)} row={action.row} /> : null}
          {action?.kind === "progress" ? <ProgressSlideOver open onOpenChange={(o) => (!o ? close() : undefined)} row={action.row} /> : null}
        </>
      )}
    </ProjectPageShell>
  );
}

