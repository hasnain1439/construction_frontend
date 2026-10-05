import { SupplierDetailView } from "@/features/master-data/views/SupplierDetailView";

export default async function Page({ params }: PageProps<"/suppliers-stock/suppliers/[supplierId]">) {
  const { supplierId } = await params;
  return <SupplierDetailView supplierId={supplierId} />;
}
