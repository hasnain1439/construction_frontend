import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { CompanyAccountsView } from "@/features/finance/views/CompanyAccountsView";

export const metadata: Metadata = { title: "Accounts" };

export default function Page() {
  return (
    <RequireAccess permission="finance.account.view">
      <CompanyAccountsView />
    </RequireAccess>
  );
}
