"use client";

import { useRef, type KeyboardEvent } from "react";
import { StepperInput } from "@/components/forms/StepperInput";
import { cn } from "@/lib/cn";
import { formatDayHeader, weekdayOf, type WeekDayName } from "@/lib/weeks";

export type HazriStatus = "FULL" | "HALF" | "ABSENT";

export interface HazriMark {
  status: HazriStatus;
  overtimeHours: number;
}

export interface AttendanceGridRow {
  /** Worker id */
  id: string;
  name: string;
  /** e.g. "Mistri · Rs 2,800" */
  subtitle?: string;
  days: Record<string, HazriMark | undefined>;
}

/** Unmarked → FULL → HALF → ABSENT → FULL … */
export function nextStatus(current: HazriStatus | undefined): HazriStatus {
  return current === "FULL" ? "HALF" : current === "HALF" ? "ABSENT" : "FULL";
}

export function daysWorked(days: Record<string, HazriMark | undefined>) {
  return Object.values(days).reduce((sum, d) => sum + (d?.status === "FULL" ? 1 : d?.status === "HALF" ? 0.5 : 0), 0);
}

const CELL: Record<HazriStatus | "NONE", { text: string; label: string; className: string }> = {
  FULL: { text: "P", label: "Full day", className: "bg-success-soft text-success border-success/30" },
  HALF: { text: "½", label: "Half day", className: "bg-warning-soft text-warning border-warning/30" },
  ABSENT: { text: "A", label: "Absent", className: "bg-danger-soft text-danger border-danger/30" },
  NONE: { text: "–", label: "Not marked", className: "bg-card text-muted-foreground border-dashed" },
};

const KEY_STATUS: Record<string, HazriStatus> = { f: "FULL", p: "FULL", h: "HALF", a: "ABSENT" };

/**
 * Hazri register. Rows = workers, columns = days. Click / Space / Enter cycles a cell
 * (full → half → absent); F/P, H, A set it directly; arrow keys move. In overtime mode
 * each marked cell gets a − / + stepper. Totals per worker on the right, per day below.
 */
export function AttendanceGrid({
  dates,
  rows,
  onChange,
  canEdit = () => true,
  overtimeMode,
  workingDays,
  today,
  className,
}: {
  dates: string[];
  rows: AttendanceGridRow[];
  /** Omit for a read-only register. */
  onChange?: (workerId: string, date: string, mark: HazriMark) => void;
  /** Per day: false for future / locked days. */
  canEdit?: (date: string) => boolean;
  overtimeMode?: boolean;
  workingDays?: WeekDayName[];
  today?: string;
  className?: string;
}) {
  const cells = useRef(new Map<string, HTMLButtonElement | null>());
  const editable = (date: string) => !!onChange && canEdit(date);

  const focusCell = (r: number, c: number) => {
    const row = Math.max(0, Math.min(rows.length - 1, r));
    const col = Math.max(0, Math.min(dates.length - 1, c));
    cells.current.get(`${row}:${col}`)?.focus();
  };

  const set = (row: AttendanceGridRow, date: string, status: HazriStatus) => {
    const before = row.days[date];
    onChange?.(row.id, date, { status, overtimeHours: status === "ABSENT" ? 0 : (before?.overtimeHours ?? 0) });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, r: number, c: number) => {
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      focusCell(r + move[0], c + move[1]);
      return;
    }
    const status = KEY_STATUS[e.key.toLowerCase()];
    if (status && editable(dates[c]!)) {
      e.preventDefault();
      set(rows[r]!, dates[c]!, status);
    }
  };

  const dayTotal = (date: string) => rows.filter((r) => r.days[date]?.status === "FULL" || r.days[date]?.status === "HALF").length;

  return (
    <div className={cn("max-h-[70dvh] overflow-auto overscroll-x-contain rounded-xl border bg-card scrollbar-slim", className)}>
      <table className="w-full border-separate border-spacing-0 text-sm" aria-label="Hazri register">
        <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur">
          <tr>
            <th scope="col" className="sticky left-0 z-30 min-w-40 border-b bg-muted px-3 py-2 text-left font-medium">
              Worker
            </th>
            {dates.map((d) => {
              const off = workingDays ? !workingDays.includes(weekdayOf(d)) : false;
              return (
                <th
                  key={d}
                  scope="col"
                  className={cn("min-w-14 border-b px-1 py-2 text-center text-xs font-medium whitespace-nowrap", off && "text-muted-foreground", d === today && "text-primary")}
                >
                  {formatDayHeader(d)}
                  {d === today ? <span className="block text-[10px] font-normal">Today</span> : null}
                </th>
              );
            })}
            <th scope="col" className="min-w-16 border-b px-2 py-2 text-right text-xs font-medium">
              Days
            </th>
            <th scope="col" className="min-w-14 border-b px-2 py-2 text-right text-xs font-medium">
              OT h
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => {
            const ot = Object.values(row.days).reduce((s, d) => s + (d?.overtimeHours ?? 0), 0);
            return (
              <tr key={row.id} className="group">
                <th scope="row" className="sticky left-0 z-10 border-b bg-card px-3 py-2 text-left font-normal group-hover:bg-muted/40">
                  <span className="block font-medium">{row.name}</span>
                  {row.subtitle ? <span className="block text-xs text-muted-foreground">{row.subtitle}</span> : null}
                </th>
                {dates.map((date, c) => {
                  const mark = row.days[date];
                  const meta = CELL[mark?.status ?? "NONE"];
                  const canChange = editable(date);
                  return (
                    <td key={date} className="border-b px-1 py-1.5 text-center align-middle">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          ref={(el) => {
                            cells.current.set(`${r}:${c}`, el);
                          }}
                          aria-label={`${row.name}, ${formatDayHeader(date)}: ${meta.label}`}
                          aria-disabled={!canChange || undefined}
                          onClick={() => (canChange ? set(row, date, nextStatus(mark?.status)) : undefined)}
                          onKeyDown={(e) => onKeyDown(e, r, c)}
                          className={cn(
                            "flex size-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                            meta.className,
                            canChange ? "cursor-pointer hover:brightness-95" : "cursor-default opacity-80",
                          )}
                        >
                          {meta.text}
                        </button>
                        {overtimeMode && mark && mark.status !== "ABSENT" && canChange ? (
                          <StepperInput
                            size="sm"
                            step={0.5}
                            max={12}
                            value={mark.overtimeHours}
                            onChange={(v) => onChange?.(row.id, date, { ...mark, overtimeHours: v })}
                            aria-label={`overtime ${row.name} ${formatDayHeader(date)}`}
                          />
                        ) : mark?.overtimeHours ? (
                          <span className="text-[10px] font-medium text-primary tabular">+{mark.overtimeHours}h</span>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
                <td className="border-b px-2 py-2 text-right font-medium tabular" data-testid={`days-${row.id}`}>
                  {daysWorked(row.days)}
                </td>
                <td className="border-b px-2 py-2 text-right tabular text-muted-foreground">{ot || "–"}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="sticky bottom-0 z-20 bg-muted/95 backdrop-blur">
          <tr>
            <th scope="row" className="sticky left-0 z-30 bg-muted px-3 py-2 text-left text-xs font-medium">
              On site
            </th>
            {dates.map((d) => (
              <td key={d} className="px-1 py-2 text-center text-xs font-medium tabular">
                {dayTotal(d)}
              </td>
            ))}
            <td className="px-2 py-2 text-right text-xs font-semibold tabular">{rows.reduce((s, r) => s + daysWorked(r.days), 0)}</td>
            <td className="px-2 py-2 text-right text-xs tabular">
              {rows.reduce((s, r) => s + Object.values(r.days).reduce((x, d) => x + (d?.overtimeHours ?? 0), 0), 0) || "–"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
