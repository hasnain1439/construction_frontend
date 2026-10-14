"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { baseApi } from "@/api/baseApi";
import { clearActingTenant, setActingTenant } from "@/lib/actingCompany";
import { DATA_BASE } from "@/lib/companyRoutes";
import { useAppDispatch } from "@/store/hooks";

/**
 * Enter / leave a company as the platform super admin (direct, full access — nothing to start
 * or end on the server). Entering stores the company cookie (sent as X-Act-As-Tenant) and drops
 * every cached company query, so nothing from the previous company can show.
 */
export function useActAsSwitch() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const enter = useCallback(
    (tenantId: string) => {
      setActingTenant(tenantId);
      dispatch(baseApi.util.resetApiState());
    },
    [dispatch],
  );

  /** Leaves the company; a project page goes back to the list. */
  const leave = useCallback(
    (opts: { stay?: boolean } = {}) => {
      clearActingTenant();
      dispatch(baseApi.util.resetApiState());
      if (
        !opts.stay &&
        typeof window !== "undefined" &&
        window.location.pathname.startsWith(`${DATA_BASE}/projects/`)
      ) {
        router.push(`${DATA_BASE}/projects`);
      }
    },
    [dispatch, router],
  );

  return { enter, leave };
}
