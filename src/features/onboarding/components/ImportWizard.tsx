"use client";

import { CircleCheck, Download, FileSpreadsheet, Upload } from "lucide-react";
import { useId, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  useCommitImportMutation,
  useDownloadImportTemplateMutation,
  usePreviewImportMutation,
} from "@/api/services/onboarding.api";
import type { ImportEntity, ImportPreview, ImportPreviewRow, ImportResult } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { InlineAlert } from "@/components/common/InlineAlert";
import { useCan } from "@/components/common/PermissionGate";
import { SlideOver } from "@/components/common/SlideOver";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useSearchFlag } from "@/hooks/useSearchFlag";
import { useLanguage, useT, type TranslationKey } from "@/i18n/useT";
import { errorCode, getErrorMessage } from "@/lib/apiErrors";
import { cn } from "@/lib/cn";
import type { PermissionKey } from "@/lib/permissions";

const ENTITY: Record<ImportEntity, { label: TranslationKey; permission: PermissionKey }> = {
  workers: { label: "imports.entityWorkers", permission: "masterdata.worker.create" },
  subcontractors: { label: "imports.entitySubcontractors", permission: "masterdata.subcontractor.create" },
  suppliers: { label: "imports.entitySuppliers", permission: "masterdata.supplier.create" },
  materials: { label: "imports.entityMaterials", permission: "masterdata.material.create" },
  brands: { label: "imports.entityBrands", permission: "masterdata.material.create" },
  clients: { label: "imports.entityClients", permission: "clients.client.create" },
  "opening-stock": { label: "imports.entityOpeningStock", permission: "company.opening.manage" },
  "opening-udhaar": { label: "imports.entityOpeningUdhaar", permission: "company.opening.manage" },
  "opening-cash": { label: "imports.entityOpeningCash", permission: "company.opening.manage" },
  "opening-peshgi": { label: "imports.entityOpeningPeshgi", permission: "company.opening.manage" },
};

export type ImportStep = "template" | "upload" | "preview" | "done";
const STEP_ORDER: ImportStep[] = ["template", "upload", "preview", "done"];
const STEP_LABEL: Record<ImportStep, TranslationKey> = {
  template: "imports.stepTemplate",
  upload: "imports.stepUpload",
  preview: "imports.stepPreview",
  done: "imports.stepDone",
};

/** Files every Excel import accepts. */
export const IMPORT_ACCEPT =
  ".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";

/** "1 Template · 2 Upload · 3 Check · 4 Done" progress pills shared by every Excel import. */
export function ImportSteps({ current }: { current: ImportStep }) {
  const t = useT();
  const at = STEP_ORDER.indexOf(current);
  return (
    <ol className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium">
      {STEP_ORDER.map((s, i) => (
        <li
          key={s}
          aria-current={s === current ? "step" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1",
            i < at
              ? "bg-success-soft"
              : i === at
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
          )}
        >
          <span className="tabular">{i + 1}</span>
          {t(STEP_LABEL[s])}
        </li>
      ))}
    </ol>
  );
}

/** Step 1: title, hint and the download button (plus optional extra content, e.g. a note). */
export function ImportTemplateSection({
  title,
  hint,
  label,
  downloading,
  onDownload,
  children,
}: {
  title: string;
  hint: string;
  label: string;
  downloading: boolean;
  onDownload: () => void;
  children?: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{hint}</p>
      <Button variant="outline" disabled={downloading} onClick={onDownload}>
        <Download data-icon="inline-start" />
        {label}
      </Button>
      {children}
    </section>
  );
}

/** Step 2: file picker (the file stays in the browser), file name, "checking…" and the file error. */
export function ImportUploadSection({
  title,
  hint,
  inputRef,
  file,
  checking,
  error,
  onFile,
  inputLabel,
}: {
  title: string;
  hint: string;
  inputRef: RefObject<HTMLInputElement | null>;
  file: File | null;
  checking: boolean;
  error: string | null;
  onFile: (file: File) => void;
  /** Accessible name of the hidden input (defaults to the visible "Choose file" label). */
  inputLabel?: string;
}) {
  const t = useT();
  const inputId = useId();
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{hint}</p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="sr-only"
          aria-label={inputLabel}
          accept={IMPORT_ACCEPT}
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            if (chosen) onFile(chosen);
          }}
        />
        <Button variant="outline" asChild>
          <label htmlFor={inputId} className="cursor-pointer">
            <FileSpreadsheet data-icon="inline-start" />
            {t("imports.chooseFile")}
          </label>
        </Button>
        {file ? (
          <span className="text-sm" dir="auto">
            {file.name}
          </span>
        ) : null}
        {checking ? <span className="text-sm text-muted-foreground">{t("imports.checking")}</span> : null}
      </div>
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
    </section>
  );
}

/** A labelled checkbox under the preview summary ("only rows with problems", "import only the good rows"). */
export function ImportOption({
  id,
  checked,
  onCheckedChange,
  children,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
      <Label htmlFor={id}>{children}</Label>
    </div>
  );
}

/** Footer: Close when done; otherwise "Choose another file" (after a preview) + the import button. */
export function ImportFooter({
  done,
  hasPreview,
  importing,
  importDisabled,
  importLabel,
  onImport,
  onReset,
  onClose,
}: {
  done: boolean;
  hasPreview: boolean;
  importing: boolean;
  importDisabled: boolean;
  importLabel: string;
  onImport: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {done ? (
        <Button onClick={onClose}>{t("imports.close")}</Button>
      ) : (
        <>
          {hasPreview ? (
            <Button variant="outline" onClick={onReset} disabled={importing}>
              {t("imports.anotherFile")}
            </Button>
          ) : null}
          <Button onClick={onImport} disabled={importDisabled || importing}>
            <Upload data-icon="inline-start" />
            {importing ? t("imports.importing") : importLabel}
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * Excel / CSV import wizard: download template → upload → preview with row problems
 * highlighted → import. All-or-nothing unless "import only the good rows" is ticked.
 * The file stays in the browser and is sent again on import (the server keeps nothing).
 * Optional: a `chooser` shown first in step 1 (e.g. which opening balance to import — a new
 * `entity` clears the chosen file and check), and its own title / description / done text.
 */
export function ImportWizard({
  entity,
  open,
  onOpenChange,
  title,
  description,
  doneText,
  chooser,
}: {
  entity: ImportEntity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  doneText?: (result: ImportResult) => string;
  chooser?: (state: { locked: boolean }) => ReactNode;
}) {
  const t = useT();
  const language = useLanguage();
  const run = useMutationToast();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [download, { isLoading: downloading }] = useDownloadImportTemplateMutation();
  const [check, { isLoading: checking }] = usePreviewImportMutation();
  const [commit, { isLoading: importing }] = useCommitImportMutation();
  const entityLabel = t(ENTITY[entity].label);

  // Another entity (the chooser): a file checked for the old one does not apply; the upload input
  // remounts (key) so the same file can be picked again.
  const [checkedFor, setCheckedFor] = useState(entity);
  if (checkedFor !== entity) {
    setCheckedFor(entity);
    setFile(null);
    setPreview(null);
    setResult(null);
    setFileError(null);
    setOnlyProblems(false);
    setSkipInvalid(false);
  }

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setFileError(null);
    setOnlyProblems(false);
    setSkipInvalid(false);
    if (inputRef.current) inputRef.current.value = "";
  };
  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const runPreview = async (chosen: File) => {
    setFile(chosen);
    setPreview(null);
    setFileError(null);
    try {
      const p = await check({ entity, file: chosen }).unwrap();
      setPreview(p);
      setOnlyProblems(p.invalidRows > 0);
    } catch (error) {
      // The generic FILE_TOO_LARGE text is about attachments (10 MB); imports have their own limits.
      setFileError(
        errorCode(error) === "FILE_TOO_LARGE" ? t("imports.uploadHint") : getErrorMessage(error, language),
      );
    }
  };

  const importedText = (res: ImportResult) =>
    doneText
      ? doneText(res)
      : res.skipped
        ? t("imports.importedSkipped", { n: res.created, skipped: res.skipped })
        : t("imports.imported", { n: res.created });

  const doImport = async () => {
    if (!file) return;
    const r = await run(() => commit({ entity, file, skipInvalid }).unwrap(), { success: importedText });
    if (r) setResult(r);
  };

  const step: ImportStep = result ? "done" : preview ? "preview" : file ? "upload" : "template";
  const label = (c: ImportPreview["columns"][number]) =>
    language === "ur" ? c.labelUrdu : language === "roman-ur" ? c.labelRoman : c.label;
  const errorsOf = (r: ImportPreviewRow, key: string) => r.errors.filter((e) => e.column === key);

  const columns: Column<ImportPreviewRow>[] = preview
    ? [
        {
          id: "row",
          header: t("imports.colRow"),
          cell: (r) => <span className="tabular">{r.rowNumber}</span>,
          sortValue: (r) => r.rowNumber,
        },
        {
          id: "problems",
          header: t("imports.colProblems"),
          className: "min-w-56",
          cell: (r) =>
            r.valid ? (
              <span className="inline-flex items-center gap-1 text-success">
                <CircleCheck className="size-4" aria-hidden />
                {t("imports.noProblems")}
              </span>
            ) : (
              <ul className="space-y-0.5 text-xs text-danger">
                {r.errors.map((e, i) => {
                  const col = preview.columns.find((c) => c.key === e.column);
                  return (
                    <li key={i}>
                      <span className="font-semibold">{col ? label(col) : e.column}:</span> {e.message}
                    </li>
                  );
                })}
              </ul>
            ),
        },
        ...preview.columns.map<Column<ImportPreviewRow>>((c) => ({
          id: c.key,
          header: `${label(c)}${c.required ? " *" : ""}`,
          cell: (r) => {
            const bad = errorsOf(r, c.key).length > 0;
            return (
              <span
                className={cn(bad && "font-medium text-danger underline decoration-wavy underline-offset-4")}
                aria-invalid={bad || undefined}
              >
                {r.values[c.key] || (bad ? "—" : "")}
              </span>
            );
          },
        })),
      ]
    : [];

  const rows = preview ? (onlyProblems ? preview.rows.filter((r) => !r.valid) : preview.rows) : [];
  const importCount = preview
    ? preview.invalidRows
      ? skipInvalid
        ? preview.validRows
        : 0
      : preview.validRows
    : 0;

  return (
    <SlideOver
      open={open}
      onOpenChange={close}
      size="lg"
      busy={importing}
      title={title ?? t("imports.title", { entity: entityLabel })}
      description={description ?? t("imports.desc")}
      footer={
        <ImportFooter
          done={Boolean(result)}
          hasPreview={Boolean(preview)}
          importing={importing}
          importDisabled={!preview || importCount === 0}
          importLabel={t("imports.import", { n: importCount })}
          onImport={() => void doImport()}
          onReset={reset}
          onClose={() => close(false)}
        />
      }
    >
      <ImportSteps current={step} />
      {result ? (
        <InlineAlert tone="success" title={importedText(result)}>
          {result.fileName}
        </InlineAlert>
      ) : (
        <div className="space-y-6">
          {chooser?.({ locked: checking || importing })}
          <ImportTemplateSection
            title={t("imports.templateTitle")}
            hint={t("imports.templateHint")}
            label={t("imports.download")}
            downloading={downloading}
            onDownload={() => void run(() => download(entity).unwrap(), { success: t("imports.downloaded") })}
          />

          <ImportUploadSection
            key={entity}
            title={t("imports.uploadTitle")}
            hint={t("imports.uploadHint")}
            inputRef={inputRef}
            file={file}
            checking={checking}
            error={fileError}
            onFile={(chosen) => void runPreview(chosen)}
          />

          {preview ? (
            <section className="space-y-3" aria-live="polite">
              <InlineAlert
                tone={preview.invalidRows ? "warning" : "success"}
                title={t("imports.summary", { valid: preview.validRows, invalid: preview.invalidRows })}
              >
                {preview.invalidRows
                  ? preview.validRows
                    ? t("imports.allOrNothing")
                    : t("imports.nothingValid")
                  : t("imports.allValid", { n: preview.validRows })}
                {preview.skippedExampleRows ? (
                  <span className="block">{t("imports.skippedExample")}</span>
                ) : null}
                {preview.unknownColumns.length ? (
                  <span className="block">
                    {t("imports.unknownColumns", { cols: preview.unknownColumns.join(", ") })}
                  </span>
                ) : null}
              </InlineAlert>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {preview.invalidRows ? (
                  <ImportOption id={`${inputId}-only`} checked={onlyProblems} onCheckedChange={setOnlyProblems}>
                    {t("imports.onlyProblems")}
                  </ImportOption>
                ) : null}
                {preview.invalidRows && preview.validRows ? (
                  <ImportOption id={`${inputId}-skip`} checked={skipInvalid} onCheckedChange={setSkipInvalid}>
                    {t("imports.skipInvalid", { n: preview.validRows, bad: preview.invalidRows })}
                  </ImportOption>
                ) : null}
              </div>
              <DataTable
                rows={rows}
                columns={columns}
                getRowId={(r) => String(r.rowNumber)}
                rowClassName={(r) => (r.valid ? undefined : "bg-danger-soft/60")}
                clientPageSize={50}
                maxHeight="md"
                caption={t("imports.summary", { valid: preview.validRows, invalid: preview.invalidRows })}
                empty={{
                  title: t("imports.allValid", { n: preview.validRows }),
                  icon: CircleCheck,
                  compact: true,
                }}
              />
            </section>
          ) : null}
        </div>
      )}
    </SlideOver>
  );
}

/** Toolbar button that opens the wizard (also from `?import=1`). Hidden without the create permission. */
export function ImportButton({ entity }: { entity: ImportEntity }) {
  const t = useT();
  const readOnly = useReadOnly();
  const allowed = useCan(ENTITY[entity].permission) && !readOnly;
  const [open, setOpen] = useSearchFlag("import");
  if (!allowed) return null;
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet data-icon="inline-start" />
        {t("imports.button")}
      </Button>
      <ImportWizard entity={entity} open={open} onOpenChange={setOpen} />
    </>
  );
}
