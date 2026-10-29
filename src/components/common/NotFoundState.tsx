"use client";

import Link from "next/link";
import { KeystoneMark } from "@/components/brand/Keystone";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";

/** "Page not found" body for `app/not-found.tsx` (a server file, so the texts live here). */
export function NotFoundState() {
  const t = useT();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <KeystoneMark size={64} />
      <div className="space-y-1">
        <h1 className="text-page-title font-semibold">{t("app.pages.notFoundTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("app.pages.notFoundBody")}</p>
      </div>
      <Button asChild>
        <Link href="/dashboard">{t("app.pages.backToDashboard")}</Link>
      </Button>
    </div>
  );
}
