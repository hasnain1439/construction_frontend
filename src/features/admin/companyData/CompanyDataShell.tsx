"use client";

import { Building2, ShieldAlert, X } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StartActAsDialog } from "../actAs/StartActAsDialog";
import { useCompanyData } from "./useCompanyData";

/**
 * Every Company data screen (opened from the sidebar) starts with the company (tenant)
 * picker. Choosing a company asks for a reason and starts a read-only support session (the
 * owner is notified); then this same screen shows that company's data, and switching keeps the
 * screen. The red banner above (ActAsBanner) shows the mode and time left. Changes need write
 * mode, go through the company's own rules and are logged with the super admin's name + reason.
 */
export function CompanyDataShell({ children }: { children: ReactNode }) {
  const d = useCompanyData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <ShieldAlert className="size-4 shrink-0 text-warning" aria-hidden />
          <span className="font-medium">Company</span>
          {d.company ? <StatusBadge domain="tenant" value={d.company.tenantStatus} /> : null}
          {d.projectId && d.project.data ? (
            <span className="text-muted-foreground">/ {d.project.data.name}</span>
          ) : null}
          <span className="hidden text-muted-foreground lg:inline">
            — support session; the owner is notified and every change is logged.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={d.tenantId ?? ""} onValueChange={d.choose}>
            <SelectTrigger className="w-full bg-card sm:w-72" aria-label="Company">
              <SelectValue placeholder={d.tenants.isLoading ? "Loading companies…" : "Choose a company"} />
            </SelectTrigger>
            <SelectContent>
              {(d.tenants.data?.items ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {d.tenantId ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="End the support session and clear the company"
              title="End the support session and clear the company"
              onClick={d.exit}
            >
              <X />
            </Button>
          ) : null}
        </div>
      </div>

      {!d.ready ? (
        <Skeleton className="h-40 w-full" />
      ) : !d.tenantId ? (
        <EmptyState
          icon={Building2}
          title="Choose a company"
          description="Pick a company (tenant) above and give a reason. You start read-only; switch to write mode (with a second reason) to add, edit or delete."
        />
      ) : d.me.isError ? (
        <EmptyState
          icon={Building2}
          title="Could not open this company"
          description="It may have been removed. Choose another company above."
        />
      ) : !d.meMatches ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div key={d.tenantId} className="space-y-6">
          {children}
        </div>
      )}
      <StartActAsDialog
        company={d.pending}
        onOpenChange={(open) => !open && d.cancelChoose()}
        onStarted={d.started}
      />
    </div>
  );
}
