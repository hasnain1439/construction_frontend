import { RequireAccess } from "@/components/common/RequireAccess";
import type { Metadata } from "next";
import { RulebookSettingsView } from "@/features/estimates/RulebookSettingsView";

export const metadata: Metadata = { title: "Rulebook" };

export default function RulebookPage() {
  return (
    <RequireAccess permission="rulebook.override.view">
      <RulebookSettingsView />
    </RequireAccess>
  );
}
