"use client";

import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { pickLabel, useLanguage } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import type { NavSection } from "@/lib/navigation";

export interface IconRailProps {
  sections: NavSection[];
  /** Section that contains the current page — the ONLY highlighted item. */
  activeSectionId: string | undefined;
  /** Section whose flyout is open (announced via aria-expanded, not highlighted). */
  openSectionId: string | null;
  onSelect: (section: NavSection) => void;
  collapsed?: boolean;
  /** Project mode: "← All projects" + project name. */
  header?: ReactNode;
  /** Pinned under the sections (e.g. Log out). */
  footer?: ReactNode;
  /** Accessible name of the rail (default "Main"). */
  label?: string;
}

/** Log out button styled like a rail item, for the rail footer. */
export function RailLogoutButton({
  label,
  collapsed,
  onClick,
}: {
  label: string;
  collapsed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className="flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-center text-destructive transition-colors outline-none hover:bg-destructive/10 focus-visible:bg-destructive/10"
    >
      <LogOut className="size-7" strokeWidth={1.6} aria-hidden />
      {collapsed ? null : <span className="text-xs leading-tight font-medium">{label}</span>}
    </button>
  );
}

/**
 * Left rail: outline icon with the label under it, in charcoal on the warm sidebar. Active =
 * a charcoal bar on the left edge (no box). Only the active item is highlighted.
 */
export function IconRail({
  sections,
  activeSectionId,
  openSectionId,
  onSelect,
  collapsed,
  header,
  footer,
  label: railLabel = "Main",
}: IconRailProps) {
  const language = useLanguage();
  return (
    <nav
      aria-label={railLabel}
      data-collapsed={collapsed || undefined}
      className={cn(
        "scrollbar-slim flex h-full flex-col overflow-y-auto bg-transparent pb-4",
        collapsed ? "w-[72px]" : "w-28",
      )}
    >
      {header}
      <ul className="flex flex-col gap-1 px-2 pt-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const active = section.id === activeSectionId;
          const label = pickLabel(section.label, language);
          return (
            <li key={section.id}>
              <button
                type="button"
                data-rail-item={section.id}
                data-active={active || undefined}
                aria-current={active ? "page" : undefined}
                aria-expanded={section.items.length > 1 ? openSectionId === section.id : undefined}
                aria-haspopup={section.items.length > 1 ? "menu" : undefined}
                aria-label={collapsed ? label : undefined}
                title={collapsed ? label : undefined}
                onClick={() => onSelect(section)}
                className={cn(
                  "relative flex w-full flex-col items-center gap-1 rounded-2xl px-1.5 py-2.5 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  active
                    ? "text-sidebar-primary before:absolute before:inset-y-3 before:-left-2 before:w-1 before:rounded-r-full before:bg-sidebar-primary"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-6" strokeWidth={1.7} aria-hidden />
                {collapsed ? null : <span className={cn("text-xs leading-tight", active ? "font-bold" : "font-medium")}>{label}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {footer ? <div className="mt-auto space-y-1 px-2 pt-3">{footer}</div> : null}
    </nav>
  );
}
