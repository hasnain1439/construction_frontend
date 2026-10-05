import { Suspense } from "react";
import { AdminOverviewView } from "@/features/admin/views/AdminOverviewView";

export default function Page() {
  return (
    <Suspense>
      <AdminOverviewView />
    </Suspense>
  );
}
