import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { OpeningBalancesView } from "@/features/onboarding/views/OpeningBalancesView";

export const metadata: Metadata = { title: "Opening balances" };

export default function OpeningBalancesPage() {
  return (
    <RequireAccess permission="company.opening.manage">
      <OpeningBalancesView />
    </RequireAccess>
  );
}
