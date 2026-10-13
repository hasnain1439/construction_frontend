import { Suspense } from "react";
import { RequireAccess } from "@/components/common/RequireAccess";
import { ClientsView } from "@/features/clients/views";

export default function Page() {
  return (
    <Suspense>
      <RequireAccess permission="clients.client.view">
        <ClientsView />
      </RequireAccess>
    </Suspense>
  );
}
