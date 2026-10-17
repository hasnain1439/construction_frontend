import { describe, expect, it } from "vitest";
import { daysUntil, formatDate, formatDateRange, formatDateTime, formatMonth, isEndBeforeStart, todayPK } from "@/lib/dates";

describe("dates in Asia/Karachi", () => {
  it("formats calendar dates without shifting them", () => {
    expect(formatDate("2026-10-15")).toBe("15 Oct 2026");
    expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
  });

  it("formats timestamps in Pakistan time (UTC+5)", () => {
    // 21:30 UTC on the 14th is 02:30 on the 15th in Karachi.
    expect(formatDate("2026-10-14T21:30:00.000Z")).toBe("15 Oct 2026");
    expect(formatDateTime("2026-10-14T21:30:00.000Z")).toBe("15 Oct 2026, 2:30 am");
  });

  it("handles empty input", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not a date", "n/a")).toBe("n/a");
  });

  it("knows today's date in Pakistan", () => {
    expect(todayPK(new Date("2026-10-04T20:00:00.000Z"))).toBe("2026-10-05");
    expect(todayPK(new Date("2026-10-04T18:00:00.000Z"))).toBe("2026-10-04");
  });

  it("counts days until a date", () => {
    const now = new Date("2026-10-05T06:00:00.000Z");
    expect(daysUntil("2026-10-16", now)).toBe(11);
    expect(daysUntil("2026-10-16T17:42:53.471Z", now)).toBe(11);
    expect(daysUntil("2026-10-01", now)).toBe(-4);
  });

  it("formats month buckets and compares ranges", () => {
    expect(formatMonth("2026-09")).toBe("Sep 2026");
    expect(isEndBeforeStart("2026-03-15", "2026-03-14")).toBe(true);
    expect(isEndBeforeStart("2026-03-15", "2026-03-15")).toBe(false);
  });
});

describe("dates in right-to-left pages", () => {
  it("are wrapped in left-to-right isolates only while the page is RTL", () => {
    expect(formatDate("2026-10-08")).toBe("8 Oct 2026");
    document.documentElement.dir = "rtl";
    try {
      expect(formatDate("2026-10-08")).toBe("⁦8 Oct 2026⁩");
      expect(formatDate(null)).toBe("—");
    } finally {
      document.documentElement.dir = "ltr";
    }
  });
});

describe("date ranges (QA-C-12)", () => {
  it("in RTL the whole range is one left-to-right unit, start first", () => {
    expect(formatDateRange("2026-10-12", "2026-10-18")).toBe("12 Oct 2026 – 18 Oct 2026");
    document.documentElement.dir = "rtl";
    try {
      const range = formatDateRange("2026-10-12", "2026-10-18");
      expect(range.startsWith("⁦")).toBe(true);
      expect(range.endsWith("⁩")).toBe(true);
      expect(range.indexOf("12 Oct 2026")).toBeLessThan(range.indexOf("18 Oct 2026"));
      expect(formatDateRange("2026-10-12", null)).toContain("…");
    } finally {
      document.documentElement.dir = "ltr";
    }
  });
});
