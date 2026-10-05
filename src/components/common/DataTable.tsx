"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
}

type SortDirection = "asc" | "desc";

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;

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
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ id: string; direction: SortDirection } | null>(defaultSort ?? null);
  const [clientPage, setClientPage] = useState(1);
  const [clientSize, setClientSize] = useState(clientPageSize);
  const visibleColumns = columns.filter((c) => !c.hidden);

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

  const onRowKey = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
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
  }

  return (
    <div className={cn("overflow-hidden", className)}>
      {body ?? (
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
                          "inline-flex items-center gap-1 rounded-sm uppercase hover:text-foreground",
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
