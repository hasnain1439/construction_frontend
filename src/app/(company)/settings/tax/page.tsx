"use client";

import { useGetTaxSettingsQuery } from "@/api/services/tax.api";
import { QueryState } from "@/components/common/QueryState";
import { RequireAccess } from "@/components/common/RequireAccess";
import { PageHeader } from "@/components/layout/PageHeader";
import { TaxSettingsForm } from "@/features/tax/components/TaxSettingsForm";
import { useT } from "@/i18n/useT";

/** Loads only behind the gate: without tax.view the page shows "Not available" and no 403 toast (QA-B-32). */
function TaxSettingsContent() {
  const query = useGetTaxSettingsQuery();
  return <QueryState query={query}>{(settings) => <TaxSettingsForm settings={settings} />}</QueryState>;
}

/** Settings → Tax (Step 18): off by default; owner / Administrator change it, the Accountant reads it. */
export default function TaxSettingsPage() {
  const t = useT();
  return (
    <RequireAccess permission="tax.view">
      <PageHeader title={t("tax.settings.title")} description={t("tax.settings.desc")} breadcrumbs={[{ label: t("crumb.settings") }, { label: t("tax.settings.title") }]} />
      <TaxSettingsContent />
    </RequireAccess>
  );
}
