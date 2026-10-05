import { CircleCheck, CircleSlash, TriangleAlert } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

export type StockStatus = "OUT" | "LOW" | "OK";

export function stockStatus(qty: number, minQty: number | null | undefined): StockStatus {
  if (qty <= 0) return "OUT";
  if (minQty !== null && minQty !== undefined && qty < minQty) return "LOW";
  return "OK";
}

/** "Low stock" / "Out of stock" / "In stock" next to a quantity (low = below the set level). */
export function StockStatusBadge({ qty, minQty, className }: { qty: number; minQty?: number | null; className?: string }) {
  const status = stockStatus(qty, minQty);
  if (status === "OUT") return <StatusBadge tone="danger" label="Out of stock" icon={CircleSlash} className={className} />;
  if (status === "LOW") return <StatusBadge tone="warning" label="Low stock" icon={TriangleAlert} className={className} />;
  return <StatusBadge tone="success" label="In stock" icon={CircleCheck} className={className} />;
}
