import { notFound } from "next/navigation";
import { matchCompanyRoute, type CompanyPageComponent } from "@/lib/companyRoutes";
import { COMPANY_ROUTES } from "@/lib/companyRoutes.generated";

/**
 * /admin/data/<company path> — the company app's own page for <company path>, shown inside
 * the super admin console for the company chosen in the Company data bar (see the layout).
 */
export default async function Page({ params, searchParams }: PageProps<"/admin/data/[[...path]]">) {
  const { path = [] } = await params;
  if (!path.length) return null; // the layout asks to choose a company / shows the sections
  const match = matchCompanyRoute(
    COMPANY_ROUTES,
    path.map((p) => decodeURIComponent(p)),
  );
  if (!match) notFound();
  const CompanyPage = (await match.route.load()).default as CompanyPageComponent;
  return <CompanyPage params={Promise.resolve(match.params)} searchParams={searchParams} />;
}
