"use client";

import type { ReactNode } from "react";
import { useGetProjectsQuery } from "@/api/services/projects.api";
import { useT } from "@/i18n/useT";
import { DateRangePicker, type DateRange } from "./DateRangePicker";
import { FilterBar, FilterSelect } from "./FilterBar";

export interface ReportFilters {
  projectId: string;
  from: string;
  to: string;
}

export const EMPTY_REPORT_FILTERS: ReportFilters = { projectId: "", from: "", to: "" };

/** Non-empty filters only, ready for the API. */
export function reportParams(f: ReportFilters): { projectId?: string; from?: string; to?: string } {
  return { ...(f.projectId ? { projectId: f.projectId } : {}), ...(f.from ? { from: f.from } : {}), ...(f.to ? { to: f.to } : {}) };
}

/**
 * Filters shared by the report, finance and dashboard pages: project (the caller's projects,
 * drafts left out), an optional date range, extra controls, and Clear.
 */
export function ReportFilterBar({
  value,
  onChange,
  showProject = true,
  showDates = true,
  dateLabel,
  children,
  trailing,
}: {
  value: ReportFilters;
  onChange: (value: ReportFilters) => void;
  showProject?: boolean;
  showDates?: boolean;
  dateLabel?: string;
  children?: ReactNode;
  trailing?: ReactNode;
}) {
  const t = useT();
  const projects = useGetProjectsQuery({ limit: 100 }, { skip: !showProject });
  const options = (projects.data?.items ?? []).filter((p) => p.status !== "DRAFT").map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }));
  const range: DateRange = { from: value.from, to: value.to };
  return (
    <FilterBar onClear={() => onChange(EMPTY_REPORT_FILTERS)} canClear={Boolean(value.projectId || value.from || value.to)} trailing={trailing}>
      {showProject ? <FilterSelect label={t("common.project")} value={value.projectId} onChange={(projectId) => onChange({ ...value, projectId })} options={options} allLabel={t("shell.allProjects")} /> : null}
      {showDates ? <DateRangePicker value={range} onChange={(r) => onChange({ ...value, from: r.from, to: r.to })} label={dateLabel ?? t("common.anyDate")} /> : null}
      {children}
    </FilterBar>
  );
}
