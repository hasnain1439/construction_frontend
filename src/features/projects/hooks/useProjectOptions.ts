"use client";

import { useMemo } from "react";
import { useGetProjectsQuery } from "@/api/services/projects.api";
import type { ProjectStatus } from "@/api/types";
import type { ComboboxOption } from "@/components/forms/ComboboxField";

/** Projects the user can see, as select options (first 100, newest first). */
export function useProjectOptions(options: { status?: ProjectStatus; skip?: boolean } = {}) {
  const query = useGetProjectsQuery({ limit: 100, ...(options.status ? { status: options.status } : {}) }, { skip: options.skip });
  const items = query.data?.items;
  const projectOptions = useMemo<ComboboxOption[]>(
    () => (items ?? []).map((p) => ({ value: p.id, label: p.name, description: `${p.code}${p.city ? ` · ${p.city}` : ""}` })),
    [items],
  );
  return { options: projectOptions, projects: items ?? [], isLoading: query.isLoading };
}
