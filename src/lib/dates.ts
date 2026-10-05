/**
 * Dates are shown in Pakistan time. The API sends timestamps in UTC (ISO) and calendar
 * dates as "YYYY-MM-DD" (no time zone — never shifted).
 */
import { addDays, differenceInCalendarDays, formatDistanceToNowStrict, parseISO } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export const TIME_ZONE = "Asia/Karachi";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

type DateInput = string | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : parseISO(DATE_ONLY.test(value) ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Calendar dates are formatted in UTC so "2026-10-15" stays the 15th everywhere. */
const zoneFor = (value: DateInput) => (typeof value === "string" && DATE_ONLY.test(value) ? "UTC" : TIME_ZONE);

/** "15 Oct 2026" */
export function formatDate(value: DateInput, fallback = "—"): string {
  const date = toDate(value);
  return date ? formatInTimeZone(date, zoneFor(value), "d MMM yyyy") : fallback;
}

/** "15 Oct 2026, 2:30 pm" (Pakistan time). */
export function formatDateTime(value: DateInput, fallback = "—"): string {
  const date = toDate(value);
  return date ? formatInTimeZone(date, zoneFor(value), "d MMM yyyy, h:mm aaa") : fallback;
}

/** "Oct 2026" — for month buckets such as "2026-09". */
export function formatMonth(value: string): string {
  const date = toDate(/^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value);
  return date ? formatInTimeZone(date, "UTC", "MMM yyyy") : value;
}

/** "3 days ago" / "in 2 hours". */
export function formatRelative(value: DateInput, fallback = "—"): string {
  const date = toDate(value);
  return date ? formatDistanceToNowStrict(date, { addSuffix: true }) : fallback;
}

/** Today's calendar date in Pakistan: "2026-10-05". */
export function todayPK(now: Date = new Date()): string {
  return formatInTimeZone(now, TIME_ZONE, "yyyy-MM-dd");
}

/** Pakistan calendar date `days` from today. */
export function datePlusDays(days: number, now: Date = new Date()): string {
  return formatInTimeZone(addDays(toZonedTime(now, TIME_ZONE), days), "UTC", "yyyy-MM-dd");
}

/** Whole calendar days from today (PK) until `value`; negative when past. */
export function daysUntil(value: DateInput, now: Date = new Date()): number | null {
  const date = toDate(value);
  if (!date) return null;
  const target = parseISO(`${formatInTimeZone(date, zoneFor(value), "yyyy-MM-dd")}T00:00:00Z`);
  const today = parseISO(`${todayPK(now)}T00:00:00Z`);
  return differenceInCalendarDays(target, today);
}

/** True when `end` is before `start` (both "YYYY-MM-DD"). */
export function isEndBeforeStart(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  return end < start;
}

export const isIsoDate = (value: string) => DATE_ONLY.test(value);
