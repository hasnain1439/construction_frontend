"use client";

import { useCallback, useMemo } from "react";
import { useGetWorkerTypesQuery } from "@/api/services/masterData.api";
import type { WorkerTypeRow } from "@/api/types";
import type { SelectOption } from "@/components/forms/SelectField";
import { useLanguage, useT } from "@/i18n/useT";
import { OTHER_WORKER_TYPE, pickTypeName, workerTypeName, type TypeNames } from "@/lib/workerTypes";

/** Every worker type of the company (active and deactivated) — one cached list shared by all screens. */
export function useAllWorkerTypes(options: { skip?: boolean } = {}) {
  return useGetWorkerTypesQuery({ includeInactive: true }, { skip: options.skip });
}

/**
 * `const typeName = useWorkerTypeName(); typeName(worker.type, namesFromWorker(worker))` — the type's
 * name in the current UI language. Works for responses without names (team, attendance) too.
 */
export function useWorkerTypeName() {
  const language = useLanguage();
  const t = useT();
  const { data } = useAllWorkerTypes();
  const types = useMemo(() => new Map<string, TypeNames>((data ?? []).map((row) => [row.key, row])), [data]);
  const otherName = t("workerTypes.other");
  return useCallback(
    (key: string | null | undefined, names?: TypeNames | null) => (key ? workerTypeName(key, language, { types, names, otherName }) : "—"),
    [language, types, otherName],
  );
}

/**
 * Options for a worker's Type select: the ACTIVE types, plus the worker's current type when it has
 * been deactivated since (so editing keeps it), plus "Other". `all` also lists deactivated types (filters).
 */
export function useWorkerTypeOptions({ current, all = false }: { current?: string | null; all?: boolean } = {}) {
  const language = useLanguage();
  const t = useT();
  const query = useAllWorkerTypes();
  const rows = query.data;
  const options = useMemo<SelectOption[]>(() => {
    const list = (rows ?? [])
      .filter((row) => all || row.isActive || row.key === current)
      .map((row) => {
        const name = pickTypeName(row, language);
        return { value: row.key, label: row.isActive ? name : t("workerTypes.inactiveOption", { name }) };
      });
    return [...list, { value: OTHER_WORKER_TYPE, label: t("workerTypes.other") }];
  }, [rows, all, current, language, t]);
  const byKey = useMemo(() => new Map<string, WorkerTypeRow>((rows ?? []).map((row) => [row.key, row])), [rows]);
  return { options, byKey, isLoading: query.isLoading };
}
