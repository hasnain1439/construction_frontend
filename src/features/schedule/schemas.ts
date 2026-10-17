import { z } from "zod";
import type { Milestone, MilestoneStatus, StoppageReason } from "@/api/types";
import { msg } from "@/i18n/message";
import { addDays } from "@/lib/weeks";
import { diffDays } from "./gantt/ganttModel";

/** Status changes a milestone may make from the site (the API has the final say: 409 INVALID_STATUS_CHANGE). */
export function nextStatuses(m: Pick<Milestone, "status" | "curingDays">): MilestoneStatus[] {
  switch (m.status) {
    case "PLANNED":
      return ["IN_PROGRESS", "BLOCKED"];
    case "IN_PROGRESS":
      return [...(m.curingDays > 0 ? (["CURING"] as const) : []), "DONE", "BLOCKED"];
    case "CURING":
      return ["DONE"];
    case "BLOCKED":
      return ["PLANNED", "IN_PROGRESS"];
    default:
      return [];
  }
}

/** Site progress: progress % and / or a status; BLOCKED needs a note. */
export function progressSchema(current: Pick<Milestone, "progressPercent">, today: string) {
  return z
    .object({
      progressPercent: z.number().nullable(),
      status: z.string(),
      date: z.string(),
      note: z.string().trim().max(500),
    })
    .superRefine((v, ctx) => {
      if (v.progressPercent !== null && (v.progressPercent < 0 || v.progressPercent > 100)) {
        ctx.addIssue({
          code: "custom",
          path: ["progressPercent"],
          message: msg("schedule.progress.percentRange"),
        });
      }
      const progressChanged = v.progressPercent !== null && v.progressPercent !== current.progressPercent;
      if (!progressChanged && !v.status) {
        ctx.addIssue({
          code: "custom",
          path: ["progressPercent"],
          message: msg("schedule.progress.nothingChanged"),
        });
      }
      if (v.status === "BLOCKED" && !v.note) {
        ctx.addIssue({ code: "custom", path: ["note"], message: msg("schedule.progress.noteRequired") });
      }
      if (!v.date) ctx.addIssue({ code: "custom", path: ["date"], message: msg("validation.dateRequired") });
      else if (v.date > today)
        ctx.addIssue({ code: "custom", path: ["date"], message: msg("schedule.progress.vFuture") });
    });
}
export type ProgressValues = z.input<ReturnType<typeof progressSchema>>;

/** The photo is required for every reason except HOLIDAY. */
export const photoRequired = (reason: StoppageReason | null | undefined) =>
  Boolean(reason) && reason !== "HOLIDAY";
/** A note is required for OTHER. */
export const noteRequired = (reason: StoppageReason | null | undefined) => reason === "OTHER";

const uploaded = z.object({
  id: z.string(),
  url: z.string().nullable(),
  fileName: z.string(),
  mimeType: z.string(),
});

/** Log a stoppage: a from–to range or separate days (1–31, at most 60 days ahead). */
export function stoppageSchema(today: string) {
  return z
    .object({
      mode: z.enum(["range", "list"]),
      from: z.string(),
      to: z.string(),
      dates: z.array(z.string()),
      reason: z
        .enum(["RAIN", "SMOG_BAN", "HOLIDAY", "OWNER_HOLD", "MATERIAL_SHORT", "LABOUR_SHORT", "OTHER"])
        .nullable(),
      photo: uploaded.nullable(),
      note: z.string().trim().max(500),
    })
    .superRefine((v, ctx) => {
      const limit = addDays(today, 60);
      if (v.mode === "range") {
        if (!v.from)
          ctx.addIssue({
            code: "custom",
            path: ["from"],
            message: msg("validation.required", { label: "schedule.log.from" }),
          });
        if (!v.to)
          ctx.addIssue({
            code: "custom",
            path: ["to"],
            message: msg("validation.required", { label: "schedule.log.to" }),
          });
        if (v.from && v.to) {
          if (v.to < v.from)
            ctx.addIssue({ code: "custom", path: ["to"], message: msg("schedule.log.vToBeforeFrom") });
          else if (diffDays(v.from, v.to) + 1 > 31)
            ctx.addIssue({ code: "custom", path: ["to"], message: msg("schedule.log.vTooMany") });
          else if (v.to > limit)
            ctx.addIssue({ code: "custom", path: ["to"], message: msg("schedule.log.vTooFar") });
        }
      } else if (v.dates.length === 0) {
        ctx.addIssue({ code: "custom", path: ["dates"], message: msg("schedule.log.vNoDays") });
      } else if (v.dates.length > 31) {
        ctx.addIssue({ code: "custom", path: ["dates"], message: msg("schedule.log.vTooMany") });
      } else if (v.dates.some((d) => d > limit)) {
        ctx.addIssue({ code: "custom", path: ["dates"], message: msg("schedule.log.vTooFar") });
      }
      if (!v.reason)
        ctx.addIssue({
          code: "custom",
          path: ["reason"],
          message: msg("validation.required", { label: "schedule.log.reason" }),
        });
      if (photoRequired(v.reason) && !v.photo)
        ctx.addIssue({ code: "custom", path: ["photo"], message: msg("schedule.log.vPhoto") });
      if (noteRequired(v.reason) && !v.note)
        ctx.addIssue({ code: "custom", path: ["note"], message: msg("schedule.log.vNote") });
    });
}
export type StoppageValues = z.input<ReturnType<typeof stoppageSchema>>;
export type StoppageOutput = z.output<ReturnType<typeof stoppageSchema>>;

/** Company Ramadan settings: day factor 0.25–1 and the periods (or the built-in dates). */
export const ramadanSchema = z
  .object({
    ramadanDayFactor: z.number().nullable(),
    builtIn: z.boolean(),
    periods: z.array(z.object({ start: z.string(), end: z.string() })),
  })
  .superRefine((v, ctx) => {
    if (v.ramadanDayFactor === null || v.ramadanDayFactor < 0.25 || v.ramadanDayFactor > 1) {
      ctx.addIssue({ code: "custom", path: ["ramadanDayFactor"], message: msg("schedule.ramadan.vFactor") });
    }
    if (v.builtIn) return;
    if (v.periods.length === 0)
      ctx.addIssue({ code: "custom", path: ["periods"], message: msg("schedule.ramadan.vNone") });
    v.periods.forEach((p, i) => {
      if (!p.start || !p.end)
        ctx.addIssue({
          code: "custom",
          path: ["periods", i, "end"],
          message: msg("schedule.ramadan.vDates"),
        });
      else if (p.end < p.start)
        ctx.addIssue({
          code: "custom",
          path: ["periods", i, "end"],
          message: msg("schedule.ramadan.vEndBefore"),
        });
    });
  });
export type RamadanValues = z.input<typeof ramadanSchema>;
