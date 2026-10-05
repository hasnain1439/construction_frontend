import { Suspense } from "react";
import { PlansView } from "@/features/admin/views/PlansView";

export default function Page() {
  return (
    <Suspense>
      <PlansView />
    </Suspense>
  );
}
