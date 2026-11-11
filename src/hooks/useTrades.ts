"use client";

import { useCallback, useMemo } from "react";
import { useGetTradesQuery } from "@/api/services/masterData.api";
import type { TradeRow } from "@/api/types";
import type { SelectOption } from "@/components/forms/SelectField";
import { useEnumT, useLanguage } from "@/i18n/useT";
import { TRADE_LABEL } from "@/lib/options";
import { humanize } from "@/lib/status";
import type { UiLanguage } from "@/store/slices/uiSlice";

export interface TradeNames {
  label?: string | null;
  labelRoman?: string | null;
  labelUrdu?: string | null;
}

/** A company trade's own name in the UI language (English when that one is empty). */
export function pickTradeName(names: TradeNames, language: UiLanguage): string | null {
  const pick = language === "ur" ? names.labelUrdu : language === "roman-ur" ? names.labelRoman : names.label;
  return pick || names.label || null;
}

/** Every trade of the company (active and switched off) — one cached list shared by all screens. */
export function useAllTrades(options: { skip?: boolean } = {}) {
  return useGetTradesQuery({ includeInactive: true }, { skip: options.skip });
}

/**
 * `const tradeName = useTradeName(); tradeName(sub.trade)` — the built-in trades in the app's own
 * words, the company's own trades by their names (from the list, or names sent with the row).
 */
export function useTradeName() {
  const language = useLanguage();
  const te = useEnumT();
  const { data } = useAllTrades();
  const rows = useMemo(() => new Map<string, TradeRow>((data ?? []).map((r) => [r.key, r])), [data]);
  return useCallback(
    (key: string | null | undefined, names?: TradeNames | null) => {
      if (!key) return "—";
      if (key in TRADE_LABEL) return te("trade", key);
      const own = rows.get(key) ?? names;
      return (own && pickTradeName(own, language)) || humanize(key);
    },
    [language, rows, te],
  );
}

/** Options for a Trade select: the active trades, plus `current` when it was switched off since. */
export function useTradeOptions({ current, all = false }: { current?: string | null; all?: boolean } = {}) {
  const tradeName = useTradeName();
  const query = useAllTrades();
  const options = useMemo<SelectOption[]>(() => {
    const rows = (query.data ?? []).filter((r) => all || r.isActive || r.key === current);
    return rows.map((r) => ({ value: r.key, label: tradeName(r.key) }));
  }, [query.data, all, current, tradeName]);
  return { options, loading: query.isLoading };
}
