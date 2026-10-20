"use client";

import { ArrowDown, ArrowUp, FileSpreadsheet } from "lucide-react";
import { useId, useRef, useState } from "react";
import {
  useCommitPriceImportMutation,
  useDownloadPriceListMutation,
  usePreviewPriceImportMutation,
} from "@/api/services/masterData.api";
import type {
  PriceImportChange,
  PriceImportError,
  PriceImportErrorCode,
  PriceImportPreview,
  PriceImportResult,
} from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { InlineAlert } from "@/components/common/InlineAlert";
import { usePermissions } from "@/components/common/PermissionGate";
import { SlideOver } from "@/components/common/SlideOver";
import { Button } from "@/components/ui/button";
import {
  ImportFooter,
  ImportOption,
  ImportSteps,
  ImportTemplateSection,
  ImportUploadSection,
  type ImportStep,
} from "@/features/onboarding/components/ImportWizard";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useLanguage, useT, type TranslationKey } from "@/i18n/useT";
import { errorCode, getErrorMessage } from "@/lib/apiErrors";
import { cn } from "@/lib/cn";
import { formatPKR } from "@/lib/money";

const ERROR_TEXT: Record<PriceImportErrorCode, TranslationKey> = {
  UNKNOWN_CATEGORY_COLUMN: "masterData.priceImport.errors.unknownCategoryColumn",
  CATEGORY_ARCHIVED: "masterData.priceImport.errors.categoryArchived",
  DUPLICATE_COLUMN: "masterData.priceImport.errors.duplicateColumn",
  MATERIAL_REQUIRED: "masterData.priceImport.errors.materialRequired",
  UNKNOWN_MATERIAL: "masterData.priceImport.errors.unknownMaterial",
  MATERIAL_HIDDEN: "masterData.priceImport.errors.materialHidden",
  DUPLICATE_ROW: "masterData.priceImport.errors.duplicateRow",
  NOT_A_NUMBER: "masterData.priceImport.errors.notANumber",
  NEGATIVE_RATE: "masterData.priceImport.errors.negativeRate",
  RATE_TOO_LARGE: "masterData.priceImport.errors.rateTooLarge",
  RATE_REQUIRED: "masterData.priceImport.errors.rateRequired",
  SPEC_TOO_LONG: "masterData.priceImport.errors.specTooLong",
};

/** Up / down arrow + coloured difference (more expensive = red, cheaper = green). */
function Difference({ change }: { change: PriceImportChange }) {
  const t = useT();
  if (change.diffPaisa === undefined || change.diffPaisa === null || !change.rateChanged) {
    return <span className="text-muted-foreground">—</span>;
  }
  const up = !change.diffPaisa.startsWith("-");
  const Icon = up ? ArrowUp : ArrowDown;
  const percent =
    change.diffPercent === null || change.diffPercent === undefined
      ? null
      : `${up ? "+" : ""}${change.diffPercent}%`;
  return (
    <span
      className={cn("tabular inline-flex items-center gap-1", up ? "text-danger" : "text-success")}
      data-direction={up ? "up" : "down"}
    >
      <Icon
        className="size-3.5"
        aria-label={up ? t("masterData.priceImport.up") : t("masterData.priceImport.down")}
      />
      {up ? "+" : ""}
      {formatPKR(change.diffPaisa)}
      {percent ? <span className="text-xs">({percent})</span> : null}
    </span>
  );
}

/** Step 3: summary counts, the "import only the changes without problems" option, problems, changes by category. */
function PricePreview({
  preview,
  skipInvalid,
  onSkipInvalidChange,
}: {
  preview: PriceImportPreview;
  skipInvalid: boolean;
  onSkipInvalidChange: (skip: boolean) => void;
}) {
  const t = useT();
  const optionId = useId();
  const hasErrors = preview.errorCount > 0;

  const errorText = (e: PriceImportError) =>
    t(ERROR_TEXT[e.code], { value: e.value ?? "", column: e.column ?? "" });
  const errorWhere = (e: PriceImportError) =>
    [
      e.rowNumber === null
        ? t("masterData.priceImport.headerLabel")
        : t("masterData.priceImport.rowLabel", { n: e.rowNumber }),
      e.code === "UNKNOWN_MATERIAL" || e.code === "DUPLICATE_ROW" ? null : e.materialName,
      e.rowNumber !== null ? e.column : null,
    ]
      .filter(Boolean)
      .join(" · ");

  const columns: Column<PriceImportChange>[] = [
    {
      id: "material",
      header: t("field.material"),
      cell: (c) => (
        <div className="min-w-0">
          <p className="font-medium">{c.material.name}</p>
          <p className="text-xs text-muted-foreground">
            {c.material.group} · {c.material.unit}
          </p>
        </div>
      ),
      sortValue: (c) => c.material.name,
    },
    {
      id: "old",
      header: t("masterData.priceImport.colOld"),
      align: "right",
      cell: (c) =>
        c.oldRatePaisa === undefined ? (
          <span className="text-muted-foreground">—</span>
        ) : c.oldRatePaisa === null ? (
          <span className="text-muted-foreground">{t("masterData.priceList.notSet")}</span>
        ) : (
          <span className="tabular">{formatPKR(c.oldRatePaisa)}</span>
        ),
    },
    {
      id: "new",
      header: t("masterData.priceImport.colNew"),
      align: "right",
      cell: (c) => (
        <span className={cn("tabular", c.rateChanged && "font-semibold")}>{formatPKR(c.newRatePaisa)}</span>
      ),
    },
    {
      id: "diff",
      header: t("masterData.priceImport.colDiff"),
      align: "right",
      cell: (c) => <Difference change={c} />,
    },
    {
      id: "spec",
      header: t("masterData.common.specification"),
      className: "min-w-48",
      cell: (c) =>
        c.specChanged ? (
          <span className="text-sm">
            {t("masterData.priceImport.specChange", {
              from: c.oldSpecification ?? "—",
              to: c.newSpecification ?? "—",
            })}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">{c.newSpecification ?? "—"}</span>
        ),
    },
  ];

  const groups = preview.categories
    .map((category) => ({ category, rows: preview.changes.filter((c) => c.category.id === category.id) }))
    .filter((g) => g.rows.length > 0);

  return (
    <section className="space-y-3" aria-live="polite">
      <InlineAlert
        tone={hasErrors ? "warning" : preview.changedCount ? "success" : "info"}
        title={t("masterData.priceImport.summary", {
          changed: preview.changedCount,
          unchanged: preview.unchangedCount,
          errors: preview.errorCount,
        })}
      >
        <span className="block" dir="auto">
          {t("masterData.priceImport.file", { name: preview.fileName })}
        </span>
        {!preview.changedCount ? (
          <span className="block">{t("masterData.priceImport.noChanges")}</span>
        ) : hasErrors ? (
          <span className="block">{t("masterData.priceImport.allOrNothing")}</span>
        ) : (
          <span className="block">{t("masterData.priceImport.allGood")}</span>
        )}
      </InlineAlert>

      {hasErrors && preview.changedCount ? (
        <ImportOption id={optionId} checked={skipInvalid} onCheckedChange={onSkipInvalidChange}>
          {t("masterData.priceImport.skipInvalid", { n: preview.changedCount })}
        </ImportOption>
      ) : null}

      {hasErrors ? (
        <InlineAlert tone="danger" title={t("masterData.priceImport.errorsTitle", { n: preview.errorCount })}>
          <p>{t("masterData.priceImport.errorsHint")}</p>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs" data-testid="price-import-errors">
            {preview.errors.map((e, i) => (
              <li key={i}>
                <span className="font-semibold" dir="auto">
                  {errorWhere(e)}:
                </span>{" "}
                {errorText(e)}
              </li>
            ))}
          </ul>
        </InlineAlert>
      ) : null}

      {groups.map(({ category, rows }) => (
        <section key={category.id} className="space-y-2" aria-label={category.name}>
          <h3 className="text-sm font-semibold">
            {t("masterData.priceImport.categoryCount", { name: category.name, n: rows.length })}
          </h3>
          <DataTable
            rows={rows}
            columns={columns}
            getRowId={(c) => `${c.material.id}:${c.category.id}`}
            clientPageSize={0}
            maxHeight="md"
            rowClassName={(c) =>
              c.rateChanged && c.diffPaisa?.startsWith("-")
                ? "bg-success-soft/40"
                : c.rateChanged
                  ? "bg-danger-soft/40"
                  : undefined
            }
            empty={{ title: t("masterData.priceImport.noChanges"), compact: true }}
          />
        </section>
      ))}
    </section>
  );
}

/**
 * Price list Excel import, same steps as the other Excel imports (ImportWizard): download the
 * pre-filled price list → upload the edited file → check old → new per category → import → done.
 * Without `canUpload` (e.g. a PM) only step 1 is shown, with a note that the owner/admin uploads.
 */
export function PriceImportWizard({
  open,
  onOpenChange,
  canDownload,
  canUpload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canDownload: boolean;
  canUpload: boolean;
}) {
  const t = useT();
  const language = useLanguage();
  const run = useMutationToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PriceImportPreview | null>(null);
  const [result, setResult] = useState<PriceImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [download, { isLoading: downloading }] = useDownloadPriceListMutation();
  const [check, { isLoading: checking }] = usePreviewPriceImportMutation();
  const [commit, { isLoading: importing }] = useCommitPriceImportMutation();

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setFileError(null);
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
    setSkipInvalid(false);
    try {
      setPreview(await check(chosen).unwrap());
    } catch (error) {
      setFileError(
        errorCode(error) === "FILE_TOO_LARGE"
          ? t("masterData.priceImport.tooLarge")
          : getErrorMessage(error, language),
      );
    }
  };

  const updatedText = (r: PriceImportResult) =>
    r.changed === 1
      ? t("masterData.priceImport.oneUpdated")
      : t("masterData.priceImport.nUpdated", { n: r.changed });

  const hasErrors = Boolean(preview?.errorCount);
  const importCount = !preview || (hasErrors && !skipInvalid) ? 0 : preview.changedCount;

  const doImport = async () => {
    if (!file) return;
    // The commit sends the same file again; with problems it only goes through as "skip the bad cells".
    const r = await run(() => commit(hasErrors ? { file, skipInvalid: true } : { file }).unwrap(), {
      success: updatedText,
    });
    if (r) setResult(r);
  };

  const step: ImportStep = result ? "done" : preview ? "preview" : file ? "upload" : "template";

  return (
    <SlideOver
      open={open}
      onOpenChange={close}
      size="lg"
      busy={importing}
      title={canUpload ? t("masterData.priceImport.title") : t("masterData.priceImport.downloadTitle")}
      description={canUpload ? t("masterData.priceImport.description") : undefined}
      footer={
        canUpload ? (
          <ImportFooter
            done={Boolean(result)}
            hasPreview={Boolean(preview)}
            importing={importing}
            importDisabled={importCount === 0}
            importLabel={t("masterData.priceImport.import", { n: importCount })}
            onImport={() => void doImport()}
            onReset={reset}
            onClose={() => close(false)}
          />
        ) : (
          <div className="flex justify-end">
            <Button onClick={() => close(false)}>{t("imports.close")}</Button>
          </div>
        )
      }
    >
      {canUpload ? <ImportSteps current={step} /> : null}
      {result ? (
        <InlineAlert tone="success" title={updatedText(result)}>
          <span className="block" dir="auto">
            {result.fileName}
          </span>
          {result.skipped ? (
            <span className="block">{t("masterData.priceImport.skipped", { n: result.skipped })}</span>
          ) : null}
        </InlineAlert>
      ) : (
        <div className="space-y-6">
          {canDownload ? (
            <ImportTemplateSection
              title={t("masterData.priceImport.templateTitle")}
              hint={t("masterData.priceImport.templateHint")}
              label={t("masterData.priceImport.download")}
              downloading={downloading}
              onDownload={() =>
                void run(() => download().unwrap(), { success: t("masterData.priceImport.downloaded") })
              }
            >
              {canUpload ? null : (
                <InlineAlert tone="info">{t("masterData.priceImport.uploadOnlyOwner")}</InlineAlert>
              )}
            </ImportTemplateSection>
          ) : null}

          {canUpload ? (
            <ImportUploadSection
              title={t("masterData.priceImport.uploadTitle")}
              hint={t("masterData.priceImport.uploadHint")}
              inputLabel={t("masterData.priceImport.uploadAria")}
              inputRef={inputRef}
              file={file}
              checking={checking}
              error={fileError}
              onFile={(chosen) => void runPreview(chosen)}
            />
          ) : null}

          {preview ? (
            <PricePreview preview={preview} skipInvalid={skipInvalid} onSkipInvalidChange={setSkipInvalid} />
          ) : null}
        </div>
      )}
    </SlideOver>
  );
}

/**
 * "Import from Excel" toolbar button on the price list (same look as the other Excel imports).
 * Download needs view + fields.rates; upload needs masterdata.pricelist.manage. Hidden without fields.rates.
 */
export function PriceImportButton() {
  const t = useT();
  const readOnly = useReadOnly();
  const { can, canSee } = usePermissions();
  const [open, setOpen] = useState(false);
  const seesRates = canSee("rates");
  const canDownload = seesRates && can("masterdata.pricelist.view");
  const canUpload = seesRates && can("masterdata.pricelist.manage") && !readOnly;
  if (!canDownload && !canUpload) return null;
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet data-icon="inline-start" />
        {canUpload ? t("masterData.priceImport.button") : t("masterData.priceImport.download")}
      </Button>
      <PriceImportWizard open={open} onOpenChange={setOpen} canDownload={canDownload} canUpload={canUpload} />
    </>
  );
}
