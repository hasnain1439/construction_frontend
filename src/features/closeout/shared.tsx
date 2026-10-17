"use client";

import { useState } from "react";
import type { CloseoutPhoto, ProjectStatus, SnagCostAttribution, SnagStatus } from "@/api/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PhotoLightbox } from "@/features/site/DailyLogsView";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import type { StatusTone } from "@/lib/status";

/** Drawings can change while the project runs and until it is handed over (mirrors the API). */
export const DRAWING_EDIT_STATUSES: ProjectStatus[] = ["ACTIVE", "CLOSEOUT", "HANDED_OVER"];
/** Snags: logged / changed in ACTIVE, CLOSEOUT and the defect period (HANDED_OVER). */
export const SNAG_EDIT_STATUSES: ProjectStatus[] = ["ACTIVE", "CLOSEOUT", "HANDED_OVER"];
/** The handover checklist and sign-off can change while ACTIVE / CLOSEOUT. */
export const HANDOVER_EDIT_STATUSES: ProjectStatus[] = ["ACTIVE", "CLOSEOUT"];
/** Retention is invoiced / followed up in CLOSEOUT and after the handover (mirrors the API's canInvoice). */
export const RETENTION_EDIT_STATUSES: ProjectStatus[] = ["CLOSEOUT", "HANDED_OVER"];

const SNAG_TONE: Record<SnagStatus, StatusTone> = { OPEN: "warning", FIXED: "info", VERIFIED: "success" };

export function SnagStatusBadge({ status }: { status: SnagStatus }) {
  const t = useT();
  return <StatusBadge tone={SNAG_TONE[status]} label={t(`closeout.snagStatus.${status}`)} />;
}

const COST_TONE: Record<SnagCostAttribution, StatusTone> = { NONE: "neutral", REWORK: "danger", SUBCONTRACTOR_DEDUCTION: "warning", CHANGE_ORDER: "info" };

export function CostBadge({ attribution }: { attribution: SnagCostAttribution }) {
  const t = useT();
  return <StatusBadge tone={COST_TONE[attribution]} label={t(`closeout.attribution.${attribution}`)} />;
}

/** Thumbnails that open a lightbox (signed, short-lived links). */
export function PhotoStrip({ photos, size = "md", label }: { photos: CloseoutPhoto[]; size?: "sm" | "md"; label: string }) {
  const t = useT();
  const [index, setIndex] = useState<number | null>(null);
  if (!photos.length) return <p className="text-sm text-muted-foreground">{t("closeout.snags.noPhotos")}</p>;
  return (
    <div className="flex flex-wrap gap-2" aria-label={label}>
      {photos.map((p, i) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setIndex(i)}
          className={cn(
            "overflow-hidden rounded-lg border bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            size === "sm" ? "size-12" : "size-24",
          )}
          aria-label={t("closeout.snags.openPhoto", { n: i + 1 })}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived storage URLs */}
          <img src={p.thumbUrl || p.url} alt="" className="size-full object-cover" loading="lazy" />
        </button>
      ))}
      <PhotoLightbox gallery={index === null ? null : { photos, index }} onChange={(g) => setIndex(g ? g.index : null)} />
    </div>
  );
}
