"use client";

import { useGetCompanySettingsQuery } from "@/api/services/company.api";
import { QueryState } from "@/components/common/QueryState";
import { PageHeader } from "@/components/layout/PageHeader";
import { RequireAccess } from "@/components/common/RequireAccess";
import { CompanySettingsForm } from "@/features/company/components/CompanySettingsForm";
import { useT } from "@/i18n/useT";

export default function AlertsLimitsPage() {
  const t = useT();
  const query = useGetCompanySettingsQuery();
  return (
    <RequireAccess permission="company.settings.manage">
      <PageHeader
        title={t("teamCompany.settings.title")}
        description={t("teamCompany.settings.desc")}
        breadcrumbs={[{ label: t("crumb.settings") }, { label: t("teamCompany.settings.title") }]}
      />
      <QueryState query={query}>{(settings) => <CompanySettingsForm settings={settings} />}</QueryState>
    </RequireAccess>
  );
}
