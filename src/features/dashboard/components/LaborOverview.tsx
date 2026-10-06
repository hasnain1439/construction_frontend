"use client";

import { CalendarCheck, ClipboardCheck, HandCoins, Receipt, Wallet } from "lucide-react";
import Link from "next/link";
import { useGetLaborOverviewQuery } from "@/api/services/labor.api";
import { KpiCard } from "@/components/common/KpiCard";
import { Button } from "@/components/ui/button";
import { formatPKRShort } from "@/lib/money";

/** Site stats on the company dashboard (THEKEDAR, PM): hazri today and this week's money. */
export function LaborOverview() {
  const q = useGetLaborOverviewQuery();
  const d = q.data;
  const waiting = d ? d.pending.settlements + d.pending.kharcha + d.pending.topups + d.pending.measurements : 0;
  return (
    <section className="space-y-3" aria-label="Site today">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Sites today</h2>
        {waiting ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/approvals">
              <ClipboardCheck data-icon="inline-start" />
              {waiting} waiting for approval
            </Link>
          </Button>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Hazri today"
          icon={CalendarCheck}
          loading={q.isLoading}
          value={d ? `${d.hazriToday.full + d.hazriToday.half} / ${d.hazriToday.assigned}` : "—"}
          hint={d ? `${d.hazriToday.unmarked} not marked · ${d.hazriToday.absent} absent` : undefined}
          tone={d?.hazriToday.unmarked ? "warning" : "success"}
        />
        <KpiCard label="Peshgi this week" icon={HandCoins} loading={q.isLoading} value={formatPKRShort(d?.peshgiThisWeekPaisa ?? "0")} />
        <KpiCard label="Site kharcha this week" icon={Receipt} loading={q.isLoading} value={formatPKRShort(d?.kharchaThisWeekPaisa ?? "0")} hint={d?.pending.kharcha ? `${d.pending.kharcha} above the limit` : undefined} />
        <KpiCard label="Cash with site staff" icon={Wallet} loading={q.isLoading} value={formatPKRShort(d?.cashWithSiteStaffPaisa ?? "0")} />
      </div>
    </section>
  );
}
