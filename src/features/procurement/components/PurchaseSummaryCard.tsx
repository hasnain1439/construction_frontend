import { MoneyText } from "@/components/common/MoneyText";
import { SectionCard } from "@/components/common/SectionCard";
import { cn } from "@/lib/cn";

function Row({ label, value, strong, className }: { label: string; value: React.ReactNode; strong?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-1.5 text-sm", strong && "border-t pt-3 font-semibold", className)}>
      <span className={strong ? undefined : "text-muted-foreground"}>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

/**
 * Right-hand totals while entering a purchase: bill, paid now, added to udhaar and the
 * supplier's balance after saving (BigInt, from paisa strings).
 */
export function PurchaseSummaryCard({
  totalPaisa,
  paidNowPaisa,
  supplierBalancePaisa,
  lines,
}: {
  totalPaisa: string;
  paidNowPaisa: string;
  /** Current udhaar; undefined while unknown / hidden. */
  supplierBalancePaisa?: string;
  lines: number;
}) {
  const total = BigInt(totalPaisa || "0");
  const paid = BigInt(paidNowPaisa || "0");
  const added = total - paid;
  const after = supplierBalancePaisa !== undefined ? BigInt(supplierBalancePaisa) + added : undefined;
  return (
    <SectionCard title="Summary" className="lg:sticky lg:top-4">
      <Row label="Materials" value={lines} />
      <Row label="Bill total" value={<MoneyText paisa={total.toString()} />} />
      <Row label="Paid now" value={<MoneyText paisa={paid.toString()} />} />
      <Row label="Added to udhaar" value={<MoneyText paisa={added.toString()} />} className={added > BigInt(0) ? "text-warning" : undefined} />
      <Row label="Supplier balance after" strong value={after === undefined ? "—" : <MoneyText paisa={after.toString()} />} />
    </SectionCard>
  );
}
