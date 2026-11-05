"use client";

import { ChevronDown, KeyRound, LogOut, Menu, Plus, Search, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND_NAME, KeystoneMark, KeystoneWordmark } from "@/components/brand/Keystone";
import { AvatarName } from "@/components/common/AvatarName";
import { LanguageMenu } from "@/components/common/LanguageMenu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationBell } from "@/components/common/NotificationBell";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FullscreenToggle } from "@/components/common/FullscreenToggle";
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
import { useAppDispatch, useAppSelector, useMe } from "@/store/hooks";
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
        {t("shell.searchMenu")}{" "}
        <kbd className="ms-1 rounded bg-muted px-1.5 text-xs text-foreground">
          Ctrl K{/* i18n-ignore: key names */}
        </kbd>
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
      <DropdownMenuContent align="start" className="w-56">
        {actions.map((action) => (
          <DropdownMenuItem key={action.id} asChild>
            <Link href={action.href} className="flex items-center justify-between gap-2">
              {pickLabel(action.label, language)}
              {!action.available ? (
                <StatusBadge tone="neutral" label={t("common.soon")} className="h-5 px-2 text-xs" />
              ) : null}
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
          className="flex items-center gap-1 rounded-full border glass py-1 ps-1 pe-2 text-start shadow-card transition-colors hover:bg-card"
          aria-label={t("shell.accountMenu")}
        >
          <AvatarName
            name={me.user.name}
            subtitle={me.tenant.name}
            photoUrl={me.user.photoUrl}
            className="max-w-52 [&>div]:max-sm:hidden"
          />
          <ChevronDown className="size-4 shrink-0 text-muted-foreground max-sm:hidden" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="text-sm font-semibold">{me.user.name}</p>
          <p className="text-xs font-normal text-muted-foreground">
            {/* A custom role (Accountant, "Site PM" …) shows its name; the default templates show the translated account type. */}
            {me.permissionRole?.name && !["PROJECT_MANAGER", "MUNSHI"].includes(me.permissionRole.key ?? "")
              ? me.permissionRole.name
              : t(
                  me.user.role === "THEKEDAR"
                    ? "role.THEKEDAR"
                    : me.user.role === "PM"
                      ? "role.PM"
                      : "role.MUNSHI",
                )}{" "}
            · {me.tenant.name}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserRound />
            {t("shell.myAccount")}
          </Link>
        </DropdownMenuItem>
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

/**
 * Keystone mark + wordmark | company logo (or initial) + name, centred in the top bar. With the
 * rail collapsed only the mark stays. In Urdu the row mirrors (company | Keystone); the Keystone
 * lockup itself stays Latin, left-to-right.
 */
function CompanyBrand() {
  const me = useMe();
  const collapsed = useAppSelector((state) => state.ui.railCollapsed);
  if (!me) return null;
  return (
    <Link
      href="/dashboard"
      data-testid="company-brand"
      data-collapsed={collapsed || undefined}
      className="flex min-w-0 items-center gap-3 rounded-full py-1 ps-2 pe-3 hover:bg-muted"
    >
      <span dir="ltr" className="flex shrink-0 items-center gap-2">
        <KeystoneMark size={36} label={collapsed ? BRAND_NAME : undefined} />
        {collapsed ? null : <KeystoneWordmark className="text-xl max-sm:hidden" />}
      </span>
      <span className="h-7 w-px shrink-0 bg-foreground/20 max-md:hidden" aria-hidden />
      <span className="flex min-w-0 items-center gap-2.5 max-md:hidden">
        {me.tenant.logoUrl ? (
          // Signed, short-lived logo URL from the API.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.tenant.logoUrl} alt="" className="size-9 rounded-full border bg-card object-contain" />
        ) : (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-charcoal text-base font-bold text-white dark:bg-primary dark:text-primary-foreground">
            {me.tenant.name.charAt(0)}
          </span>
        )}
        <span className="hidden max-w-56 truncate text-base font-semibold lg:block">{me.tenant.name}</span>
      </span>
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
        <CreateMenu />
      </div>
      <CompanyBrand />
      <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-1.5">
        <LanguageMenu />
        <ThemeToggle />
        <FullscreenToggle />
        <NotificationBell />
        {rightExtra}
        <UserMenu onSessions={onSessions} onLogout={onLogout} />
      </div>
    </header>
  );
}
