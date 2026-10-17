"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Milestone } from "@/api/types";
import { useEnumT, useStatusT, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { formatDate, formatMonth } from "@/lib/dates";
import { addDays } from "@/lib/weeks";
import { useMilestoneName } from "../labels";
import {
  BAR_H,
  BAR_TOP,
  BASELINE_H,
  BASELINE_TOP,
  dragDays,
  type GanttModel,
  type MilestoneRow,
} from "./ganttModel";

const HEADER_H = 44;

/** Bar colour by status (with the label and icon in the panel — never colour alone). */
const BAR_TONE: Record<Milestone["status"], string> = {
  PLANNED: "border-primary/60 bg-primary/15",
  IN_PROGRESS: "border-primary bg-primary/20",
  CURING: "border-warning bg-warning-soft",
  DONE: "border-success bg-success-soft",
  BLOCKED: "border-danger bg-danger-soft",
};
const FILL_TONE: Record<Milestone["status"], string> = {
  PLANNED: "bg-primary/70",
  IN_PROGRESS: "bg-primary/70",
  CURING: "bg-warning/70",
  DONE: "bg-success/70",
  BLOCKED: "bg-danger/60",
};

export const HATCH_WARNING =
  "bg-[repeating-linear-gradient(135deg,var(--warning)_0_2px,transparent_2px_6px)]";
export const HATCH_CURING = "bg-[repeating-linear-gradient(45deg,var(--primary)_0_1px,transparent_1px_4px)]";

interface Drag {
  id: string;
  startX: number;
  dx: number;
}

export interface GanttChartProps {
  model: GanttModel;
  selectedId?: string | null;
  onSelect: (milestoneId: string) => void;
  /** Present when the user may move dates (schedule.plan.manage): called with the new start after a drag. */
  onMove?: (milestone: Milestone, startNoEarlierThan: string) => void;
}

/**
 * Weeks view: label column at the inline start (follows the page direction), timeline always
 * left → right. Bars are buttons (click / Enter opens the milestone); planned bars of work that has
 * not started can be dragged sideways to change their start (whole days).
 */
export function GanttChart({ model, selectedId, onSelect, onMove }: GanttChartProps) {
  const t = useT();
  const milestoneName = useMilestoneName();
  const ts = useStatusT();
  const te = useEnumT();
  const scroller = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const moved = useRef(false);

  // Open with today in view.
  useEffect(() => {
    const el = scroller.current;
    if (el && model.todayX !== null) el.scrollLeft = Math.max(0, model.todayX - el.clientWidth / 3);
  }, [model.todayX]);

  const milestoneRows = model.rows.filter((r): r is MilestoneRow => r.kind === "milestone");

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>, row: MilestoneRow) => {
    if (!onMove || !row.movable || e.button !== 0) return;
    moved.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({ id: row.id, startX: e.clientX, dx: 0 });
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 3) moved.current = true;
    setDrag({ ...drag, dx });
  };
  const onPointerUp = (row: MilestoneRow) => {
    if (!drag) return;
    const days = dragDays(drag.dx);
    setDrag(null);
    if (moved.current && days !== 0 && onMove)
      onMove(row.milestone, addDays(row.milestone.plannedStart, days));
  };
  const onClick = (row: MilestoneRow) => {
    // A drag ends with a click on the same button — that one only moved the bar.
    if (moved.current) {
      moved.current = false;
      return;
    }
    onSelect(row.id);
  };

  return (
    <div className="flex overflow-hidden rounded-xl border bg-card" data-testid="gantt">
      {/* Labels (inline start: left in English, right in Urdu) */}
      {/* Phones: a narrow label column leaves room for the timeline (QA-B-27); names truncate with a tooltip. */}
      <div className="w-28 shrink-0 border-e sm:w-60">
        <div
          className="flex items-end border-b px-3 pb-1.5 text-xs font-medium text-muted-foreground"
          style={{ height: HEADER_H }}
        >
          {t("schedule.gantt.milestoneCol")}
        </div>
        {model.rows.map((row) =>
          row.kind === "stage" ? (
            <div
              key={row.id}
              className="flex items-center truncate border-b bg-muted/50 px-3 text-xs font-semibold"
              style={{ height: row.height }}
            >
              <span className="truncate">{te("scheduleStage", row.stage.stageKey, row.stage.name)}</span>
              <span className="tabular ms-auto ps-2 text-muted-foreground">{row.stage.progressPercent}%</span>
            </div>
          ) : (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelect(row.id)}
              className={cn(
                "flex w-full items-center gap-1.5 border-b px-3 text-start text-sm hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring",
                selectedId === row.id && "bg-sun-soft",
              )}
              style={{ height: row.height }}
              tabIndex={-1}
            >
              <bdi className="truncate" title={milestoneName(row.milestone)}>
                {milestoneName(row.milestone)}
              </bdi>
              {row.milestone.late ? (
                <TriangleAlert
                  className="size-3.5 shrink-0 text-danger"
                  aria-label={t("schedule.common.late")}
                />
              ) : null}
            </button>
          ),
        )}
      </div>

      {/* Timeline — always left to right */}
      <div ref={scroller} className="min-w-0 flex-1 overflow-x-auto" dir="ltr">
        <div
          className="relative"
          style={{ width: model.width, height: HEADER_H + model.height }}
          role="group"
          aria-label={t("schedule.gantt.chartLabel", { n: milestoneRows.length })}
        >
          {/* Header: months, then week starts */}
          <div className="absolute inset-x-0 top-0 border-b bg-card" style={{ height: HEADER_H }}>
            {model.months.map((m) => (
              <div
                key={m.key}
                className="absolute top-0 h-5 truncate border-s px-1 text-xs font-medium"
                style={{ left: m.x, width: m.width }}
              >
                {formatMonth(m.month)}
              </div>
            ))}
            {model.ramadan.map((r) => (
              <div
                key={r.key}
                className="absolute top-5 h-1 rounded-full bg-success/50"
                style={{ left: r.x, width: r.width }}
                title={t("schedule.gantt.legendRamadan")}
                data-testid="ramadan-band"
              />
            ))}
            {model.weeks.map((w) => (
              <div
                key={w.start}
                className="tabular absolute bottom-0 h-5 border-s ps-0.5 text-[10px] text-muted-foreground"
                style={{ left: w.x, width: 7 * 6 }}
              >
                {w.day}
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="absolute inset-x-0" style={{ top: HEADER_H, height: model.height }}>
            {/* Week grid */}
            {model.weeks.map((w) => (
              <div
                key={w.start}
                className="absolute inset-y-0 border-s border-border/50"
                style={{ left: w.x }}
              />
            ))}
            {/* Off days and holidays */}
            {model.shades.map((s) => (
              <div
                key={s.key}
                className={cn("absolute inset-y-0", s.kind === "OFF" ? "bg-muted/70" : "bg-neutral-soft")}
                style={{ left: s.x, width: s.width }}
                title={s.name ? `${s.name} · ${formatDate(s.date)}` : formatDate(s.date)}
                data-testid={`shade-${s.kind}`}
              />
            ))}
            {/* Stoppage days: approved solid, pending hatched */}
            {model.stoppageBands.map((b) => (
              <div
                key={b.key}
                className={cn(
                  "absolute inset-y-0 opacity-60",
                  b.status === "APPROVED" ? "bg-warning/40" : HATCH_WARNING,
                )}
                style={{ left: b.x, width: b.width }}
                title={t("schedule.gantt.stoppageLabel", {
                  reason: te("stoppageReason", b.stoppage.reason),
                  status: ts("stoppage", b.status),
                })}
                data-testid={`stoppage-band-${b.status}`}
              />
            ))}

            {/* Rows */}
            {model.rows.map((row) =>
              row.kind === "stage" ? (
                <div
                  key={row.id}
                  className="absolute inset-x-0 border-b bg-muted/30"
                  style={{ top: row.y, height: row.height }}
                >
                  <div
                    className="absolute top-2.5 h-2 rounded-full bg-foreground/25"
                    style={{ left: row.bar.x, width: row.bar.width }}
                    role="img"
                    aria-label={t("schedule.gantt.stageLabel", {
                      name: te("scheduleStage", row.stage.stageKey, row.stage.name),
                      from: formatDate(row.stage.plannedStart),
                      to: formatDate(row.stage.plannedEnd),
                      progress: row.stage.progressPercent,
                    })}
                  >
                    <div
                      className="h-full rounded-full bg-foreground/60"
                      style={{ width: `${Math.min(100, row.stage.progressPercent)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <MilestoneBar
                  key={row.id}
                  row={row}
                  selected={selectedId === row.id}
                  dx={drag?.id === row.id ? drag.dx : 0}
                  draggable={Boolean(onMove) && row.movable}
                  onPointerDown={(e) => onPointerDown(e, row)}
                  onPointerMove={onPointerMove}
                  onPointerUp={() => onPointerUp(row)}
                  onClick={() => onClick(row)}
                  label={t("schedule.gantt.barLabel", {
                    name: milestoneName(row.milestone),
                    from: formatDate(row.milestone.plannedStart),
                    to: formatDate(row.milestone.plannedEnd),
                    status: ts("milestone", row.milestone.status),
                    progress: row.milestone.progressPercent,
                  })}
                  curingLabel={
                    row.milestone.curingUntil
                      ? t("schedule.gantt.curingLabel", { date: formatDate(row.milestone.curingUntil) })
                      : ""
                  }
                  lateLabel={t("schedule.common.late")}
                />
              ),
            )}

            {/* Dependency arrows */}
            <svg
              className="pointer-events-none absolute inset-0 overflow-visible"
              width={model.width}
              height={model.height}
              aria-hidden
            >
              <defs>
                <marker
                  id="gantt-arrow"
                  viewBox="0 0 6 6"
                  refX="5"
                  refY="3"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6 z" className="fill-muted-foreground" />
                </marker>
              </defs>
              {model.arrows.map((a) => (
                <path
                  key={a.key}
                  d={a.path}
                  fill="none"
                  className="stroke-muted-foreground/70"
                  strokeWidth={1}
                  strokeDasharray={a.type === "SS" ? "3 2" : undefined}
                  markerEnd="url(#gantt-arrow)"
                  data-testid="dep-arrow"
                  data-type={a.type}
                />
              ))}
            </svg>

            {/* Today */}
            {model.todayX !== null ? (
              <div
                className="pointer-events-none absolute inset-y-0 w-0.5 bg-danger"
                style={{ left: model.todayX }}
                data-testid="today-line"
              >
                <span className="absolute -top-0.5 left-1 rounded bg-danger px-1 text-[10px] font-medium text-white">
                  {t("schedule.gantt.today")}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function MilestoneBar({
  row,
  selected,
  dx,
  draggable,
  label,
  curingLabel,
  lateLabel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClick,
}: {
  row: MilestoneRow;
  selected: boolean;
  dx: number;
  draggable: boolean;
  label: string;
  curingLabel: string;
  lateLabel: string;
  onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
  onClick: () => void;
}) {
  const m = row.milestone;
  const shift = Math.round(dx / 6) * 6;
  return (
    <div className="absolute inset-x-0 border-b" style={{ top: row.y, height: row.height }}>
      {row.baseline ? (
        <div
          className="absolute rounded-sm border border-dashed border-muted-foreground/60 bg-muted-foreground/15"
          style={{ left: row.baseline.x, width: row.baseline.width, top: BASELINE_TOP, height: BASELINE_H }}
          data-testid={`baseline-${m.id}`}
        />
      ) : null}
      {row.curing ? (
        <div
          className={cn("absolute rounded-sm border border-primary/30", HATCH_CURING)}
          style={{ left: row.curing.x, width: row.curing.width, top: BAR_TOP + 2, height: BAR_H - 4 }}
          title={curingLabel}
          data-testid={`curing-${m.id}`}
        />
      ) : null}
      <button
        type="button"
        aria-label={label}
        aria-pressed={selected}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClick}
        className={cn(
          "absolute overflow-hidden rounded-md border text-start focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
          BAR_TONE[m.status],
          m.late && "ring-1 ring-danger",
          selected && "outline-2 outline-ring",
          draggable ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-pointer",
          dx !== 0 && "opacity-80 shadow-md",
        )}
        style={{ left: row.bar.x + shift, width: row.bar.width, top: BAR_TOP, height: BAR_H }}
        data-testid={`bar-${m.id}`}
        data-status={m.status}
      >
        <span
          className={cn("block h-full", FILL_TONE[m.status])}
          style={{ width: row.progressWidth }}
          data-testid={`progress-${m.id}`}
        />
      </button>
      {m.late ? (
        <TriangleAlert
          className="absolute size-3.5 text-danger"
          style={{ left: row.bar.x + row.bar.width + 2, top: BAR_TOP }}
          aria-label={lateLabel}
          data-testid={`late-${m.id}`}
        />
      ) : null}
    </div>
  );
}
