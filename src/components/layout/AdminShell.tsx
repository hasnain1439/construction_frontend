"use client";

import { ChevronDown, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useGetAdminMeQuery } from "@/api/services/admin/auth.api";
import { BRAND_NAME, KeystoneLogo } from "@/components/brand/Keystone";
import { AvatarName } from "@/components/common/AvatarName";
import { CommandSearch } from "@/components/common/CommandSearch";
import { LanguageMenu } from "@/components/common/LanguageMenu";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ActAsBanner } from "@/features/admin/actAs/ActAsBanner";
import { useAdminLogout } from "@/features/auth/hooks/useLogout";
import { useT } from "@/i18n/useT";
import { loginUrl } from "@/lib/session";
import { useAppSelector } from "@/store/hooks";
import { NavBackdrop, railWrapperClass, useNavToggle } from "./navDrawer";
import { AdminRail } from "./AdminRail";
import { SearchTrigger } from "./TopBar";

/** Platform console shell: neutral branding, the same rail + flyout as the company app, its own auth (admin cookies). */
export function AdminShell({ children }: { children: ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const collapsed = useAppSelector((state) => state.ui.railCollapsed);
  const mobileOpen = useAppSelector((state) => state.ui.mobileNavOpen);
  const toggleNav = useNavToggle();
  const { data: admin, error, isLoading } = useGetAdminMeQuery();
  const { signOut } = useAdminLogout();

  const status = error && "status" in error ? error.status : undefined;
  useEffect(() => {
    if (status === 401) router.replace(loginUrl("platform", pathname));
  }, [status, router, pathname]);

  if (isLoading || !admin) {
    return (
      <div className="fixed inset-0 flex flex-col" aria-busy="true" aria-label={t("common.loading")}>
        <div className="h-16" />
        <div className="flex flex-1">
          <div className="w-28" />
          <div className="flex-1 space-y-4 p-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    // overflow-clip: never scrolled by focus / find-in-page (see AppShell)
    <div className="fixed inset-0 flex flex-col overflow-clip">
      <header className="relative z-10 flex h-16 items-center justify-between gap-2 bg-transparent px-3 sm:gap-4 sm:px-4 shadow-(--shadow-topbar)">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleNav}
            aria-label={t("shell.toggleMenu")}
          >
            <Menu />
          </Button>
          {/* Keystone on a charcoal plate (dark-variant mark) + the sun "Super Admin" pill. */}
          <Link
            href="/admin/overview"
            data-testid="admin-brand"
            aria-label={`${BRAND_NAME} · ${t("shell.superAdmin")}`}
            className="flex items-center gap-2.5 rounded-full bg-charcoal py-1.5 ps-3 pe-1.5 text-white transition-opacity hover:opacity-90 dark:ring-1 dark:ring-white/10"
          >
            <KeystoneLogo size={30} tone="dark" wordmarkClassName="text-lg text-white max-sm:hidden" />
            <span className="rounded-full bg-sun px-2.5 py-1 text-xs leading-none font-bold text-charcoal">
              {t("shell.superAdmin")}
            </span>
          </Link>
          <SearchTrigger />
        </div>
        <div className="flex items-center gap-1.5">
          <LanguageMenu />
          <ThemeToggle />
          <FullscreenToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 rounded-full border glass py-1 pe-2 ps-1 shadow-card hover:bg-card"
                aria-label={t("shell.accountMenu")}
              >
                <AvatarName name={admin.name} subtitle={admin.email} className="[&>div]:max-sm:hidden" />
                <ChevronDown className="size-4 text-muted-foreground max-sm:hidden" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm font-semibold">{admin.name}</p>
                <p className="text-xs font-normal text-muted-foreground">{t("shell.platformAdmin")}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
                <LogOut />
                {t("shell.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      {/* Working inside a company: small neutral bar with the company and Exit (every page). */}
      <ActAsBanner />
      <div className="relative flex min-h-0 flex-1">
        {/* Same rail + flyout as the company dashboard; the menu button slides it out. */}
        <NavBackdrop />
        <div className={railWrapperClass(collapsed, mobileOpen)} aria-hidden={(collapsed && !mobileOpen) || undefined} inert={collapsed && !mobileOpen}>
          <AdminRail collapsed={collapsed && !mobileOpen} mobileOpen={mobileOpen} />
        </div>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="w-full space-y-6 px-4 py-5 sm:px-6 sm:py-6">{children}</div>
        </main>
      </div>
      <CommandSearch mode="admin" />
    </div>
  );
}
