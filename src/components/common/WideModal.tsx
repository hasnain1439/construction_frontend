"use client";

import { XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n/useT";

export interface WideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Sticky footer (Save / Cancel). */
  footer?: ReactNode;
  /** Prevent closing while a save is running. */
  busy?: boolean;
  /** data-testid of the dialog. */
  testId?: string;
}

/**
 * Centered, wide modal (90vw, at most max-w-6xl) for multi-tab create / edit forms: a fixed header, a
 * scrollable body and a sticky footer. Full width (minus a 16px gutter) on phones.
 */
export function WideModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  busy,
  testId,
}: WideModalProps) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={(next) => (!busy ? onOpenChange(next) : undefined)}>
      <DialogContent
        showCloseButton={false}
        data-testid={testId}
        className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:w-[90vw] sm:max-w-6xl"
        onInteractOutside={(e) => (busy ? e.preventDefault() : undefined)}
      >
        <div className="relative space-y-1 border-b px-4 py-4 pe-12 sm:px-6">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" className="absolute end-3 top-3" disabled={busy}>
              <XIcon aria-hidden />
              <span className="sr-only">{t("common.close")}</span>
            </Button>
          </DialogClose>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer ? <div className="border-t bg-card px-4 py-3 sm:px-6">{footer}</div> : null}
      </DialogContent>
    </Dialog>
  );
}
