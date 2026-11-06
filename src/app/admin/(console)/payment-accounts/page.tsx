import { Suspense } from "react";
import { PaymentAccountsView } from "@/features/admin/views/PaymentAccountsView";

export default function Page() {
  return (
    <Suspense>
      <PaymentAccountsView />
    </Suspense>
  );
}
