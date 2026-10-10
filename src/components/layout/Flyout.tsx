"use client";

import { EllipsisVertical, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { pickLabel, useLanguage, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import type { NavItem, NavSection } from "@/lib/navigation";

export interface FlyoutProps {
  section: NavSection | null;
  items: NavItem[];
  hrefFor: (item: NavItem) => string;
  onClose: () => void;
  /** Live count per item (e.g. incoming deliveries). */
  badgeFor?: (item: NavItem) => number | undefined;
  /** Start offset = rail width. */
  className?: string;
}

/**
 * Sub-menu panel beside the rail. Closes on Esc, outside click and navigation (the shell
 * closes it when the path changes).
 */
export function Flyout({ section, items, hrefFor, onClose, badgeFor, className }: FlyoutProps) {
  const t = useT();
  const language = useLanguage();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!section) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || panelRef.current?.contains(target)) return;
      // Clicking a rail button toggles via the rail itself.
      if (target.closest("[data-rail-item]")) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [section, onClose]);

  useEffect(() => {
    if (section) panelRef.current?.querySelector<HTMLElement>("a")?.focus();
  }, [section]);

  if (!section) return null;
  const title = pickLabel(section.label, language);

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-label={title}
      className={cn(
        "absolute top-0 bottom-0 z-30 flex w-[300px] flex-col rounded-se-3xl border-e border-transparent bg-popover shadow-flyout animate-in fade-in-0 slide-in-from-start-4",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b px-5 py-4">
        <p className="text-base font-semibold">{title}</p>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("common.close")}>
          <X />
        </Button>
      </div>
      <ul className="scrollbar-slim flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const href = hrefFor(item);
          const current = pathname === href;
          const count = badgeFor?.(item);
          return (
            <li key={item.id}>
              <Link
                href={href}
                role="menuitem"
                aria-current={current ? "page" : undefined}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  current ? "bg-secondary font-semibold text-foreground shadow-sm" : "hover:bg-muted",
                )}
              >
                <EllipsisVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex-1">{pickLabel(item.label, language)}</span>
                {!item.available ? <StatusBadge tone="neutral" label={t("common.soon")} className="h-5 px-2 text-[11px]" /> : null}
                {count ? (
                  <span className="rounded-full bg-sun px-1.5 text-[11px] font-semibold text-charcoal" aria-label={t("common.waiting", { n: count })}>
                    {count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
