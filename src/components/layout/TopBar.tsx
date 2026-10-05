"use client";

import { Bell, ChevronDown, KeyRound, LogOut, Menu, Plus, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AvatarName } from "@/components/common/AvatarName";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { pickLabel, useLanguage, useT } from "@/i18n/useT";
import { CREATE_ACTIONS } from "@/lib/navigation";
import { canAccess } from "@/lib/permissions";
import { useAppDispatch, useMe } from "@/store/hooks";
import { setCommandOpen, toggleRail } from "@/store/slices/uiSlice";

/** Round search button + "Search menu…" (opens CommandSearch, Ctrl+K). */
export function SearchTrigger() {
  const t = useT();
  const dispatch = useAppDispatch();
  return (
    <button
      type="button"
      onClick={() => dispatch(setCommandOpen(true))}
      className="group flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 text-sm text-muted-foreground transition-colors hover:bg-muted"
      aria-keyshortcuts="Control+K"
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Search className="size-4" aria-hidden />
      </span>
      <span className="hidden md:inline">{t("shell.searchMenu")}</span>
      <kbd className="hidden rounded border bg-muted px-1.5 text-[11px] font-medium lg:inline">Ctrl K</kbd>
    </button>
  );
}

export function NotificationsBell() {
  const t = useT();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("shell.notifications")}>
          <Bell />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="text-sm font-semibold">{t("shell.notifications")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("shell.noNotifications")}</p>
      </PopoverContent>
    </Popover>
  );
}

function CreateMenu() {
  const t = useT();
  const language = useLanguage();
  const me = useMe();
  const actions = CREATE_ACTIONS.filter((action) => canAccess(me, action.access));
  if (!actions.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" />
          {t("shell.create")}
          <ChevronDown data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {actions.map((action) => (
          <DropdownMenuItem key={action.id} asChild>
            <Link href={action.href} className="flex items-center justify-between gap-2">
              {pickLabel(action.label, language)}
              {!action.available ? <StatusBadge tone="neutral" label="Soon" className="h-5 px-2 text-[11px]" /> : null}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ onSessions, onLogout }: { onSessions: () => void; onLogout: () => void }) {
  const t = useT();
  const me = useMe();
  if (!me) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 rounded-full py-1 pr-2 pl-1 text-left transition-colors hover:bg-muted"
          aria-label="Account menu"
        >
          <AvatarName name={me.user.name} subtitle={me.tenant.name} photoUrl={me.user.photoUrl} className="max-w-52" />
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="text-sm font-semibold">{me.user.name}</p>
          <p className="text-xs font-normal text-muted-foreground">
            {me.user.role === "THEKEDAR" ? "Thekedar" : me.user.role === "PM" ? "Project Manager" : "Munshi"} ·{" "}
            {me.tenant.name}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSessions}>
          <KeyRound />
          {t("shell.sessions")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onLogout} variant="destructive">
          <LogOut />
          {t("shell.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Company logo (or initial) + name, centred in the top bar. */
function CompanyBrand() {
  const me = useMe();
  if (!me) return null;
  return (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-muted">
      {me.tenant.logoUrl ? (
        // Signed, short-lived logo URL from the API.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={me.tenant.logoUrl} alt="" className="size-10 rounded-lg border object-contain" />
      ) : (
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground">
          {me.tenant.name.charAt(0)}
        </span>
      )}
      <span className="hidden truncate text-base font-semibold sm:block">{me.tenant.name}</span>
    </Link>
  );
}

/** ~80px white top bar of the company / project shell. */
export function TopBar({
  onSessions,
  onLogout,
  rightExtra,
}: {
  onSessions: () => void;
  onLogout: () => void;
  rightExtra?: ReactNode;
}) {
  const t = useT();
  const dispatch = useAppDispatch();
  return (
    <header className="grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b bg-card px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => dispatch(toggleRail())} aria-label={t("shell.toggleMenu")}>
          <Menu />
        </Button>
        <SearchTrigger />
        <LanguageToggle className="hidden xl:inline-flex" />
      </div>
      <CompanyBrand />
      <div className="flex min-w-0 items-center justify-end gap-1.5">
        <CreateMenu />
        <ThemeToggle />
        <NotificationsBell />
        {rightExtra}
        <UserMenu onSessions={onSessions} onLogout={onLogout} />
      </div>
    </header>
  );
}

