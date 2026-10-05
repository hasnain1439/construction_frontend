import { Suspense } from "react";
import { AuditLogsView } from "@/features/admin/views/AuditLogsView";

export default function Page() {
  return (
    <Suspense>
      <AuditLogsView />
    </Suspense>
  );
}
