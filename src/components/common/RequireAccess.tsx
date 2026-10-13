"use client";

import { ShieldOff } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";
import { canAccess, type AccessRule } from "@/lib/permissions";
import { useMe } from "@/store/hooks";
import { EmptyState } from "./EmptyState";
import { SectionCard } from "./SectionCard";

/**
 * Page-level gate for direct URL visits (the menu already hides the item). Rules use permission
 * keys (`permission`, `anyPermission`, `allPermissions`). The API refuses the data anyway
 * (403 PERMISSION_DENIED); this explains it instead of showing an error.
 */
export function RequireAccess({ children, ...rule }: AccessRule & { children: ReactNode }) {
  const me = useMe();
  const t = useT();
  if (!me) return null;
  if (canAccess(me, rule)) return <>{children}</>;
  return (
    <SectionCard>
      <EmptyState
        icon={ShieldOff}
        title={t("permissions.deniedTitle")}
        description={t("permissions.deniedBody")}
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">{t("permissions.goDashboard")}</Link>
          </Button>
        }
      />
    </SectionCard>
  );
}
