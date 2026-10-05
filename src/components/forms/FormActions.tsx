"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";

/**
 * Cancel + primary submit. `formId` lets the buttons live outside the <form> (e.g. in a
 * SlideOver footer).
 */
export function FormActions({
  submitLabel,
  onCancel,
  cancelLabel,
  loading,
  disabled,
  formId,
  extra,
  align = "end",
  fullWidth,
  className,
}: {
  submitLabel: string;
  onCancel?: () => void;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  formId?: string;
  /** Extra buttons on the left (e.g. "Save as draft"). */
  extra?: ReactNode;
  align?: "end" | "between";
  /** Single full-width submit (auth forms). */
  fullWidth?: boolean;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={cn("flex flex-wrap items-center gap-2", align === "end" ? "justify-end" : "justify-between", fullWidth && "[&>div]:w-full", className)}>
      {extra ? <div className="flex flex-wrap items-center gap-2">{extra}</div> : null}
      <div className="flex flex-wrap items-center gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel ?? t("common.cancel")}
          </Button>
        ) : null}
        <Button type="submit" form={formId} disabled={loading || disabled} className={fullWidth ? "w-full" : undefined} size={fullWidth ? "lg" : "default"}>
          {loading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
