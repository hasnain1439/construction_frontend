"use client";

import { useGetCompanySettingsQuery } from "@/api/services/company.api";
import { QueryState } from "@/components/common/QueryState";
import { PageHeader } from "@/components/layout/PageHeader";
import { RequireAccess } from "@/components/common/RequireAccess";
import { CompanySettingsForm } from "@/features/company/components/CompanySettingsForm";

export default function AlertsLimitsPage() {
  const query = useGetCompanySettingsQuery();
  return (
    <RequireAccess roles={["THEKEDAR"]}>
      <PageHeader
        title="Alerts & Limits"
        description="Rules the app uses to warn you and to ask for your approval."
        breadcrumbs={[{ label: "Settings" }, { label: "Alerts & Limits" }]}
      />
      <QueryState query={query}>{(settings) => <CompanySettingsForm settings={settings} />}</QueryState>
    </RequireAccess>
  );
}
