"use client";

import { CircleCheck, CircleSlash, TriangleAlert } from "lucide-react";
import { useT } from "@/i18n/useT";
import { StatusBadge } from "./StatusBadge";

export type StockStatus = "OUT" | "LOW" | "OK";

export function stockStatus(qty: number, minQty: number | null | undefined): StockStatus {
  if (qty <= 0) return "OUT";
  if (minQty !== null && minQty !== undefined && qty < minQty) return "LOW";
  return "OK";
}

/** "Low stock" / "Out of stock" / "In stock" next to a quantity (low = below the set level). */
export function StockStatusBadge({ qty, minQty, className }: { qty: number; minQty?: number | null; className?: string }) {
  const t = useT();
  const status = stockStatus(qty, minQty);
  if (status === "OUT") return <StatusBadge tone="danger" label={t("app.components.stock.out")} icon={CircleSlash} className={className} />;
  if (status === "LOW") return <StatusBadge tone="warning" label={t("app.components.stock.low")} icon={TriangleAlert} className={className} />;
  return <StatusBadge tone="success" label={t("app.components.stock.in")} icon={CircleCheck} className={className} />;
}
