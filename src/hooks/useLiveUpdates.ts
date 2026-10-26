"use client";

import { useEffect } from "react";
import { baseApi } from "@/api/baseApi";
import { authApi } from "@/api/services/auth.api";
import { COMPANY_TAGS, type CompanyTag } from "@/api/tags";
import { startLiveUpdates } from "@/lib/liveUpdates";
import { useAppDispatch } from "@/store/hooks";

/** Lists that only change with a new release — never re-read on a live update. */
const STATIC_TAGS = new Set<CompanyTag>(["PermissionCatalog", "SupplyPresets", "SubscriptionPlans"]);
const LIVE_TAGS = COMPANY_TAGS.filter((tag) => !STATIC_TAGS.has(tag));
/** Several writes in a row (a bulk save, a phone's sync push) → one re-read. */
const DEBOUNCE_MS = 400;

/**
 * Someone else changed something in the company → the open screens re-read their data, without
 * a page reload. Only queries that are on screen refetch; cached ones are dropped and load fresh
 * when opened. A hidden tab waits until it is shown again. See lib/liveUpdates.ts.
 */
export function useLiveUpdates(enabled: boolean) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pendingWhileHidden = false;

    const refresh = () => {
      timer = undefined;
      if (document.hidden) {
        pendingWhileHidden = true;
        return;
      }
      dispatch(baseApi.util.invalidateTags(LIVE_TAGS));
    };
    const onVisible = () => {
      if (!document.hidden && pendingWhileHidden) {
        pendingWhileHidden = false;
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const stop = startLiveUpdates({
      onChange: () => {
        if (timer === undefined) timer = setTimeout(refresh, DEBOUNCE_MS);
      },
      refreshSession: async () => {
        const result = await dispatch(authApi.endpoints.getMe.initiate(undefined, { subscribe: false, forceRefetch: true }));
        return !result.error;
      },
    });

    return () => {
      stop();
      if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, dispatch]);
}
