import type { ApiMeta } from "@/api/baseQuery";
import type { PageMeta, Paginated } from "@/api/types";

const EMPTY_PAGE: PageMeta = { page: 1, limit: 25, total: 0, totalPages: 1 };

/** `transformResponse` for paginated lists: rows + the backend `meta` block. */
export function toPage<T, M extends object = object>(data: unknown, meta: ApiMeta | undefined): Paginated<T, M> {
  const items = (Array.isArray(data) ? data : []) as T[];
  return {
    items,
    meta: { ...EMPTY_PAGE, total: items.length, ...(meta?.page ?? {}) } as PageMeta & M,
  };
}

/** Drops empty-string / undefined / null query values so they are not sent as `?x=`. */
export function cleanParams<T extends object>(params: T | undefined): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value as string | number | boolean;
  }
  return out;
}
