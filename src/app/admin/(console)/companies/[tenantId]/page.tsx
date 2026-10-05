import { CompanyDetailView } from "@/features/admin/views/CompanyDetailView";

export default async function Page({ params }: PageProps<"/admin/companies/[tenantId]">) {
  const { tenantId } = await params;
  return <CompanyDetailView tenantId={tenantId} />;
}
