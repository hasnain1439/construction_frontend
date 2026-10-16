"use client";

import { CalendarClock, ClipboardList, FilePen, Hourglass, Plus, Scale, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGetChangeOrdersQuery, useSnagToChangeOrderMutation } from "@/api/services/changeOrders.api";
import { CHANGE_ORDER_STATUSES, type ChangeOrder, type ChangeOrderStatus } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { InlineAlert } from "@/components/common/InlineAlert";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan, usePermissions } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { projectHref } from "@/lib/navigation";
import { ChangeOrderStatusBadge, CO_EDIT_STATUSES, SignedMoney } from "./shared";

/** Project → Change Orders: KPIs (revised contract / end date), the list, CHANGE_ORDER snags to convert. */
export function ChangeOrdersView({ projectId }: { projectId: string }) {
  const t = useT();
  const canCreate = useCan("changeorder.create");
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("changeOrders.list.crumb")}
      actions={(project) =>
        canCreate && CO_EDIT_STATUSES.includes(project.status) ? (
          <Button asChild>
            <Link href={projectHref(projectId, "/change-orders/new")}>
              <Plus data-icon="inline-start" />
              {t("changeOrders.list.new")}
            </Link>
          </Button>
        ) : null
      }
    >
      {(project) => <ChangeOrdersList projectId={projectId} editable={CO_EDIT_STATUSES.includes(project.status)} />}
    </ProjectPageShell>
  );
}

export function ChangeOrdersList({ projectId, editable }: { projectId: string; editable: boolean }) {
  const t = useT();
  const router = useRouter();
  const { can, canAny } = usePermissions();
  const [status, setStatus] = useState<"" | ChangeOrderStatus>("");
  const list = useGetChangeOrdersQuery({ projectId, ...(status ? { status } : {}) });
  const [fromSnag, { isLoading: converting }] = useSnagToChangeOrderMutation();
  const run = useMutationToast();
  const s = list.data?.summary;
  const open = (co: ChangeOrder) => router.push(projectHref(projectId, `/change-orders/${co.id}`));

  const columns: Column<ChangeOrder>[] = [
    { id: "code", header: t("changeOrders.list.colCode"), sortValue: (r) => r.number, cell: (r) => <span className="tabular font-medium" dir="ltr">{r.code}</span>, className: "w-24" },
    {
      id: "title",
      header: t("changeOrders.list.colTitle"),
      cell: (r) => (
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium">{r.title}</p>
          <p className="text-xs text-muted-foreground">
            {t(`changeOrders.type.${r.type}`)} · {t(`changeOrders.source.${r.source}`)}
          </p>
        </div>
      ),
    },
    { id: "status", header: t("changeOrders.list.colStatus"), sortValue: (r) => r.status, cell: (r) => <ChangeOrderStatusBadge status={r.status} /> },
    { id: "total", header: t("changeOrders.list.colTotal"), cell: (r) => <SignedMoney paisa={r.totalPaisa} />, className: "text-end" },
    { id: "days", header: t("changeOrders.list.colDays"), sortValue: (r) => r.daysImpact, cell: (r) => (r.daysImpact ? <span dir="ltr">+{r.daysImpact}</span> : "—") },
    {
      id: "proof",
      header: t("changeOrders.list.colProof"),
      cell: (r) => (r.proofType ? t(`changeOrders.proof.${r.proofType}`) : <span className="text-muted-foreground">{t("changeOrders.list.noProof")}</span>),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("changeOrders.list.kpiApproved")}
          value={<SignedMoney paisa={s?.approvedChangesPaisa} />}
          icon={Scale}
          loading={list.isLoading}
          hint={t("changeOrders.list.kpiApprovedHint", { n: s?.approvedCount ?? 0 })}
        />
        <KpiCard
          label={t("changeOrders.list.kpiRevised")}
          value={<MoneyText paisa={s?.revisedContractPaisa} />}
          icon={FilePen}
          tone="success"
          loading={list.isLoading}
          hint={s?.originalContractPaisa ? t("changeOrders.list.kpiRevisedHint", { amount: formatPKR(s.originalContractPaisa) }) : undefined}
        />
        <KpiCard
          label={t("changeOrders.list.kpiEnd")}
          value={s?.revisedEndDate ? formatDate(s.revisedEndDate) : "—"}
          icon={CalendarClock}
          tone={s?.daysImpact ? "warning" : "primary"}
          loading={list.isLoading}
          hint={s?.daysImpact ? t("changeOrders.list.kpiDaysValue", { n: s.daysImpact }) : s?.originalEndDate ? t("changeOrders.list.kpiEndHint", { date: formatDate(s.originalEndDate) }) : undefined}
        />
        <KpiCard
          label={t("changeOrders.list.kpiPending")}
          value={s?.pendingPaisa !== undefined ? <SignedMoney paisa={s.pendingPaisa} /> : (s?.byStatus.DRAFT ?? 0) + (s?.byStatus.SENT ?? 0)}
          icon={Hourglass}
          loading={list.isLoading}
          hint={t("changeOrders.list.kpiPendingHint")}
        />
      </div>
      {s?.newSiteInstructions && canAny(["changeorder.instruction.view", "changeorder.instruction.create"]) ? (
        <InlineAlert tone="info" title={t("changeOrders.list.instructionsWaiting", { n: s.newSiteInstructions })}>
          <Link className="underline" href={projectHref(projectId, "/change-orders/instructions")}>
            {t("changeOrders.list.openInstructions")}
          </Link>
        </InlineAlert>
      ) : null}
      <FilterBar onClear={() => setStatus("")} canClear={Boolean(status)}>
        <FilterSelect
          label={t("changeOrders.list.filterStatus")}
          value={status}
          onChange={(v) => setStatus(v as "" | ChangeOrderStatus)}
          options={CHANGE_ORDER_STATUSES.map((v) => ({ value: v, label: t(`changeOrders.status.${v}`) }))}
        />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={list.data?.items}
          columns={columns}
          getRowId={(r) => r.id}
          loading={list.isLoading}
          error={list.error}
          onRetry={list.refetch}
          onRowClick={open}
          empty={status ? { icon: ClipboardList, title: t("changeOrders.list.noMatch") } : { icon: ClipboardList, title: t("changeOrders.list.empty"), description: t("changeOrders.list.emptyDesc") }}
        />
      </SectionCard>
      {s?.changeOrderSnags.length ? (
        <SectionCard title={t("changeOrders.list.snagsTitle")} description={t("changeOrders.list.snagsDesc")} flush>
          <ul className="divide-y">
            {s.changeOrderSnags.map((snag) => (
              <li key={snag.id} className="flex flex-wrap items-center gap-3 px-6 py-3" data-testid={`co-snag-${snag.code}`}>
                <span className="tabular font-medium" dir="ltr">
                  {snag.code}
                </span>
                <span className="min-w-0 flex-1">{snag.description}</span>
                {snag.amountPaisa !== undefined ? <MoneyText paisa={snag.amountPaisa} /> : null}
                {editable && can("changeorder.create") ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={converting}
                    onClick={async () => {
                      const co = await run(() => fromSnag({ snagId: snag.id, body: {} }).unwrap(), { success: (r) => t("changeOrders.list.convertedSnag", { code: r.code }) });
                      if (co) router.push(projectHref(projectId, `/change-orders/${co.id}`));
                    }}
                  >
                    <Wand2 data-icon="inline-start" />
                    {t("changeOrders.list.convertSnag")}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );
}
