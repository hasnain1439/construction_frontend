import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { OfficeExpensesView } from "@/features/finance/views/OfficeExpensesView";

export const metadata: Metadata = { title: "Office Expenses" };

export default function Page() {
  return (
    <RequireAccess permission="finance.officeexpense.view">
      <OfficeExpensesView />
    </RequireAccess>
  );
}
