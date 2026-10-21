"use client";

import { FileSpreadsheet } from "lucide-react";
import { useId, useState } from "react";
import type { ImportResult, OpeningImportEntity, OpeningKind } from "@/api/types";
import { useCan } from "@/components/common/PermissionGate";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ImportWizard } from "@/features/onboarding/components/ImportWizard";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useT, type TranslationKey } from "@/i18n/useT";
import { cn } from "@/lib/cn";

/** One Excel import per kind of opening balance (each has its own template columns). */
const KINDS: Array<{ entity: OpeningImportEntity; kind: OpeningKind }> = [
  { entity: "opening-stock", kind: "STORE_STOCK" },
  { entity: "opening-udhaar", kind: "SUPPLIER_UDHAAR" },
  { entity: "opening-cash", kind: "CASH_IN_HAND" },
  { entity: "opening-peshgi", kind: "WORKER_PESHGI" },
];
const kindLabel = (k: OpeningKind) => `opening.kind${k}` as TranslationKey;
const kindHint = (k: OpeningKind) => `opening.hint${k}` as TranslationKey;

/**
 * Opening balances from Excel: the same popup and steps as the other imports (ImportWizard), with
 * the kind chosen first in step 1. Every row is saved and locked like a single opening balance.
 */
export function OpeningImportWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const id = useId();
  const [entity, setEntity] = useState<OpeningImportEntity>("opening-stock");

  const doneText = (r: ImportResult) =>
    r.skipped
      ? t("opening.importedSkipped", { n: r.created, skipped: r.skipped })
      : t("opening.imported", { n: r.created });

  return (
    <ImportWizard
      entity={entity}
      open={open}
      onOpenChange={onOpenChange}
      title={t("opening.importTitle")}
      description={t("opening.importDesc")}
      doneText={doneText}
      chooser={({ locked }) => (
        <section className="space-y-2">
          <h3 id={`${id}-title`} className="text-sm font-semibold">
            {t("opening.importKindTitle")}
          </h3>
          <RadioGroup
            aria-labelledby={`${id}-title`}
            value={entity}
            disabled={locked}
            className="sm:grid-cols-2"
            // The wizard clears a file checked for the previous kind.
            onValueChange={(next) => setEntity(next as OpeningImportEntity)}
          >
            {KINDS.map(({ entity: value, kind }) => (
              <label
                key={value}
                htmlFor={`${id}-${value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border p-3",
                  value === entity && "border-primary bg-primary/5",
                )}
              >
                <RadioGroupItem id={`${id}-${value}`} value={value} className="mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{t(kindLabel(kind))}</span>
                  <span className="block text-xs text-muted-foreground">{t(kindHint(kind))}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </section>
      )}
    />
  );
}

/** "Import from Excel" on the Opening balances page (same look as the other imports). */
export function OpeningImportButton() {
  const t = useT();
  const readOnly = useReadOnly();
  const allowed = useCan("company.opening.manage") && !readOnly;
  const [open, setOpen] = useState(false);
  if (!allowed) return null;
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet data-icon="inline-start" />
        {t("opening.importButton")}
      </Button>
      <OpeningImportWizard open={open} onOpenChange={setOpen} />
    </>
  );
}
