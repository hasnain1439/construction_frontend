"use client";

import { Wand2 } from "lucide-react";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { formatPKR, toPaisaBigInt } from "@/lib/money";

export interface AllocatableInvoice {
  id: string;
  number: string;
  dueDate: string | null;
  /** What may still be put against it (total − paid − pending) */
  openPaisa: string;
  overdue?: boolean;
}

const big = (v: string | null | undefined) => toPaisaBigInt(v) ?? BigInt(0);

/** Oldest due first, up to `total`. */
export function autoAllocate(invoices: AllocatableInvoice[], totalPaisa: string): Record<string, string> {
  let left = big(totalPaisa);
  const out: Record<string, string> = {};
  for (const inv of [...invoices].sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))) {
    if (left <= BigInt(0)) break;
    const open = big(inv.openPaisa);
    const take = open < left ? open : left;
    if (take > BigInt(0)) out[inv.id] = take.toString();
    left -= take;
  }
  return out;
}

export function allocationSummary(invoices: AllocatableInvoice[], amounts: Record<string, string | null>, totalPaisa: string) {
  const allocated = Object.values(amounts).reduce((s, v) => s + big(v), BigInt(0));
  const remainder = big(totalPaisa) - allocated;
  const overInvoice = invoices.filter((i) => big(amounts[i.id]) > big(i.openPaisa)).map((i) => i.id);
  return { allocated, remainder, overInvoice, overPayment: remainder < BigInt(0) };
}

/**
 * Puts a payment against open invoices. "Auto" fills oldest due first; amounts can be typed;
 * the remainder stays as project credit (settles the next invoice).
 */
export function AllocationEditor({
  invoices,
  totalPaisa,
  value,
  onChange,
  className,
}: {
  invoices: AllocatableInvoice[];
  /** Payment + WHT */
  totalPaisa: string;
  value: Record<string, string | null>;
  onChange: (value: Record<string, string | null>) => void;
  className?: string;
}) {
  const s = allocationSummary(invoices, value, totalPaisa);
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Put against invoices</p>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange(autoAllocate(invoices, totalPaisa))} disabled={!invoices.length}>
          <Wand2 data-icon="inline-start" />
          Auto (oldest first)
        </Button>
      </div>
      {invoices.length === 0 ? (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">No open invoices — the whole amount is kept as credit for the next invoice.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium tabular">{inv.number}</p>
                <p className={cn("text-xs", inv.overdue ? "text-danger" : "text-muted-foreground")}>
                  Open {formatPKR(inv.openPaisa)}
                  {inv.dueDate ? ` · due ${formatDate(inv.dueDate)}` : ""}
                </p>
              </div>
              <div className="w-40">
                <MoneyInput
                  aria-label={`Amount for ${inv.number}`}
                  value={value[inv.id] ?? null}
                  onChange={(v) => onChange({ ...value, [inv.id]: v })}
                  aria-invalid={s.overInvoice.includes(inv.id) || undefined}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm" data-testid="allocation-summary">
        <dt className="text-muted-foreground">Against invoices</dt>
        <dd className="text-right tabular">{formatPKR(s.allocated.toString())}</dd>
        <dt className="text-muted-foreground">{s.overPayment ? "More than received" : "Kept as credit"}</dt>
        <dd className={cn("text-right font-medium tabular", s.overPayment && "text-danger")}>{formatPKR((s.overPayment ? -s.remainder : s.remainder).toString())}</dd>
      </dl>
      {s.overInvoice.length ? <p className="text-xs text-danger">An amount is more than that invoice&apos;s open balance.</p> : null}
    </div>
  );
}
