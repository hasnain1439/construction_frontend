"use client";

import Link from "next/link";
import { useEffect } from "react";
import { KeystoneMark } from "@/components/brand/Keystone";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";

/** Last-resort error page (a render error no screen caught): the mark, a short note, retry and the dashboard. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div
      role="alert"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <KeystoneMark size={64} />
      <div className="space-y-1">
        <h1 className="text-page-title font-semibold">{t("common.somethingWrong")}</h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{t("app.pages.errorBody")}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" onClick={() => retry()}>
          {t("common.retry")}
        </Button>
        <Button asChild>
          <Link href="/dashboard">{t("app.pages.backToDashboard")}</Link>
        </Button>
      </div>
    </div>
  );
}
