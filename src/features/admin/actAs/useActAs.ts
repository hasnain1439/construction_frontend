"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { baseApi } from "@/api/baseApi";
import { useEndActAsSessionMutation } from "@/api/services/admin/actAs.api";
import type { ActAsSession } from "@/api/types";
import { actingSessionId, clearActingTenant, setActingTenant } from "@/lib/actingCompany";
import { DATA_BASE } from "@/lib/companyRoutes";
import { useAppDispatch } from "@/store/hooks";

/**
 * Enter / leave a company as platform support. Entering stores the company + session cookies
 * (sent as X-Act-As-Tenant / X-Act-As-Session) and drops every cached company query, so
 * nothing from the previous company can show.
 */
export function useActAsSwitch() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [endSession, { isLoading: ending }] = useEndActAsSessionMutation();

  const enter = useCallback(
    (session: Pick<ActAsSession, "id" | "tenant">) => {
      setActingTenant(session.tenant.id, session.id);
      dispatch(baseApi.util.resetApiState());
    },
    [dispatch],
  );

  /** Leaves the company locally (session expired / ended elsewhere). */
  const forget = useCallback(() => {
    clearActingTenant();
    dispatch(baseApi.util.resetApiState());
  }, [dispatch]);

  /** Ends the session on the server, then leaves; a project page goes back to the list. */
  const leave = useCallback(
    async (opts: { stay?: boolean } = {}) => {
      const id = actingSessionId();
      if (id)
        await endSession(id)
          .unwrap()
          .catch(() => undefined);
      forget();
      if (
        !opts.stay &&
        typeof window !== "undefined" &&
        window.location.pathname.startsWith(`${DATA_BASE}/projects/`)
      ) {
        router.push(`${DATA_BASE}/projects`);
      }
    },
    [endSession, forget, router],
  );

  return { enter, leave, forget, ending };
}

/** Milliseconds until `expiresAt`, ticking every second (null without a date). */
export function useTimeLeft(expiresAt: string | null | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  return expiresAt ? Math.max(0, Date.parse(expiresAt) - now) : null;
}
