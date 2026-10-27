"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Fragment, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScrollEdges } from "@/hooks/useScrollEdges";
import { cn } from "@/lib/cn";
import { EmptyState, type EmptyStateProps } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { Pagination } from "./Pagination";
import { TableSkeleton } from "./TableSkeleton";

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Enables sorting on this column. */
  sortValue?: (row: T) => string | number | null | undefined;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
  hidden?: boolean;
}

export interface ServerPagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export interface DataTableProps<T> {
  rows: T[] | undefined;
  columns: Column<T>[];
  getRowId: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty: EmptyStateProps;
  onRowClick?: (row: T) => void;
  /** Server-side pagination; omit for client-side pagination of `rows`. */
  pagination?: ServerPagination;
  /** Client-side page size (ignored with server pagination). 0 disables paging. */
  clientPageSize?: number;
  defaultSort?: { id: string; direction: SortDirection };
  rowClassName?: (row: T) => string | undefined;
  caption?: string;
  className?: string;
  /** Cap the table's height: rows scroll inside the card and the header row stays visible. */
  maxHeight?: keyof typeof maxHeightClass;
  /**
   * "cards" lists each row as a card — the first column as its title, the others as label / value
   * pairs — for phones (QA R-02; pair with `useListView`). Sorting and paging stay the same.
   */
  view?: "table" | "cards";
}

/** Literal classes (Tailwind can't see computed ones): height cap on the scroll container + sticky header. */
const maxHeightClass = {
  sm: "[&_[data-slot=table-container]]:max-h-80",
  md: "[&_[data-slot=table-container]]:max-h-[28rem]",
} as const;
const scrollClass =
  "[&_[data-slot=table-container]]:overflow-y-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead_tr]:bg-muted [&_thead_tr]:hover:bg-muted";

/**
 * `className` for wide tables (8+ columns, QA-B-30): small text, tight cell padding, headers that wrap
 * and a first (name) column that wraps, so the P&L and the CO register fit a 1280–1440 px screen. The
 * table still scrolls sideways inside its card when it does not fit (phones), so no column is ever
 * out of reach.
 */
export const DENSE_TABLE =
  "[&_table]:text-xs [&_td]:px-1.5 [&_td]:py-2 [&_th]:h-auto [&_th]:px-1.5 [&_th]:py-2 [&_th]:whitespace-normal [&_th]:align-bottom [&_th]:leading-tight [&_th]:text-xs [&_th]:tracking-normal [&_td:first-child]:ps-3 [&_th:first-child]:ps-3 [&_td:last-child]:pe-3 [&_th:last-child]:pe-3 [&_td:first-child]:whitespace-normal [&_td:first-child]:min-w-32";

/**
 * While a table scrolls sideways (phones, QA R-02) its first column stays put, so every row keeps its
 * name in view; the cells get the card colour so the scrolled columns pass underneath.
 */
const STICKY_FIRST_COLUMN =
  "[&_tbody_td:first-child]:sticky [&_tbody_td:first-child]:start-0 [&_tbody_td:first-child]:z-[1] [&_tbody_td:first-child]:bg-card [&_thead_th:first-child]:sticky [&_thead_th:first-child]:start-0 [&_thead_th:first-child]:z-[2] [&_thead_th:first-child]:bg-[color-mix(in_oklch,var(--muted)_40%,var(--card))]";
/** Once scrolled, the sticky first column casts a shadow over the columns passing under it. */
const SCROLLED_SHADOW =
  "[&_td:first-child]:shadow-[6px_0_6px_-6px_rgb(0_0_0/0.25)] [&_th:first-child]:shadow-[6px_0_6px_-6px_rgb(0_0_0/0.25)] rtl:[&_td:first-child]:shadow-[-6px_0_6px_-6px_rgb(0_0_0/0.25)] rtl:[&_th:first-child]:shadow-[-6px_0_6px_-6px_rgb(0_0_0/0.25)]";

/**
 * A row's "actions" menu (the last column, ACTIONS_COLUMN) stays at the end edge while the table scrolls
 * sideways, so the button is always in reach without scrolling to the far end; the columns pass under it.
 */
const STICKY_ACTIONS_COLUMN =
  "[&_tbody_td:last-child]:sticky [&_tbody_td:last-child]:end-0 [&_tbody_td:last-child]:z-[1] [&_tbody_td:last-child]:bg-card [&_thead_th:last-child]:sticky [&_thead_th:last-child]:end-0 [&_thead_th:last-child]:z-[2] [&_thead_th:last-child]:bg-[color-mix(in_oklch,var(--muted)_40%,var(--card))]";
/** Columns hidden past the end: the sticky actions column casts a shadow over them (instead of the edge fade). */
const ACTIONS_SHADOW =
  "[&_td:last-child]:shadow-[-6px_0_6px_-6px_rgb(0_0_0/0.25)] [&_th:last-child]:shadow-[-6px_0_6px_-6px_rgb(0_0_0/0.25)] rtl:[&_td:last-child]:shadow-[6px_0_6px_-6px_rgb(0_0_0/0.25)] rtl:[&_th:last-child]:shadow-[6px_0_6px_-6px_rgb(0_0_0/0.25)]";

type SortDirection = "asc" | "desc";

const alignClass = { left: "text-start", right: "text-end", center: "text-center" } as const;

function compare(a: string | number | null | undefined, b: string | number | null | undefined) {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/** One table pattern for every list: sorting, pagination, loading, error and empty states. */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  loading,
  error,
  onRetry,
  empty,
  onRowClick,
  pagination,
  clientPageSize = 10,
  defaultSort,
  rowClassName,
  caption,
  className,
  maxHeight,
  view = "table",
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ id: string; direction: SortDirection } | null>(defaultSort ?? null);
  const [clientPage, setClientPage] = useState(1);
  const [clientSize, setClientSize] = useState(clientPageSize);
  const visibleColumns = columns.filter((c) => !c.hidden);
  const frameRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => {
    const list = rows ?? [];
    const column = sort ? columns.find((c) => c.id === sort.id) : undefined;
    if (!sort || !column?.sortValue) return list;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...list].sort((a, b) => factor * compare(column.sortValue!(a), column.sortValue!(b)));
  }, [rows, columns, sort]);

  const clientPaging = !pagination && clientSize > 0;
  const totalPages = clientPaging ? Math.max(1, Math.ceil(sorted.length / clientSize)) : 1;
  const page = Math.min(clientPage, totalPages);
  const pageRows = clientPaging ? sorted.slice((page - 1) * clientSize, page * clientSize) : sorted;

  const toggleSort = (id: string) => {
    setSort((current) => {
      if (!current || current.id !== id) return { id, direction: "asc" };
      if (current.direction === "asc") return { id, direction: "desc" };
      return null;
    });
  };

  const onRowKey = (event: KeyboardEvent<HTMLElement>, row: T) => {
    if (onRowClick && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onRowClick(row);
    }
  };

  let body: ReactNode;
  if (loading && !rows) {
    body = <TableSkeleton columns={Math.min(visibleColumns.length, 6)} />;
  } else if (error && !rows) {
    body = <ErrorState error={error} onRetry={onRetry} compact />;
  } else if (sorted.length === 0) {
    body = <EmptyState compact {...empty} />;
  } else if (view === "cards") {
    const [title, ...rest] = visibleColumns;
    body = (
      <ul className="divide-y" aria-busy={loading || undefined} aria-label={caption}>
        {pageRows.map((row) => (
          <li
            key={getRowId(row)}
            data-testid="data-card"
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            onKeyDown={onRowClick ? (e) => onRowKey(e, row) : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            className={cn("space-y-2 px-4 py-3 text-sm", onRowClick && "cursor-pointer hover:bg-muted/50", rowClassName?.(row))}
          >
            {title ? <div className="min-w-0 break-words">{title.cell(row)}</div> : null}
            {rest.length ? (
              <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1.5">
                {rest.map((column) => (
                  <Fragment key={column.id}>
                    <dt className="text-xs font-medium text-muted-foreground uppercase">{column.header}</dt>
                    <dd className="min-w-0 break-words text-end">{column.cell(row)}</dd>
                  </Fragment>
                ))}
              </dl>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  const edges = useScrollEdges(frameRef, "[data-slot=table-container]", [body === undefined]);
  const stickyActions = edges.overflow && visibleColumns.length > 1 && visibleColumns[visibleColumns.length - 1]!.id === "actions";

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden",
        maxHeight && [maxHeightClass[maxHeight], scrollClass],
        edges.overflow && STICKY_FIRST_COLUMN,
        stickyActions && STICKY_ACTIONS_COLUMN,
        className,
      )}
    >
      {body ?? (
        <div
          ref={frameRef}
          className={cn("relative", edges.start && SCROLLED_SHADOW, stickyActions && edges.end && ACTIONS_SHADOW)}
          data-scroll-start={edges.start || undefined}
          data-scroll-end={edges.end || undefined}
          data-sticky-actions={stickyActions || undefined}
        >
        <Table aria-busy={loading || undefined}>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {visibleColumns.map((column) => {
                const active = sort?.id === column.id;
                const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined;
                return (
                  <TableHead
                    key={column.id}
                    aria-sort={column.sortValue ? (ariaSort ?? "none") : undefined}
                    className={cn(
                      "h-10 px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase",
                      alignClass[column.align ?? "left"],
                      column.headerClassName,
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.id)}
                        className={cn(
                          "hit-area inline-flex items-center gap-1 rounded-sm uppercase hover:text-foreground",
                          active && "text-foreground",
                        )}
                      >
                        {column.header}
                        {active ? (
                          sort.direction === "asc" ? (
                            <ArrowUp className="size-3.5" aria-hidden />
                          ) : (
                            <ArrowDown className="size-3.5" aria-hidden />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row) => (
              <TableRow
                key={getRowId(row)}
                data-testid="data-row"
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => onRowKey(e, row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(onRowClick && "cursor-pointer", rowClassName?.(row))}
              >
                {visibleColumns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={cn("px-4 py-3", alignClass[column.align ?? "left"], column.className)}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
          {/* Scroll hint: a soft shadow at the edge that hides columns. */}
          {edges.end && !stickyActions ? (
            <span aria-hidden data-testid="scroll-shadow-end" className="pointer-events-none absolute inset-y-0 end-0 z-[3] w-6 bg-linear-to-l from-foreground/15 to-transparent rtl:bg-linear-to-r" />
          ) : null}
        </div>
      )}
      {pagination && sorted.length > 0 ? (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      ) : null}
      {clientPaging && sorted.length > clientSize ? (
        <Pagination
          page={page}
          pageSize={clientSize}
          total={sorted.length}
          onPageChange={setClientPage}
          onPageSizeChange={(size) => {
            setClientSize(size);
            setClientPage(1);
          }}
        />
      ) : null}
    </div>
  );
}
