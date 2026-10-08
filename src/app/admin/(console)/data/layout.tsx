import { CompanyDataShell } from "@/features/admin/companyData/CompanyDataShell";

export default function CompanyDataLayout({ children }: LayoutProps<"/admin/data">) {
  return <CompanyDataShell>{children}</CompanyDataShell>;
}
