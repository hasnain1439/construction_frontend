"use client";

import { Building, ChevronDown, CircleCheck, LogOut, Menu, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useGetAdminMeQuery } from "@/api/services/admin/auth.api";
import { useGetAdminHealthQuery, useGetAdminOverviewQuery } from "@/api/services/admin/overview.api";
import { AvatarName } from "@/components/common/AvatarName";
import { CommandSearch } from "@/components/common/CommandSearch";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminLogout } from "@/features/auth/hooks/useLogout";
import { pickLabel, useLanguage, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { ADMIN_NAV } from "@/lib/navigation";
import { loginUrl } from "@/lib/session";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleRail } from "@/store/slices/uiSlice";
import { SearchTrigger } from "./TopBar";

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  return days ? `${days}d ${hours}h` : `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function HealthCard() {
  const { data, isError } = useGetAdminHealthQuery(undefined, { pollingInterval: 60_000 });
  const ok = !isError && data?.api.ok && data.database.ok;
  return (
    <div className={cn("m-3 rounded-xl border p-3 text-xs", ok ? "bg-success-soft" : "bg-warning-soft")}>
      <p className="flex items-center gap-1.5 font-semibold">
        {ok ? <CircleCheck className="size-4 text-success" aria-hidden /> : <TriangleAlert className="size-4 text-warning" aria-hidden />}
        {data ? (ok ? "All systems normal" : "Attention needed") : "Checking systems…"}
      </p>
      {data ? (
        <p className="mt-1 text-muted-foreground">
          Uptime {formatUptime(data.uptimeSeconds)} · DB {data.database.latencyMs ?? "–"} ms
        </p>
      ) : null}
    </div>
  );
}

/** Platform console shell: neutral branding, sidebar, its own auth (admin cookies). */
export function AdminShell({ children }: { children: ReactNode }) {
  const t = useT();
  const language = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((state) => state.ui.railCollapsed);
  const { data: admin, error, isLoading } = useGetAdminMeQuery();
  const { data: overview } = useGetAdminOverviewQuery(undefined, { skip: !admin, pollingInterval: 120_000 });
  const { signOut } = useAdminLogout();

  const status = error && "status" in error ? error.status : undefined;
  useEffect(() => {
    if (status === 401) router.replace(loginUrl("platform", pathname));
  }, [status, router, pathname]);

  if (isLoading || !admin) {
    return (
      <div className="flex h-dvh flex-col" aria-busy="true" aria-label="Loading">
        <div className="h-16 border-b bg-card" />
        <div className="flex flex-1">
          <div className="w-60 border-r bg-card" />
          <div className="flex-1 space-y-4 p-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => dispatch(toggleRail())} aria-label={t("shell.toggleMenu")}>
            <Menu />
          </Button>
          <Link href="/admin/overview" className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted">
            <span className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
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
                className="flex items-center gap-1 rounded-full py-1 pr-2 pl-1 hover:bg-muted"
                aria-label="Account menu"
              >
                <AvatarName name={admin.name} subtitle={admin.email} />
                <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm font-semibold">{admin.name}</p>
                <p className="text-xs font-normal text-muted-foreground">Platform admin</p>
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
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Platform" className={cn("flex flex-col border-r bg-sidebar", collapsed ? "w-[72px]" : "w-60")}>
          <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const label = pickLabel(item.label, language);
              const badge = item.badge === "pendingPayments" ? overview?.paymentsAwaitingReview : undefined;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-primary before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-r-full before:bg-sidebar-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden />
                    {collapsed ? <span className="sr-only">{label}</span> : <span className="flex-1">{label}</span>}
                    {!collapsed && !item.available ? <StatusBadge tone="neutral" label="Soon" className="h-5 px-2 text-[11px]" /> : null}
                    {badge ? (
                      <span className="ml-auto rounded-full bg-amber px-1.5 text-[11px] font-semibold text-slate-950" aria-label={`${badge} pending`}>
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          {collapsed ? null : <HealthCard />}
          <div className="border-t p-2">
            <button
              type="button"
              onClick={() => void signOut()}
              title={collapsed ? t("shell.logout") : undefined}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-5 shrink-0" aria-hidden />
              {collapsed ? <span className="sr-only">{t("shell.logout")}</span> : t("shell.logout")}
            </button>
          </div>
        </nav>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] space-y-6 px-6 py-6">{children}</div>
        </main>
      </div>
      <CommandSearch mode="admin" />
    </div>
  );
}
