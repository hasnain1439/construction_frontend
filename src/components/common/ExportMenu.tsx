"use client";

import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2, Sheet } from "lucide-react";
import { useExportReportMutation } from "@/api/services/reports.api";
import type { ReportFormat, ReportName, ReportQuery } from "@/api/types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMutationToast } from "@/hooks/useMutationToast";

type FileFormat = Exclude<ReportFormat, "json">;

export const EXPORT_FORMATS: Array<{ format: FileFormat; label: string; icon: typeof FileText }> = [
  { format: "csv", label: "CSV", icon: Sheet },
  { format: "xlsx", label: "Excel", icon: FileSpreadsheet },
  { format: "pdf", label: "PDF", icon: FileText },
];

/**
 * CSV / Excel / PDF for a report with the current filters. The API stores the file and
 * returns a signed link, which opens in a new tab (a download for CSV / Excel).
 */
export function ExportMenu({ name, filters, disabled }: { name: ReportName; filters: Omit<NonNullable<ReportQuery>, "format">; disabled?: boolean }) {
  const [exportReport, state] = useExportReportMutation();
  const run = useMutationToast();
  const download = async (format: FileFormat) => {
    const file = await run(() => exportReport({ name, format, ...filters }).unwrap(), { success: (f) => `${f.fileName} is ready` });
    if (file) window.open(file.url, "_blank", "noopener,noreferrer");
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || state.isLoading}>
          {state.isLoading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Download data-icon="inline-start" />}
          Export
          <ChevronDown data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {EXPORT_FORMATS.map(({ format, label, icon: Icon }) => (
          <DropdownMenuItem key={format} onSelect={() => void download(format)}>
            <Icon aria-hidden />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
