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
import { fmt, fmtUp, unitText } from "./labels";

/** Project overview: the estimate's headline numbers and a link to the full BoQ. */
export function EstimateOverviewCard({ projectId }: { projectId: string }) {
  const t = useT();
  const { data, isLoading } = useGetEstimateQuery(projectId);
  const qty = (m: string) => data?.materials.find((x) => x.material === m)?.quantity ?? 0;
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
              label: t("projects.estimate.overview.cost"),
              value: data.cost ? formatPKRShort(data.cost.totalPaisa) : "—",
              hidden: !data.cost,
            },
            {
              label: t("projects.estimate.overview.cement"),
              value: `${fmtUp(qty("cement"))} ${unitText(t, "bag")}`,
            },
            { label: t("projects.estimate.overview.bricks"), value: fmtUp(qty("bricks")) },
            {
              label: t("projects.estimate.overview.steel"),
              value: `${fmt(Math.round(qty("steel") / 10) / 100)} ${unitText(t, "ton")}`,
            },
          ]}
        />
      )}
    </SectionCard>
  );
}
