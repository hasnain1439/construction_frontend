"use client";

import { BadgeAlert, Banknote, CalendarRange, CheckCheck, CircleDollarSign, FileSpreadsheet, HandCoins, Minus, Pencil, Percent, Plus, Ruler, Send, Wallet } from "lucide-react";
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
import { useCan } from "@/components/common/PermissionGate";
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
import { PAID_FROM_OPTIONS, paidFromLabel, rateTypeLabel } from "../options";

const OFFICE = { roles: ["THEKEDAR", "PM"] } as const;
const isOpen = (status: string) => status === "ACTIVE" || status === "CLOSEOUT";

// ─── Work measurements ──────────────────────────────────────────────────────

export function MeasurementsView({ projectId }: { projectId: string }) {
  const office = useCan(OFFICE);
  const [status, setStatus] = useState<"RECORDED" | "VERIFIED" | "REJECTED" | "ALL">("ALL");
  const list = useGetMeasurementsQuery({ projectId, limit: 100, ...(status !== "ALL" ? { status } : {}) });
  const [verify, { isLoading: verifying }] = useVerifyMeasurementMutation();
  const [reject, { isLoading: rejecting }] = useRejectMeasurementMutation();
  const run = useMutationToast();
  const [open, setOpen] = useState(false);
  const columns: Column<WorkMeasurement>[] = [
    { id: "date", header: "Date", sortValue: (m) => m.date, cell: (m) => formatDate(m.date) },
    {
      id: "sub",
      header: "Sub-contractor",
      cell: (m) => (
        <div>
          <p className="font-medium">{m.assignment.subcontractor.name}</p>
          <p className="text-xs text-muted-foreground">{m.description}</p>
        </div>
      ),
    },
    { id: "qty", header: "Quantity", align: "right", cell: (m) => <span className="tabular">{formatQty(m.quantity, m.unit)}</span> },
    { id: "value", header: "Value", align: "right", hidden: !office, cell: (m) => <MoneyText paisa={m.valuePaisa} /> },
    { id: "status", header: "Status", cell: (m) => <StatusBadge domain="measurement" value={m.status} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      hidden: !office,
      cell: (m) =>
        m.status === "RECORDED" ? (
          <ApprovalActions
            size="sm"
            decline="reject"
            approveLabel="Verify"
            approving={verifying}
            declining={rejecting}
            onApprove={() => run(() => verify(m.id).unwrap(), { success: "Verified — value added to the account" })}
            onDecline={async (note) => {
              const ok = await run(() => reject({ id: m.id, note }).unwrap(), { success: "Measurement rejected" });
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
      crumb="Work Measurements"
      actions={(p) =>
        isOpen(p.status) ? (
          <Button onClick={() => setOpen(true)}>
            <Ruler data-icon="inline-start" />
            Record measurement
          </Button>
        ) : null
      }
    >
      {(project) => (
        <>
          {list.data?.meta.pendingCount ? (
            <InlineAlert tone="warning" title={`${list.data.meta.pendingCount} measurement${list.data.meta.pendingCount === 1 ? "" : "s"} to verify`}>
              {office ? "Check the work on site, then verify — the value goes to the sub-contractor's account." : "The office verifies them."}
            </InlineAlert>
          ) : null}
          <SectionCard
            flush
            title="Measurements"
            actions={
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="w-40" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="RECORDED">To verify</SelectItem>
                  <SelectItem value="VERIFIED">Verified</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            }
          >
            <DataTable rows={list.data?.items} getRowId={(m) => m.id} loading={list.isLoading} error={list.error} onRetry={list.refetch} columns={columns} empty={{ title: "No measurements yet", icon: Ruler }} />
          </SectionCard>
          {open ? <MeasurementSlideOver open onOpenChange={setOpen} projectId={project.id} /> : null}
        </>
      )}
    </ProjectPageShell>
  );
}

// ─── Peshgi ─────────────────────────────────────────────────────────────────

export function PeshgiView({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<"OUTSTANDING" | "PARTLY_ADJUSTED" | "ADJUSTED" | "ALL">("ALL");
  const list = useGetAdvancesQuery({ projectId, limit: 100, ...(status !== "ALL" ? { status } : {}) });
  const week = currentWeekStart();
  const thisWeek = sumPaisa((list.data?.items ?? []).filter((a) => a.date >= week).map((a) => a.amountPaisa));
  const [open, setOpen] = useState(false);
  const columns: Column<Advance>[] = [
    { id: "date", header: "Date", sortValue: (a) => a.date, cell: (a) => formatDate(a.date) },
    {
      id: "payee",
      header: "Paid to",
      cell: (a) => (
        <div>
          <p className="font-medium">{a.worker?.name ?? a.assignment?.subcontractor.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{a.payeeType === "WORKER" ? "Worker" : `Sub-contract · ${a.assignment?.scope ?? ""}`}</p>
        </div>
      ),
    },
    { id: "amount", header: "Amount", align: "right", sortValue: (a) => Number(a.amountPaisa), cell: (a) => <MoneyText paisa={a.amountPaisa} className="font-medium" /> },
    { id: "out", header: "Outstanding", align: "right", cell: (a) => <MoneyText paisa={a.outstandingPaisa} /> },
    { id: "from", header: "Paid from", cell: (a) => paidFromLabel(a.paidFrom) },
    { id: "status", header: "Status", cell: (a) => <StatusBadge domain="advance" value={a.status} /> },
    { id: "note", header: "Note", cell: (a) => <span className="text-sm text-muted-foreground">{a.note ?? ""}</span> },
  ];
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb="Peshgi"
      actions={(p) =>
        isOpen(p.status) ? (
          <Button onClick={() => setOpen(true)}>
            <HandCoins data-icon="inline-start" />
            Give peshgi
          </Button>
        ) : null
      }
    >
      {(project) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label="Outstanding peshgi" icon={HandCoins} tone="warning" value={formatPKRShort(list.data?.meta.outstandingPaisa ?? "0")} loading={list.isLoading} />
            <KpiCard label="Given this week" icon={CalendarRange} value={formatPKRShort(thisWeek)} loading={list.isLoading} />
            <KpiCard label="Total given" icon={Wallet} value={formatPKRShort(list.data?.meta.totalPaisa ?? "0")} loading={list.isLoading} />
          </div>
          <SectionCard
            flush
            title="Peshgi register"
            description="A worker's peshgi is cut from the weekly settlement (oldest first); it counts as adjusted once that week is approved."
            actions={
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="w-44" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="OUTSTANDING">Outstanding</SelectItem>
                  <SelectItem value="PARTLY_ADJUSTED">Partly adjusted</SelectItem>
                  <SelectItem value="ADJUSTED">Adjusted</SelectItem>
                </SelectContent>
              </Select>
            }
          >
            <DataTable rows={list.data?.items} getRowId={(a) => a.id} loading={list.isLoading} error={list.error} onRetry={list.refetch} columns={columns} empty={{ title: "No peshgi given", icon: HandCoins }} />
          </SectionCard>
          {open ? <AdvanceSlideOver open onOpenChange={setOpen} projectId={project.id} /> : null}
        </>
      )}
    </ProjectPageShell>
  );
}

// ─── Settlements ────────────────────────────────────────────────────────────

export function SettlementsView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const list = useGetProjectSettlementsQuery({ projectId, limit: 50 });
  const [generate, { isLoading }] = useGenerateSettlementMutation();
  const run = useMutationToast();
  const [week, setWeek] = useState(() => currentWeekStart());
  const columns: Column<Settlement>[] = [
    { id: "week", header: "Week", sortValue: (s) => s.weekStart, cell: (s) => <span className="font-medium">{formatWeekRange(s.weekStart)}</span> },
    { id: "workers", header: "Workers", align: "right", cell: (s) => s.workers },
    { id: "gross", header: "Wages", align: "right", cell: (s) => <MoneyText paisa={s.grossPaisa} /> },
    { id: "peshgi", header: "Peshgi cut", align: "right", cell: (s) => <MoneyText paisa={s.advancePaisa} /> },
    { id: "net", header: "To pay", align: "right", cell: (s) => <MoneyText paisa={s.netPaisa} className="font-semibold" /> },
    { id: "paid", header: "Paid", align: "right", cell: (s) => <MoneyText paisa={s.paidPaisa} /> },
    { id: "status", header: "Status", cell: (s) => <StatusBadge domain="settlement" value={s.status} label={s.status === "APPROVED" && s.fullyPaid ? "Paid" : undefined} /> },
  ];
  return (
    <ProjectPageShell projectId={projectId} crumb="Weekly Settlements">
      {(project) => (
        <>
          {isOpen(project.status) ? (
            <SectionCard title="Make a week's hisaab" description="Wages from hazri, peshgi cut oldest-first. A draft can be regenerated until it is submitted.">
              <div className="flex flex-wrap items-center gap-3">
                <WeekPicker value={week} onChange={setWeek} />
                <Button
                  disabled={isLoading}
                  onClick={async () => {
                    const s = await run(() => generate({ projectId: project.id, weekStart: week }).unwrap(), { success: (r) => `${formatWeekRange(r.weekStart)}: ${formatPKR(r.netPaisa)} to pay` });
                    if (s) router.push(projectHref(project.id, `/labor/settlements/${s.id}`));
                  }}
                >
                  <FileSpreadsheet data-icon="inline-start" />
                  Generate
                </Button>
              </div>
            </SectionCard>
          ) : null}
          <SectionCard flush title="Settlements">
            <DataTable
              rows={list.data?.items}
              getRowId={(s) => s.id}
              loading={list.isLoading}
              error={list.error}
              onRetry={list.refetch}
              columns={columns}
              onRowClick={(s) => router.push(projectHref(project.id, `/labor/settlements/${s.id}`))}
              empty={{ title: "No settlements yet", description: "Generate the first week above.", icon: FileSpreadsheet }}
            />
          </SectionCard>
        </>
      )}
    </ProjectPageShell>
  );
}

function AdjustLineDialog({ settlementId, line, onClose }: { settlementId: string; line: SettlementLine; onClose: () => void }) {
  const [amount, setAmount] = useState<string | null>(line.advanceAdjustedPaisa);
  const [note, setNote] = useState(line.overrideNote ?? "");
  const [adjust, { isLoading }] = useAdjustSettlementLineMutation();
  const run = useMutationToast();
  const valid = amount !== null && note.trim().length >= 3;
  return (
    <Dialog open onOpenChange={(o) => (!o && !isLoading ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Peshgi cut — {line.worker.name}</DialogTitle>
          <DialogDescription>
            Wages <MoneyText paisa={line.grossPaisa} />. Cut less to leave some peshgi for later weeks.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="adj-amount">Peshgi to cut this week</Label>
            <MoneyInput id="adj-amount" value={amount} onChange={setAmount} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adj-note">Reason</Label>
            <Textarea id="adj-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Wedding at home" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            disabled={!valid || isLoading}
            onClick={async () => {
              const ok = await run(() => adjust({ id: settlementId, lineId: line.id, body: { advanceAdjustedPaisa: amount!, note: note.trim() } }).unwrap(), { success: "Line updated" });
              if (ok) onClose();
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayDialog({ settlement, lines, onClose }: { settlement: Settlement; lines: SettlementLine[]; onClose: () => void }) {
  const munshi = useIsMunshi();
  const [paidFrom, setPaidFrom] = useState<LaborPaidFrom>(munshi ? "SITE_CASH" : "OFFICE_CASH");
  const [pay, { isLoading }] = usePaySettlementMutation();
  const run = useMutationToast();
  const total = sumPaisa(lines.map((l) => l.netPaisa));
  return (
    <Dialog open onOpenChange={(o) => (!o && !isLoading ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay {lines.length} {lines.length === 1 ? "worker" : "workers"}</DialogTitle>
          <DialogDescription>
            {formatWeekRange(settlement.weekStart)} · total <span className="font-semibold text-foreground">{formatPKR(total)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Paid from</Label>
          {munshi ? (
            <p className="text-sm">Your site cash</p>
          ) : (
            <Select value={paidFrom} onValueChange={(v) => setPaidFrom(v as LaborPaidFrom)}>
              <SelectTrigger aria-label="Paid from">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAID_FROM_OPTIONS.map((o) => (
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
            Cancel
          </Button>
          <Button
            disabled={isLoading}
            onClick={async () => {
              const ok = await run(() => pay({ id: settlement.id, body: { lineIds: lines.map((l) => l.id), paidFrom } }).unwrap(), { success: `Paid ${formatPKR(total)}` });
              if (ok) onClose();
            }}
          >
            <Banknote data-icon="inline-start" />
            Pay {formatPKR(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SettlementDetailView({ projectId, settlementId }: { projectId: string; settlementId: string }) {
  const office = useCan(OFFICE);
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
                  aria-label={`Select ${l.worker.name}`}
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
    { id: "worker", header: "Worker", sortValue: (l) => l.worker.name, cell: (l) => <span className="font-medium">{l.worker.name}</span> },
    {
      id: "days",
      header: "Days",
      align: "right",
      cell: (l) => (
        <span className="tabular" title={`${l.fullDays} full · ${l.halfDays} half`}>
          {l.daysWorked}
        </span>
      ),
    },
    { id: "rate", header: "Rate", align: "right", cell: (l) => <MoneyText paisa={l.dailyRatePaisa} /> },
    { id: "ot", header: "OT", align: "right", cell: (l) => (l.overtimeHours ? <span title={`${l.overtimeHours} h`}><MoneyText paisa={l.overtimePaisa} /></span> : "—") },
    { id: "gross", header: "Wages", align: "right", cell: (l) => <MoneyText paisa={l.grossPaisa} /> },
    {
      id: "peshgi",
      header: "Peshgi",
      align: "right",
      cell: (l) => (
        <span className="inline-flex items-center justify-end gap-1">
          {l.advanceAdjustedPaisa !== "0" ? <>−<MoneyText paisa={l.advanceAdjustedPaisa} /></> : "—"}
          {l.advanceOverride ? <span title={l.overrideNote ?? ""} className="text-xs text-primary">(set)</span> : null}
          {editable && office ? (
            <Button size="icon" variant="ghost" className="size-7" aria-label={`Change peshgi for ${l.worker.name}`} onClick={() => setAdjusting(l)}>
              <Pencil aria-hidden />
            </Button>
          ) : null}
        </span>
      ),
    },
    { id: "net", header: "To pay", align: "right", cell: (l) => <MoneyText paisa={l.netPaisa} className="font-semibold" /> },
    { id: "pay", header: "Payment", cell: (l) => (payable ? <StatusBadge domain="linePayment" value={l.paymentStatus} label={l.paymentStatus === "PAID" ? `Paid · ${paidFromLabel(l.paidFrom)}` : undefined} /> : null) },
  ];

  const steps: TimelineStep[] = s
    ? [
        { label: "Generated", state: "done", at: s.createdAt, by: s.createdBy?.name },
        s.status === "RETURNED"
          ? { label: "Returned", state: "returned", note: s.returnComment }
          : { label: "Submitted", state: s.submittedAt ? "done" : "current", at: s.submittedAt, by: s.submittedBy?.name },
        { label: "Approved", state: s.approvedAt ? "done" : s.status === "SUBMITTED" ? "current" : "pending", at: s.approvedAt, by: s.approvedBy?.name },
        { label: "Paid", state: s.fullyPaid ? "done" : payable ? "current" : "pending" },
      ]
    : [];

  return (
    <ProjectPageShell projectId={projectId} crumb="Weekly Settlement" title={s ? `Wages ${formatWeekRange(s.weekStart)}` : undefined}>
      {(project) =>
        q.isLoading || !s ? (
          <CardsSkeleton count={2} height="h-40" />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge domain="settlement" value={s.status} />
                <Link className="text-sm text-primary underline-offset-4 hover:underline" href={projectHref(project.id, "/labor/settlements")}>
                  All weeks
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {editable && isOpen(project.status) ? (
                  <>
                    <Button variant="outline" disabled={regenerating} onClick={() => run(() => generate({ projectId: project.id, weekStart: s.weekStart }).unwrap(), { success: "Recalculated from hazri" })}>
                      <FileSpreadsheet data-icon="inline-start" />
                      Recalculate
                    </Button>
                    <Button disabled={submitting || !lines.length} onClick={() => run(() => submit(s.id).unwrap(), { success: "Submitted for approval" })}>
                      <Send data-icon="inline-start" />
                      Submit for approval
                    </Button>
                  </>
                ) : null}
                {s.status === "SUBMITTED" && office ? (
                  <ApprovalActions
                    approving={approving}
                    declining={returning}
                    onApprove={() => run(() => approve(s.id).unwrap(), { success: "Approved — wages can be paid" })}
                    onDecline={async (comment) => {
                      const ok = await run(() => ret({ id: s.id, comment }).unwrap(), { success: "Returned with your comment" });
                      if (!ok) throw new Error("failed");
                    }}
                  />
                ) : null}
                {payable && unpaid.length ? (
                  <>
                    <Button variant="outline" disabled={!selected.size} onClick={() => setPaying(unpaid.filter((l) => selected.has(l.id)))}>
                      <CheckCheck data-icon="inline-start" />
                      Pay selected ({selected.size})
                    </Button>
                    <Button onClick={() => setPaying(unpaid)}>
                      <Banknote data-icon="inline-start" />
                      Pay all
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            {s.status === "RETURNED" && s.returnComment ? (
              <InlineAlert tone="warning" title="Returned by the office">
                “{s.returnComment}” — fix hazri if needed, then recalculate and submit again.
              </InlineAlert>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Workers / days" icon={CalendarRange} value={`${s.workers} / ${s.daysWorked}`} />
              <KpiCard label="Wages" icon={CircleDollarSign} value={formatPKRShort(s.grossPaisa)} />
              <KpiCard label="Peshgi cut" icon={Minus} tone="warning" value={formatPKRShort(s.advancePaisa)} />
              <KpiCard label={payable ? "Still to pay" : "To pay"} icon={Wallet} tone={payable && s.unpaidPaisa === "0" ? "success" : "primary"} value={formatPKRShort(payable ? s.unpaidPaisa : s.netPaisa)} hint={payable ? `Paid ${formatPKR(s.paidPaisa)}` : undefined} />
            </div>
            <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
              <SectionCard flush title="Lines">
                <DataTable rows={lines} getRowId={(l) => l.id} columns={columns} empty={{ title: "Nobody worked this week", compact: true }} />
              </SectionCard>
              <SectionCard title="Status">
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
  const ledger = useGetSubcontractLedgerQuery(row.id);
  return (
    <SlideOver open onOpenChange={(o) => (!o ? onClose() : undefined)} size="lg" title={`${row.subcontractor.name} — ledger`} description={row.scope}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {(
            [
              ["Work value", row.account.valuePaisa],
              ["Retention held", row.account.retentionHeldPaisa],
              ["Paid", row.account.paidPaisa],
              ["Deductions", row.account.deductionsPaisa],
              ["Balance due", row.account.balanceDuePaisa],
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
            { id: "date", header: "Date", cell: (e) => formatDate(e.occurredAt) },
            { id: "type", header: "Entry", cell: (e) => <span className="text-sm">{e.type.replace(/_/g, " ").toLowerCase()}</span> },
            { id: "note", header: "Detail", cell: (e) => <span className="text-xs text-muted-foreground">{e.note ?? ""}</span> },
            { id: "amount", header: "Amount", align: "right", cell: (e) => <MoneyText paisa={e.amountPaisa} className={e.amountPaisa.startsWith("-") ? "text-danger" : "text-success"} /> },
            { id: "running", header: "Running", align: "right", cell: (e) => <MoneyText paisa={e.runningPaisa} /> },
          ]}
          empty={{ title: "No entries yet", compact: true }}
        />
      </div>
    </SlideOver>
  );
}

export function SubcontractAccountsView({ projectId }: { projectId: string }) {
  const owner = useCan({ roles: ["THEKEDAR"] });
  const accounts = useGetSubcontractAccountsQuery(projectId);
  const [action, setAction] = useState<{ kind: "ledger" | "pay" | "deduct" | "progress"; row: SubcontractAccountRow } | null>(null);
  const columns: Column<SubcontractAccountRow>[] = [
    {
      id: "sub",
      header: "Sub-contractor",
      sortValue: (r) => r.subcontractor.name,
      cell: (r) => (
        <div>
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {r.subcontractor.name}
            {r.account.overpaid ? <StatusBadge tone="danger" icon={BadgeAlert} label={`Overpaid ${formatPKR(r.account.overpaidPaisa)}`} /> : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {r.scope} · {rateTypeLabel(r.rateType)}
            {r.pendingMeasurements ? ` · ${r.pendingMeasurements} to verify` : ""}
          </p>
        </div>
      ),
    },
    {
      id: "done",
      header: "Done",
      align: "right",
      cell: (r) => (r.rateType === "LUMPSUM" ? `${r.progressPercent}%` : r.verifiedQty !== null ? formatQty(r.verifiedQty, r.unit) : "—"),
    },
    { id: "value", header: "Value", align: "right", cell: (r) => <MoneyText paisa={r.account.valuePaisa} /> },
    { id: "ret", header: "Retention", align: "right", cell: (r) => <MoneyText paisa={r.account.retentionHeldPaisa} /> },
    { id: "paid", header: "Paid", align: "right", cell: (r) => <MoneyText paisa={r.account.paidPaisa} /> },
    { id: "due", header: "Balance due", align: "right", sortValue: (r) => Number(r.account.balanceDuePaisa), cell: (r) => <MoneyText paisa={r.account.balanceDuePaisa} className={r.account.overpaid ? "font-semibold text-danger" : "font-semibold"} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex flex-wrap justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setAction({ kind: "ledger", row: r })}>
            Ledger
          </Button>
          {r.isActive && r.rateType === "LUMPSUM" ? (
            <Button size="sm" variant="ghost" onClick={() => setAction({ kind: "progress", row: r })}>
              <Percent data-icon="inline-start" />
              Progress
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => setAction({ kind: "pay", row: r })}>
            <Banknote data-icon="inline-start" />
            Pay
          </Button>
          {owner ? (
            <Button size="sm" variant="ghost" onClick={() => setAction({ kind: "deduct", row: r })}>
              <Minus data-icon="inline-start" />
              Deduct
            </Button>
          ) : null}
        </div>
      ),
    },
  ];
  const close = () => setAction(null);
  return (
    <ProjectPageShell projectId={projectId} crumb="Sub-contractor Accounts">
      {() => (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Work value" icon={CircleDollarSign} value={formatPKRShort(accounts.data?.totals.valuePaisa ?? "0")} loading={accounts.isLoading} />
            <KpiCard label="Paid" icon={Banknote} value={formatPKRShort(accounts.data?.totals.paidPaisa ?? "0")} loading={accounts.isLoading} />
            <KpiCard label="Retention held" icon={Wallet} value={formatPKRShort(accounts.data?.totals.retentionHeldPaisa ?? "0")} loading={accounts.isLoading} />
            <KpiCard
              label="Balance due"
              icon={Plus}
              value={formatPKRShort(accounts.data?.totals.balanceDuePaisa ?? "0")}
              hint={accounts.data?.totals.overpaidCount ? `${accounts.data.totals.overpaidCount} overpaid` : undefined}
              tone={accounts.data?.totals.overpaidCount ? "danger" : "primary"}
              loading={accounts.isLoading}
            />
          </div>
          <SectionCard flush title="Accounts" description="Balance due = work value − retention − paid − deductions.">
            <DataTable rows={accounts.data?.items} getRowId={(r) => r.id} loading={accounts.isLoading} error={accounts.error} onRetry={accounts.refetch} columns={columns} empty={{ title: "No sub-contracts on this site", icon: Pencil }} />
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

