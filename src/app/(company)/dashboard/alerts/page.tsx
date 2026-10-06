import type { Metadata } from "next";
import { AlertsView } from "@/features/dashboard/views/AlertsView";

export const metadata: Metadata = { title: "Alerts & Notifications" };

export default function Page() {
  return <AlertsView />;
}
