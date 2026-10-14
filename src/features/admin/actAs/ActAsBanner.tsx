"use client";

import { Building2, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { useGetTenantQuery } from "@/api/services/admin/tenants.api";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";
import { useActingTenant } from "@/lib/actingCompany";
import { DATA_BASE } from "@/lib/companyRoutes";
import { useActAsSwitch } from "./useActAs";

/**
 * Small neutral bar on every admin console page while the super admin works inside a company:
 * "Viewing <company> · platform admin · full access · changes are logged", with "Open company"
 * (outside Company data) and "Exit". Access is direct and full — no mode, no timer.
 */
export function ActAsBanner() {
  const t = useT();
  const pathname = usePathname();
  const acting = useActingTenant();
  const id = acting === "pending" ? null : acting;
  const { data: tenant } = useGetTenantQuery(id ?? "", { skip: !id });
  const { leave } = useActAsSwitch();

  if (!id) return null;
  const inData = pathname === DATA_BASE || pathname.startsWith(`${DATA_BASE}/`);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="act-as-banner"
      className="relative z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b bg-muted px-3 py-1.5 text-sm sm:px-4"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="font-medium">{t("actAs.viewing", { company: tenant?.name ?? "…" })}</span>
        <span className="hidden text-muted-foreground sm:inline">· {t("actAs.fullAccess")}</span>
      </div>
      <div className="flex items-center gap-2">
        {!inData ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={`${DATA_BASE}/dashboard`}>{t("actAs.goToCompany")}</Link>
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            leave();
            toast.success(t("actAs.exited"));
          }}
        >
          <LogOut data-icon="inline-start" />
          {t("actAs.exit")}
        </Button>
      </div>
    </div>
  );
}
