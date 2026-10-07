"use client";

import { ChevronLeft, ChevronRight, ClipboardList, Images, Mic, NotebookPen } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetDailyLogQuery, useGetDailyLogsQuery } from "@/api/services/dailyLogs.api";
import type { DailyLog, DailyLogFile, SiteCondition } from "@/api/types";
import { AvatarName } from "@/components/common/AvatarName";
import { DateRangePicker, type DateRange } from "@/components/common/DateRangePicker";
import { EmptyState } from "@/components/common/EmptyState";
import { LateSyncBadge } from "@/components/common/LateSyncBadge";
import { MoneyText } from "@/components/common/MoneyText";
import { ErrorState } from "@/components/common/ErrorState";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { formatDate, formatDateTime, todayPK } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import { ROLE_LABEL } from "@/lib/options";
import { addDays } from "@/lib/weeks";

export const CONDITION_LABEL: Record<SiteCondition, { label: string; icon: string }> = {
  NORMAL: { label: "Normal", icon: "☀️" },
  RAIN: { label: "Rain", icon: "🌧️" },
  POWER_CUT: { label: "Power cut", icon: "🔌" },
  WATER_SHORTAGE: { label: "No water", icon: "🚱" },
  CURING: { label: "Curing", icon: "💧" },
  LABOUR_SHORT: { label: "Labour short", icon: "👷" },
  MATERIAL_SHORT: { label: "Material short", icon: "🧱" },
  OTHER: { label: "Other", icon: "•" },
};

/** Logs grouped by day, newest first. */
export function groupByDay(logs: DailyLog[]): Array<[string, DailyLog[]]> {
  const map = new Map<string, DailyLog[]>();
  for (const l of logs) map.set(l.logDate, [...(map.get(l.logDate) ?? []), l]);
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/** Project → Site → Daily Logs & Photos: what the munshi wrote each day, with photos and voice notes. */
export function DailyLogsView({ projectId }: { projectId: string }) {
  const today = todayPK();
  const [range, setRange] = useState<DateRange>({ from: addDays(today, -13), to: today });
  const logs = useGetDailyLogsQuery({
    projectId,
    from: range.from || undefined,
    to: range.to || undefined,
    limit: 100,
  });
  const [openLog, setOpenLog] = useState<string | null>(null);
  const [gallery, setGallery] = useState<{ photos: DailyLogFile[]; index: number } | null>(null);
  const groups = useMemo(() => groupByDay(logs.data?.items ?? []), [logs.data]);

  return (
    <ProjectPageShell
      projectId={projectId}
      crumb="Daily Logs & Photos"
      actions={() => <DateRangePicker value={range} onChange={setRange} label="Any date" />}
    >
      {() => (
        <>
          {logs.isLoading ? (
            <CardsSkeleton count={2} height="h-40" />
          ) : logs.error ? (
            <ErrorState error={logs.error} onRetry={logs.refetch} />
          ) : groups.length === 0 ? (
            <SectionCard>
              <EmptyState
                icon={NotebookPen}
                title="No daily logs in these dates"
                description="The munshi writes the daily log from the phone app — conditions, work done, photos and a voice note."
              />
            </SectionCard>
          ) : (
            groups.map(([day, entries]) => (
              <SectionCard
                key={day}
                title={formatDate(day)}
                description={`${entries.length} log${entries.length > 1 ? "s" : ""}`}
                flush
              >
                <ul className="divide-y">
                  {entries.map((log) => (
                    <DailyLogItem
                      key={log.id}
                      log={log}
                      onSummary={() => setOpenLog(log.id)}
                      onPhoto={(index) => setGallery({ photos: log.photos, index })}
                    />
                  ))}
                </ul>
              </SectionCard>
            ))
          )}
          <DaySummarySlideOver logId={openLog} onClose={() => setOpenLog(null)} />
          <PhotoLightbox gallery={gallery} onChange={setGallery} />
        </>
      )}
    </ProjectPageShell>
  );
}

function DailyLogItem({
  log,
  onSummary,
  onPhoto,
}: {
  log: DailyLog;
  onSummary: () => void;
  onPhoto: (index: number) => void;
}) {
  return (
    <li className="space-y-3 px-5 py-4" data-testid={`log-${log.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AvatarName
          name={log.author.name}
          subtitle={`${ROLE_LABEL[log.author.role]} · ${formatDateTime(log.updatedAt)}`}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {log.lateSync ? <LateSyncBadge /> : null}
          <Button size="sm" variant="outline" onClick={onSummary}>
            <ClipboardList data-icon="inline-start" />
            Day summary
          </Button>
        </div>
      </div>
      {log.conditions.length ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Site conditions">
          {log.conditions.map((c) => (
            <StatusBadge
              key={c}
              tone={c === "NORMAL" ? "success" : "warning"}
              label={`${CONDITION_LABEL[c].icon} ${CONDITION_LABEL[c].label}`}
            />
          ))}
        </div>
      ) : null}
      {log.workDone ? <p className="text-sm whitespace-pre-line">{log.workDone}</p> : null}
      {log.note ? <p className="text-sm whitespace-pre-line text-muted-foreground">{log.note}</p> : null}
      {log.photos.length ? (
        <div className="flex flex-wrap gap-2" aria-label="Photos">
          {log.photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPhoto(i)}
              className="size-24 overflow-hidden rounded-lg border bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={`Open photo ${i + 1} of ${log.photos.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived storage URLs */}
              <img src={p.thumbUrl ?? p.url} alt="" className="size-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
      {log.voiceNotes.length ? (
        <div className="space-y-2" aria-label="Voice notes">
          {log.voiceNotes.map((v, i) => (
            <div key={v.id} className="flex items-center gap-2">
              <Mic className="size-4 text-muted-foreground" aria-hidden />
              <audio
                controls
                preload="none"
                src={v.url}
                className="h-9 max-w-full"
                aria-label={`Voice note ${i + 1}`}
              />
            </div>
          ))}
        </div>
      ) : null}
      {log.deviceCreatedAt && log.lateSync ? (
        <p className="text-xs text-muted-foreground">
          Written on the phone {formatDateTime(log.deviceCreatedAt)} · reached the office{" "}
          {formatDateTime(log.createdAt)}
        </p>
      ) : null}
    </li>
  );
}

function DaySummarySlideOver({ logId, onClose }: { logId: string | null; onClose: () => void }) {
  const detail = useGetDailyLogQuery(logId ?? "", { skip: !logId });
  const d = detail.data;
  return (
    <SlideOver
      open={Boolean(logId)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={d ? `Day summary · ${formatDate(d.logDate)}` : "Day summary"}
      description={d?.project.name}
    >
      {detail.isFetching && !d ? (
        <CardsSkeleton count={3} height="h-20" />
      ) : d ? (
        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Hazri</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Present" value={d.summary.hazri.present} />
              <Stat label="Half day" value={d.summary.hazri.half} />
              <Stat label="Absent" value={d.summary.hazri.absent} />
            </div>
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Material used</h3>
            {d.summary.usage.length ? (
              <ul className="divide-y rounded-lg border text-sm">
                {d.summary.usage.map((u) => (
                  <li key={u.material.id} className="flex justify-between px-3 py-2">
                    <span>{u.material.name}</span>
                    <span className="tabular font-medium">{formatQty(u.quantity, u.material.unit)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No usage recorded this day.</p>
            )}
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              Kharcha {d.summary.kharcha.scope === "MINE" ? "(mine)" : ""}
            </h3>
            <p className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">{d.summary.kharcha.entries} entries</span>
              <MoneyText paisa={d.summary.kharcha.totalPaisa} />
            </p>
          </section>
          {d.photos.length ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Images className="size-3.5" aria-hidden /> {d.photos.length} photo
              {d.photos.length > 1 ? "s" : ""} · {d.voiceNotes.length} voice note
              {d.voiceNotes.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
      ) : detail.error ? (
        <ErrorState error={detail.error} onRetry={detail.refetch} />
      ) : null}
    </SlideOver>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border px-2 py-3">
      <p className="tabular text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PhotoLightbox({
  gallery,
  onChange,
}: {
  gallery: { photos: DailyLogFile[]; index: number } | null;
  onChange: (g: { photos: DailyLogFile[]; index: number } | null) => void;
}) {
  const photo = gallery ? gallery.photos[gallery.index] : undefined;
  const step = (by: number) =>
    gallery &&
    onChange({ ...gallery, index: (gallery.index + by + gallery.photos.length) % gallery.photos.length });
  return (
    <Dialog open={Boolean(photo)} onOpenChange={(o) => (!o ? onChange(null) : undefined)}>
      <DialogContent className="max-w-3xl p-2">
        <DialogTitle className="sr-only">Site photo</DialogTitle>
        {photo ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived storage URLs */}
            <img
              src={photo.url}
              alt={`Site photo ${gallery!.index + 1}`}
              className="max-h-[80vh] w-full rounded-md object-contain"
            />
            {gallery!.photos.length > 1 ? (
              <div className="absolute inset-x-2 top-1/2 flex -translate-y-1/2 justify-between">
                <Button size="icon" variant="secondary" aria-label="Previous photo" onClick={() => step(-1)}>
                  <ChevronLeft />
                </Button>
                <Button size="icon" variant="secondary" aria-label="Next photo" onClick={() => step(1)}>
                  <ChevronRight />
                </Button>
              </div>
            ) : null}
            <p className="pt-2 text-center text-xs text-muted-foreground">
              {gallery!.index + 1} / {gallery!.photos.length}
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
