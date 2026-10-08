"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { baseApi } from "@/api/baseApi";
import { useGetTenantsQuery } from "@/api/services/admin/tenants.api";
import { useGetMeQuery } from "@/api/services/auth.api";
import { useGetProjectQuery } from "@/api/services/projects.api";
import { clearActingTenant, setActingTenant, useActingTenant } from "@/lib/actingCompany";
import { DATA_BASE, toAdminDataPath } from "@/lib/companyRoutes";
import { COMPANY_NAV, PROJECT_NAV, projectHref, type NavSection } from "@/lib/navigation";
import { useAppDispatch } from "@/store/hooks";
import { setCurrentProject } from "@/store/slices/projectSlice";

const PROJECT_PATH = /^\/admin\/data\/projects\/([0-9a-f-]{36})(?:\/|$)/i;

/**
 * Company data state shared by the admin sidebar (company picker + the company's sections)
 * and the page area: the chosen company, the company's sections the super admin may open,
 * and the project open right now (project sections replace company sections inside one).
 */
export function useCompanyData() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const acting = useActingTenant();
  const ready = acting !== "pending";
  const tenantId = acting === "pending" ? null : acting;
  const tenants = useGetTenantsQuery({ limit: 100 });

  const me = useGetMeQuery(undefined, { skip: !tenantId });
  const meMatches = Boolean(me.data && tenantId && me.data.tenant.id === tenantId);

  const inData = pathname === DATA_BASE || pathname.startsWith(`${DATA_BASE}/`);
  const projectId = inData ? PROJECT_PATH.exec(pathname)?.[1] : undefined;
  const project = useGetProjectQuery(projectId ?? "", { skip: !projectId || !meMatches });

  useEffect(() => {
    if (inData) dispatch(setCurrentProject(projectId ?? null));
  }, [inData, projectId, dispatch]);

  const choose = useCallback(
    (id: string) => {
      if (id === tenantId) return;
      setActingTenant(id);
      // Nothing cached from the previous company may show in the next one.
      dispatch(baseApi.util.resetApiState());
      // Stay on the same screen, now for this company. A project page belongs to the old
      // company, so go to the projects list; the bare Company data page opens the dashboard.
      if (projectId) router.push(`${DATA_BASE}/projects`);
      else if (!inData || pathname === DATA_BASE) router.push(`${DATA_BASE}/dashboard`);
    },
    [tenantId, dispatch, router, projectId, inData, pathname],
  );

  /** Clears the chosen company (the screen stays and asks again). */
  const exit = useCallback(() => {
    clearActingTenant();
    dispatch(baseApi.util.resetApiState());
    if (projectId) router.push(`${DATA_BASE}/projects`);
  }, [dispatch, router, projectId]);

  /**
   * The super admin works as the company's owner, so every section the owner has — listed
   * even before a company is chosen (the screen then asks for one).
   */
  const sections: NavSection[] = useMemo(() => {
    const all = projectId ? PROJECT_NAV : COMPANY_NAV;
    return all
      .map((section) => ({ ...section, items: section.items.filter((item) => item.available) }))
      .filter((section) => section.items.length > 0);
  }, [projectId]);

  const companyPath = inData ? pathname.slice(DATA_BASE.length) || "/" : "";
  const hrefOf = useCallback(
    (href: string) => toAdminDataPath(projectId ? projectHref(projectId, href) : href),
    [projectId],
  );
  const isActive = useCallback(
    (href: string) => {
      const full = projectId ? projectHref(projectId, href) : href;
      return companyPath === full || companyPath.startsWith(`${full}/`);
    },
    [projectId, companyPath],
  );
  // Longest matching item wins (e.g. /projects/closed over /projects).
  const activeItemId = useMemo(() => {
    let best: { id: string; length: number } | null = null;
    for (const s of sections)
      for (const i of s.items) {
        const full = projectId ? projectHref(projectId, i.href) : i.href;
        if (isActive(i.href) && (!best || full.length > best.length))
          best = { id: i.id, length: full.length };
      }
    return best?.id ?? null;
  }, [sections, isActive, projectId]);
  const activeSectionId = sections.find((s) => s.items.some((i) => i.id === activeItemId))?.id ?? null;

  return {
    ready,
    tenantId,
    tenants,
    company: tenants.data?.items.find((t) => t.id === tenantId),
    me,
    meMatches,
    inData,
    projectId,
    project,
    choose,
    exit,
    sections,
    hrefOf,
    activeItemId,
    activeSectionId,
  };
}
