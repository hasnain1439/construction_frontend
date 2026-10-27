"use client";

import { useEffect } from "react";
import { baseApi } from "@/api/baseApi";
import { authApi } from "@/api/services/auth.api";
import { COMPANY_TAGS, type CompanyTag } from "@/api/tags";
import { startLiveUpdates, tagsForResource } from "@/lib/liveUpdates";
import { useAppDispatch } from "@/store/hooks";

/** Lists that only change with a new release — never re-read on a live update. */
const STATIC_TAGS = new Set<CompanyTag>(["PermissionCatalog", "SupplyPresets", "SubscriptionPlans"]);
const LIVE_TAGS = COMPANY_TAGS.filter((tag) => !STATIC_TAGS.has(tag));
/** Several writes in a row (a bulk save, a phone's sync push) → one re-read; short, so a single change shows quickly. */
const DEBOUNCE_MS = 150;

/**
 * Someone else changed something in the company → the open screens re-read their data, without
 * a page reload. Only the screens the change can touch refetch (tagsForResource; unknown = all), so
 * they come back sooner than when every query on the page re-ran. Cached queries that are not on
 * screen are dropped and load fresh when opened. A hidden tab waits until it is shown again.
 * See lib/liveUpdates.ts.
 */
export function useLiveUpdates(enabled: boolean) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    /** Tags waiting for the next re-read; "ALL" once any change was not recognised. */
    let pending: Set<CompanyTag> | "ALL" = new Set();
    let pendingWhileHidden = false;

    const refresh = () => {
      timer = undefined;
      if (document.hidden) {
        pendingWhileHidden = true;
        return;
      }
      const tags = pending === "ALL" ? LIVE_TAGS : [...pending].filter((tag) => !STATIC_TAGS.has(tag));
      pending = new Set();
      if (tags.length) dispatch(baseApi.util.invalidateTags(tags));
    };
    const onVisible = () => {
      if (!document.hidden && pendingWhileHidden) {
        pendingWhileHidden = false;
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const stop = startLiveUpdates({
      onChange: (event) => {
        const tags = tagsForResource(event.resource);
        if (tags === "ALL" || pending === "ALL") pending = "ALL";
        else for (const tag of tags) pending.add(tag);
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
