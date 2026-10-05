"use client";

import { Laptop, LogOut, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useGetSessionsQuery } from "@/api/services/auth.api";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ErrorState } from "@/components/common/ErrorState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage, useT } from "@/i18n/useT";
import { getErrorMessage } from "@/lib/apiErrors";
import { formatRelative } from "@/lib/dates";
import { useLogout } from "../hooks/useLogout";

/** Where the signed-in user is logged in (GET /auth/sessions) + sign out everywhere. */
export function SessionsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const language = useLanguage();
  const { data, isLoading, error, refetch } = useGetSessionsQuery(undefined, { skip: !open });
  const { signOutEverywhere, isLoading: signingOut } = useLogout();
  const [confirm, setConfirm] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{t("shell.sessions")}</DialogTitle>
            <DialogDescription>Devices and browsers where you are signed in.</DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <TableSkeleton rows={3} columns={2} />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} compact />
          ) : (
            <ul className="divide-y rounded-xl border">
              {(data ?? []).map((session) => {
                const Icon = session.platform === "WEB" ? Laptop : Smartphone;
                return (
                  <li key={session.id} className="flex items-center gap-3 px-4 py-3">
                    <Icon className="size-5 text-muted-foreground" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {session.platform === "WEB" ? "Web browser" : (session.model ?? session.platform)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {session.ip ?? "Unknown IP"} · active {formatRelative(session.lastActiveAt)}
                      </p>
                    </div>
                    {session.current ? <StatusBadge tone="info" label="This device" /> : null}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex justify-end">
            <Button variant="destructive-soft" onClick={() => setConfirm(true)}>
              <LogOut data-icon="inline-start" />
              Sign out everywhere
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Sign out everywhere?"
        description="Every device — including this one — will need to sign in again."
        confirmLabel="Sign out everywhere"
        loading={signingOut}
        onConfirm={async () => {
          try {
            await signOutEverywhere();
          } catch (err) {
            toast.error(getErrorMessage(err, language));
          }
        }}
      />
    </>
  );
}
