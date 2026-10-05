import { RequireAccess } from "@/components/common/RequireAccess";
import { ClientDetailView } from "@/features/clients/views";

export default async function Page({ params }: PageProps<"/sales/clients/[clientId]">) {
  const { clientId } = await params;
  return (
    <RequireAccess roles={["THEKEDAR", "PM"]}>
      <ClientDetailView clientId={clientId} />
    </RequireAccess>
  );
}
