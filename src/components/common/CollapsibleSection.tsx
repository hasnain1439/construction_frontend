"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/cn";

/** Group header (title + count) that expands / collapses its rows. */
export function CollapsibleSection({
  title,
  count,
  meta,
  defaultOpen = true,
  children,
  className,
}: {
  title: ReactNode;
  count?: number;
  meta?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("border-b last:border-b-0", className)}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 bg-muted/40 px-4 py-2.5 text-left text-sm font-semibold hover:bg-muted/70">
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", !open && "-rotate-90")} aria-hidden />
        <span className="flex-1">{title}</span>
        {meta}
        {count !== undefined ? <span className="rounded-full bg-card px-2 text-xs font-medium text-muted-foreground tabular">{count}</span> : null}
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
