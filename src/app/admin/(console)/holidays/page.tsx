import { Suspense } from "react";
import { AdminHolidaysView } from "@/features/admin/views/AdminHolidaysView";

export default function Page() {
  return (
    <Suspense>
      <AdminHolidaysView />
    </Suspense>
  );
}
