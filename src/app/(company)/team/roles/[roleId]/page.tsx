import { RequireAccess } from "@/components/common/RequireAccess";
import { RolesView } from "@/features/team/views/RolesView";

/** Old editor URL: the roles list with that role's modal open. */
export default async function Page({ params }: PageProps<"/team/roles/[roleId]">) {
  const { roleId } = await params;
  return (
    <RequireAccess permission="team.member.manage">
      <RolesView key={roleId} initialRoleId={roleId} />
    </RequireAccess>
  );
}
