/**
 * Pure layout of the Gantt (weeks view): every date becomes an x position, every stage / milestone a
 * row. Dates are calendar strings ("YYYY-MM-DD") worked on in UTC so nothing shifts with the browser
 * time zone. The timeline always runs left → right (earlier → later), also in Urdu — see README
 * "Schedule" (only labels follow the page direction).
 */
import type { Milestone, ScheduleDetail, PlanStage, Stoppage, StoppageStatus } from "@/api/types";
import { addDays, weekStartOf, weekdayOf } from "@/lib/weeks";

/** Pixels per calendar day (a week is 42 px). */
export const DAY_PX = 6;
export const STAGE_ROW_H = 30;
export const MILESTONE_ROW_H = 36;
/** Bar geometry inside a milestone row. */
export const BAR_TOP = 8;
export const BAR_H = 14;
export const BASELINE_TOP = 25;
export const BASELINE_H = 5;

const DAY_MS = 86_400_000;
const parse = (date: string) =>
  Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));

/** Whole days from `a` to `b` (b − a). */
export const diffDays = (a: string, b: string) => Math.round((parse(b) - parse(a)) / DAY_MS);

export interface Span {
  x: number;
  width: number;
}

export interface StageRow {
  kind: "stage";
  id: string;
  stage: PlanStage;
  y: number;
  height: number;
  bar: Span;
}

export interface MilestoneRow {
  kind: "milestone";
  id: string;
  milestone: Milestone;
  y: number;
  height: number;
  bar: Span;
  /** Width of the "done so far" fill inside the bar. */
  progressWidth: number;
  baseline: Span | null;
  /** After the work ends, until `curingUntil`. */
  curing: Span | null;
  /** Dates may be moved by dragging (not started, not finished). */
  movable: boolean;
}

export type GanttRow = StageRow | MilestoneRow;

export interface Band extends Span {
  key: string;
}

export interface StoppageBand extends Band {
  status: StoppageStatus;
  stoppage: Stoppage;
}

export interface DayShade extends Band {
  kind: "OFF" | "HOLIDAY" | "PARTIAL";
  date: string;
  name?: string;
}

export interface Arrow {
  key: string;
  fromId: string;
  toId: string;
  type: "FS" | "SS";
  path: string;
}

export interface GanttModel {
  start: string;
  end: string;
  days: number;
  width: number;
  height: number;
  weeks: { start: string; x: number; day: number }[];
  months: { key: string; month: string; x: number; width: number }[];
  todayX: number | null;
  shades: DayShade[];
  stoppageBands: StoppageBand[];
  ramadan: Band[];
  rows: GanttRow[];
  arrows: Arrow[];
}

/** Bar covering `start` … `end` (both days included). */
export function spanOf(chartStart: string, start: string, end: string): Span {
  const x = diffDays(chartStart, start) * DAY_PX;
  return { x, width: Math.max(1, diffDays(start, end) + 1) * DAY_PX };
}

/** A milestone's start can be dragged when it has not started and is not finished. */
export const isMovable = (m: Milestone) =>
  !m.actualStart && (m.status === "PLANNED" || m.status === "BLOCKED");

/** Group sorted dates into runs of consecutive days. */
function runs(dates: string[]): { from: string; to: string }[] {
  const sorted = [...new Set(dates)].sort();
  const out: { from: string; to: string }[] = [];
  for (const date of sorted) {
    const last = out[out.length - 1];
    if (last && diffDays(last.to, date) === 1) last.to = date;
    else out.push({ from: date, to: date });
  }
  return out;
}

const minDate = (dates: (string | null | undefined)[]) =>
  dates.filter((d): d is string => Boolean(d)).sort()[0];
const maxDate = (dates: (string | null | undefined)[]) =>
  dates
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);

/** Lay out the schedule; `null` when there is nothing to draw. */
export function buildGanttModel(detail: ScheduleDetail): GanttModel | null {
  const { milestones, stages } = detail;
  if (!detail.schedule || milestones.length === 0) return null;

  const first = minDate([
    detail.schedule.startDate,
    ...milestones.flatMap((m) => [m.plannedStart, m.baselineStart, m.actualStart]),
  ])!;
  const last = maxDate([
    detail.plannedEnd,
    detail.baselineEnd,
    detail.projectedEnd,
    detail.today,
    ...milestones.flatMap((m) => [m.plannedEnd, m.baselineEnd, m.curingUntil, m.actualEnd]),
  ])!;
  const start = weekStartOf(addDays(first, -3), "MONDAY");
  const end = addDays(weekStartOf(addDays(last, 7), "MONDAY"), 6);
  const days = diffDays(start, end) + 1;
  const width = days * DAY_PX;
  const xOf = (date: string) => diffDays(start, date) * DAY_PX;
  const inRange = (date: string) => date >= start && date <= end;

  // ── Header: weeks and months ──
  const weeks: GanttModel["weeks"] = [];
  for (let d = start; d <= end; d = addDays(d, 7))
    weeks.push({ start: d, x: xOf(d), day: Number(d.slice(8, 10)) });
  const months: GanttModel["months"] = [];
  for (let d = start; d <= end;) {
    const monthKey = d.slice(0, 7);
    const nextMonth = addDays(`${monthKey}-01`, 32).slice(0, 7) + "-01";
    const to = nextMonth > end ? addDays(end, 1) : nextMonth;
    months.push({ key: monthKey, month: monthKey, x: xOf(d), width: diffDays(d, to) * DAY_PX });
    d = to;
  }

  // ── Background: weekly off days, holidays, Ramadan, stoppages ──
  const working = new Set(detail.calendar.workingDays);
  const holidays = new Map(detail.calendar.holidays.map((h) => [h.date, h]));
  const shades: DayShade[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const holiday = holidays.get(d);
    if (holiday)
      shades.push({
        key: `h-${d}`,
        date: d,
        x: xOf(d),
        width: DAY_PX,
        kind: holiday.type === "PARTIAL" ? "PARTIAL" : "HOLIDAY",
        name: holiday.name,
      });
    else if (!working.has(weekdayOf(d)))
      shades.push({ key: `o-${d}`, date: d, x: xOf(d), width: DAY_PX, kind: "OFF" });
  }
  const ramadan: Band[] = detail.calendar.ramadanPeriods
    .filter((p) => p.end >= start && p.start <= end)
    .map((p) => {
      const from = p.start < start ? start : p.start;
      const to = p.end > end ? end : p.end;
      return { key: `r-${p.start}`, ...spanOf(start, from, to) };
    });
  const stoppageBands: StoppageBand[] = detail.stoppages
    .filter((s) => s.status !== "REJECTED")
    .flatMap((s) =>
      runs(s.dates.filter(inRange)).map((r) => ({
        key: `s-${s.id}-${r.from}`,
        status: s.status,
        stoppage: s,
        ...spanOf(start, r.from, r.to),
      })),
    );

  // ── Rows: a stage header, then its milestones ──
  const rows: GanttRow[] = [];
  let y = 0;
  const sortedStages = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
  const byStage = new Map<string, Milestone[]>();
  for (const m of [...milestones].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const list = byStage.get(m.stageId) ?? [];
    list.push(m);
    byStage.set(m.stageId, list);
  }
  for (const stage of sortedStages) {
    rows.push({
      kind: "stage",
      id: stage.id,
      stage,
      y,
      height: STAGE_ROW_H,
      bar: spanOf(start, stage.plannedStart, stage.plannedEnd),
    });
    y += STAGE_ROW_H;
    for (const m of byStage.get(stage.id) ?? []) {
      // Started work is drawn from its actual start (QA-A-18); finished work to its actual end.
      const barStart = m.actualStart ?? m.plannedStart;
      const barEnd = m.actualEnd ?? (m.plannedEnd < barStart ? barStart : m.plannedEnd);
      const bar = spanOf(start, barStart, barEnd);
      const workEnd = m.actualEnd ?? m.plannedEnd;
      rows.push({
        kind: "milestone",
        id: m.id,
        milestone: m,
        y,
        height: MILESTONE_ROW_H,
        bar,
        progressWidth: Math.round((bar.width * Math.min(100, Math.max(0, m.progressPercent))) / 100),
        baseline: m.baselineStart && m.baselineEnd ? spanOf(start, m.baselineStart, m.baselineEnd) : null,
        curing:
          m.curingUntil && m.curingDays > 0 && m.curingUntil > workEnd
            ? spanOf(start, addDays(workEnd, 1), m.curingUntil)
            : null,
        movable: isMovable(m),
      });
      y += MILESTONE_ROW_H;
    }
  }

  // ── Dependency arrows (FS from the end of the predecessor, SS from its start) ──
  const rowById = new Map(
    rows.filter((r): r is MilestoneRow => r.kind === "milestone").map((r) => [r.id, r]),
  );
  const arrows: Arrow[] = [];
  for (const row of rowById.values()) {
    for (const dep of row.milestone.dependsOn) {
      const from = rowById.get(dep.milestoneId);
      if (!from) continue;
      const x1 = dep.type === "SS" ? from.bar.x : from.bar.x + from.bar.width;
      const y1 = from.y + BAR_TOP + BAR_H / 2;
      const x2 = row.bar.x;
      const y2 = row.y + BAR_TOP + BAR_H / 2;
      const out = x1 + 6;
      const path =
        x2 - 4 >= out
          ? `M ${x1} ${y1} H ${out} V ${y2} H ${x2}`
          : `M ${x1} ${y1} H ${out} V ${row.y + 2} H ${x2 - 6} V ${y2} H ${x2}`;
      arrows.push({
        key: `${dep.milestoneId}-${row.id}`,
        fromId: dep.milestoneId,
        toId: row.id,
        type: dep.type,
        path,
      });
    }
  }

  return {
    start,
    end,
    days,
    width,
    height: y,
    weeks,
    months,
    todayX: inRange(detail.today) ? xOf(detail.today) + DAY_PX / 2 : null,
    shades,
    stoppageBands,
    ramadan,
    rows,
    arrows,
  };
}

/** Whole days a drag of `dx` pixels moves a bar. */
export const dragDays = (dx: number) => Math.round(dx / DAY_PX);
