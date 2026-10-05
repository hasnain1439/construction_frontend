"use client";

import type { ReactNode } from "react";
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
  empty = { title: "No entries yet", description: "Entries appear here as they happen." },
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
  const isPositive = (v: string | number) => (typeof v === "number" ? v > 0 : !v.startsWith("-") && v !== "0");
  const abs = (v: string | number) => (typeof v === "number" ? Math.abs(v) : v.replace(/^-/, ""));
  const show = (v: string | number | null) => (v === null ? "—" : kind === "money" ? formatPKR(v) : formatQty(v, unit));

  const columns: Column<LedgerRow>[] = [
    { id: "date", header: "Date", cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(r.date)}</span> },
    {
      id: "entry",
      header: "Entry",
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-medium">{r.title}</p>
          {r.detail ? <p className="truncate text-xs text-muted-foreground">{r.detail}</p> : null}
        </div>
      ),
    },
    { id: "in", header: inLabel ?? (kind === "money" ? "Debit (udhaar +)" : "In"), align: "right", cell: (r) => (isPositive(r.amount) ? <span className="tabular">{show(abs(r.amount))}</span> : null) },
    {
      id: "out",
      header: outLabel ?? (kind === "money" ? "Credit (paid / returned)" : "Out"),
      align: "right",
      cell: (r) => (!isPositive(r.amount) && abs(r.amount) !== "0" && r.amount !== 0 ? <span className="tabular text-success">{show(abs(r.amount))}</span> : null),
    },
    { id: "balance", header: "Balance", align: "right", cell: (r) => <span className="font-semibold tabular">{show(r.balance)}</span> },
  ];

  return <DataTable rows={rows} columns={columns} getRowId={(r) => r.id} loading={loading} error={error} onRetry={onRetry} pagination={pagination} clientPageSize={0} empty={empty} />;
}
