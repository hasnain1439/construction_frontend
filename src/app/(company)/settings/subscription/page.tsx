import type { Metadata } from "next";
import { RequireAccess } from "@/components/common/RequireAccess";
import { SubscriptionView } from "@/features/subscription/views/SubscriptionView";

export const metadata: Metadata = { title: "Subscription" };

export default function SubscriptionPage() {
  return (
    <RequireAccess roles={["THEKEDAR"]}>
      <SubscriptionView />
    </RequireAccess>
  );
}
