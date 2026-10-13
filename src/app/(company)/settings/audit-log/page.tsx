import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { CompanyAuditLogView } from "@/features/company/views/CompanyAuditLogView";

export const metadata: Metadata = { title: "Audit log" };

export default function AuditLogPage() {
  return (
    <RequireAccess permission="company.audit.view">
      <CompanyAuditLogView />
    </RequireAccess>
  );
}
