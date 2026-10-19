"use client";

import { useGetCompanyQuery } from "@/api/services/company.api";
import { QueryState } from "@/components/common/QueryState";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCan } from "@/components/common/PermissionGate";
import { RequireAccess } from "@/components/common/RequireAccess";
import { CompanyProfileForm } from "@/features/company/components/CompanyProfileForm";
import { useT } from "@/i18n/useT";

export default function CompanyProfilePage() {
  const t = useT();
  // No request for a user the gate below turns away (no 403 behind "Not available for you").
  const query = useGetCompanyQuery(undefined, { skip: !useCan("company.settings.manage") });
  return (
    <RequireAccess permission="company.settings.manage">
      <PageHeader title={t("teamCompany.profile.title")} breadcrumbs={[{ label: t("crumb.settings") }, { label: t("teamCompany.profile.title") }]} />
      <QueryState query={query}>{(company) => <CompanyProfileForm company={company} />}</QueryState>
    </RequireAccess>
  );
}
