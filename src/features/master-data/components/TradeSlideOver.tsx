"use client";

import { useState } from "react";
import { useCreateTradeMutation } from "@/api/services/masterData.api";
import type { TradeRow } from "@/api/types";
import { SlideOver } from "@/components/common/SlideOver";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useEnumT, useT } from "@/i18n/useT";

const UNITS: TradeRow["unit"][] = ["SQFT", "TON", "BRICK", "RFT", "LUMPSUM"];

/**
 * Labour rates → Add trade: a sub-contract trade of the company's own (False ceiling, Glass work …)
 * with its default rate. It then shows in the piece-rate table, the sub-contractor form and imports.
 */
export function TradeSlideOver({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const te = useEnumT();
  const [create, { isLoading }] = useCreateTradeMutation();
  const run = useMutationToast();
  const [label, setLabel] = useState("");
  const [labelRoman, setLabelRoman] = useState("");
  const [labelUrdu, setLabelUrdu] = useState("");
  const [unit, setUnit] = useState<TradeRow["unit"]>("SQFT");
  const [rate, setRate] = useState<string | null>(null);
  const ready = label.trim().length >= 2 && Boolean(rate && Number(rate) > 0);

  const save = async () => {
    if (!ready) return;
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
      title={t("masterData.laborRates.addTrade")}
      description={t("masterData.laborRates.addTradeDesc")}
      busy={isLoading}
      footer={<FormActions formId="trade-form" submitLabel={t("common.add")} loading={isLoading} disabled={!ready} onCancel={() => onOpenChange(false)} />}
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
        <p className="text-xs text-muted-foreground">{t("masterData.laborRates.tradeHint")}</p>
      </form>
    </SlideOver>
  );
}
