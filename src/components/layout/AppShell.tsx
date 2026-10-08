"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useGetMeQuery } from "@/api/services/auth.api";
import { useGetIncomingQuery } from "@/api/services/dispatch.api";
import { CommandSearch } from "@/components/common/CommandSearch";
import { PlanLimitDialog } from "@/components/common/PlanLimitDialog";
import { ReadOnlyBanner } from "@/components/common/ReadOnlyBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionsDialog } from "@/features/auth/components/SessionsDialog";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { activeSection, COMPANY_NAV, PROJECT_NAV, projectHref, type NavItem, type NavSection } from "@/lib/navigation";
import { canAccess } from "@/lib/permissions";
import { loginUrl } from "@/lib/session";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCurrentProject } from "@/store/slices/projectSlice";
import { closeFlyout, toggleFlyout } from "@/store/slices/uiSlice";
import { Flyout } from "./Flyout";
import { IconRail, RailLogoutButton } from "./IconRail";
import { ProjectRailHeader } from "./ProjectRailHeader";
import { StickyFooter } from "./StickyFooter";
import { TopBar } from "./TopBar";

function ShellSkeleton() {
  return (
    <div className="fixed inset-0 flex flex-col" aria-busy="true" aria-label="Loading">
      <div className="h-20" />
      <div className="flex flex-1">
        <div className="w-28" />
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * Company / project shell: top bar, icon rail, flyout, sticky footer. The real auth
 * check happens here (GET /auth/me); the proxy only checks that a cookie exists.
 */
export function AppShell({ mode, children }: { mode: "company" | "project"; children: ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ projectId?: string }>();
  const projectId = mode === "project" ? params.projectId : undefined;
  const dispatch = useAppDispatch();
  const { data: me, error, isLoading } = useGetMeQuery();
  const collapsed = useAppSelector((state) => state.ui.railCollapsed);
  const flyoutFor = useAppSelector((state) => state.ui.flyoutFor);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const { signOut } = useLogout();
  const incoming = useGetIncomingQuery(projectId ?? "", { skip: !projectId || !me, pollingInterval: 120_000 });

  const status = error && "status" in error ? error.status : undefined;
  useEffect(() => {
    if (status === 401) router.replace(loginUrl("company", pathname));
  }, [status, router, pathname]);

  // Close the flyout whenever the page changes.
  useEffect(() => {
    dispatch(closeFlyout());
  }, [pathname, dispatch]);

  useEffect(() => {
    dispatch(setCurrentProject(projectId ?? null));
  }, [projectId, dispatch]);

  const sections = useMemo(() => {
    const all = mode === "project" ? PROJECT_NAV : COMPANY_NAV;
    return all
      .filter((section) => canAccess(me, section.access))
      .map((section) => ({ ...section, items: section.items.filter((item) => canAccess(me, item.access)) }))
      .filter((section) => section.items.length > 0);
  }, [mode, me]);

  const hrefFor = useCallback(
    (item: NavItem) => (projectId ? projectHref(projectId, item.href) : item.href),
    [projectId],
  );
  const current = activeSection(sections, pathname, projectId);
  const openSection = sections.find((s) => s.id === flyoutFor) ?? null;

  const onSelect = (section: NavSection) => {
    if (section.items.length === 1) {
      router.push(hrefFor(section.items[0]));
      return;
    }
    dispatch(toggleFlyout(section.id));
  };
  const onCloseFlyout = useCallback(() => dispatch(closeFlyout()), [dispatch]);

  if (isLoading || !me) {
    return error && status !== 401 ? (
      <div className="fixed inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Could not load your account. Check that the API is running and refresh the page.
      </div>
    ) : (
      <ShellSkeleton />
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <TopBar onSessions={() => setSessionsOpen(true)} onLogout={() => void signOut()} />
      <div className="relative flex min-h-0 flex-1">
        {/* The menu button slides the rail out to the left (and back); the content takes the room. */}
        <div
          className={cn("h-full shrink-0 overflow-hidden transition-[width] duration-200 ease-out", collapsed ? "w-0" : "w-28 shadow-(--shadow-rail)")}
          aria-hidden={collapsed || undefined}
          inert={collapsed}
        >
          <IconRail
            sections={sections}
            activeSectionId={current?.id}
            openSectionId={flyoutFor}
            onSelect={onSelect}
            header={projectId ? <ProjectRailHeader projectId={projectId} /> : undefined}
            footer={<RailLogoutButton label={t("shell.logout")} onClick={() => void signOut()} />}
          />
        </div>
        <Flyout
          section={collapsed ? null : openSection}
          items={openSection?.items ?? []}
          hrefFor={hrefFor}
          onClose={onCloseFlyout}
          badgeFor={(item) => (item.badge === "incoming" ? incoming.data?.count : undefined)}
          className="left-28"
        />
        <main id="main" className={cn("min-w-0 flex-1 overflow-y-auto")}>
          <div className="w-full space-y-6 px-6 py-6">
            <ReadOnlyBanner />
            {children}
          </div>
        </main>
      </div>
      <StickyFooter />
      <CommandSearch mode={mode} />
      <PlanLimitDialog />
      <SessionsDialog open={sessionsOpen} onOpenChange={setSessionsOpen} />
    </div>
  );
}
