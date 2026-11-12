"use client";

import { ChevronDown, FileSpreadsheet, FileText, FolderDown, Loader2 } from "lucide-react";
import { useExportProjectFileMutation } from "@/api/services/reports.api";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { pdfLang } from "@/features/estimates/labels";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useLanguage, useT } from "@/i18n/useT";
import { downloadFile } from "@/lib/download";

/**
 * "Project file": the whole project, A to Z, as one PDF or Excel file in the reader's language
 * (GET /reports/project-file/:projectId). The API leaves out what the user may not see.
 */
export function ProjectFileMenu({ projectId }: { projectId: string }) {
  const t = useT();
  const language = useLanguage();
  const [exportFile, state] = useExportProjectFileMutation();
  const run = useMutationToast();
  const download = async (format: "pdf" | "xlsx") => {
    const file = await run(() => exportFile({ projectId, format, lang: pdfLang(language) }).unwrap(), { success: (f) => t("app.components.exportMenu.ready", { name: f.fileName }) });
    if (file) await downloadFile(file.downloadUrl ?? file.url, file.fileName);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={state.isLoading} title={state.isLoading ? t("projects.projectFile.busy") : t("projects.projectFile.hint")}>
          {state.isLoading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <FolderDown data-icon="inline-start" />}
          {t("projects.projectFile.button")}
          <ChevronDown data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-72">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">{t("projects.projectFile.hint")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void download("pdf")}>
          <FileText aria-hidden />
          {t("projects.projectFile.pdf")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void download("xlsx")}>
          <FileSpreadsheet aria-hidden />
          {t("projects.projectFile.excel")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
