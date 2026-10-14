"use client";

import { Building2 } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyPicker } from "./CompanyPicker";
import { useCompanyData } from "./useCompanyData";

/**
 * Every Company data screen (opened from the sidebar) starts with the company (tenant)
 * picker. Choosing a company opens it directly with full access; this same screen then shows
 * that company's data, and switching keeps the screen. Changes go through the company's own
 * rules and are logged in its audit log with the super admin's name.
 */
export function CompanyDataShell({ children }: { children: ReactNode }) {
  const d = useCompanyData();

  return (
    <div className="space-y-6">
      <CompanyPicker
        companies={d.tenants.data?.items ?? []}
        loading={d.tenants.isLoading}
        selected={d.company}
        projectName={d.projectId ? d.project.data?.name : undefined}
        onChoose={d.choose}
        onExit={d.exit}
      />

      {!d.ready ? (
        <Skeleton className="h-40 w-full" />
      ) : !d.tenantId ? (
        <EmptyState
          icon={Building2}
          title="Choose a company"
          description="Pick a company (tenant) above to open it. You can view, add, edit and delete as its owner would; every change is logged in its audit log."
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
    </div>
  );
}
