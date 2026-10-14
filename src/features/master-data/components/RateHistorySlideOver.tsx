"use client";

import { History } from "lucide-react";
import { useGetRateHistoryQuery } from "@/api/services/masterData.api";
import { DataTable } from "@/components/common/DataTable";
import { MoneyText } from "@/components/common/MoneyText";
import { SlideOver } from "@/components/common/SlideOver";
import { useT } from "@/i18n/useT";
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
  const t = useT();
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
      title={t("masterData.rateHistory.title", { name: material?.name ?? "" })}
      description={material ? t("masterData.rateHistory.description", { unit: material.unit }) : undefined}
    >
      <div className="overflow-hidden rounded-xl border">
        <DataTable
          rows={rows}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          getRowId={(h) => h.id}
          clientPageSize={25}
          empty={{ title: t("masterData.rateHistory.empty"), icon: History }}
          columns={[
            { id: "date", header: t("field.date"), cell: (h) => formatDateTime(h.effectiveFrom) },
            { id: "category", header: t("field.category"), cell: (h) => h.category.name },
            { id: "rate", header: t("field.rate"), align: "right", cell: (h) => <MoneyText paisa={h.ratePaisa} /> },
            { id: "spec", header: t("masterData.common.specification"), cell: (h) => h.specification ?? <span className="text-muted-foreground">—</span> },
            { id: "by", header: t("masterData.common.changedBy"), cell: (h) => h.changedBy?.name ?? "—" },
          ]}
        />
      </div>
    </SlideOver>
  );
}
