import { ComingSoonRoute } from "@/components/common/ComingSoon";
import { RequireAccess } from "@/components/common/RequireAccess";
import { isReportName, REPORTS } from "@/features/reports/reports.config";
import { ReportView } from "@/features/reports/views/ReportView";

/** One page per report; names the API doesn't have yet (Delay Analysis) stay "coming soon". */
export default async function Page({ params }: PageProps<"/reports/[report]">) {
  const { report } = await params;
  if (!isReportName(report)) return <ComingSoonRoute />;
  return (
    <RequireAccess {...REPORTS[report].access}>
      <ReportView name={report} />
    </RequireAccess>
  );
}
