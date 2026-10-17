"use client";

import { useGetTaxSettingsQuery } from "@/api/services/tax.api";
import { QueryState } from "@/components/common/QueryState";
import { useCan } from "@/components/common/PermissionGate";
import { RequireAccess } from "@/components/common/RequireAccess";
import { PageHeader } from "@/components/layout/PageHeader";
import { TaxSettingsForm } from "@/features/tax/components/TaxSettingsForm";
import { useT } from "@/i18n/useT";

/** Settings → Tax (Step 18): off by default; owner / Administrator change it, the Accountant reads it. */
export default function TaxSettingsPage() {
  const t = useT();
  // No request for a user the gate below turns away (no 403 behind "Not available for you").
  const query = useGetTaxSettingsQuery(undefined, { skip: !useCan("tax.view") });
  return (
    <RequireAccess permission="tax.view">
      <PageHeader title={t("tax.settings.title")} description={t("tax.settings.desc")} breadcrumbs={[{ label: t("crumb.settings") }, { label: t("tax.settings.title") }]} />
      <QueryState query={query}>{(settings) => <TaxSettingsForm settings={settings} />}</QueryState>
    </RequireAccess>
  );
}
