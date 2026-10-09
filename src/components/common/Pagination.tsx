"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

/** "Showing 1–25 of 73" · page selector · prev/next · items per page. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: PaginationProps) {
  const t = useT();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(total, current * pageSize);

  return (
    <nav
      aria-label={t("common.pagination")}
      className={cn("flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm", className)}
    >
      <p className="text-muted-foreground tabular" aria-live="polite">
        {t("common.showing")} {from}–{to} {t("common.of")} {total}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange ? (
          <label className="flex items-center gap-2 text-muted-foreground">
            <span>{t("common.rowsPerPage")}</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger size="sm" className="w-20" aria-label={t("common.rowsPerPage")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : null}
        <label className="flex items-center gap-2 text-muted-foreground">
          <span>{t("common.page")}</span>
          <Select value={String(current)} onValueChange={(v) => onPageChange(Number(v))}>
            <SelectTrigger size="sm" className="w-20" aria-label={t("common.page")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="tabular">
            {t("common.of")} {totalPages}
          </span>
        </label>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(current - 1)}
            disabled={current <= 1}
            aria-label={t("common.previous")}
          >
            <ChevronLeft className="rtl:-scale-x-100" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(current + 1)}
            disabled={current >= totalPages}
            aria-label={t("common.next")}
          >
            <ChevronRight className="rtl:-scale-x-100" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
