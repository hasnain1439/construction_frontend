"use client";

import { Calculator } from "lucide-react";
import Link from "next/link";
import { useGetEstimateQuery } from "@/api/services/projects.api";
import { InfoList } from "@/components/common/InfoList";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/i18n/useT";
import { formatPKRShort } from "@/lib/money";
import { projectHref } from "@/lib/navigation";
import { fmt, fmtUp, steelKgOf, unitText } from "./labels";
import { isEstimateBlocked } from "./warningText";

/** Project overview: the estimate's headline numbers and a link to the full BoQ. */
export function EstimateOverviewCard({ projectId }: { projectId: string }) {
  const t = useT();
  const { data, isLoading } = useGetEstimateQuery(projectId);
  const qty = (m: string) => data?.materials.find((x) => x.material === m)?.quantity ?? 0;
  // QA pass 2 NEW-9: the BoQ total (direct + overheads + contingency), the same number and label as the Estimate tab
  const cost = data?.boqCost ?? data?.cost;
  return (
    <SectionCard
      title={t("projects.mode.boqTitle")}
      description={t("projects.mode.boqDesc")}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={projectHref(projectId, "/planning/estimate")}>
            <Calculator data-icon="inline-start" />
            {t("projects.estimate.overview.open")}
          </Link>
        </Button>
      }
    >
      {isLoading || !data ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <InfoList
          items={[
            {
              label: t("projects.estimate.kpi.totalCost"),
              value: cost ? formatPKRShort(cost.totalPaisa) : "—",
              // QE4: no cost while the estimate is blocked (rooms under half of the covered area)
              hidden: !cost || isEstimateBlocked(data),
            },
            {
              label: t("projects.estimate.overview.cement"),
              value: `${fmtUp(qty("cement"))} ${unitText(t, "bag")}`,
            },
            { label: t("projects.estimate.overview.bricks"), value: fmtUp(qty("bricks")) },
            {
              label: t("projects.estimate.overview.steel"),
              // QA pass 2 NEW-8: every bar size, not only the generic "steel" line
              value: `${fmt(Math.round(steelKgOf(data.materials) / 10) / 100)} ${unitText(t, "ton")}`,
            },
          ]}
        />
      )}
    </SectionCard>
  );
}
