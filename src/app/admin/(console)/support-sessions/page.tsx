import { Suspense } from "react";
import { ActAsSessionsView } from "@/features/admin/views/ActAsSessionsView";

export default function Page() {
  return (
    <Suspense>
      <ActAsSessionsView />
    </Suspense>
  );
}
