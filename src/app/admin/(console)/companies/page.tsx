import { Suspense } from "react";
import { CompaniesView } from "@/features/admin/views/CompaniesView";

export default function Page() {
  return (
    <Suspense>
      <CompaniesView />
    </Suspense>
  );
}
