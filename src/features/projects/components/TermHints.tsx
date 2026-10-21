"use client";

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage, useT } from "@/i18n/useT";

export type LocalTerm = "lenter" | "chajja" | "dpc" | "bricks";

/**
 * Site words explained (QA B-32): in Roman Urdu / Urdu a small chip per term (lenter, chajja, DPC,
 * awwal / doum eent) opens a one-line explanation. English stays plain, so nothing is shown there.
 */
export function TermHints({ terms }: { terms: LocalTerm[] }) {
  const t = useT();
  const language = useLanguage();
  if (language === "en") return null;
  return (
    <span className="ms-1 inline-flex flex-wrap gap-1.5 align-middle" data-testid="term-hints">
      {terms.map((term) => (
        <Tooltip key={term}>
          <TooltipTrigger asChild>
            <button type="button" className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground">
              <Info className="size-3" aria-hidden />
              {t(`projects.glossary.${term}.term`)}
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{t(`projects.glossary.${term}.text`)}</TooltipContent>
        </Tooltip>
      ))}
    </span>
  );
}
