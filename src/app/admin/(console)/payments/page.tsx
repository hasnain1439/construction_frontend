import { Suspense } from "react";
import { PaymentsView } from "@/features/admin/views/PaymentsView";

export default function Page() {
  return (
    <Suspense>
      <PaymentsView />
    </Suspense>
  );
}
