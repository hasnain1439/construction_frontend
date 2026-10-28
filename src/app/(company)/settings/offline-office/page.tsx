import { RequireAccess } from "@/components/common/RequireAccess";
import { OfflineOfficeView } from "@/features/company/views/OfflineOfficeView";

export default function OfflineOfficePage() {
  return (
    <RequireAccess permission="company.settings.manage">
      <OfflineOfficeView />
    </RequireAccess>
  );
}
