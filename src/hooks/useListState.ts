"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Page / page size / search / filters for a server-paginated list. Any filter change
 * goes back to page 1. `query` is ready to pass to an RTK Query list hook.
 */
export function useListState<F extends Record<string, string>>(initialFilters: F, initialPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [search, setSearchState] = useState("");
  const [filters, setFilters] = useState<F>(initialFilters);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPage(1);
  }, []);

  const setFilter = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const clear = useCallback(() => {
    setFilters(initialFilters);
    setSearchState("");
    setPage(1);
  }, [initialFilters]);

  const isFiltered = search !== "" || Object.entries(filters).some(([k, v]) => v !== initialFilters[k]);

  const query = useMemo(
    () => ({ page, limit: pageSize, ...(search ? { search } : {}), ...filters }),
    [page, pageSize, search, filters],
  );

  return { page, setPage, pageSize, setPageSize, search, setSearch, filters, setFilter, clear, isFiltered, query };
}
