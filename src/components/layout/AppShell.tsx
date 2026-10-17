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
import { observeSignedIn } from "@/lib/observability/identity";
import {
  activeSection,
  COMPANY_NAV,
  PROJECT_NAV,
  projectHref,
  visibleSections,
  type NavItem,
  type NavSection,
} from "@/lib/navigation";
import { loginUrl } from "@/lib/session";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCurrentProject } from "@/store/slices/projectSlice";
import { closeFlyout, setMobileNav, toggleFlyout } from "@/store/slices/uiSlice";
import { flyoutClass, NavBackdrop, railWrapperClass } from "./navDrawer";
import { Flyout } from "./Flyout";
import { IconRail } from "./IconRail";
import { ProjectRailHeader } from "./ProjectRailHeader";
import { StickyFooter } from "./StickyFooter";
import { TopBar } from "./TopBar";

function ShellSkeleton() {
  const t = useT();
  return (
    <div className="fixed inset-0 flex flex-col" aria-busy="true" aria-label={t("common.loading")}>
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
  const mobileOpen = useAppSelector((state) => state.ui.mobileNavOpen);
  const flyoutFor = useAppSelector((state) => state.ui.flyoutFor);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const { signOut } = useLogout();
  const incoming = useGetIncomingQuery(projectId ?? "", {
    skip: !projectId || !me,
    pollingInterval: 120_000,
  });

  const status = error && "status" in error ? error.status : undefined;
  useEffect(() => {
    if (status === 401) router.replace(loginUrl("company", pathname));
  }, [status, router, pathname]);

  // Close the flyout (and the phone drawer) whenever the page changes.
  useEffect(() => {
    dispatch(closeFlyout());
    dispatch(setMobileNav(false));
  }, [pathname, dispatch]);

  // Error reports / analytics carry the hashed user id and the tenant id (no-op when both are off).
  const userId = me?.user.id;
  const tenantId = me?.tenant.id;
  useEffect(() => {
    if (userId) void observeSignedIn({ userId, tenantId });
  }, [userId, tenantId]);

  useEffect(() => {
    dispatch(setCurrentProject(projectId ?? null));
  }, [projectId, dispatch]);

  const sections = useMemo(() => {
    const all = mode === "project" ? PROJECT_NAV : COMPANY_NAV;
    return visibleSections(me, all);
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
        {t("shell.loadAccountFailed")}
      </div>
    ) : (
      <ShellSkeleton />
    );
  }

  return (
    // print: only the page content flows onto paper (no top bar, rail, flyout or footer; no inner scroll box).
    <div className="fixed inset-0 flex flex-col overflow-hidden print:static print:block print:overflow-visible">
      <div className="contents print:hidden">
        <TopBar onSessions={() => setSessionsOpen(true)} onLogout={() => void signOut()} />
      </div>
      <div className="relative flex min-h-0 flex-1 print:block">
        {/* The menu button slides the rail out to the start side (and back); the content takes the room. */}
        <div className="contents print:hidden">
          <NavBackdrop />
          <div
            className={railWrapperClass(collapsed, mobileOpen)}
            aria-hidden={(collapsed && !mobileOpen) || undefined}
            inert={collapsed && !mobileOpen}
          >
            <IconRail
              sections={sections}
              activeSectionId={current?.id}
              openSectionId={flyoutFor}
              onSelect={onSelect}
              header={projectId ? <ProjectRailHeader projectId={projectId} /> : undefined}
            />
          </div>
          <Flyout
            section={collapsed && !mobileOpen ? null : openSection}
            items={openSection?.items ?? []}
            hrefFor={hrefFor}
            onClose={onCloseFlyout}
            badgeFor={(item) => (item.badge === "incoming" ? incoming.data?.count : undefined)}
            className={flyoutClass(mobileOpen)}
          />
        </div>
        {/* Page + footer share the column right of the rail, so the footer starts where the rail ends. */}
        <div className="flex min-w-0 flex-1 flex-col print:block">
          <main id="main" className="min-h-0 min-w-0 flex-1 overflow-y-auto print:overflow-visible">
            <div className="w-full space-y-6 px-4 py-5 sm:px-6 sm:py-6">
              <ReadOnlyBanner />
              {children}
            </div>
          </main>
          <div className="contents print:hidden">
            <StickyFooter />
          </div>
        </div>
      </div>
      <CommandSearch mode={mode} />
      <PlanLimitDialog />
      <SessionsDialog open={sessionsOpen} onOpenChange={setSessionsOpen} />
    </div>
  );
}
