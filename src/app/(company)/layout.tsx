import { AppShell } from "@/components/layout/AppShell";

export default function CompanyLayout({ children }: LayoutProps<"/">) {
  return <AppShell mode="company">{children}</AppShell>;
}
