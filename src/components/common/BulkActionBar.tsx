"use client";

import { X } from "lucide-react";
import { useState } from "react";
import type { ApprovalAction, QuickAction } from "@/api/types";
import { Button } from "@/components/ui/button";
import { ActionInputDialog, isDecline, type ActionInput } from "./ApprovalItem";

/** Actions every selected item allows (same action name), in the first item's order. */
export function commonActions(lists: QuickAction[][]): QuickAction[] {
  if (!lists.length) return [];
  const [first, ...rest] = lists;
  return first!.filter((qa) => rest.every((l) => l.some((x) => x.action === qa.action)));
}

/**
 * Sticky bar while items are selected: "3 selected", the actions they all allow (a note /
 * method is asked once for all), and Clear.
 */
export function BulkActionBar({
  count,
  actions,
  onRun,
  onClear,
  busy,
}: {
  count: number;
  actions: QuickAction[];
  onRun: (action: ApprovalAction, input: ActionInput) => Promise<unknown> | void;
  onClear: () => void;
  busy?: boolean;
}) {
  const [asking, setAsking] = useState<QuickAction | null>(null);
  if (!count) return null;
  const run = async (qa: QuickAction, input: ActionInput = {}) => {
    await onRun(qa.action, input);
    setAsking(null);
  };
  return (
    <div role="region" aria-label="Bulk actions" className="sticky bottom-20 z-20 flex flex-wrap items-center gap-2 rounded-full border bg-card px-4 py-2 shadow-lg">
      <span className="text-sm font-medium">{count} selected</span>
      <div className="ml-auto flex flex-wrap gap-2">
        {actions.length ? (
          actions.map((qa) => (
            <Button key={qa.action} size="sm" variant={isDecline(qa.action) ? "outline" : "default"} disabled={busy} onClick={() => (qa.needsNote || qa.needsMethod ? setAsking(qa) : void run(qa))}>
              {qa.label} ({count})
            </Button>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">No action fits all of them — select items of one kind.</span>
        )}
        <Button size="sm" variant="ghost" onClick={onClear} disabled={busy}>
          <X data-icon="inline-start" />
          Clear
        </Button>
      </div>
      <ActionInputDialog action={asking} count={count} busy={busy} onCancel={() => setAsking(null)} onConfirm={(input) => void run(asking!, input)} />
    </div>
  );
}
