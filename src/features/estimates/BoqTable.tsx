"use client";

import { Info, PencilLine } from "lucide-react";
import { Fragment } from "react";
import type { BoqLine, BoqMoney, BoqSectionBlock } from "@/api/types";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatPKR } from "@/lib/money";
import { boqRateUnit, boqUnit, fmt, lineText, orderedSections, rupees, sectionText, stageText, visibleText } from "./labels";

type T = ReturnType<typeof useT>;

/** The trace popover: the formula and every step with its numbers (human-readable, from the API). */
export function LineTrace({ line, money }: { line: BoqLine; money: boolean }) {
  const t = useT();
  const item = lineText(t, line);
  const trace = line.trace.filter((s) => visibleText(s, money));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="print:hidden" aria-label={t("estimates.boq.traceFor", { item })}>
          <Info aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)]" data-testid="line-trace">
        <p className="font-medium">{t("estimates.boq.traceFor", { item })}</p>
        {visibleText(line.formula, money) ? (
          <p className="tabular text-muted-foreground">
            <bdi>{line.formula}</bdi>
          </p>
        ) : null}
        {trace.length ? (
          <ul className="list-disc space-y-1 ps-5 text-xs tabular">
            {trace.map((step, i) => (
              <li key={i}>
                <bdi>{step}</bdi>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">{t("estimates.boq.noTrace")}</p>
        )}
        {line.override ? (
          <p className="rounded-md bg-warning-soft p-2 text-xs">
            {t("estimates.boq.editedBy", { name: line.override.by?.name ?? "—", note: line.override.note })}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function OwnerCell({ t }: { t: T }) {
  return (
    <span title={t("estimates.boq.ownerHint")}>
      <StatusBadge tone="info" label={t("estimates.boq.owner")} />
    </span>
  );
}

function RateCell({ t, line }: { t: T; line: BoqLine }) {
  if (line.suppliedBy === "OWNER") return <OwnerCell t={t} />;
  if (line.kind === "PERCENT") {
    return line.rateQuantity !== null && line.rateQuantity !== undefined ? (
      <span className="tabular text-muted-foreground">{t("estimates.boq.percentOf", { amount: rupees(String(Math.round(line.rateQuantity))) })}</span>
    ) : (
      <>—</>
    );
  }
  // A rate typed in as an adjustment replaces the missing / mismatched price-list rate (QA-A-11).
  const rateOverride = Boolean(line.override?.ratePaisa);
  if (line.rateStatus === "RATE_MISSING" && !rateOverride) return <StatusBadge tone="warning" label={t("estimates.boq.noRate")} />;
  if (line.rateStatus === "UNIT_MISMATCH" && !rateOverride) return <StatusBadge tone="warning" label={t("estimates.boq.unitMismatch")} />;
  const rate = line.effectiveRatePaisa ?? line.ratePaisa;
  if (!rate) return <>—</>;
  return (
    <span className={cn("tabular whitespace-nowrap", line.override?.ratePaisa && "font-medium text-warning")}>
      <bdi>{t("estimates.boq.perUnit", { rate: formatPKR(rate), unit: boqRateUnit(t, line.rateUnit ?? line.unit) })}</bdi>
    </span>
  );
}

function QtyCell({ t, line }: { t: T; line: BoqLine }) {
  if (line.kind === "PERCENT") return <span className="tabular">{fmt(line.quantity)}%</span>;
  const overridden = line.override?.quantity !== null && line.override?.quantity !== undefined;
  return (
    <div className="tabular">
      <p className={cn("font-medium", overridden && "text-warning")}>{fmt(line.effectiveQuantity)}</p>
      {overridden ? (
        <p className="text-xs text-muted-foreground">{t("estimates.boq.wasQty", { n: fmt(line.quantityWithWastage) })}</p>
      ) : line.wastagePercent > 0 ? (
        <p className="text-xs text-muted-foreground">
          {fmt(line.quantity)} + {fmt(line.wastagePercent)}%
        </p>
      ) : null}
    </div>
  );
}

/**
 * The BoQ grouped by the 14 sections: a header row per section, its lines, a section total;
 * direct cost, overheads, contingency and the grand total at the foot. `money` false (no
 * fields.rates) drops the rate and amount columns entirely. Owner-supplied lines keep their
 * quantity and show "Owner" instead of a rate / amount.
 */
export function BoqTable({
  sections,
  totals,
  money,
  onAdjust,
}: {
  sections: BoqSectionBlock[];
  totals: BoqMoney;
  money: boolean;
  /** Draft revisions: adjust a line (quantity / rate with a note). */
  onAdjust?: (line: BoqLine) => void;
}) {
  const t = useT();
  const ordered = orderedSections(sections).filter((s) => s.lines.length);
  const colCount = 6 + (money ? 2 : 0) + (onAdjust ? 1 : 0);
  if (!ordered.length) {
    return (
      <SectionCard>
        <p className="text-sm text-muted-foreground">{t("estimates.boq.emptyBoq")}</p>
      </SectionCard>
    );
  }
  const footRow = (label: string, value: string | undefined, strong = false) => (
    <TableRow className={cn(strong && "text-base")}>
      <TableCell colSpan={6} className={cn("text-end", strong ? "font-semibold" : "text-muted-foreground")}>
        {label}
      </TableCell>
      <TableCell className={cn("text-end tabular", strong && "font-semibold")}>{value ? rupees(value) : "—"}</TableCell>
      <TableCell colSpan={colCount - 7} />
    </TableRow>
  );
  return (
    <SectionCard flush>
      <p className="px-4 pt-3 text-xs text-muted-foreground sm:hidden">{t("estimates.boq.scrollHint")}</p>
      <Table data-testid="boq-table">
        <TableHeader>
          <TableRow>
            <TableHead>{t("estimates.boq.col.item")}</TableHead>
            <TableHead>{t("estimates.boq.col.stage")}</TableHead>
            <TableHead className="text-end">{t("estimates.boq.col.qty")}</TableHead>
            <TableHead>{t("estimates.boq.col.unit")}</TableHead>
            <TableHead>{t("estimates.boq.col.supplied")}</TableHead>
            {money ? <TableHead>{t("estimates.boq.col.rate")}</TableHead> : null}
            {money ? <TableHead className="text-end">{t("estimates.boq.col.amount")}</TableHead> : null}
            <TableHead className="w-10 print:hidden">
              <span className="sr-only">{t("estimates.boq.col.trace")}</span>
            </TableHead>
            {onAdjust ? (
              <TableHead className="w-10 print:hidden">
                <span className="sr-only">{t("estimates.boq.col.actions")}</span>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordered.map((block) => (
            <Fragment key={block.section}>
              <TableRow className="bg-muted/60 hover:bg-muted/60" data-section={block.section}>
                <TableCell colSpan={colCount} className="font-semibold">
                  {sectionText(t, block.section)}
                  <span className="ms-2 text-xs font-normal text-muted-foreground">{t("estimates.boq.linesCount", { n: block.lines.length })}</span>
                </TableCell>
              </TableRow>
              {block.lines.map((line) => (
                <TableRow key={line.id} data-line={line.lineKey} data-owner={line.suppliedBy === "OWNER" || undefined}>
                  <TableCell className="min-w-48">
                    <p className="flex flex-wrap items-center gap-2">
                      {lineText(t, line)}
                      {line.override ? <StatusBadge tone="warning" label={t("estimates.boq.edited")} /> : null}
                    </p>
                    {/* Phone (QA-A-26): the amount right under the item, the full row scrolls sideways */}
                    {money && line.suppliedBy !== "OWNER" && line.amountPaisa ? (
                      <p className="text-xs font-medium tabular text-muted-foreground sm:hidden" data-testid="line-amount-mobile">
                        {rupees(line.amountPaisa)}
                      </p>
                    ) : null}
                    {visibleText(line.formula, money) ? (
                      <p className="hidden text-xs text-muted-foreground print:block">
                        <bdi>{line.formula}</bdi>
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{stageText(t, line.stageKey)}</TableCell>
                  <TableCell className="text-end">
                    <QtyCell t={t} line={line} />
                  </TableCell>
                  <TableCell>{line.kind === "PERCENT" ? "%" : boqUnit(t, line.unit)}</TableCell>
                  <TableCell>{t(`estimates.supplied.${line.suppliedBy}`)}</TableCell>
                  {money ? (
                    <TableCell>
                      <RateCell t={t} line={line} />
                    </TableCell>
                  ) : null}
                  {money ? (
                    <TableCell className="text-end tabular" data-testid="line-amount">
                      {line.suppliedBy === "OWNER" ? <OwnerCell t={t} /> : line.amountPaisa ? rupees(line.amountPaisa) : "—"}
                    </TableCell>
                  ) : null}
                  <TableCell className="print:hidden">
                    <LineTrace line={line} money={money} />
                  </TableCell>
                  {onAdjust ? (
                    <TableCell className="print:hidden">
                      {line.kind !== "PERCENT" ? (
                        <Button variant="ghost" size="icon-sm" aria-label={t("estimates.boq.adjustFor", { item: lineText(t, line) })} onClick={() => onAdjust(line)}>
                          <PencilLine aria-hidden />
                        </Button>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {money ? (
                <TableRow className="border-b-2" data-testid={`section-total-${block.section}`}>
                  <TableCell colSpan={6} className="text-end text-sm font-medium">
                    {t("estimates.boq.sectionTotal", { section: sectionText(t, block.section) })}
                  </TableCell>
                  <TableCell className="text-end font-semibold tabular">{block.amountPaisa ? rupees(block.amountPaisa) : "—"}</TableCell>
                  <TableCell colSpan={colCount - 7} />
                </TableRow>
              ) : null}
            </Fragment>
          ))}
        </TableBody>
        {money ? (
          <TableFooter>
            {footRow(t("estimates.boq.directCost"), totals.directCostPaisa)}
            {footRow(t("estimates.boq.overheads"), totals.overheadPaisa)}
            {footRow(t("estimates.boq.contingency"), totals.contingencyPaisa)}
            {footRow(t("estimates.boq.grandTotal"), totals.totalPaisa, true)}
          </TableFooter>
        ) : null}
      </Table>
    </SectionCard>
  );
}
