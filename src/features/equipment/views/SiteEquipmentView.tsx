"use client";

import { ArrowLeftRight, Forklift, Handshake, PackageCheck, Truck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useGetProjectEquipmentQuery } from "@/api/services/equipment.api";
import type { EquipmentTransfer, ProjectEquipmentItem } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useT } from "@/i18n/useT";
import { formatDateTime } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import { ReportLossSlideOver } from "../components/LossSlideOvers";
import { NewRentalSlideOver } from "../components/RentalSlideOvers";
import { NewTransferSlideOver, ReceiveTransferSlideOver } from "../components/TransferSlideOvers";
import { placeName, useSeesRates } from "../options";
import { useLossColumns } from "./LossChargeViews";
import { itemsSummary } from "./MovementViews";
import { useRentalColumns } from "./RentalViews";

/** Project → Site → Equipment on Site: what is here (owned vs rented), incoming transfers to count, rentals, open losses. */
export function SiteEquipmentView({ projectId }: { projectId: string }) {
  const t = useT();
  const rates = useSeesRates();
  const { data, isLoading } = useGetProjectEquipmentQuery(projectId);
  const canReceive = useCan("equipment.receiving.create");
  const canSend = useCan("equipment.transfer.create");
  const canReport = useCan("equipment.loss.create");
  const canRent = useCan("equipment.rental.manage");
  const [receiving, setReceiving] = useState<EquipmentTransfer | null>(null);
  const [open, setOpen] = useState<"send" | "loss" | "rent" | null>(null);
  const rentalColumns = useRentalColumns();
  const lossColumns = useLossColumns();
  const siteId = data?.site?.id ?? null;

  const itemColumns: Column<ProjectEquipmentItem>[] = [
    {
      id: "equipment",
      header: t("equipment.field.equipment"),
      cell: (i) => <span className="font-medium">{i.equipment.name}</span>,
      sortValue: (i) => i.equipment.name,
    },
    {
      id: "owned",
      header: t("equipment.col.owned"),
      align: "right",
      cell: (i) => (i.ownedQty ? formatQty(i.ownedQty, i.equipment.unit) : "—"),
    },
    {
      id: "rented",
      header: t("equipment.col.onRent"),
      align: "right",
      cell: (i) => (i.rentedQty ? formatQty(i.rentedQty, i.equipment.unit) : "—"),
    },
    {
      id: "total",
      header: t("field.total"),
      align: "right",
      cell: (i) => (
        <span className="tabular font-semibold">{formatQty(i.ownedQty + i.rentedQty, i.equipment.unit)}</span>
      ),
    },
    {
      id: "rate",
      header: t("equipment.field.hireRate"),
      align: "right",
      hidden: !rates,
      cell: (i) => <MoneyText paisa={i.hireRatePaisaPerDay} />,
    },
    {
      id: "daily",
      header: t("equipment.site.dailyHire"),
      align: "right",
      hidden: !rates,
      cell: (i) => <MoneyText paisa={i.dailyHirePaisa} />,
    },
  ];

  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("equipment.site.crumb")}
      actions={(project) => {
        const editable = project.status === "ACTIVE" || project.status === "CLOSEOUT";
        if (!editable) return null;
        return (
          <span className="flex flex-wrap gap-2">
            {canReport && siteId ? (
              <Button variant="outline" onClick={() => setOpen("loss")}>
                <TriangleAlert data-icon="inline-start" />
                {t("equipment.loss.report")}
              </Button>
            ) : null}
            {canRent ? (
              <Button variant="outline" onClick={() => setOpen("rent")}>
                <Handshake data-icon="inline-start" />
                {t("equipment.rental.new")}
              </Button>
            ) : null}
            {canSend && siteId ? (
              <Button onClick={() => setOpen("send")}>
                <ArrowLeftRight data-icon="inline-start" />
                {t("equipment.site.sendOrReturn")}
              </Button>
            ) : null}
          </span>
        );
      }}
    >
      {(project, flags) =>
        isLoading ? (
          <CardsSkeleton count={3} height="h-32" />
        ) : !data ? (
          <SectionCard>
            <EmptyState title={t("equipment.site.loadFailed")} />
          </SectionCard>
        ) : (
          <div className="space-y-5">
            <KpiGroup
              columns={rates ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"}
              ariaLabel={t("equipment.site.crumb")}
            >
              <KpiCard
                variant="tile"
                label={t("equipment.col.owned")}
                value={formatQty(data.items.reduce((s, i) => s + i.ownedQty, 0))}
              />
              <KpiCard
                variant="tile"
                label={t("equipment.col.onRent")}
                value={formatQty(data.items.reduce((s, i) => s + i.rentedQty, 0))}
              />
              {rates ? (
                <KpiCard
                  variant="tile"
                  label={t("equipment.site.hireToDate")}
                  value={<MoneyText paisa={data.hireToDatePaisa} />}
                />
              ) : null}
              {rates ? (
                <KpiCard
                  variant="tile"
                  label={t("equipment.site.rentToDate")}
                  value={<MoneyText paisa={data.rentalToDatePaisa} />}
                />
              ) : null}
            </KpiGroup>

            {data.incoming.length ? (
              <section className="space-y-3" aria-label={t("equipment.site.incomingTitle")}>
                <h2 className="text-sm font-semibold">{t("equipment.site.incomingTitle")}</h2>
                {data.incoming.map((tr) => (
                  <SectionCard
                    key={tr.id}
                    title={
                      <span className="flex flex-wrap items-center gap-2">
                        <Truck className="size-4 text-primary" aria-hidden />
                        {tr.number}
                        <StatusBadge domain="equipmentTransfer" value={tr.status} />
                      </span>
                    }
                    description={t("equipment.receive.desc", {
                      from: placeName(t, tr.from),
                      date: formatDateTime(tr.sentAt),
                    })}
                    actions={
                      canReceive && !flags.readOnly ? (
                        <Button onClick={() => setReceiving(tr)}>
                          <PackageCheck data-icon="inline-start" />
                          {t("equipment.receive.action")}
                        </Button>
                      ) : null
                    }
                  >
                    <p className="text-sm">
                      <span className="text-muted-foreground">{t("equipment.common.items")}: </span>
                      {itemsSummary(tr.items)}
                    </p>
                    {tr.vehicleNo || tr.driverName ? (
                      <p className="text-sm text-muted-foreground">
                        <bdi>{[tr.vehicleNo, tr.driverName].filter(Boolean).join(" · ")}</bdi>
                      </p>
                    ) : null}
                  </SectionCard>
                ))}
              </section>
            ) : null}

            <SectionCard title={t("equipment.site.hereNow")} flush>
              <DataTable
                rows={data.items}
                columns={itemColumns}
                getRowId={(i) => i.equipment.id}
                clientPageSize={0}
                empty={{
                  title: t("equipment.site.emptyTitle"),
                  description: t("equipment.site.emptyDesc"),
                  icon: Forklift,
                }}
              />
            </SectionCard>

            <SectionCard
              title={t("equipment.site.rentalsTitle")}
              actions={
                <Link href="/equipment/rentals" className="text-sm text-primary underline">
                  {t("common.viewAll")}
                </Link>
              }
              flush
            >
              <DataTable
                rows={data.rentals}
                columns={rentalColumns}
                getRowId={(r) => r.id}
                clientPageSize={0}
                empty={{ title: t("equipment.site.noRentals") }}
              />
            </SectionCard>

            <SectionCard title={t("equipment.site.lossesTitle")} flush>
              <DataTable
                rows={data.openLosses}
                columns={lossColumns}
                getRowId={(l) => l.id}
                clientPageSize={0}
                empty={{ title: t("equipment.site.noLosses") }}
              />
            </SectionCard>

            <ReceiveTransferSlideOver
              transfer={receiving}
              open={Boolean(receiving)}
              onOpenChange={(o) => !o && setReceiving(null)}
            />
            <NewTransferSlideOver
              open={open === "send"}
              onOpenChange={(o) => !o && setOpen(null)}
              defaultFromId={siteId}
              lockFrom
            />
            <ReportLossSlideOver
              open={open === "loss"}
              onOpenChange={(o) => !o && setOpen(null)}
              defaultLocationId={siteId}
              lockLocation
            />
            <NewRentalSlideOver
              open={open === "rent"}
              onOpenChange={(o) => !o && setOpen(null)}
              defaultProjectId={project.id}
            />
          </div>
        )
      }
    </ProjectPageShell>
  );
}
