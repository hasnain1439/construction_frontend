"use client";

import { PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";
import { useLogout } from "../hooks/useLogout";
import { AuthCard } from "../components/AuthLayout";

/** Shown on 403 COMPANY_SUSPENDED. Signing out still works for a suspended company. */
export function SuspendedView() {
  const t = useT();
  const { signOut, isLoading } = useLogout();
  return (
    <AuthCard
      title={t("app.auth.suspendedTitle")}
      icon={
        <span className="flex size-11 items-center justify-center rounded-xl bg-danger-soft text-danger">
          <PauseCircle className="size-6" aria-hidden />
        </span>
      }
      description={t("app.auth.suspendedDesc")}
    >
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">{t("app.auth.suspendedMulti")}</p>
        <Button className="w-full" variant="outline" disabled={isLoading} onClick={() => void signOut()}>
          {t("app.auth.signOut")}
        </Button>
      </div>
    </AuthCard>
  );
}
