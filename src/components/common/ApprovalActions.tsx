"use client";

import { Check, Loader2, Undo2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

const MIN_COMMENT = 3;

/**
 * Approve + Return (or Reject). Returning / rejecting always asks for a comment (≥ 3
 * characters) — the person who submitted needs to know what to fix.
 */
export function ApprovalActions({
  onApprove,
  onDecline,
  decline = "return",
  approveLabel = "Approve",
  declineLabel,
  approving,
  declining,
  disabled,
  size = "default",
  className,
}: {
  onApprove: () => void | Promise<unknown>;
  onDecline: (comment: string) => void | Promise<unknown>;
  decline?: "return" | "reject";
  approveLabel?: string;
  declineLabel?: string;
  approving?: boolean;
  declining?: boolean;
  disabled?: boolean;
  size?: "default" | "sm";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const label = declineLabel ?? (decline === "return" ? "Return" : "Reject");
  const tooShort = comment.trim().length < MIN_COMMENT;
  const busy = approving || declining;

  const submit = async () => {
    if (tooShort) return;
    try {
      await onDecline(comment.trim());
      setOpen(false);
      setComment("");
    } catch {
      // the caller shows the error; keep the dialog open
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button type="button" size={size} onClick={() => void onApprove()} disabled={disabled || busy}>
        {approving ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
        {approveLabel}
      </Button>
      <Button type="button" size={size} variant="outline" onClick={() => setOpen(true)} disabled={disabled || busy}>
        {decline === "return" ? <Undo2 aria-hidden /> : <X aria-hidden />}
        {label}
      </Button>
      <Dialog open={open} onOpenChange={(next) => (!declining ? setOpen(next) : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>{decline === "return" ? "Say what needs fixing — it goes back to whoever submitted it." : "Say why — the person who entered it will see this."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="approval-comment">Comment</Label>
            <Textarea id="approval-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={500} aria-invalid={comment.length > 0 && tooShort} />
            {comment.length > 0 && tooShort ? <p className="text-xs text-danger">Write at least {MIN_COMMENT} characters.</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={declining}>
              Cancel
            </Button>
            <Button type="button" variant={decline === "reject" ? "destructive" : "default"} onClick={() => void submit()} disabled={tooShort || declining}>
              {declining ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
