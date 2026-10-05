import { RequireAccess } from "@/components/common/RequireAccess";
import { StoreStockView } from "@/features/procurement/views/StoreStockView";

export default function Page() {
  return (
    <RequireAccess roles={["THEKEDAR"]}>
      <StoreStockView />
    </RequireAccess>
  );
}
