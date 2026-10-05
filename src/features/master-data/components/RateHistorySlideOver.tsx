"use client";

import { History } from "lucide-react";
import { useGetRateHistoryQuery } from "@/api/services/masterData.api";
import { DataTable } from "@/components/common/DataTable";
import { MoneyText } from "@/components/common/MoneyText";
import { SlideOver } from "@/components/common/SlideOver";
import { formatDateTime } from "@/lib/dates";

/** Every rate change for one material (optionally one category), newest first. */
export function RateHistorySlideOver({
  material,
  categoryId,
  onClose,
}: {
  material: { id: string; name: string; unit: string } | null;
  categoryId?: string;
  onClose: () => void;
}) {
  const { data, isLoading, error, refetch } = useGetRateHistoryQuery(
    { materialId: material?.id ?? "", ...(categoryId ? { categoryId } : {}) },
    { skip: !material },
  );
  const rows = data?.history;
  return (
    <SlideOver
      open={Boolean(material)}
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={`Rate history — ${material?.name ?? ""}`}
      description={material ? `Rates per ${material.unit}. The current rate is the newest row.` : undefined}
    >
      <div className="overflow-hidden rounded-xl border">
        <DataTable
          rows={rows}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          getRowId={(h) => h.id}
          clientPageSize={25}
          empty={{ title: "No rate set yet", icon: History }}
          columns={[
            { id: "date", header: "Date", cell: (h) => formatDateTime(h.effectiveFrom) },
            { id: "category", header: "Category", cell: (h) => h.category.name },
            { id: "rate", header: "Rate", align: "right", cell: (h) => <MoneyText paisa={h.ratePaisa} /> },
            { id: "spec", header: "Specification", cell: (h) => h.specification ?? <span className="text-muted-foreground">—</span> },
            { id: "by", header: "Changed by", cell: (h) => h.changedBy?.name ?? "—" },
          ]}
        />
      </div>
    </SlideOver>
  );
}
