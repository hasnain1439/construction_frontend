import { RequireAccess } from "@/components/common/RequireAccess";
import { RoleEditorView } from "@/features/team/views/RoleEditorView";

export default async function Page({ params }: PageProps<"/team/roles/[roleId]">) {
  const { roleId } = await params;
  return (
    <RequireAccess permission="team.member.manage">
      <RoleEditorView roleId={roleId} />
    </RequireAccess>
  );
}
