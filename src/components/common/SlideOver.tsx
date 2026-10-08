"use client";

import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";

export interface SlideOverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** md = 560px, lg = 760px; full width on phones, never wider than the screen. */
  size?: "md" | "lg";
  children: ReactNode;
  /** Sticky footer (FormActions). */
  footer?: ReactNode;
  /** Prevent closing while a save is running. */
  busy?: boolean;
}

/** Right-hand panel used for create / edit forms and details. */
export function SlideOver({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  children,
  footer,
  busy,
}: SlideOverProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => (!busy ? onOpenChange(next) : undefined)}>
      <SheetContent
        side="right"
        // The base Sheet sizes its right panel with `data-[side=right]:` classes (w-3/4, max-w-sm),
        // which beat plain `w-*` — so the overrides must use the same variant.
        className={cn(
          "gap-0 p-0 data-[side=right]:w-full data-[side=right]:max-w-full",
          size === "md"
            ? "data-[side=right]:sm:w-[560px] data-[side=right]:sm:max-w-[calc(100vw-3rem)]"
            : "data-[side=right]:sm:w-[760px] data-[side=right]:sm:max-w-[calc(100vw-3rem)]",
        )}
        onInteractOutside={(e) => (busy ? e.preventDefault() : undefined)}
      >
        <SheetHeader className="border-b px-4 py-4 pr-12 sm:px-6 sm:py-5">
          <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer ? <div className="border-t bg-card px-4 py-3 sm:px-6 sm:py-4">{footer}</div> : null}
      </SheetContent>
    </Sheet>
  );
}
