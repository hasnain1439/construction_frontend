"use client";

import Link from "next/link";
import { useGetProjectReceivablesQuery } from "@/api/services/billing.api";
import { MoneySummaryCards } from "@/components/common/MoneySummaryCards";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@/lib/money";
import { projectHref } from "@/lib/navigation";

/** Project overview: contract → invoiced → received → outstanding → own money, and the next stage to bill. */
export function ProjectMoneyCard({ projectId }: { projectId: string }) {
  const r = useGetProjectReceivablesQuery(projectId);
  const next = r.data?.nextBillableStage;
  return (
    <SectionCard
      title="Money"
      description={next ? `Next to bill: ${next.label} · ${formatPKR(next.amountPaisa)}${next.status === "READY" ? " (ready)" : ""}` : undefined}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={projectHref(projectId, "/billing/schedule")}>Payment schedule</Link>
        </Button>
      }
    >
      <MoneySummaryCards data={r.data} loading={r.isLoading} />
    </SectionCard>
  );
}
