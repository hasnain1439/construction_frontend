/**
 * Settlement weeks. Dates are calendar strings ("YYYY-MM-DD") worked on in UTC so a
 * date never shifts with the browser's time zone.
 */
import { todayPK } from "./dates";

export const WEEKDAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
export type WeekDayName = (typeof WEEKDAYS)[number];

const DAY_MS = 86_400_000;
const parse = (date: string) => Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
const format = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (date: string, days: number) => format(parse(date) + days * DAY_MS);
export const weekdayOf = (date: string): WeekDayName => WEEKDAYS[new Date(parse(date)).getUTCDay()]!;

/** First day of the week that contains `date`. */
export function weekStartOf(date: string, startDay: WeekDayName = "MONDAY"): string {
  const shift = (WEEKDAYS.indexOf(weekdayOf(date)) - WEEKDAYS.indexOf(startDay) + 7) % 7;
  return addDays(date, -shift);
}

export const currentWeekStart = (startDay: WeekDayName = "MONDAY", now = new Date()) => weekStartOf(todayPK(now), startDay);

/** The 7 dates of a week. */
export const weekDates = (weekStart: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

const SHORT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const LONG = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const DOW = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

/** "21 – 27 Sep 2026" (or "28 Sep – 4 Oct 2026"). */
export function formatWeekRange(weekStart: string, days = 7): string {
  const end = addDays(weekStart, days - 1);
  const sameMonth = weekStart.slice(0, 7) === end.slice(0, 7);
  const from = sameMonth ? String(Number(weekStart.slice(8, 10))) : SHORT.format(parse(weekStart));
  return `${from} – ${LONG.format(parse(end))}`;
}

/** "Mon 21" */
export const formatDayHeader = (date: string) => `${DOW.format(parse(date))} ${Number(date.slice(8, 10))}`;
export const formatShortDate = (date: string) => SHORT.format(parse(date));
