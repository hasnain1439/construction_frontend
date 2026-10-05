import { AdminShell } from "@/components/layout/AdminShell";

export default function AdminConsoleLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
