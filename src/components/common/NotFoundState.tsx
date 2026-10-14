"use client";

import { SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";

/** "Page not found" body for `app/not-found.tsx` (a server file, so the texts live here). */
export function NotFoundState() {
  const t = useT();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-7" aria-hidden />
      </span>
      <div className="space-y-1">
        <h1 className="text-page-title font-semibold">{t("app.pages.notFoundTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("app.pages.notFoundBody")}</p>
      </div>
      <Button asChild>
        <Link href="/dashboard">{t("permissions.goDashboard")}</Link>
      </Button>
    </div>
  );
}
