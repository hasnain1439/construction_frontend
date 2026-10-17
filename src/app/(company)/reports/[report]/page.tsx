import { ComingSoonRoute } from "@/components/common/ComingSoon";
import { RequireAccess } from "@/components/common/RequireAccess";
import { isReportName, isStep18Report, REPORTS } from "@/features/reports/reports.config";
import { ReportView } from "@/features/reports/views/ReportView";
import { Step18ReportView } from "@/features/reports/views/Step18ReportView";

/** One page per report: the Phase 1 tables and the Step 18 reports (charts + project books). */
export default async function Page({ params }: PageProps<"/reports/[report]">) {
  const { report } = await params;
  if (!isReportName(report)) return <ComingSoonRoute />;
  return <RequireAccess {...REPORTS[report].access}>{isStep18Report(report) ? <Step18ReportView name={report} /> : <ReportView name={report} />}</RequireAccess>;
}
