import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { PriceListView } from "@/features/master-data/views/PriceListView";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess roles={["THEKEDAR", "PM"]} permission="rates.view">
        <PriceListView />
      </RequireAccess>
    </Suspense>
  );
}
