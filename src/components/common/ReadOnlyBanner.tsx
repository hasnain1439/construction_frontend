"use client";

import { Lock, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { daysUntil } from "@/lib/dates";
import { isThekedar } from "@/lib/permissions";
import { useAppSelector, useMe } from "@/store/hooks";

function Banner({
  tone,
  icon: Icon,
  children,
  action,
}: {
  tone: "neutral" | "warning";
  icon: typeof Lock;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm",
        tone === "warning" ? "border-warning/30 bg-warning-soft text-foreground" : "border-border bg-neutral-soft",
      )}
    >
      <Icon className={cn("size-5 shrink-0", tone === "warning" ? "text-warning" : "text-muted-foreground")} aria-hidden />
      <p className="min-w-0 flex-1 font-medium">{children}</p>
      {action}
    </div>
  );
}

/**
 * With a `message`: a generic read-only banner (e.g. locked project).
 * Without: the company banner — read-only (LAPSED subscription) or grace-period warning.
 */
export function ReadOnlyBanner({ message, action }: { message?: ReactNode; action?: ReactNode }) {
  const t = useT();
  const me = useMe();
  const readOnlyHit = useAppSelector((state) => state.ui.readOnlyHit);

  if (message) {
    return (
      <Banner tone="neutral" icon={Lock} action={action}>
        {message}
      </Banner>
    );
  }
  if (!me) return null;

  const renew = isThekedar(me) ? (
    <Button asChild size="sm">
      <Link href="/settings/subscription">{t("shell.renewNow")}</Link>
    </Button>
  ) : null;

  if (me.tenant.readOnly || readOnlyHit) {
    return (
      <Banner tone="neutral" icon={Lock} action={renew}>
        {t("shell.readOnlyBanner")}
      </Banner>
    );
  }
  if (me.subscription?.status === "GRACE") {
    const left = daysUntil(me.subscription.renewsOn);
    return (
      <Banner tone="warning" icon={TriangleAlert} action={renew}>
        Your subscription period has ended. Renew
        {left !== null && left >= 0 ? ` within ${left} day${left === 1 ? "" : "s"}` : " now"} to keep editing.
      </Banner>
    );
  }
  return null;
}
