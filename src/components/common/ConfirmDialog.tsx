"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  /** Destructive actions get a red button and a warning icon. */
  tone?: "danger" | "default";
  loading?: boolean;
  /** Disable confirm (e.g. a required reason is empty). */
  confirmDisabled?: boolean;
  onConfirm: () => void | Promise<void>;
  /** Extra content (reason field, consequences list …). */
  children?: ReactNode;
}

/** Every destructive action goes through this dialog. The caller closes it on success. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = "danger",
  loading,
  confirmDisabled,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const t = useT();
  return (
    <AlertDialog open={open} onOpenChange={(next) => (!loading ? onOpenChange(next) : undefined)}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          {tone === "danger" ? (
            <AlertDialogMedia className="bg-danger-soft text-danger">
              <TriangleAlert />
            </AlertDialogMedia>
          ) : null}
          <AlertDialogTitle className="text-base font-semibold">{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t("common.cancel")}</AlertDialogCancel>
          <Button
            variant={tone === "danger" ? "destructive" : "default"}
            disabled={loading || confirmDisabled}
            onClick={() => void onConfirm()}
          >
            {loading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
