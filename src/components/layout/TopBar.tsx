"use client";

import { ChevronDown, KeyRound, LogOut, Menu, Plus, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AvatarName } from "@/components/common/AvatarName";
import { LanguageMenu } from "@/components/common/LanguageMenu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationBell } from "@/components/common/NotificationBell";
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
import { pickLabel, useLanguage, useT } from "@/i18n/useT";
import { CREATE_ACTIONS } from "@/lib/navigation";
import { canAccess } from "@/lib/permissions";
import { useAppDispatch, useMe } from "@/store/hooks";
import { setCommandOpen } from "@/store/slices/uiSlice";
import { useNavToggle } from "./navDrawer";

/** Search icon (opens CommandSearch; Ctrl+K works anywhere). */
export function SearchTrigger() {
  const t = useT();
  const dispatch = useAppDispatch();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => dispatch(setCommandOpen(true))}
          className="flex size-10 items-center justify-center rounded-full border glass text-muted-foreground shadow-card transition-colors hover:text-foreground"
          aria-label={t("shell.searchMenu")}
          aria-keyshortcuts="Control+K"
        >
          <Search className="size-[18px]" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {t("shell.searchMenu")} <kbd className="ms-1 rounded bg-muted px-1.5 text-[11px] text-foreground">Ctrl K</kbd>
      </TooltipContent>
    </Tooltip>
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
        <Button aria-label={t("shell.create")} className="max-sm:size-9 max-sm:px-0">
          <Plus data-icon="inline-start" />
          <span className="max-sm:hidden">{t("shell.create")}</span>
          <ChevronDown data-icon="inline-end" className="max-sm:hidden" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {actions.map((action) => (
          <DropdownMenuItem key={action.id} asChild>
            <Link href={action.href} className="flex items-center justify-between gap-2">
              {pickLabel(action.label, language)}
              {!action.available ? <StatusBadge tone="neutral" label={t("common.soon")} className="h-5 px-2 text-[11px]" /> : null}
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
          className="flex items-center gap-1 rounded-full border glass py-1 pe-2 ps-1 text-start shadow-card transition-colors hover:bg-card"
          aria-label={t("shell.accountMenu")}
        >
          <AvatarName name={me.user.name} subtitle={me.tenant.name} photoUrl={me.user.photoUrl} className="max-w-52 [&>div]:max-sm:hidden" />
          <ChevronDown className="size-4 shrink-0 text-muted-foreground max-sm:hidden" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="text-sm font-semibold">{me.user.name}</p>
          <p className="text-xs font-normal text-muted-foreground">
            {t(me.user.role === "THEKEDAR" ? "role.THEKEDAR" : me.user.role === "PM" ? "role.PM" : "role.MUNSHI")} ·{" "}
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
    <Link href="/dashboard" className="hidden min-w-0 items-center gap-2.5 rounded-full py-1 pe-3 ps-1 hover:bg-muted md:flex">
      {me.tenant.logoUrl ? (
        // Signed, short-lived logo URL from the API.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={me.tenant.logoUrl} alt="" className="size-10 rounded-full border bg-card object-contain" />
      ) : (
        <span className="flex size-10 items-center justify-center rounded-full bg-charcoal text-base font-bold text-white dark:bg-primary dark:text-primary-foreground">
          {me.tenant.name.charAt(0)}
        </span>
      )}
      <span className="hidden max-w-56 truncate text-base font-semibold lg:block">{me.tenant.name}</span>
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
  const toggleNav = useNavToggle();
  return (
    // Phones: menu + search on one side, actions on the other; desktop: three columns with the company centred.
    <header className="relative z-10 flex h-16 items-center justify-between gap-2 bg-transparent px-3 shadow-(--shadow-topbar) sm:h-20 sm:px-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <Button variant="ghost" size="icon" onClick={toggleNav} aria-label={t("shell.toggleMenu")}>
          <Menu />
        </Button>
        <SearchTrigger />
      </div>
      <CompanyBrand />
      <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-1.5">
        <CreateMenu />
        <LanguageMenu />
        <ThemeToggle />
        <NotificationBell />
        {rightExtra}
        <UserMenu onSessions={onSessions} onLogout={onLogout} />
      </div>
    </header>
  );
}

