import { AuthLayout } from "@/features/auth/components/AuthLayout";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return <AuthLayout>{children}</AuthLayout>;
}
