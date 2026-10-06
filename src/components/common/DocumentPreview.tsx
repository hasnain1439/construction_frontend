"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** A PDF in an iframe (signed URL), with an "open in a new tab" fallback for phones. */
export function DocumentPreview({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="flex h-[90dvh] max-w-4xl flex-col gap-3 sm:max-w-4xl">
        <DialogHeader className="flex-row items-center justify-between gap-3 pr-8">
          <DialogTitle>{title}</DialogTitle>
          <Button asChild size="sm" variant="outline">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink data-icon="inline-start" />
              Open
            </a>
          </Button>
        </DialogHeader>
        <iframe src={url} title={title} className="min-h-0 w-full flex-1 rounded-lg border bg-muted" />
      </DialogContent>
    </Dialog>
  );
}
