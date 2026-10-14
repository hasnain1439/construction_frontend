"use client";

import { Check, ChevronDown, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useChangeLanguage } from "@/features/auth/hooks/useChangeLanguage";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { useAppSelector } from "@/store/hooks";
import type { UiLanguage } from "@/store/slices/uiSlice";

/** Each language named in its own script, so anyone can find theirs (never translated). */
const LANGUAGES: { value: UiLanguage; label: string; short: string; dir?: "rtl" }[] = [
  { value: "en", label: "English", short: "EN" }, // i18n-ignore: language names stay in their own language
  { value: "roman-ur", label: "Roman Urdu", short: "Roman" }, // i18n-ignore
  { value: "ur", label: "اردو", short: "اردو", dir: "rtl" }, // i18n-ignore
];

/**
 * Language picker: a compact button (globe + current language) opening English · Roman Urdu · اردو.
 * The choice is kept in this browser and saved on the account (see useChangeLanguage).
 */
export function LanguageMenu({ className }: { className?: string }) {
  const t = useT();
  const changeLanguage = useChangeLanguage();
  const language = useAppSelector((state) => state.ui.language);
  const current = LANGUAGES.find((l) => l.value === language) ?? LANGUAGES[0]!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn("gap-1.5 rounded-full px-2.5", className)} aria-label={`${t("shell.language")}: ${current.label}`}>
          <Languages className="size-4" aria-hidden />
          <span dir={current.dir} className="text-sm font-medium max-sm:hidden">
            {current.short}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground max-sm:hidden" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("shell.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((l) => (
          <DropdownMenuItem key={l.value} onSelect={() => changeLanguage(l.value)} className="justify-between">
            <span dir={l.dir}>{l.label}</span>
            {l.value === language ? <Check className="size-4" aria-hidden /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
