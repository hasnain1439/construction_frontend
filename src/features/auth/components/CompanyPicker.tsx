"use client";

import { Building2, ChevronRight, Loader2 } from "lucide-react";
import type { CompanyChoice } from "@/api/types";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useT } from "@/i18n/useT";

/** Company list shown after 409 MULTIPLE_COMPANIES. */
export function CompanyPicker({
  companies,
  onPick,
  pendingTenantId,
}: {
  companies: CompanyChoice[];
  onPick: (tenantId: string) => void;
  pendingTenantId?: string | null;
}) {
  const t = useT();
  return (
    <ul className="space-y-2">
      {companies.map((company) => (
        <li key={company.tenantId}>
          <button
            type="button"
            onClick={() => onPick(company.tenantId)}
            disabled={Boolean(pendingTenantId)}
            className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-start transition-colors hover:border-primary/50 hover:bg-accent/50 disabled:opacity-60"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
              <Building2 className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 space-y-1">
              <span className="block truncate text-sm font-semibold">{company.name}</span>
              <StatusBadge tone="info" label={t(`role.${company.role}`)} className="h-5 px-2 text-[11px]" />
            </span>
            {pendingTenantId === company.tenantId ? (
              <Loader2 className="size-5 animate-spin text-primary" aria-label={t("app.auth.signingIn")} />
            ) : (
              <ChevronRight className="size-5 text-muted-foreground rtl:-scale-x-100" aria-hidden />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
