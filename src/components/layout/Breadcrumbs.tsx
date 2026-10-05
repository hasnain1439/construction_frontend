"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { useT } from "@/i18n/useT";

export interface Crumb {
  label: string;
  href?: string;
}

/** "Home | Projects | New Project" — every crumb with an href is clickable. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useT();
  const pathname = usePathname();
  const home = pathname.startsWith("/admin") ? "/admin/overview" : "/dashboard";
  const all: Crumb[] = [{ label: t("shell.home"), href: home }, ...items];
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {all.map((crumb, index) => {
          const last = index === all.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <li>
                {crumb.href && !last ? (
                  <Link href={crumb.href} className="rounded-sm hover:text-foreground hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current={last ? "page" : undefined} className={last ? "text-foreground" : undefined}>
                    {crumb.label}
                  </span>
                )}
              </li>
              {!last ? (
                <li aria-hidden>
                  <ChevronRight className="size-3" />
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
