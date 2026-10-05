"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { pickLabel, useLanguage, useT } from "@/i18n/useT";
import { FOOTER_ACTIONS } from "@/lib/navigation";
import { canAccess } from "@/lib/permissions";
import { useMe } from "@/store/hooks";

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0";

/** Always-visible footer: quick actions that exist today, version, sync status. */
export function StickyFooter() {
  const t = useT();
  const language = useLanguage();
  const me = useMe();
  const actions = FOOTER_ACTIONS.filter((action) => canAccess(me, action.access));
  return (
    <footer className="flex h-14 items-center justify-between gap-3 border-t bg-card px-4">
      <div className="flex items-center gap-2 overflow-x-auto">
        {actions.map((action, index) => (
          <Button key={action.id} asChild size="sm" variant={index === 0 ? "default" : "outline"}>
            <Link href={action.href}>{pickLabel(action.label, language)}</Link>
          </Button>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        <span className="hidden sm:inline">Construction Platform v{VERSION}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 font-medium text-success">
          <CircleCheck className="size-3.5" aria-hidden />
          {t("shell.allSynced")}
        </span>
      </div>
    </footer>
  );
}
