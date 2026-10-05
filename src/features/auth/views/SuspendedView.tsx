"use client";

import { PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout } from "../hooks/useLogout";
import { AuthCard } from "../components/AuthLayout";

/** Shown on 403 COMPANY_SUSPENDED. Signing out still works for a suspended company. */
export function SuspendedView() {
  const { signOut, isLoading } = useLogout();
  return (
    <AuthCard
      title="Company account suspended"
      icon={
        <span className="flex size-11 items-center justify-center rounded-xl bg-danger-soft text-danger">
          <PauseCircle className="size-6" aria-hidden />
        </span>
      }
      description="Access to this company has been paused by the platform. Your records are safe. Please contact support to restore access."
    >
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          If you work for more than one company, sign out and choose the other company when you sign in again.
        </p>
        <Button className="w-full" variant="outline" disabled={isLoading} onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </AuthCard>
  );
}
