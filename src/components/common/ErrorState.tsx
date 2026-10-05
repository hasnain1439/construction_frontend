"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage, useT } from "@/i18n/useT";
import { getErrorMessage } from "@/lib/apiErrors";
import { cn } from "@/lib/cn";

export interface ErrorStateProps {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({ error, title, onRetry, className, compact }: ErrorStateProps) {
  const t = useT();
  const language = useLanguage();
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert className="size-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold">{title ?? t("common.somethingWrong")}</p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{getErrorMessage(error, language)}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw data-icon="inline-start" />
          {t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
}
