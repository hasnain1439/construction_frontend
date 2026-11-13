"use client";

import { ChevronDown, FileSpreadsheet, FileText, FolderDown, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useExportProjectFileMutation, useGetProjectFilePartsQuery, type ProjectFilePart } from "@/api/services/reports.api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { pdfLang } from "@/features/estimates/labels";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useLanguage, useT } from "@/i18n/useT";
import { downloadFile } from "@/lib/download";
import { Capture3D, type Shot } from "./Capture3D";

type Format = "pdf" | "xlsx";
/** The 3D pictures are a choice of their own (PDF only). */
const PICTURES = "pictures3d";

/** Pick the parts (each a check box), then the file is made with only those. */
function PartsDialog({ projectId, format, onCancel, onConfirm }: { projectId: string; format: Format; onCancel: () => void; onConfirm: (parts: ProjectFilePart[], pictures: boolean) => void }) {
  const t = useT();
  const available = useGetProjectFilePartsQuery(projectId);
  const options = [...(format === "pdf" ? [PICTURES] : []), ...(available.data ?? [])];
  const [off, setOff] = useState<Set<string>>(new Set());
  const checked = (k: string) => !off.has(k);
  const toggle = (k: string, on: boolean) =>
    setOff((s) => {
      const n = new Set(s);
      if (on) n.delete(k);
      else n.add(k);
      return n;
    });
  const parts = (available.data ?? []).filter(checked);
  return (
    <Dialog open onOpenChange={(o) => (!o ? onCancel() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("projects.projectFile.pickTitle")}</DialogTitle>
          <DialogDescription>{t("projects.projectFile.pickDesc")}</DialogDescription>
        </DialogHeader>
        {available.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-5 w-48" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3 text-xs">
              <button type="button" className="underline" onClick={() => setOff(new Set())}>
                {t("projects.projectFile.all")}
              </button>
              <button type="button" className="underline" onClick={() => setOff(new Set(options))}>
                {t("projects.projectFile.none")}
              </button>
            </div>
            <ul className="space-y-2">
              {options.map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Checkbox id={`pf-${k}`} checked={checked(k)} onCheckedChange={(v) => toggle(k, v === true)} />
                  <Label htmlFor={`pf-${k}`} className="font-normal leading-tight">
                    <span className="block text-sm">{t(`projects.projectFile.part.${k}` as never)}</span>
                    <span className="block text-xs text-muted-foreground">{t(`projects.projectFile.partHint.${k}` as never)}</span>
                  </Label>
                </li>
              ))}
            </ul>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("projects.projectFile.cancel")}
          </Button>
          <Button type="button" disabled={available.isLoading || (!parts.length && !(format === "pdf" && checked(PICTURES)))} onClick={() => onConfirm(parts, format === "pdf" && checked(PICTURES))}>
            {format === "pdf" ? <FileText data-icon="inline-start" /> : <FileSpreadsheet data-icon="inline-start" />}
            {t("projects.projectFile.make")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * "Project file": the whole project, A to Z, as one PDF or Excel file in the reader's language
 * (/reports/project-file/:projectId). The reader picks the parts; the API leaves out what they may not see.
 */
export function ProjectFileMenu({ projectId }: { projectId: string }) {
  const t = useT();
  const language = useLanguage();
  const [exportFile, state] = useExportProjectFileMutation();
  const run = useMutationToast();
  const [picking, setPicking] = useState<Format | null>(null);
  // PDF with pictures: first the 3D pictures (taken off screen), then the file with them.
  const [capturing, setCapturing] = useState<ProjectFilePart[] | null>(null);
  const download = useCallback(
    async (format: Format, parts: ProjectFilePart[], images: Shot[] = []) => {
      const file = await run(() => exportFile({ projectId, format, lang: pdfLang(language), parts, ...(images.length ? { images } : {}) }).unwrap(), {
        success: (f) => t("app.components.exportMenu.ready", { name: f.fileName }),
      });
      if (file) await downloadFile(file.downloadUrl ?? file.url, file.fileName);
    },
    [exportFile, language, projectId, run, t],
  );
  const onShots = useCallback(
    (shots: Shot[]) => {
      const parts = capturing ?? [];
      setCapturing(null);
      void download("pdf", parts, shots);
    },
    [capturing, download],
  );
  const busy = state.isLoading || capturing !== null;
  return (
    <>
      {capturing ? <Capture3D projectId={projectId} onDone={onShots} /> : null}
      {picking ? (
        <PartsDialog
          projectId={projectId}
          format={picking}
          onCancel={() => setPicking(null)}
          onConfirm={(parts, pictures) => {
            const format = picking;
            setPicking(null);
            if (pictures) setCapturing(parts);
            else void download(format, parts);
          }}
        />
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={busy} title={busy ? t("projects.projectFile.busy") : t("projects.projectFile.hint")}>
            {busy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <FolderDown data-icon="inline-start" />}
            {t("projects.projectFile.button")}
            <ChevronDown data-icon="inline-end" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-w-72">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("projects.projectFile.hint")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setPicking("pdf")}>
            <FileText aria-hidden />
            {t("projects.projectFile.pdf")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPicking("xlsx")}>
            <FileSpreadsheet aria-hidden />
            {t("projects.projectFile.excel")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
