"use client";

import { Eye, LogOut, PencilLine, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useChangeActAsModeMutation, useGetActAsSessionQuery } from "@/api/services/admin/actAs.api";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { useActingSession } from "@/lib/actingCompany";
import { DATA_BASE } from "@/lib/companyRoutes";
import { REASON_MAX, REASON_MIN } from "./StartActAsDialog";
import { useActAsSwitch, useTimeLeft } from "./useActAs";

/**
 * Persistent red bar on every admin console page while the super admin works inside a company:
 * "Acting as <company> · read-only · 42 min left · End", with the write-mode switch (second
 * reason) and End. Leaves the company by itself when the session expires or is ended elsewhere.
 */
export function ActAsBanner() {
  const t = useT();
  const pathname = usePathname();
  const sessionId = useActingSession();
  const id = sessionId === "pending" ? null : sessionId;
  const { data: session, error } = useGetActAsSessionQuery(id ?? "", { skip: !id });
  const { leave, forget, ending } = useActAsSwitch();
  const left = useTimeLeft(session?.status === "ACTIVE" ? session.expiresAt : null);
  const [changeMode, { isLoading: switching }] = useChangeActAsModeMutation();
  const run = useMutationToast();
  const [dialog, setDialog] = useState<"write" | "end" | null>(null);
  const [writeReason, setWriteReason] = useState("");
  const handled = useRef<string | null>(null);

  // Expired, ended elsewhere or unknown: leave the company (once).
  const finished =
    Boolean(id) &&
    ((session && (session.status !== "ACTIVE" || left === 0)) ||
      (error && "status" in error && error.status === 404));
  useEffect(() => {
    if (!finished || handled.current === id) return;
    handled.current = id;
    toast.error(session?.status === "ENDED" ? t("actAs.ended") : t("actAs.expiredToast"), {
      id: "act-as-session",
    });
    forget();
  }, [finished, forget, id, session?.status, t]);

  if (!id || !session || session.id !== id) return null;

  const minutes = left === null ? 0 : Math.ceil(left / 60_000);
  const timeText =
    left === 0
      ? t("actAs.expired")
      : left !== null && left < 60_000
        ? t("actAs.underMinute")
        : t("actAs.minutesLeft", { n: minutes });
  const writing = session.mode === "WRITE";
  const trimmed = writeReason.trim();
  const inData = pathname === DATA_BASE || pathname.startsWith(`${DATA_BASE}/`);

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        data-testid="act-as-banner"
        className="relative z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-danger px-3 py-2 text-sm text-white sm:px-4"
      >
        <div
          className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
          title={session.writeReason ?? session.reason}
        >
          <ShieldAlert className="size-4 shrink-0" aria-hidden />
          <span className="font-semibold">{t("actAs.bannerActing", { company: session.tenant.name })}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold tracking-wide uppercase">
            {writing ? (
              <PencilLine className="size-3.5" aria-hidden />
            ) : (
              <Eye className="size-3.5" aria-hidden />
            )}
            {writing ? t("actAs.write") : t("actAs.readOnly")}
          </span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">{timeText}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!inData ? (
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/15 hover:text-white"
            >
              <Link href={`${DATA_BASE}/dashboard`}>{t("actAs.goToCompany")}</Link>
            </Button>
          ) : null}
          {writing ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/15 hover:text-white"
              disabled={switching}
              onClick={() =>
                void run(() => changeMode({ id: session.id, body: { mode: "READ_ONLY" } }).unwrap(), {
                  success: t("actAs.readOnlyOn"),
                })
              }
            >
              <Eye data-icon="inline-start" />
              {t("actAs.backToReadOnly")}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/15 hover:text-white"
              onClick={() => setDialog("write")}
            >
              <PencilLine data-icon="inline-start" />
              {t("actAs.enableWrite")}
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            className="bg-white text-danger hover:bg-white/90"
            disabled={ending}
            onClick={() => setDialog("end")}
          >
            <LogOut data-icon="inline-start" />
            {t("actAs.end")}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={dialog === "write"}
        onOpenChange={(o) => {
          if (!o) {
            setDialog(null);
            setWriteReason("");
          }
        }}
        title={t("actAs.writeTitle")}
        description={t("actAs.writeDescription")}
        confirmLabel={t("actAs.writeConfirm")}
        loading={switching}
        confirmDisabled={trimmed.length < REASON_MIN || trimmed.length > REASON_MAX}
        onConfirm={async () => {
          const ok = await run(
            () => changeMode({ id: session.id, body: { mode: "WRITE", reason: trimmed } }).unwrap(),
            { success: t("actAs.writeOn") },
          );
          if (ok) {
            setDialog(null);
            setWriteReason("");
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="act-as-write-reason">
            {t("actAs.writeReasonLabel")}
            <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="act-as-write-reason"
            rows={3}
            maxLength={REASON_MAX}
            value={writeReason}
            onChange={(e) => setWriteReason(e.target.value)}
            placeholder={t("actAs.writeReasonPlaceholder")}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">{t("actAs.reasonHint")}</p>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "end"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={t("actAs.endTitle")}
        description={t("actAs.endDescription", { company: session.tenant.name })}
        confirmLabel={t("actAs.endConfirm")}
        loading={ending}
        onConfirm={async () => {
          await leave();
          setDialog(null);
          toast.success(t("actAs.ended"));
        }}
      />
    </>
  );
}
