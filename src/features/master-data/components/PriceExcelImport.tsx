"use client";

import { ArrowDown, ArrowUp, Download, FileSpreadsheet, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
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
} from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { InlineAlert } from "@/components/common/InlineAlert";
import { usePermissions } from "@/components/common/PermissionGate";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
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

/** Preview of an uploaded price list file: changes grouped by category, the problems, then confirm. */
export function PriceImportPreviewDialog({
  preview,
  file,
  onClose,
}: {
  preview: PriceImportPreview | null;
  file: File | null;
  onClose: () => void;
}) {
  const t = useT();
  const run = useMutationToast();
  const checkboxId = useId();
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [commit, { isLoading: saving }] = useCommitPriceImportMutation();
  const open = Boolean(preview && file);

  const close = () => {
    setSkipInvalid(false);
    onClose();
  };

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

  const groups = (preview?.categories ?? [])
    .map((category) => ({
      category,
      rows: (preview?.changes ?? []).filter((c) => c.category.id === category.id),
    }))
    .filter((g) => g.rows.length > 0);
  const hasErrors = Boolean(preview?.errorCount);
  const saveCount = !preview || (hasErrors && !skipInvalid) ? 0 : preview.changedCount;

  const save = async () => {
    if (!file) return;
    const result = await run(() => commit({ file, ...(hasErrors ? { skipInvalid: true } : {}) }).unwrap(), {
      success: (r) =>
        r.changed === 1
          ? t("masterData.priceImport.oneUpdated")
          : t("masterData.priceImport.nUpdated", { n: r.changed }),
    });
    if (result) close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{t("masterData.priceImport.title")}</DialogTitle>
          <DialogDescription>{t("masterData.priceImport.description")}</DialogDescription>
        </DialogHeader>
        {preview ? (
          <div className="space-y-4" aria-live="polite">
            <InlineAlert
              tone={hasErrors ? "warning" : preview.changedCount ? "success" : "info"}
              title={t("masterData.priceImport.summary", {
                changed: preview.changedCount,
                unchanged: preview.unchangedCount,
                errors: preview.errorCount,
              })}
            >
              <span dir="auto">{t("masterData.priceImport.file", { name: preview.fileName })}</span>
              {!preview.changedCount ? (
                <span className="block">{t("masterData.priceImport.noChanges")}</span>
              ) : null}
              {preview.changedCount && !hasErrors ? (
                <span className="block">{t("masterData.priceImport.allGood")}</span>
              ) : null}
            </InlineAlert>

            {hasErrors ? (
              <InlineAlert
                tone="danger"
                title={t("masterData.priceImport.errorsTitle", { n: preview.errorCount })}
              >
                <p>{t("masterData.priceImport.errorsHint")}</p>
                <ul
                  className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs"
                  data-testid="price-import-errors"
                >
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

            {hasErrors && preview.changedCount ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={checkboxId}
                  checked={skipInvalid}
                  onCheckedChange={(v) => setSkipInvalid(v === true)}
                />
                <Label htmlFor={checkboxId}>
                  {t("masterData.priceImport.skipInvalid", { n: preview.changedCount })}
                </Label>
              </div>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void save()} disabled={saveCount === 0 || saving}>
            <Upload data-icon="inline-start" />
            {saving
              ? t("masterData.priceImport.saving")
              : t("masterData.priceImport.confirm", { n: saveCount })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * "Excel rates" menu on the price list: download every material × category with today's rates
 * (view + fields.rates), upload the edited file → preview dialog → save (masterdata.pricelist.manage).
 */
export function PriceExcelActions() {
  const t = useT();
  const language = useLanguage();
  const readOnly = useReadOnly();
  const { can, canSee } = usePermissions();
  const run = useMutationToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PriceImportPreview | null>(null);
  const [download, { isLoading: downloading }] = useDownloadPriceListMutation();
  const [check, { isLoading: checking }] = usePreviewPriceImportMutation();
  const canDownload = can("masterdata.pricelist.view") && canSee("rates");
  const canUpload = can("masterdata.pricelist.manage") && !readOnly;
  if (!canDownload && !canUpload) return null;

  const onFile = async (chosen: File) => {
    if (inputRef.current) inputRef.current.value = "";
    try {
      const p = await check(chosen).unwrap();
      setFile(chosen);
      setPreview(p);
    } catch (error) {
      toast.error(
        errorCode(error) === "FILE_TOO_LARGE"
          ? t("masterData.priceImport.tooLarge")
          : getErrorMessage(error, language),
      );
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={checking}>
            <FileSpreadsheet data-icon="inline-start" />
            {checking ? t("masterData.priceImport.checking") : t("masterData.priceImport.button")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canDownload ? (
            <DropdownMenuItem
              disabled={downloading}
              onSelect={() =>
                void run(() => download().unwrap(), { success: t("masterData.priceImport.downloaded") })
              }
            >
              <Download />
              {t("masterData.priceImport.download")}
            </DropdownMenuItem>
          ) : null}
          {canUpload ? (
            <DropdownMenuItem onSelect={() => inputRef.current?.click()}>
              <Upload />
              {t("masterData.priceImport.upload")}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {canUpload ? (
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-label={t("masterData.priceImport.uploadAria")}
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            if (chosen) void onFile(chosen);
          }}
        />
      ) : null}
      <PriceImportPreviewDialog
        preview={preview}
        file={file}
        onClose={() => {
          setPreview(null);
          setFile(null);
        }}
      />
    </>
  );
}
