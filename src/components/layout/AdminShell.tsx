"use client";

import { Building, ChevronDown, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useGetAdminMeQuery } from "@/api/services/admin/auth.api";
import { AvatarName } from "@/components/common/AvatarName";
import { CommandSearch } from "@/components/common/CommandSearch";
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
import { useAdminLogout } from "@/features/auth/hooks/useLogout";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { loginUrl } from "@/lib/session";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleRail } from "@/store/slices/uiSlice";
import { AdminRail } from "./AdminRail";
import { SearchTrigger } from "./TopBar";

/** Platform console shell: neutral branding, the same rail + flyout as the company app, its own auth (admin cookies). */
export function AdminShell({ children }: { children: ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((state) => state.ui.railCollapsed);
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
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <header className="relative z-10 flex h-16 items-center justify-between gap-4 bg-transparent px-4 shadow-(--shadow-topbar)">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dispatch(toggleRail())}
            aria-label={t("shell.toggleMenu")}
          >
            <Menu />
          </Button>
          <Link
            href="/admin/overview"
            className="flex items-center gap-2 rounded-full py-1 pe-3 ps-1 hover:bg-muted"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-charcoal text-white dark:bg-primary dark:text-primary-foreground">
              <Building className="size-5" aria-hidden />
            </span>
            <span className="text-base font-semibold">{t("shell.platformConsole")}</span>
          </Link>
          <SearchTrigger />
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 rounded-full border glass py-1 pe-2 ps-1 shadow-card hover:bg-card"
                aria-label={t("shell.accountMenu")}
              >
                <AvatarName name={admin.name} subtitle={admin.email} />
                <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
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
      <div className="relative flex min-h-0 flex-1">
        {/* Same rail + flyout as the company dashboard; the menu button slides it out. */}
        <div
          className={cn(
            "h-full shrink-0 overflow-hidden transition-[width] duration-200 ease-out",
            collapsed ? "w-0" : "w-28 shadow-(--shadow-rail)",
          )}
          aria-hidden={collapsed || undefined}
          inert={collapsed}
        >
          <AdminRail collapsed={collapsed} onLogout={() => void signOut()} />
        </div>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="w-full space-y-6 px-6 py-6">{children}</div>
        </main>
      </div>
      <CommandSearch mode="admin" />
    </div>
  );
}
