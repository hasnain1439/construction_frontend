import { Suspense } from "react";
import { CatalogView } from "@/features/admin/views/CatalogView";

export default function Page() {
  return (
    <Suspense>
      <CatalogView />
    </Suspense>
  );
}
