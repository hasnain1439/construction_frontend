"use client";

import { useGetCompanySettingsQuery } from "@/api/services/company.api";
import { QueryState } from "@/components/common/QueryState";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCan } from "@/components/common/PermissionGate";
import { RequireAccess } from "@/components/common/RequireAccess";
import { CompanySettingsForm } from "@/features/company/components/CompanySettingsForm";
import { RamadanSettingsCard } from "@/features/schedule/components/RamadanSettingsCard";
import { useT } from "@/i18n/useT";

export default function AlertsLimitsPage() {
  const t = useT();
  // No request for a user the gate below turns away (no 403 behind "Not available for you").
  const query = useGetCompanySettingsQuery(undefined, { skip: !useCan("company.settings.manage") });
  return (
    <RequireAccess permission="company.settings.manage">
      <PageHeader
        title={t("teamCompany.settings.title")}
        description={t("teamCompany.settings.desc")}
        breadcrumbs={[{ label: t("crumb.settings") }, { label: t("teamCompany.settings.title") }]}
      />
      <QueryState query={query}>
        {(settings) => (
          <div className="space-y-6">
            <CompanySettingsForm settings={settings} />
            <RamadanSettingsCard settings={settings} />
          </div>
        )}
      </QueryState>
    </RequireAccess>
  );
}
