"use client";

import { FileText, PackageCheck, PencilLine, Tag, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useGetPurchaseQuery } from "@/api/services/procurement.api";
import type { Purchase, PurchaseItem } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { DocumentHeader } from "@/components/common/DocumentHeader";
import { InlineAlert } from "@/components/common/InlineAlert";
import { MoneyText } from "@/components/common/MoneyText";
import { usePermissions } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { LateSyncBadge } from "@/components/common/LateSyncBadge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useStatusT, useT } from "@/i18n/useT";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatQty } from "@/lib/quantity";
import { CorrectionSlideOver, RatesSlideOver, ReturnSlideOver } from "../components/PurchaseActions";

const FINAL = ["SAVED", "RECEIVED", "RECEIVED_WITH_SHORTAGE"];

function Items({ purchase }: { purchase: Purchase }) {
  const t = useT();
  const unit = (i: PurchaseItem) => i.material.unit;
  const columns: Column<PurchaseItem>[] = [
    { id: "material", header: t("field.material"), cell: (i) => <span className="font-medium">{i.material.name}</span> },
    { id: "challan", header: t("procurement.common.challan"), align: "right", hidden: purchase.blindCount, cell: (i) => formatQty(i.challanQty ?? null, unit(i)) },
    { id: "counted", header: t("field.counted"), align: "right", cell: (i) => formatQty(i.countedQty, unit(i)) },
    { id: "damaged", header: t("field.damaged"), align: "right", cell: (i) => (i.damagedQty ? <span className="text-danger">{formatQty(i.damagedQty, unit(i))}</span> : "—") },
    { id: "good", header: t("procurement.common.good"), align: "right", cell: (i) => <span className="font-medium">{formatQty(i.goodQty, unit(i))}</span> },
    { id: "short", header: t("procurement.common.short"), align: "right", hidden: purchase.blindCount, cell: (i) => (i.shortQty ? <span className="text-warning">{formatQty(i.shortQty, unit(i))}</span> : "—") },
    {
      id: "rate",
      header: t("field.rate"),
      align: "right",
      cell: (i) => (
        <div>
          <MoneyText paisa={i.ratePaisa} />
          {i.correctedRatePaisa ? (
            <p className="text-xs text-primary">
              → <MoneyText paisa={i.correctedRatePaisa} />
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "amount",
      header: t("field.amount"),
      align: "right",
      cell: (i) => (
        <div>
          <MoneyText paisa={i.amountPaisa} />
          {i.correctedQty !== null && i.correctedQty !== undefined ? <p className="text-xs text-primary">{t("procurement.detail.correctedQty", { qty: formatQty(i.correctedQty, unit(i)) })}</p> : null}
        </div>
      ),
    },
    { id: "note", header: t("field.note"), cell: (i) => <span className="text-sm text-muted-foreground">{i.note ?? ""}</span> },
  ];
  return (
    <SectionCard title={t("field.materials")} flush>
      <DataTable rows={purchase.items} columns={columns} getRowId={(i) => i.id} clientPageSize={0} empty={{ title: t("procurement.common.noMaterials") }} />
    </SectionCard>
  );
}

function Payment({ purchase }: { purchase: Purchase }) {
  const t = useT();
  const te = useEnumT();
  if (purchase.totalPaisa === undefined) return null;
  const rows: Array<[string, React.ReactNode]> = [
    [t("procurement.common.billTotal"), <MoneyText key="t" paisa={purchase.totalPaisa} />],
    ...(purchase.correctedTotalPaisa && purchase.correctedTotalPaisa !== purchase.totalPaisa ? ([[t("procurement.detail.afterCorrections"), <MoneyText key="c" paisa={purchase.correctedTotalPaisa} />]] as Array<[string, React.ReactNode]>) : []),
    [t("procurement.common.paidNow"), <MoneyText key="p" paisa={purchase.paidNowPaisa} />],
    [t("procurement.common.addedToUdhaar"), <MoneyText key="u" paisa={purchase.udhaarAddedPaisa} />],
  ];
  return (
    <SectionCard title={t("procurement.detail.paymentLedger")} description={purchase.paidFrom ? t("procurement.detail.paidFromX", { source: te("procPaidFrom", purchase.paidFrom) }) : undefined}>
      <dl className="space-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="tabular">{v}</dd>
          </div>
        ))}
      </dl>
      {purchase.ledgerEffect?.length ? (
        <div className="mt-4 border-t pt-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">{t("procurement.detail.ledgerEffect")}</p>
          <ul className="space-y-1 text-sm">
            {purchase.ledgerEffect.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  {te("procLedgerType", l.type)} <span className="text-xs text-muted-foreground">{formatDate(l.occurredAt)}</span>
                </span>
                <span className={l.amountPaisa.startsWith("-") ? "text-success tabular" : "tabular"}>
                  <MoneyText paisa={l.amountPaisa} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SectionCard>
  );
}

function PurchaseBody({ purchase }: { purchase: Purchase }) {
  const t = useT();
  const ts = useStatusT();
  const readOnly = useReadOnly();
  const { can } = usePermissions();
  const canRate = can("procurement.purchase.edit") && !readOnly;
  const canReturn = can("procurement.return.create") && !readOnly;
  const owner = can("procurement.purchase.manage") && !readOnly;
  const [open, setOpen] = useState<"return" | "rates" | "correct" | null>(null);
  const final = FINAL.includes(purchase.status);

  return (
    <>
      <PageHeader
        title={purchase.number}
        breadcrumbs={[{ label: t("crumb.suppliersStock") }, { label: t("procurement.crumb.purchases"), href: "/suppliers-stock/purchases" }, { label: purchase.number }]}
        actions={
          <>
            {canRate && purchase.status === "PENDING_RATE" ? (
              <Button onClick={() => setOpen("rates")}>
                <Tag data-icon="inline-start" />
                {t("procurement.detail.addRates")}
              </Button>
            ) : null}
            {canReturn && final ? (
              <Button variant="outline" onClick={() => setOpen("return")}>
                <Undo2 data-icon="inline-start" />
                {t("procurement.detail.createReturn")}
              </Button>
            ) : null}
            {owner && final ? (
              <Button variant="outline" onClick={() => setOpen("correct")}>
                <PencilLine data-icon="inline-start" />
                {t("procurement.detail.correction")}
              </Button>
            ) : null}
          </>
        }
      />
      <DocumentHeader
        title={t("procurement.detail.docTitle")}
        number={purchase.number}
        status={
          <span className="flex flex-wrap gap-1">
            <StatusBadge domain="purchase" value={purchase.status} />
            {purchase.lateSync ? <LateSyncBadge /> : null}
          </span>
        }
        locked={purchase.locked}
        party={
          <>
            {t("procurement.common.route", { from: purchase.supplier.name, to: purchase.deliverTo === "STORE" ? t("field.centralStore") : (purchase.project?.name ?? purchase.location.name) })}
          </>
        }
        meta={[
          { label: t("field.date"), value: formatDate(purchase.purchaseDate) },
          { label: t("procurement.common.challanNo"), value: purchase.challanNo },
          { label: t("procurement.common.vehicle"), value: purchase.vehicleNo },
          { label: t("field.payment"), value: <StatusBadge domain="paymentMode" value={purchase.paymentMode} /> },
          { label: t("procurement.common.purchaseOrder"), value: purchase.purchaseOrder ? <Link className="text-primary hover:underline" href={`/suppliers-stock/purchase-orders/${purchase.purchaseOrder.id}`}>{purchase.purchaseOrder.number}</Link> : null },
          { label: t("field.received"), value: purchase.receivedAt ? `${formatDateTime(purchase.receivedAt)}${purchase.receivedBy ? ` · ${purchase.receivedBy.name}` : ""}` : null },
          { label: t("procurement.detail.enteredBy"), value: purchase.createdBy?.name },
        ]}
      />
      {purchase.status === "PENDING_RECEIPT" && purchase.project ? (
        <InlineAlert tone="info" title={t("procurement.detail.waitingSiteCount")}>
          {t("procurement.detail.waitingSiteCountBody")}{" "}
          <Link className="font-medium underline" href={`/projects/${purchase.project.id}/site/incoming`}>
            {t("procurement.detail.openIncoming")}
          </Link>
        </InlineAlert>
      ) : null}
      {purchase.status === "PENDING_RATE" ? <InlineAlert tone="warning" title={ts("purchase", "PENDING_RATE")}>{t("procurement.detail.ratesPendingBody")}</InlineAlert> : null}
      <Items purchase={purchase} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Payment purchase={purchase} />
        <SectionCard title={t("procurement.common.challanAndBill")}>
          <ul className="space-y-2 text-sm">
            {[purchase.challan, purchase.bill].filter(Boolean).map((a) => (
              <li key={a!.id}>
                <a className="inline-flex items-center gap-2 text-primary hover:underline" href={a!.url ?? undefined} target="_blank" rel="noreferrer">
                  <FileText className="size-4" aria-hidden />
                  {a!.fileName}
                </a>
              </li>
            ))}
          </ul>
          {purchase.note ? <p className="mt-3 text-sm text-muted-foreground">{purchase.note}</p> : null}
        </SectionCard>
      </div>
      {purchase.shortages.length ? (
        <SectionCard
          title={t("procurement.common.shortages")}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/suppliers-stock/shortages">{t("procurement.detail.openShortages")}</Link>
            </Button>
          }
        >
          <ul className="divide-y text-sm">
            {purchase.shortages.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-2">
                  <StatusBadge domain="shortageKind" value={s.kind} />
                  {formatQty(s.qty, s.material.unit)} {s.material.name}
                </span>
                <span className="flex items-center gap-2">
                  <MoneyText paisa={s.valuePaisa} />
                  <StatusBadge domain="shortage" value={s.status} />
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
      {purchase.corrections.length || purchase.returns.length ? (
        <SectionCard title={t("procurement.detail.correctionsReturns")}>
          <ul className="divide-y text-sm">
            {purchase.corrections.map((c) => (
              <li key={c.id} className="space-y-1 py-2">
                <p className="font-medium">
                  {t("procurement.detail.correctionLine", { date: formatDateTime(c.createdAt), name: c.createdBy?.name ?? "" })}
                  {c.deltaPaisa ? (
                    <span className="ms-2 tabular">
                      (<MoneyText paisa={c.deltaPaisa} />)
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground">{c.reason}</p>
              </li>
            ))}
            {purchase.returns.map((r) => (
              <li key={r.id} className="flex justify-between gap-2 py-2">
                <span>
                  <PackageCheck className="me-1 inline size-4 text-muted-foreground" aria-hidden />
                  {r.number} · {r.reason}
                </span>
                <MoneyText paisa={r.totalPaisa} />
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
      <ReturnSlideOver purchase={purchase} open={open === "return"} onOpenChange={(o) => setOpen(o ? "return" : null)} />
      <RatesSlideOver purchase={purchase} open={open === "rates"} onOpenChange={(o) => setOpen(o ? "rates" : null)} />
      <CorrectionSlideOver purchase={purchase} open={open === "correct"} onOpenChange={(o) => setOpen(o ? "correct" : null)} />
    </>
  );
}

export function PurchaseDetailView({ purchaseId }: { purchaseId: string }) {
  const query = useGetPurchaseQuery(purchaseId);
  return <QueryState query={query}>{(purchase) => <PurchaseBody purchase={purchase} />}</QueryState>;
}
