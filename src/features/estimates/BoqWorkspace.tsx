"use client";

import { Calculator, CheckCircle2, FilePlus2, ListOrdered, Percent, RefreshCw, Wallet } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  useApproveEstimateMutation,
  useGenerateEstimateMutation,
  useGetEstimatePdfMutation,
  useGetEstimateRevisionQuery,
  useGetEstimatesQuery,
  useRegenerateEstimateMutation,
} from "@/api/services/estimates.api";
import type { ApiError, BoqLine, BoqMoney, BoqStageTotal, EstimateDetail, EstimateSummary, EstimateWarning, ProjectDetail, ProjectEstimate } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ErrorState } from "@/components/common/ErrorState";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { PdfActions } from "@/components/common/PdfActions";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EstimateBasisOverride } from "@/features/projects/estimate/ContractFromEstimateCard";
import { EstimateWarnings } from "@/features/projects/estimate/EstimateView";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useLanguage, useStatusT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { formatPKRShort } from "@/lib/money";
import { projectHref } from "@/lib/navigation";
import { BoqTable } from "./BoqTable";
import { LineOverrideSlideOver } from "./LineOverrideSlideOver";
import { fmt, hasMargin, hasMoney, iso, pdfLang, rupees, stageText } from "./labels";

const PREVIEW = "preview";

/** Projects that may get new revisions (mirrors the API: DRAFT / ACTIVE). */
const ESTIMATING_STATUSES = ["DRAFT", "ACTIVE"];

/** The revision opened by default: the draft being worked on, else the approved one, else the newest. */
export function defaultRevision(list: EstimateSummary[]): EstimateSummary | null {
  return list.find((r) => r.status === "DRAFT") ?? list.find((r) => r.status === "APPROVED") ?? list[0] ?? null;
}

/** Engine warnings + BoQ warnings, one per code (+ floor). */
function mergeWarnings(...lists: EstimateWarning[][]): EstimateWarning[] {
  const seen = new Set<string>();
  return lists.flat().filter((w) => {
    const key = `${w.code}.${w.floor?.level ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Project → Planning → Estimate (BoQ), Step 11: the saved revisions (draft / approved /
 * superseded) with generate, regenerate, line adjustments, approve and PDF — or, before the
 * first revision, the live preview of what Generate would save (`previewExtras` adds the
 * grey-structure working below it).
 */
export function BoqWorkspace({
  project,
  live,
  initialRevisionId,
  previewExtras,
  contractCard,
}: {
  project: ProjectDetail;
  live: ProjectEstimate;
  initialRevisionId?: string;
  previewExtras?: ReactNode;
  /** "Contract value from this estimate" for the BoQ on screen (QA-A-02: same total as the KPI above). */
  contractCard?: (basis: EstimateBasisOverride) => ReactNode;
}) {
  const t = useT();
  const revisions = useGetEstimatesQuery(project.id);
  const [selected, setSelected] = useState<string | null>(initialRevisionId ?? null);
  const list = revisions.data ?? [];
  const current = selected === PREVIEW ? null : (list.find((r) => r.id === selected) ?? defaultRevision(list));
  const detail = useGetEstimateRevisionQuery(current?.id ?? "", { skip: !current });

  if (revisions.isLoading) return <CardsSkeleton count={2} height="h-32" />;
  if (revisions.error) return <ErrorState error={revisions.error} onRetry={revisions.refetch} />;

  const bar = (
    <RevisionBar
      project={project}
      list={list}
      current={current}
      onSelect={setSelected}
    />
  );

  if (!current) {
    const boq = live.boq;
    return (
      <div className="space-y-6">
        {list.length ? bar : <GenerateCard project={project} onGenerated={setSelected} />}
        <InlineAlert tone="info" title={t("estimates.boq.previewTitle")}>
          {t("estimates.boq.previewBody")}
        </InlineAlert>
        <EstimateWarnings project={project} warnings={mergeWarnings(live.warnings, boq?.warnings ?? [])} />
        {boq ? <BoqBody money={boq} coveredAreaSqft={boq.coveredAreaSqft} ownerLines={countOwner(boq.sections.flatMap((s) => s.lines))} lineCount={boq.sections.reduce((a, s) => a + s.lines.length, 0)} sections={boq.sections} stages={boq.stages} /> : null}
        {boq?.totalPaisa && contractCard
          ? contractCard({ estimateId: null, totalPaisa: boq.totalPaisa, revision: null, status: null, coveredAreaSqft: boq.coveredAreaSqft })
          : null}
        {previewExtras}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bar}
      {detail.isLoading || (detail.isFetching && detail.data?.id !== current.id) ? (
        <CardsSkeleton count={3} height="h-40" />
      ) : detail.error || !detail.data ? (
        <ErrorState error={detail.error} onRetry={detail.refetch} />
      ) : (
        <>
          <RevisionBody project={project} estimate={detail.data} />
          {detail.data.totalPaisa && contractCard
            ? contractCard({
                estimateId: detail.data.id,
                totalPaisa: detail.data.totalPaisa,
                revision: detail.data.revision,
                status: detail.data.status,
                coveredAreaSqft: detail.data.coveredAreaSqft,
              })
            : null}
        </>
      )}
    </div>
  );
}

const countOwner = (lines: BoqLine[]) => lines.filter((l) => l.suppliedBy === "OWNER").length;

function RevisionBody({ project, estimate: e }: { project: ProjectDetail; estimate: EstimateDetail }) {
  const t = useT();
  const canManage = useCan("projects.estimate.manage");
  const readOnly = useReadOnly();
  const [adjusting, setAdjusting] = useState<BoqLine | null>(null);
  const money = hasMoney(e);
  const editable = e.status === "DRAFT" && canManage && !readOnly && ESTIMATING_STATUSES.includes(project.status);
  return (
    <>
      {e.status === "DRAFT" && e.ratesOutdated ? (
        <InlineAlert
          tone="warning"
          title={t("estimates.boq.ratesOutdatedTitle")}
          action={editable ? <RegenerateButton estimate={e} variant="outline" /> : undefined}
        >
          <span data-testid="rates-outdated">{t("estimates.boq.ratesOutdatedBody", { n: e.revision })}</span>
        </InlineAlert>
      ) : null}
      <EstimateWarnings project={project} warnings={e.warnings} />
      <BoqBody
        money={e}
        coveredAreaSqft={e.coveredAreaSqft}
        ownerLines={e.ownerSuppliedLines}
        lineCount={e.lineCount}
        sections={e.sections}
        stages={e.stages}
        onAdjust={editable ? setAdjusting : undefined}
      />
      <LineOverrideSlideOver estimateId={e.id} line={adjusting} money={money} onClose={() => setAdjusting(null)} />
    </>
  );
}

function BoqBody({
  money: m,
  coveredAreaSqft,
  ownerLines,
  lineCount,
  sections,
  stages,
  onAdjust,
}: {
  money: BoqMoney;
  coveredAreaSqft: number;
  ownerLines: number;
  lineCount: number;
  sections: EstimateDetail["sections"];
  stages: BoqStageTotal[];
  onAdjust?: (line: BoqLine) => void;
}) {
  const t = useT();
  const money = hasMoney(m);
  return (
    <>
      {!money ? <InlineAlert tone="info">{t("estimates.boq.noMoney")}</InlineAlert> : null}
      <BoqKpis money={m} coveredAreaSqft={coveredAreaSqft} ownerLines={ownerLines} lineCount={lineCount} />
      <BoqTable sections={sections} totals={m} money={money} onAdjust={onAdjust} />
      {money ? <StageTotals stages={stages} /> : null}
    </>
  );
}

export function BoqKpis({ money: m, coveredAreaSqft, ownerLines, lineCount }: { money: BoqMoney; coveredAreaSqft: number; ownerLines: number; lineCount: number }) {
  const t = useT();
  const money = hasMoney(m);
  const margin = hasMargin(m);
  return (
    <KpiGroup columns={cn("sm:grid-cols-2", money ? (margin ? "xl:grid-cols-4" : "xl:grid-cols-3") : "")}>
      {money ? (
        <>
          <KpiCard
            variant="tile"
            highlight
            icon={Wallet}
            label={t("estimates.boq.kpi.total")}
            value={formatPKRShort(m.totalPaisa)}
            hint={t("estimates.boq.kpi.totalHint", { direct: iso(rupees(m.directCostPaisa)), overhead: iso(rupees(m.overheadPaisa)), contingency: iso(rupees(m.contingencyPaisa)) })}
          />
          <KpiCard
            variant="tile"
            icon={Calculator}
            label={t("estimates.boq.kpi.perSqft")}
            value={m.perSqftPaisa ? rupees(m.perSqftPaisa) : "—"}
            hint={t("estimates.boq.kpi.perSqftHint", { area: fmt(coveredAreaSqft) })}
          />
        </>
      ) : null}
      {margin ? (
        <KpiCard
          variant="tile"
          icon={Percent}
          tone={m.marginPercent === null || m.marginPercent === undefined ? "warning" : m.marginPercent < 0 ? "danger" : "success"}
          label={t("estimates.boq.kpi.margin")}
          value={m.marginPercent === null || m.marginPercent === undefined ? "—" : `${fmt(m.marginPercent)}%`}
          hint={m.contractTotalPaisa ? t("estimates.boq.kpi.marginHint", { contract: rupees(m.contractTotalPaisa), cost: rupees(m.totalPaisa) }) : t("estimates.boq.kpi.noContract")}
        />
      ) : null}
      <KpiCard
        variant="tile"
        icon={ListOrdered}
        label={t("estimates.boq.kpi.lines")}
        value={String(lineCount)}
        hint={t("estimates.boq.kpi.linesHint", { owner: ownerLines })}
      />
    </KpiGroup>
  );
}

function StageTotals({ stages }: { stages: BoqStageTotal[] }) {
  const t = useT();
  const rows = stages.filter((s) => s.amountPaisa && s.amountPaisa !== "0");
  if (!rows.length) return null;
  return (
    <SectionCard title={t("estimates.boq.stagesTitle")} description={t("estimates.boq.stagesDesc")}>
      <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2" data-testid="stage-totals">
        {rows.map((s) => (
          <div key={s.stageKey} className="flex items-baseline justify-between gap-4 border-b py-1.5">
            <dt className="text-muted-foreground">{stageText(t, s.stageKey)}</dt>
            <dd className="tabular font-medium">{rupees(s.amountPaisa)}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

// ─── Revision bar + actions ─────────────────────────────────────────────────

function RevisionBar({
  project,
  list,
  current,
  onSelect,
}: {
  project: ProjectDetail;
  list: EstimateSummary[];
  current: EstimateSummary | null;
  onSelect: (id: string) => void;
}) {
  const t = useT();
  const ts = useStatusT();
  const language = useLanguage();
  const canManage = useCan("projects.estimate.manage");
  const canApprove = useCan("estimate.revision.approve");
  const readOnly = useReadOnly();
  const [getPdf] = useGetEstimatePdfMutation();
  const writable = !readOnly && ESTIMATING_STATUSES.includes(project.status);
  const hasDraft = list.some((r) => r.status === "DRAFT");
  const nextRevision = Math.max(0, ...list.map((r) => r.revision)) + 1;
  return (
    <SectionCard>
      <div className="flex flex-wrap items-end justify-between gap-4" data-testid="revision-bar">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="estimate-revision">{t("estimates.boq.revision")}</Label>
          <Select value={current?.id ?? PREVIEW} onValueChange={onSelect}>
            <SelectTrigger id="estimate-revision" className="w-72 max-w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {list.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {t("estimates.boq.revisionOption", { n: r.revision, status: ts("estimateRevision", r.status) })}
                </SelectItem>
              ))}
              <SelectItem value={PREVIEW}>{t("estimates.boq.previewOption")}</SelectItem>
            </SelectContent>
          </Select>
          {current ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <StatusBadge domain="estimateRevision" value={current.status} />
              {current.ratesOutdated && current.status === "DRAFT" ? <StatusBadge tone="warning" label={t("estimates.revisions.outdated")} /> : null}
              <span>{t("estimates.boq.generatedBy", { name: current.generatedBy?.name ?? "—", date: formatDate(current.generatedAt.slice(0, 10)) })}</span>
              {current.approvedAt ? <span>{t("estimates.boq.approvedBy", { name: current.approvedBy?.name ?? "—", date: formatDate(current.approvedAt.slice(0, 10)) })}</span> : null}
              <span>{current.rulebook ? t("estimates.boq.rulebookVersion", { n: current.rulebook.version }) : t("estimates.boq.rulebookBuiltIn")}</span>
              {current.note ? <span className="italic">{current.note}</span> : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {current?.status === "DRAFT" && canManage && writable ? <RegenerateButton estimate={current} variant="outline" /> : null}
          {current?.status === "DRAFT" && canApprove && !readOnly ? <ApproveButton estimate={current} /> : null}
          {!hasDraft && canManage && writable ? <GenerateButton projectId={project.id} revision={nextRevision} onGenerated={onSelect} variant={current ? "outline" : "default"} /> : null}
          <Button asChild variant="ghost">
            <Link href={projectHref(project.id, "/planning/estimate-revisions")}>{t("estimates.boq.allRevisions")}</Link>
          </Button>
        </div>
      </div>
      {current ? (
        <div className="mt-4 border-t pt-4 print:hidden">
          <PdfActions load={() => getPdf({ id: current.id, lang: pdfLang(language) }).unwrap()} title={t("estimates.boq.pdfTitle", { n: current.revision })} />
        </div>
      ) : null}
      {!writable && canManage ? <p className="mt-3 text-xs text-muted-foreground">{t("estimates.boq.lockedHint")}</p> : null}
    </SectionCard>
  );
}

/** Before the first revision: the call to action after activation. */
function GenerateCard({ project, onGenerated }: { project: ProjectDetail; onGenerated: (id: string) => void }) {
  const t = useT();
  const canManage = useCan("projects.estimate.manage");
  const readOnly = useReadOnly();
  const writable = !readOnly && ESTIMATING_STATUSES.includes(project.status);
  return (
    <SectionCard
      title={t("estimates.boq.generateTitle")}
      description={t("estimates.boq.generateBody")}
      actions={canManage && writable ? <GenerateButton projectId={project.id} revision={1} onGenerated={onGenerated} /> : undefined}
    >
      {!writable && canManage ? <p className="text-xs text-muted-foreground">{t("estimates.boq.lockedHint")}</p> : null}
    </SectionCard>
  );
}

function GenerateButton({
  projectId,
  revision,
  onGenerated,
  variant = "default",
}: {
  projectId: string;
  revision: number;
  onGenerated: (id: string) => void;
  variant?: "default" | "outline";
}) {
  const t = useT();
  const [generate, { isLoading }] = useGenerateEstimateMutation();
  const run = useMutationToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <FilePlus2 data-icon="inline-start" />
        {revision === 1 ? t("estimates.boq.generate") : t("estimates.boq.generateNew", { n: revision })}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("estimates.boq.generateConfirmTitle", { n: revision })}
        description={t("estimates.boq.generateConfirmBody")}
        confirmLabel={t("estimates.boq.generate")}
        tone="default"
        loading={isLoading}
        onConfirm={async () => {
          const r = await run(() => generate({ projectId, note: note.trim() || undefined }).unwrap(), {
            success: (d) => t("estimates.boq.generated", { n: d.revision }),
            onError: (code, error) => {
              if (code !== "ESTIMATE_DRAFT_EXISTS") return false;
              const id = ((error as ApiError).details as { estimateId?: string } | undefined)?.estimateId;
              if (id) onGenerated(id);
              toast.info(t("estimates.boq.draftExists"));
              setOpen(false);
              return true;
            },
          });
          if (r) {
            onGenerated(r.id);
            setNote("");
            setOpen(false);
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="estimate-note">{t("estimates.boq.noteLabel")}</Label>
          <Textarea id="estimate-note" rows={2} maxLength={500} value={note} placeholder={t("estimates.boq.notePlaceholder")} onChange={(e) => setNote(e.target.value)} />
        </div>
      </ConfirmDialog>
    </>
  );
}

function RegenerateButton({ estimate, variant = "outline" }: { estimate: EstimateSummary; variant?: "default" | "outline" }) {
  const t = useT();
  const [regenerate, { isLoading }] = useRegenerateEstimateMutation();
  const run = useMutationToast();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <RefreshCw data-icon="inline-start" />
        {t("estimates.boq.regenerate")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("estimates.boq.regenerateTitle", { n: estimate.revision })}
        description={t("estimates.boq.regenerateBody")}
        confirmLabel={t("estimates.boq.regenerate")}
        tone="default"
        loading={isLoading}
        onConfirm={async () => {
          const r = await run(() => regenerate(estimate.id).unwrap(), { success: t("estimates.boq.regenerated", { n: estimate.revision }) });
          if (r) setOpen(false);
        }}
      />
    </>
  );
}

/** Approve a DRAFT (estimate.revision.approve). Outdated rates need an explicit tick (confirmOutdatedRates). */
export function ApproveButton({ estimate }: { estimate: EstimateSummary }) {
  const t = useT();
  const [approve, { isLoading }] = useApproveEstimateMutation();
  const run = useMutationToast();
  const [open, setOpen] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [confirmOutdated, setConfirmOutdated] = useState(false);
  const outdated = estimate.ratesOutdated || needsConfirm;
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CheckCircle2 data-icon="inline-start" />
        {t("estimates.boq.approve")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setConfirmOutdated(false);
        }}
        title={t("estimates.boq.approveTitle", { n: estimate.revision })}
        description={t("estimates.boq.approveBody")}
        confirmLabel={t("estimates.boq.approve")}
        tone="default"
        loading={isLoading}
        confirmDisabled={outdated && !confirmOutdated}
        onConfirm={async () => {
          const r = await run(() => approve({ id: estimate.id, confirmOutdatedRates: outdated && confirmOutdated }).unwrap(), {
            success: t("estimates.boq.approved", { n: estimate.revision }),
            onError: (code) => {
              if (code !== "RATES_OUTDATED") return false;
              setNeedsConfirm(true);
              return true;
            },
          });
          if (r) setOpen(false);
        }}
      >
        {outdated ? (
          <label className="flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-sm" data-testid="confirm-outdated">
            <Checkbox checked={confirmOutdated} onCheckedChange={(c) => setConfirmOutdated(c === true)} className="mt-0.5" />
            <span>{t("estimates.boq.approveOutdated")}</span>
          </label>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
