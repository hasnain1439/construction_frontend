"use client";

import { Blocks, Calculator, Hammer, Info, Percent, Printer, SlidersHorizontal, Wallet } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useGetEstimateQuery } from "@/api/services/projects.api";
import type {
  EstimateLine,
  EstimateMethod,
  EstimateStageBlock,
  EstimateWarning,
  ProjectDetail,
  ProjectEstimate,
} from "@/api/types";
import { CollapsibleSection } from "@/components/common/CollapsibleSection";
import { DataTable, type Column } from "@/components/common/DataTable";
import { InfoList } from "@/components/common/InfoList";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { usePermissions } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { RequireAccess } from "@/components/common/RequireAccess";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useT, type TranslationKey } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatPKR, formatPKRShort } from "@/lib/money";
import { LOCKED_STATUSES } from "../constants";
import { ContractFromEstimateCard } from "./ContractFromEstimateCard";
import { useEstimateWarningText } from "./warningText";
import { wizardHref } from "../utils/links";
import { ProjectPageShell } from "../views/ProjectModeViews";
import { EstimateSettingsModal } from "./EstimateSettingsModal";
import { BoqWorkspace } from "@/features/estimates/BoqWorkspace";
import { iso } from "@/features/estimates/labels";
import { fmt, fmtUp, formulaText, lineText, materialText, rupees, unitText } from "./labels";

type T = ReturnType<typeof useT>;

/** Every steel material: the % method's generic steel and the bar sizes of the detailed method. */
const STEEL_MATERIALS = ["steel", "steel10", "steel12", "steel16", "steel20"] as const;
const SIZE_BAR: Record<string, number> = { steel10: 3, steel12: 4, steel16: 5, steel20: 6 };

/** "Detailed" (from the walls / roof entered) or "Estimated" (rule of thumb) — on work lines and in the basis. */
export function MethodBadge({ method }: { method: EstimateMethod | "MIXED" | undefined }) {
  const t = useT();
  const m = method ?? "ESTIMATED";
  return (
    <span data-method={m} className="inline-flex font-normal">
      <StatusBadge
        tone={m === "DETAILED" ? "success" : m === "MIXED" ? "info" : "neutral"}
        label={t(`projects.estimate.method.${m}` as TranslationKey)}
      />
    </span>
  );
}

/**
 * Project → Planning → Estimate (BoQ): the saved revisions (Step 11) — or, before the first one,
 * the live preview with its grey-structure working — plus the editable assumptions.
 */
export function EstimateView({ projectId, initialRevisionId }: { projectId: string; initialRevisionId?: string }) {
  return (
    <RequireAccess permission="projects.estimate.view">
      <EstimatePage projectId={projectId} initialRevisionId={initialRevisionId} />
    </RequireAccess>
  );
}

function EstimatePage({ projectId, initialRevisionId }: { projectId: string; initialRevisionId?: string }) {
  const t = useT();
  const { can } = usePermissions();
  const readOnly = useReadOnly();
  const query = useGetEstimateQuery(projectId, { refetchOnMountOrArgChange: true });
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("projects.estimate.crumb")}
      actions={() => (
        <span className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.print()} disabled={!query.data}>
            <Printer data-icon="inline-start" />
            {t("projects.estimate.print")}
          </Button>
          <Button onClick={() => setSettingsOpen(true)} disabled={!query.data}>
            <SlidersHorizontal data-icon="inline-start" />
            {t("projects.estimate.assumptions")}
          </Button>
        </span>
      )}
    >
      {(project) => (
        <QueryState query={query} skeleton={<CardsSkeleton count={4} height="h-40" />}>
          {(estimate) => (
            <>
              <EstimateBody project={project} estimate={estimate} initialRevisionId={initialRevisionId} />
              {settingsOpen ? (
                <EstimateSettingsModal
                  projectId={projectId}
                  estimate={estimate}
                  canManage={can("projects.estimate.manage")}
                  locked={readOnly || LOCKED_STATUSES.includes(project.status)}
                  onClose={() => setSettingsOpen(false)}
                />
              ) : null}
            </>
          )}
        </QueryState>
      )}
    </ProjectPageShell>
  );
}

function EstimateBody({ project, estimate: e, initialRevisionId }: { project: ProjectDetail; estimate: ProjectEstimate; initialRevisionId?: string }) {
  const t = useT();
  const readOnly = useReadOnly();
  const money = e.cost !== undefined;
  const greyWorking = (
    <div className="space-y-6" data-testid="grey-working">
      {!e.boq ? <p className="max-w-3xl text-sm text-muted-foreground">{t("projects.estimate.subtitle")}</p> : null}
      {!money && !e.boq ? <InlineAlert tone="info">{t("projects.estimate.noAccessCost")}</InlineAlert> : null}
      {!e.boq ? <EstimateKpis estimate={e} /> : null}
      <EstimateBasis estimate={e} />
      {e.stages.map((stage) => (
        <EstimateStageSection
          key={stage.stage}
          stage={stage}
          money={money}
          collapsible={Boolean(e.boq)}
          hasFoundation={!e.warnings.some((w) => w.code === "FOUNDATION_MISSING")}
        />
      ))}
      <EstimateMaterialSummary estimate={e} />
      <EstimateLabour estimate={e} collapsible={Boolean(e.boq)} />
      {e.cost ? <EstimateCostSummary estimate={e} /> : null}
    </div>
  );
  return (
    <div className="space-y-6" data-testid="estimate-page">
      <BoqWorkspace
        project={project}
        live={e}
        initialRevisionId={initialRevisionId}
        contractCard={(basis) => (
          <div className="print:hidden">
            <ContractFromEstimateCard
              projectId={project.id}
              estimate={e}
              basis={basis}
              fromQuote={Boolean(project.createdFromQuoteId)}
              locked={readOnly || LOCKED_STATUSES.includes(project.status)}
            />
          </div>
        )}
        previewExtras={
          e.boq ? (
            <SectionCard flush>
              <CollapsibleSection title={t("estimates.boq.greyWorking")} defaultOpen={false}>
                <div className="p-4">
                  <p className="mb-4 text-sm text-muted-foreground">{t("estimates.boq.greyWorkingDesc")}</p>
                  {greyWorking}
                </div>
              </CollapsibleSection>
            </SectionCard>
          ) : (
            greyWorking
          )
        }
      />
      <HowItWorks />
    </div>
  );
}

// ─── Warnings ───────────────────────────────────────────────────────────────

export { useEstimateWarningText } from "./warningText";

/**
 * Estimate warnings. On the project page a warning with a wizard `tab` links to the setup;
 * inside the wizard (`onGoToTab`) it switches the wizard tab instead ("Go to Floors & Rooms").
 */
export function EstimateWarnings({
  project,
  warnings,
  onGoToTab,
}: {
  project: ProjectDetail;
  warnings: EstimateWarning[];
  onGoToTab?: { go: (tab: number) => void; label: (tab: number) => string };
}) {
  const t = useT();
  const text = useEstimateWarningText();
  const { can } = usePermissions();
  if (!warnings.length) return null;
  const editSetup = can("projects.project.edit") && !LOCKED_STATUSES.includes(project.status);
  const link = (href: string, label: string) => (
    <Button asChild size="sm" variant="link" className="h-auto p-0 print:hidden">
      <Link href={href}>{label}</Link>
    </Button>
  );
  const action = (w: EstimateWarning): ReactNode => {
    if (w.code === "RATES_MISSING" && can("masterdata.pricelist.view"))
      return link("/settings/price-list", t("projects.estimate.warn.openPriceList"));
    if (w.code === "LABOUR_RATES_MISSING" && can("masterdata.laborrate.view"))
      return link("/settings/labor-rates", t("projects.estimate.warn.openLaborRates"));
    if (w.tab && onGoToTab) {
      const tab = w.tab;
      return (
        <Button
          type="button"
          size="sm"
          variant="link"
          className="h-auto p-0"
          onClick={() => onGoToTab.go(tab)}
        >
          {t("projects.review.goTo", { step: onGoToTab.label(tab) })}
        </Button>
      );
    }
    if (w.tab && editSetup) return link(wizardHref(project.id, w.tab), t("projects.estimate.warn.openSetup"));
    return null;
  };
  return (
    <InlineAlert tone="warning" title={t("projects.estimate.warn.title")}>
      <ul className="mt-1 list-disc space-y-1 ps-5" data-testid="estimate-warnings">
        {warnings.map((w) => (
          <li key={`${w.code}.${w.floor?.level ?? ""}`} data-code={w.code}>
            <span className="me-2">{text(w)}</span>
            {action(w)}
          </li>
        ))}
      </ul>
    </InlineAlert>
  );
}

// ─── KPIs ───────────────────────────────────────────────────────────────────

/** `compact`: at most 3 tiles a row (the wizard is narrower than the project page). */
export function EstimateKpis({
  estimate: e,
  compact = false,
}: {
  estimate: ProjectEstimate;
  compact?: boolean;
}) {
  const t = useT();
  const qty = (m: string) => e.materials.find((x) => x.material === m)?.quantity ?? 0;
  const steelKg = STEEL_MATERIALS.reduce((a, m) => a + qty(m), 0);
  const sizes = e.materials
    .filter((m) => SIZE_BAR[m.material])
    .map((m) => t("projects.estimate.kpi.steelSize", { bar: SIZE_BAR[m.material]!, kg: fmtUp(m.quantity) }));
  // QA-A-01: the cost is the BoQ total (direct + overheads + contingency) — the same number as the
  // BoQ page and the contract suggestion; the old grey-structure cost only without it (older API).
  const c = e.boqCost ?? e.cost;
  const bc = e.boqCost;
  const marginVisible = c?.marginPercent !== undefined;
  return (
    <KpiGroup
      columns={cn("sm:grid-cols-2", c && !compact ? "lg:grid-cols-3 xl:grid-cols-6" : "lg:grid-cols-3")}
    >
      {c ? (
        <>
          <KpiCard
            variant="tile"
            highlight
            icon={Wallet}
            label={t("projects.estimate.kpi.totalCost")}
            value={formatPKRShort(c.totalPaisa)}
            hint={
              bc
                ? t("estimates.boq.kpi.totalHint", { direct: iso(rupees(bc.directCostPaisa)), overhead: iso(rupees(bc.overheadPaisa)), contingency: iso(rupees(bc.contingencyPaisa)) })
                : e.cost
                  ? t("projects.estimate.kpi.totalCostHint", { materials: rupees(e.cost.materialsPaisa), labour: rupees(e.cost.labourPaisa) })
                  : undefined
            }
          />
          <KpiCard
            variant="tile"
            icon={Calculator}
            label={t("projects.estimate.kpi.perSqft")}
            value={c.perSqftPaisa ? rupees(c.perSqftPaisa) : "—"}
            hint={t("projects.estimate.kpi.perSqftHint", { area: fmt(bc?.coveredAreaSqft ?? e.basis.coveredAreaSqft) })}
          />
        </>
      ) : null}
      <KpiCard
        variant="tile"
        icon={Blocks}
        label={t("projects.estimate.kpi.cement")}
        value={t("projects.estimate.kpi.cementValue", { n: fmtUp(qty("cement")) })}
      />
      <KpiCard
        variant="tile"
        icon={Blocks}
        label={t("projects.estimate.kpi.bricks")}
        value={t("projects.estimate.kpi.bricksValue", { n: fmtUp(qty("bricks")) })}
        hint={t("projects.estimate.kpi.bricksHint", { n: fmt(Math.round(qty("bricks") / 100) / 10) })}
      />
      <KpiCard
        variant="tile"
        icon={Hammer}
        label={t("projects.estimate.kpi.steel")}
        value={t("projects.estimate.kpi.steelValue", { n: fmt(Math.round(steelKg / 10) / 100) })}
        hint={sizes.length ? sizes.join(" · ") : t("projects.estimate.kpi.steelHint", { n: fmtUp(steelKg) })}
      />
      {marginVisible && c ? (
        <KpiCard
          variant="tile"
          icon={Percent}
          tone={
            c.marginPercent === null || c.marginPercent === undefined
              ? "warning"
              : c.marginPercent < 0
                ? "danger"
                : "success"
          }
          label={t("projects.estimate.kpi.margin")}
          value={c.marginPercent === null || c.marginPercent === undefined ? "—" : `${fmt(c.marginPercent)}%`}
          hint={
            c.contractTotalPaisa
              ? t("projects.estimate.kpi.marginHint", {
                  contract: rupees(c.contractTotalPaisa),
                  cost: rupees(c.totalPaisa),
                })
              : t("projects.estimate.kpi.noContract")
          }
        />
      ) : null}
    </KpiGroup>
  );
}

// ─── Basis ──────────────────────────────────────────────────────────────────

export function EstimateBasis({ estimate: e }: { estimate: ProjectEstimate }) {
  const t = useT();
  const te = useEnumT();
  const b = e.basis;
  const structure = te("projectStructureType", b.structureType);
  const ft = (n: number) => t("projects.unit.ftValue", { n: fmt(n) });
  return (
    <SectionCard flush>
      <CollapsibleSection title={t("projects.estimate.basis.title")} defaultOpen={false}>
        <div className="space-y-4 p-4">
          <InfoList
            columns={3}
            items={[
              {
                label: t("projects.estimate.basis.structure"),
                value: b.structureTypeAssumed
                  ? t("projects.estimate.basis.assumed", { type: structure })
                  : structure,
              },
              {
                label: t("projects.estimate.basis.covered"),
                value: t(
                  b.coveredAreaSource === "PROJECT"
                    ? "projects.estimate.basis.coveredValue"
                    : "projects.estimate.basis.coveredFromRooms",
                  { n: fmt(b.coveredAreaSqft) },
                ),
              },
              {
                label: t("projects.estimate.basis.foundationLength"),
                value: t(
                  !b.foundationWallLengthAuto
                    ? "projects.estimate.basis.lengthManual"
                    : b.foundationWallLengthSource === "WALLS"
                      ? "projects.estimate.basis.lengthWalls"
                      : "projects.estimate.basis.lengthAuto",
                  { n: fmt(b.foundationWallLengthFt) },
                ),
              },
              {
                label: t("projects.estimate.basis.methodWalls"),
                value: <MethodBadge method={b.methods?.walls} />,
              },
              {
                label: t("projects.estimate.basis.methodRoof"),
                value: <MethodBadge method={b.methods?.roof} />,
              },
            ]}
          />
          <DataTable
            rows={b.floors}
            getRowId={(f) => f.level}
            clientPageSize={0}
            empty={{ title: t("projects.estimate.stage.emptyRooms") }}
            columns={[
              {
                id: "floor",
                header: t("projects.estimate.basis.floor"),
                cell: (f) => te("projectFloorLevel", f.level, f.name),
              },
              {
                id: "rooms",
                header: t("projects.estimate.basis.rooms"),
                align: "right",
                cell: (f) => f.rooms,
              },
              {
                id: "height",
                header: t("projects.estimate.basis.height"),
                align: "right",
                cell: (f) => ft(f.heightFt),
              },
              {
                id: "footprint",
                header: t("projects.estimate.basis.footprint"),
                align: "right",
                cell: (f) => t("projects.unit.sqftValue", { n: fmt(f.footprintSqft) }),
              },
              {
                id: "ext",
                header: t("projects.estimate.basis.externalWall"),
                align: "right",
                cell: (f) => ft(f.externalWallFt),
              },
              {
                id: "int",
                header: t("projects.estimate.basis.internalWall"),
                align: "right",
                cell: (f) => ft(f.internalWallFt),
              },
              {
                id: "walls",
                header: t("projects.estimate.basis.wallsCol"),
                cell: (f) => <MethodBadge method={f.wallsMethod} />,
              },
              {
                id: "roof",
                header: t("projects.estimate.basis.roofCol"),
                cell: (f) => <MethodBadge method={f.roofMethod} />,
              },
            ]}
          />
          <DetailedBasis estimate={e} />
          <p className="text-xs text-muted-foreground">{t("projects.estimate.basis.wallsNote")}</p>
        </div>
      </CollapsibleSection>
    </SectionCard>
  );
}

/** Per floor: brickwork by wall thickness and slab steel by bar size (detailed floors only). */
function DetailedBasis({ estimate: e }: { estimate: ProjectEstimate }) {
  const t = useT();
  const te = useEnumT();
  const floors = e.basis.floors.filter((f) => f.walls || f.roof);
  if (!floors.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2" data-testid="estimate-detailed-basis">
      {floors.map((f) => (
        <div key={f.level} className="space-y-1 rounded-lg border p-3 text-sm">
          <p className="font-medium">{te("projectFloorLevel", f.level, f.name)}</p>
          {f.walls ? (
            <>
              <p className="text-xs font-semibold text-muted-foreground">{t("projects.estimate.basis.byThickness")}</p>
              <ul className="space-y-0.5 tabular">
                {f.walls.byThickness.map((w) => (
                  <li key={w.thicknessIn}>
                    <bdi>{t("projects.estimate.basis.thicknessLine", { n: w.thicknessIn, cft: fmt(w.volumeCft), bricks: fmtUp(w.bricks) })}</bdi>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {f.roof?.steelBySize.length ? (
            <>
              <p className="text-xs font-semibold text-muted-foreground">{t("projects.estimate.basis.steelBySize")}</p>
              <ul className="space-y-0.5 tabular" data-testid="steel-by-size">
                {f.roof.steelBySize.map((s) => (
                  <li key={s.bar}>
                    <bdi>{t("projects.estimate.basis.steelLine", { bar: s.bar, mm: s.mm, kg: fmt(s.kg) })}</bdi>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ─── Stages ─────────────────────────────────────────────────────────────────

function RateCell({
  t,
  rateStatus,
  ratePaisa,
  rateUnit,
  suppliedBy,
}: { t: T } & Pick<EstimateLine, "rateStatus" | "ratePaisa" | "rateUnit" | "suppliedBy">) {
  if (!rateStatus) return <>—</>;
  if (rateStatus === "RATE_MISSING") {
    return suppliedBy === "OWNER" ? (
      <StatusBadge tone="neutral" label={t("projects.estimate.byOwner")} />
    ) : (
      <StatusBadge tone="warning" label={t("projects.estimate.rateMissing")} />
    );
  }
  if (rateStatus === "UNIT_MISMATCH")
    return <StatusBadge tone="warning" label={t("projects.estimate.unitMismatch")} />;
  return (
    <span className="tabular whitespace-nowrap">
      <bdi>{t("projects.estimate.perUnit", { rate: formatPKR(ratePaisa), unit: unitText(t, rateUnit) })}</bdi>
    </span>
  );
}

function FormulaHint({ line }: { line: EstimateLine }) {
  const t = useT();
  const text = formulaText(t, line.formula, line.formulaText);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="print:hidden"
          aria-label={t("projects.estimate.showFormula", { item: lineText(t, line) })}
        >
          <Info aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <bdi>{text}</bdi>
      </TooltipContent>
    </Tooltip>
  );
}

/** A card whose body folds away under its title (wizard variant: collapsed by default). */
function FoldingCard({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return (
    <SectionCard flush>
      <CollapsibleSection
        title={
          <span className="flex flex-col gap-0.5">
            <span>{title}</span>
            {meta ? <span className="text-xs font-normal text-muted-foreground">{meta}</span> : null}
          </span>
        }
        defaultOpen={false}
      >
        {children}
      </CollapsibleSection>
    </SectionCard>
  );
}

export function EstimateStageSection({
  stage,
  money,
  hasFoundation,
  collapsible = false,
}: {
  stage: EstimateStageBlock;
  money: boolean;
  hasFoundation: boolean;
  /** Fold the table under the title, closed at first (wizard). */
  collapsible?: boolean;
}) {
  const t = useT();
  const te = useEnumT();
  const meta = [
    money && stage.materialsPaisa && stage.materialsPaisa !== "0"
      ? t("projects.estimate.stage.cost", { amount: rupees(stage.materialsPaisa) })
      : null,
    money && stage.ownerSuppliedPaisa && stage.ownerSuppliedPaisa !== "0"
      ? t("projects.estimate.stage.ownerSupplied", { amount: rupees(stage.ownerSuppliedPaisa) })
      : null,
    money && stage.missingRates ? t("projects.estimate.stage.missing", { n: stage.missingRates }) : null,
  ].filter(Boolean);
  const columns: Column<EstimateLine>[] = [
    {
      id: "item",
      header: t("projects.estimate.col.item"),
      cell: (l) => (
        <div className={cn("min-w-48", l.kind === "MATERIAL" && "ps-4")}>
          <p className={cn("flex flex-wrap items-center gap-2", l.kind === "WORK" ? "font-medium" : "text-muted-foreground")}>
            {lineText(t, l)}
            {l.kind === "WORK" ? <MethodBadge method={l.method} /> : null}
          </p>
          <p className="hidden text-xs text-muted-foreground print:block">
            <bdi>{formulaText(t, l.formula, l.formulaText)}</bdi>
          </p>
        </div>
      ),
    },
    {
      id: "floor",
      header: t("projects.estimate.col.floor"),
      cell: (l) =>
        l.floor ? te("projectFloorLevel", l.floor.level, l.floor.name) : t("projects.estimate.allFloors"),
    },
    {
      id: "qty",
      header: t("projects.estimate.col.qty"),
      align: "right",
      cell: (l) => (
        <div className="tabular">
          <p className={cn(l.kind === "WORK" && "font-medium")}>{fmt(l.quantity)}</p>
          {l.wastagePercent > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("projects.estimate.wastage", { n: fmt(l.wastagePercent) })}
            </p>
          ) : null}
        </div>
      ),
    },
    { id: "unit", header: t("projects.estimate.col.unit"), cell: (l) => unitText(t, l.unit) },
    {
      id: "rate",
      header: t("projects.estimate.col.rate"),
      hidden: !money,
      cell: (l) => <RateCell t={t} {...l} />,
    },
    {
      id: "amount",
      header: t("projects.estimate.col.amount"),
      align: "right",
      hidden: !money,
      cell: (l) => (l.amountPaisa ? <span className="tabular">{rupees(l.amountPaisa)}</span> : "—"),
    },
    {
      id: "formula",
      header: <span className="sr-only">{t("projects.estimate.col.formula")}</span>,
      className: "w-10 print:hidden",
      headerClassName: "print:hidden",
      cell: (l) => <FormulaHint line={l} />,
    },
  ];
  const emptyKey: TranslationKey =
    stage.stage === "FOUNDATION" && !hasFoundation
      ? "projects.estimate.stage.emptyFoundation"
      : stage.stage === "FOUNDATION"
        ? "projects.estimate.stage.empty"
        : "projects.estimate.stage.emptyRooms";
  const title = t(`projects.estimate.stage.${stage.stage}` as TranslationKey);
  const body = (
    <div data-stage={stage.stage}>
      <DataTable
        rows={stage.lines}
        getRowId={(l) => l.id}
        columns={columns}
        clientPageSize={0}
        empty={{ title: t(emptyKey) }}
        rowClassName={(l) => (l.kind === "WORK" ? "bg-muted/40" : undefined)}
      />
      {stage.totals.length ? (
        <p className="flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-3 text-sm">
          {stage.totals.map((x) => (
            <span key={x.material} className="tabular">
              <span className="text-muted-foreground">{materialText(t, x.material)}:</span>{" "}
              <bdi>{fmt(x.quantity)}</bdi> {unitText(t, materialUnit(x.material))}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
  const description = meta.join(" · ") || undefined;
  if (collapsible) {
    return (
      <FoldingCard title={title} meta={description}>
        {body}
      </FoldingCard>
    );
  }
  return (
    <SectionCard title={title} description={description} flush>
      {body}
    </SectionCard>
  );
}

const MATERIAL_UNIT: Record<string, string> = {
  cement: "bag",
  bricks: "nos",
  sand: "cft",
  crush: "cft",
  steel: "kg",
  steel10: "kg",
  steel12: "kg",
  steel16: "kg",
  steel20: "kg",
  tIron: "kg",
  roofTile: "nos",
  precastPlank: "sqft",
  steelDeck: "sqft",
  waterproofing: "kg",
  bitumen: "kg",
  termite: "litre",
  stone: "cft",
};
const materialUnit = (m: string) => MATERIAL_UNIT[m] ?? "";

// ─── Summary, labour, cost ──────────────────────────────────────────────────

export function EstimateMaterialSummary({ estimate: e }: { estimate: ProjectEstimate }) {
  const t = useT();
  const money = e.cost !== undefined;
  type Row = ProjectEstimate["materials"][number];
  return (
    <SectionCard
      title={t("projects.estimate.summary.title")}
      description={t("projects.estimate.summary.description")}
      actions={
        e.cost ? (
          <span className="tabular text-sm font-semibold">
            {t("projects.estimate.summary.total")}: {rupees(e.cost.materialsPaisa)}
          </span>
        ) : undefined
      }
      flush
    >
      <DataTable<Row>
        rows={e.materials}
        getRowId={(m) => m.material}
        clientPageSize={0}
        empty={{ title: t("projects.estimate.stage.empty") }}
        columns={[
          {
            id: "material",
            header: t("projects.estimate.col.material"),
            cell: (m) => <span className="font-medium">{materialText(t, m.material)}</span>,
          },
          {
            id: "qty",
            header: t("projects.estimate.col.qty"),
            align: "right",
            cell: (m) => (
              <div className="tabular">
                <p className="font-medium">{fmtUp(m.quantity)}</p>
                <p className="text-xs text-muted-foreground">{fmt(m.quantity)}</p>
              </div>
            ),
          },
          { id: "unit", header: t("projects.estimate.col.unit"), cell: (m) => unitText(t, m.unit) },
          {
            id: "item",
            header: t("projects.estimate.col.priceItem"),
            cell: (m) => (
              <div>
                <p>{m.materialName ?? "—"}</p>
                {m.qualityCategory ? (
                  <p className="text-xs text-muted-foreground">{m.qualityCategory.name}</p>
                ) : null}
                {m.rateFallback ? (
                  <StatusBadge tone="warning" label={t("projects.estimate.rateFallback")} />
                ) : null}
              </div>
            ),
          },
          {
            id: "supplied",
            header: t("projects.estimate.col.supplied"),
            cell: (m) => (
              <StatusBadge
                tone={m.suppliedBy === "OWNER" ? "info" : "neutral"}
                label={t(
                  m.suppliedBy === "OWNER" ? "projects.estimate.byOwner" : "projects.estimate.byContractor",
                )}
              />
            ),
          },
          {
            id: "rate",
            header: t("projects.estimate.col.rate"),
            hidden: !money,
            cell: (m) => (
              <RateCell
                t={t}
                rateStatus={m.rateStatus}
                ratePaisa={m.ratePaisa}
                rateUnit={m.rateUnit}
                suppliedBy={m.suppliedBy}
              />
            ),
          },
          {
            id: "amount",
            header: t("projects.estimate.col.amount"),
            align: "right",
            hidden: !money,
            cell: (m) =>
              m.amountPaisa ? <span className="tabular font-medium">{rupees(m.amountPaisa)}</span> : "—",
          },
        ]}
      />
    </SectionCard>
  );
}

export function EstimateLabour({
  estimate: e,
  collapsible = false,
}: {
  estimate: ProjectEstimate;
  collapsible?: boolean;
}) {
  const t = useT();
  const money = e.cost !== undefined;
  const l = e.labour;
  type Row = ProjectEstimate["labour"]["lines"][number];
  const title = t("projects.estimate.labour.title");
  const description = t(`projects.estimate.labour.${l.method}` as TranslationKey);
  const total = money && l.totalPaisa ? rupees(l.totalPaisa) : null;
  const table = l.lines.length ? (
    <DataTable<Row>
      rows={l.lines}
      getRowId={(r) => r.item}
      clientPageSize={0}
      empty={{ title: t("projects.estimate.labour.EXCLUDED") }}
      columns={[
        {
          id: "item",
          header: t("projects.estimate.col.item"),
          cell: (r) => t(`projects.estimate.labour.item.${r.item}` as TranslationKey),
        },
        {
          id: "qty",
          header: t("projects.estimate.col.qty"),
          align: "right",
          cell: (r) => <span className="tabular">{fmt(r.quantity)}</span>,
        },
        { id: "unit", header: t("projects.estimate.col.unit"), cell: (r) => unitText(t, r.unit) },
        {
          id: "rate",
          header: t("projects.estimate.col.rate"),
          hidden: !money,
          cell: (r) => (
            <RateCell
              t={t}
              rateStatus={r.rateStatus ?? null}
              ratePaisa={r.ratePaisa}
              rateUnit={r.unit}
              suppliedBy="CONTRACTOR"
            />
          ),
        },
        {
          id: "amount",
          header: t("projects.estimate.col.amount"),
          align: "right",
          hidden: !money,
          cell: (r) => (r.amountPaisa ? <span className="tabular">{rupees(r.amountPaisa)}</span> : "—"),
        },
      ]}
    />
  ) : null;
  if (collapsible && table) {
    return (
      <FoldingCard title={title} meta={[description, total].filter(Boolean).join(" · ")}>
        {table}
      </FoldingCard>
    );
  }
  return (
    <SectionCard
      title={title}
      description={description}
      actions={total ? <span className="tabular text-sm font-semibold">{total}</span> : undefined}
      flush
    >
      {table}
    </SectionCard>
  );
}

export function EstimateCostSummary({ estimate: e }: { estimate: ProjectEstimate }) {
  const t = useT();
  const c = e.cost!;
  const row = (label: string, value: ReactNode, strong = false) => (
    <div className={cn("flex items-baseline justify-between gap-4 py-2", strong && "border-t font-semibold")}>
      <span className={cn(!strong && "text-muted-foreground")}>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
  return (
    <SectionCard title={t("projects.estimate.cost.title")}>
      <div className="max-w-xl text-sm" data-testid="estimate-cost">
        {row(t("projects.estimate.cost.materials"), rupees(c.materialsPaisa))}
        {row(t("projects.estimate.cost.labour"), rupees(c.labourPaisa))}
        {row(t("projects.estimate.cost.total"), rupees(c.totalPaisa), true)}
        {c.ownerSuppliedPaisa !== "0"
          ? row(t("projects.estimate.cost.ownerSupplied"), rupees(c.ownerSuppliedPaisa))
          : null}
        {c.contractTotalPaisa !== undefined
          ? row(
              t("projects.estimate.cost.contract"),
              c.contractTotalPaisa ? rupees(c.contractTotalPaisa) : "—",
            )
          : null}
        {c.marginPaisa !== undefined
          ? row(
              t("projects.estimate.cost.margin"),
              c.marginPaisa !== null && c.marginPercent !== null && c.marginPercent !== undefined
                ? t("projects.estimate.cost.marginValue", {
                    amount: rupees(c.marginPaisa),
                    percent: fmt(c.marginPercent),
                  })
                : "—",
              true,
            )
          : null}
      </div>
    </SectionCard>
  );
}

function HowItWorks() {
  const t = useT();
  const keys = ["concrete", "mortar", "plaster", "steel", "walls", "detailedWalls", "detailedRoof", "wastage"] as const;
  return (
    <SectionCard flush>
      <CollapsibleSection title={t("projects.estimate.how.title")} defaultOpen={false}>
        <ul className="list-disc space-y-1.5 p-4 ps-9 text-sm text-muted-foreground">
          {keys.map((k) => (
            <li key={k}>{t(`projects.estimate.how.${k}`)}</li>
          ))}
        </ul>
      </CollapsibleSection>
    </SectionCard>
  );
}
