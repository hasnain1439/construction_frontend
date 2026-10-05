"use client";

import { useGetCompanyQuery } from "@/api/services/company.api";
import { QueryState } from "@/components/common/QueryState";
import { PageHeader } from "@/components/layout/PageHeader";
import { RequireAccess } from "@/components/common/RequireAccess";
import { CompanyProfileForm } from "@/features/company/components/CompanyProfileForm";

export default function CompanyProfilePage() {
  const query = useGetCompanyQuery();
  return (
    <RequireAccess roles={["THEKEDAR"]}>
      <PageHeader title="Company Profile" breadcrumbs={[{ label: "Settings" }, { label: "Company Profile" }]} />
      <QueryState query={query}>{(company) => <CompanyProfileForm company={company} />}</QueryState>
    </RequireAccess>
  );
}
