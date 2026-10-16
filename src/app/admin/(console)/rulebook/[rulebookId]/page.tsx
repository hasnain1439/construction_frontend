import { AdminRulebookDetailView } from "@/features/admin/views/AdminRulebookView";

export default async function Page({ params }: PageProps<"/admin/rulebook/[rulebookId]">) {
  const { rulebookId } = await params;
  return <AdminRulebookDetailView rulebookId={rulebookId} />;
}
