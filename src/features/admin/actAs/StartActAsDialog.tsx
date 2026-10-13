"use client";

import { useState } from "react";
import { useStartActAsSessionMutation } from "@/api/services/admin/actAs.api";
import type { ActAsSession } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { InlineAlert } from "@/components/common/InlineAlert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";

const DURATIONS = [15, 30, 60, 120] as const;
export const REASON_MIN = 5;
export const REASON_MAX = 300;

/**
 * Opening a company as platform support: a reason (shown to the owner, who is notified by app
 * and email) and a length. The session always starts read-only.
 */
export function StartActAsDialog({
  company,
  onOpenChange,
  onStarted,
}: {
  /** The company to open; null closes the dialog. */
  company: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onStarted: (session: ActAsSession) => void;
}) {
  const t = useT();
  const run = useMutationToast();
  const [start, { isLoading }] = useStartActAsSessionMutation();
  const [reason, setReason] = useState("");
  const [minutes, setMinutes] = useState("60");
  const trimmed = reason.trim();

  return (
    <ConfirmDialog
      open={Boolean(company)}
      onOpenChange={(open) => {
        if (!open) setReason("");
        onOpenChange(open);
      }}
      tone="default"
      title={t("actAs.startTitle", { company: company?.name ?? "" })}
      description={t("actAs.startDescription")}
      confirmLabel={t("actAs.start")}
      loading={isLoading}
      confirmDisabled={trimmed.length < REASON_MIN || trimmed.length > REASON_MAX}
      onConfirm={async () => {
        if (!company) return;
        const session = await run(
          () => start({ tenantId: company.id, reason: trimmed, durationMinutes: Number(minutes) }).unwrap(),
          {
            success: t("actAs.started"),
          },
        );
        if (session) {
          setReason("");
          onStarted(session);
        }
      }}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="act-as-reason">
            {t("actAs.reasonLabel")}
            <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="act-as-reason"
            rows={3}
            maxLength={REASON_MAX}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("actAs.reasonPlaceholder")}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            {t("actAs.reasonHint")}{" "}
            <span className="tabular-nums">
              ({trimmed.length}/{REASON_MAX})
            </span>
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="act-as-minutes">{t("actAs.durationLabel")}</Label>
          <Select value={minutes} onValueChange={setMinutes}>
            <SelectTrigger id="act-as-minutes" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {t("actAs.minutes", { n })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <InlineAlert tone="info">{t("actAs.readOnlyNote")}</InlineAlert>
      </div>
    </ConfirmDialog>
  );
}
