"use client";

import { useState } from "react";
import { useCreateTradeMutation, useUpdateTradeMutation } from "@/api/services/masterData.api";
import type { TradeRow } from "@/api/types";
import { SlideOver } from "@/components/common/SlideOver";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useEnumT, useT } from "@/i18n/useT";

const UNITS: TradeRow["unit"][] = ["SQFT", "TON", "BRICK", "RFT", "LUMPSUM"];

/**
 * Labour rates → Add / edit trade: a sub-contract trade of the company (False ceiling, Glass work …)
 * with its default rate. Editing renames it or switches it off: a switched-off trade can't be given to
 * new sub-contractors; the ones who have it keep it. The key never changes.
 */
export function TradeSlideOver({ open, onOpenChange, trade }: { open: boolean; onOpenChange: (open: boolean) => void; trade?: TradeRow }) {
  const t = useT();
  const te = useEnumT();
  const [create, { isLoading: creating }] = useCreateTradeMutation();
  const [update, { isLoading: updating }] = useUpdateTradeMutation();
  const busy = creating || updating;
  const run = useMutationToast();
  const [label, setLabel] = useState(trade?.label ?? "");
  const [labelRoman, setLabelRoman] = useState(trade?.labelRoman ?? "");
  const [labelUrdu, setLabelUrdu] = useState(trade?.labelUrdu ?? "");
  const [unit, setUnit] = useState<TradeRow["unit"]>(trade?.unit ?? "SQFT");
  const [rate, setRate] = useState<string | null>(trade?.ratePaisa ?? null);
  const [active, setActive] = useState(trade?.isActive ?? true);
  const ready = label.trim().length >= 2 && Boolean(rate && Number(rate) > 0);

  const save = async () => {
    if (!ready) return;
    if (trade) {
      const body = {
        ...(label.trim() !== trade.label ? { label: label.trim() } : {}),
        ...(labelRoman.trim() !== (trade.labelRoman ?? "") ? { labelRoman: labelRoman.trim() || null } : {}),
        ...(labelUrdu.trim() !== (trade.labelUrdu ?? "") ? { labelUrdu: labelUrdu.trim() || null } : {}),
        ...(unit !== trade.unit ? { unit } : {}),
        ...(rate !== trade.ratePaisa ? { ratePaisa: rate! } : {}),
        ...(active !== trade.isActive ? { isActive: active } : {}),
      };
      if (!Object.keys(body).length) return onOpenChange(false);
      const ok = await run(() => update({ id: trade.id, body }).unwrap(), { success: t("masterData.laborRates.tradeSaved", { name: label.trim() }) });
      if (ok) onOpenChange(false);
      return;
    }
    const ok = await run(
      () =>
        create({
          label: label.trim(),
          ...(labelRoman.trim() ? { labelRoman: labelRoman.trim() } : {}),
          ...(labelUrdu.trim() ? { labelUrdu: labelUrdu.trim() } : {}),
          unit,
          ratePaisa: rate!,
        }).unwrap(),
      { success: t("masterData.laborRates.tradeAdded", { name: label.trim() }) },
    );
    if (ok) onOpenChange(false);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title={trade ? t("masterData.laborRates.editTrade", { name: trade.label }) : t("masterData.laborRates.addTrade")}
      description={t("masterData.laborRates.addTradeDesc")}
      busy={busy}
      footer={<FormActions formId="trade-form" submitLabel={trade ? t("common.save") : t("common.add")} loading={busy} disabled={!ready} onCancel={() => onOpenChange(false)} />}
    >
      <form
        id="trade-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="trade-label">{t("masterData.laborRates.tradeName")}</Label>
          <Input id="trade-label" value={label} maxLength={60} placeholder={t("masterData.laborRates.tradePlaceholder")} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="trade-roman">{t("masterData.laborRates.tradeRoman")}</Label>
            <Input id="trade-roman" value={labelRoman} maxLength={60} onChange={(e) => setLabelRoman(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trade-urdu">{t("masterData.laborRates.tradeUrdu")}</Label>
            <Input id="trade-urdu" dir="rtl" value={labelUrdu} maxLength={60} onChange={(e) => setLabelUrdu(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="trade-unit">{t("field.unit")}</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as TradeRow["unit"])}>
              <SelectTrigger id="trade-unit" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {te("laborUnit", u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trade-rate">{t("masterData.laborRates.tradeRate")}</Label>
            <MoneyInput id="trade-rate" value={rate} onChange={setRate} />
          </div>
        </div>
        {trade ? (
          <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
            <div>
              <Label htmlFor="trade-active">{t("masterData.laborRates.tradeActive")}</Label>
              <p className="text-xs text-muted-foreground">{t("masterData.laborRates.tradeActiveHint", { n: trade.subcontractorCount })}</p>
            </div>
            <Switch id="trade-active" checked={active} onCheckedChange={setActive} />
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">{t("masterData.laborRates.tradeHint")}</p>
      </form>
    </SlideOver>
  );
}
