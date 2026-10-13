import { RequireAccess } from "@/components/common/RequireAccess";
import { ClientDetailView } from "@/features/clients/views";

export default async function Page({ params }: PageProps<"/sales/clients/[clientId]">) {
  const { clientId } = await params;
  return (
    <RequireAccess permission="clients.client.view">
      <ClientDetailView clientId={clientId} />
    </RequireAccess>
  );
}
