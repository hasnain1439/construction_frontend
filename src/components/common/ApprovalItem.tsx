"use client";

import {
  Banknote,
  ClipboardCheck,
  FileText,
  HandCoins,
  Loader2,
  PackageX,
  ReceiptText,
  Ruler,
  Tag,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ApprovalAction, ApprovalItem as Item, ApprovalType, QuickAction } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { MoneyText } from "./MoneyText";
import { SegmentedControl } from "./SegmentedControl";

export const APPROVAL_ICON: Record<ApprovalType, LucideIcon> = {
  SETTLEMENT_SUBMITTED: HandCoins,
  EXPENSE_PENDING_APPROVAL: ReceiptText,
  TOPUP_PENDING: Wallet,
  MEASUREMENT_TO_VERIFY: Ruler,
  SHORTAGE_OPEN: PackageX,
  PURCHASE_PENDING_RATE: Tag,
  STAGE_READY_UNBILLED: ClipboardCheck,
  INVOICE_DRAFT: FileText,
  CHEQUE_PENDING: Banknote,
};

export type FloatMethod = "CASH" | "BANK" | "JAZZCASH" | "EASYPAISA";
export interface ActionInput {
  note?: string;
  method?: FloatMethod;
}

const DECLINE: ApprovalAction[] = ["reject", "return", "bounce"];
export const isDecline = (action: ApprovalAction) => DECLINE.includes(action);
const MIN_NOTE = 3;

export const ageText = (days: number) => (days <= 0 ? "Today" : days === 1 ? "1 day" : `${days} days`);

/**
 * Asks for what an action needs before it runs: a note (reject / return / bounce) and / or
 * how the cash is sent (top-up). Shared by one item and the bulk bar.
 */
export function ActionInputDialog({
  action,
  count = 1,
  onCancel,
  onConfirm,
  busy,
}: {
  action: QuickAction | null;
  count?: number;
  onCancel: () => void;
  onConfirm: (input: ActionInput) => void;
  busy?: boolean;
}) {
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<FloatMethod>("CASH");
  if (!action) return null;
  const noteShort = action.needsNote && note.trim().length < MIN_NOTE;
  return (
    <Dialog open onOpenChange={(open) => (!open && !busy ? onCancel() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action.label}
            {count > 1 ? ` — ${count} items` : ""}
          </DialogTitle>
          <DialogDescription>{action.needsNote ? "Say why — whoever submitted it will see this." : "Choose how the cash is sent."}</DialogDescription>
        </DialogHeader>
        {action.needsMethod ? (
          <div className="space-y-1.5">
            <Label>Send by</Label>
            <SegmentedControl<FloatMethod>
              ariaLabel="Send by"
              value={method}
              onChange={setMethod}
              options={[
                { value: "CASH", label: "Cash" },
                { value: "BANK", label: "Bank" },
                { value: "JAZZCASH", label: "JazzCash" },
                { value: "EASYPAISA", label: "Easypaisa" },
              ]}
            />
          </div>
        ) : null}
        {action.needsNote ? (
          <div className="space-y-1.5">
            <Label htmlFor="approval-note">Note</Label>
            <Textarea id="approval-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={note.length > 0 && noteShort} />
            {note.length > 0 && noteShort ? <p className="text-xs text-danger">Write at least {MIN_NOTE} characters.</p> : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={isDecline(action.action) ? "destructive" : "default"}
            disabled={noteShort || busy}
            onClick={() => onConfirm({ ...(action.needsNote ? { note: note.trim() } : {}), ...(action.needsMethod ? { method } : {}) })}
          >
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {action.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * One waiting item: type icon, title, project, amount (when the caller may see it), age, a
 * link to its page and only the quick actions the API says the caller may run.
 */
export function ApprovalItem({
  item,
  selected,
  onSelect,
  onAction,
  busy,
}: {
  item: Item;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onAction: (item: Item, action: ApprovalAction, input: ActionInput) => Promise<unknown> | void;
  busy?: boolean;
}) {
  const [asking, setAsking] = useState<QuickAction | null>(null);
  const Icon = APPROVAL_ICON[item.type];
  const run = async (qa: QuickAction, input: ActionInput = {}) => {
    await onAction(item, qa.action, input);
    setAsking(null);
  };
  return (
    <li className={cn("flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 sm:flex-nowrap", selected && "border-primary/60 bg-accent/30")}>
      {onSelect ? (
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelect(v === true)}
          aria-label={`Select ${item.title}`}
          disabled={!item.quickActions.length}
        />
      ) : null}
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <Link href={item.actionUrl} className="block truncate text-sm font-medium hover:underline">
          {item.title}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {[item.project?.code, item.subtitle, `waiting ${ageText(item.ageDays).toLowerCase()}`].filter(Boolean).join(" · ")}
        </p>
      </div>
      {item.amountPaisa !== null ? <MoneyText paisa={item.amountPaisa} className="text-sm font-semibold" /> : null}
      <div className="flex shrink-0 flex-wrap gap-2">
        {item.quickActions.map((qa) => (
          <Button
            key={qa.action}
            type="button"
            size="sm"
            variant={isDecline(qa.action) ? "outline" : "default"}
            disabled={busy}
            onClick={() => (qa.needsNote || qa.needsMethod ? setAsking(qa) : void run(qa))}
          >
            {qa.label}
          </Button>
        ))}
        {!item.quickActions.length ? (
          <Button asChild size="sm" variant="outline">
            <Link href={item.actionUrl}>Open</Link>
          </Button>
        ) : null}
      </div>
      <ActionInputDialog action={asking} busy={busy} onCancel={() => setAsking(null)} onConfirm={(input) => void run(asking!, input)} />
    </li>
  );
}
