"use client";

import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";

export interface SlideOverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** md = 480px, lg = 640px (design brief §1). */
  size?: "md" | "lg";
  children: ReactNode;
  /** Sticky footer (FormActions). */
  footer?: ReactNode;
  /** Prevent closing while a save is running. */
  busy?: boolean;
}

/** Right-hand panel used for create / edit forms and details. */
export function SlideOver({ open, onOpenChange, title, description, size = "md", children, footer, busy }: SlideOverProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => (!busy ? onOpenChange(next) : undefined)}>
      <SheetContent
        side="right"
        className={cn(
          "w-full gap-0 p-0 sm:max-w-none",
          size === "md" ? "sm:w-[480px]" : "sm:w-[640px]",
        )}
        onInteractOutside={(e) => (busy ? e.preventDefault() : undefined)}
      >
        <SheetHeader className="border-b px-6 py-5 pr-12">
          <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <div className="border-t bg-card px-6 py-4">{footer}</div> : null}
      </SheetContent>
    </Sheet>
  );
}
