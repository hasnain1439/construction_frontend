"use client";

import type { ReactNode } from "react";
import { useT } from "@/i18n/useT";
import { formatDateTime } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { formatQty } from "@/lib/quantity";
import { DataTable, type Column, type ServerPagination } from "./DataTable";
import type { EmptyStateProps } from "./EmptyState";

export interface LedgerRow {
  id: string;
  date: string;
  /** "Purchase", "Payment", "Dispatched" … */
  title: ReactNode;
  /** Reference / note under the title. */
  detail?: ReactNode;
  /** Signed: + increases the balance (debit / stock in), − decreases it. */
  amount: string | number;
  /** Balance after this row. */
  balance: string | number | null;
}

/**
 * Running-balance ledger: date · entry · in (debit) · out (credit) · balance. `kind="money"`
 * takes paisa strings (supplier udhaar); `kind="quantity"` takes numbers with a unit
 * (stock movement history).
 */
export function LedgerTable({
  rows,
  kind,
  unit,
  loading,
  error,
  onRetry,
  pagination,
  empty,
  inLabel,
  outLabel,
}: {
  rows: LedgerRow[] | undefined;
  kind: "money" | "quantity";
  unit?: string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  pagination?: ServerPagination;
  empty?: EmptyStateProps;
  inLabel?: string;
  outLabel?: string;
}) {
  const t = useT();
  const isPositive = (v: string | number) => (typeof v === "number" ? v > 0 : !v.startsWith("-") && v !== "0");
  const abs = (v: string | number) => (typeof v === "number" ? Math.abs(v) : v.replace(/^-/, ""));
  const show = (v: string | number | null) => (v === null ? "—" : kind === "money" ? formatPKR(v) : formatQty(v, unit));

  const columns: Column<LedgerRow>[] = [
    { id: "date", header: t("field.date"), cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(r.date)}</span> },
    {
      id: "entry",
      header: t("field.entry"),
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-medium">{r.title}</p>
          {r.detail ? <p className="truncate text-xs text-muted-foreground">{r.detail}</p> : null}
        </div>
      ),
    },
    { id: "in", header: inLabel ?? (kind === "money" ? t("app.components.ledger.debit") : t("app.components.ledger.in")), align: "right", cell: (r) => (isPositive(r.amount) ? <span className="tabular">{show(abs(r.amount))}</span> : null) },
    {
      id: "out",
      header: outLabel ?? (kind === "money" ? t("app.components.ledger.credit") : t("app.components.ledger.out")),
      align: "right",
      cell: (r) => (!isPositive(r.amount) && abs(r.amount) !== "0" && r.amount !== 0 ? <span className="tabular text-success">{show(abs(r.amount))}</span> : null),
    },
    { id: "balance", header: t("field.balance"), align: "right", cell: (r) => <span className="font-semibold tabular">{show(r.balance)}</span> },
  ];

  return <DataTable rows={rows} columns={columns} getRowId={(r) => r.id} loading={loading} error={error} onRetry={onRetry} pagination={pagination} clientPageSize={0} empty={empty ?? { title: t("app.components.ledger.empty"), description: t("app.components.ledger.emptyDesc") }} />;
}
