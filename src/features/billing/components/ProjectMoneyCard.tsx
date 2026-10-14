"use client";

import Link from "next/link";
import { useGetProjectReceivablesQuery } from "@/api/services/billing.api";
import { MoneySummaryCards } from "@/components/common/MoneySummaryCards";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";
import { formatPKR } from "@/lib/money";
import { projectHref } from "@/lib/navigation";

/** Project overview: contract → invoiced → received → outstanding → own money, and the next stage to bill. */
export function ProjectMoneyCard({ projectId }: { projectId: string }) {
  const r = useGetProjectReceivablesQuery(projectId);
  const next = r.data?.nextBillableStage;
  const t = useT();
  return (
    <SectionCard
      title={t("billing.money.title")}
      description={next ? t(next.status === "READY" ? "billing.money.nextToBillReady" : "billing.money.nextToBill", { stage: next.label, amount: formatPKR(next.amountPaisa) }) : undefined}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={projectHref(projectId, "/billing/schedule")}>{t("billing.money.paymentSchedule")}</Link>
        </Button>
      }
    >
      <MoneySummaryCards data={r.data} loading={r.isLoading} />
    </SectionCard>
  );
}
