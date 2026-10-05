import { createListenerMiddleware, isRejectedWithValue } from "@reduxjs/toolkit";
import { isApiError, planLimitDetails } from "@/lib/apiErrors";
import { markReadOnlyHit, showPlanLimit } from "@/store/slices/uiSlice";

/**
 * App-wide reactions to specific API errors, wherever they happen:
 *   402 PLAN_LIMIT_REACHED → upgrade dialog
 *   403 ACCOUNT_READ_ONLY  → read-only banner
 *   403 COMPANY_SUSPENDED  → /suspended
 */
export const errorListener = createListenerMiddleware();

errorListener.startListening({
  predicate: (action) => isRejectedWithValue(action),
  effect: (action, api) => {
    const error = (action as { payload?: unknown }).payload;
    if (!isApiError(error)) return;
    switch (error.code) {
      case "PLAN_LIMIT_REACHED":
        api.dispatch(showPlanLimit(planLimitDetails(error) ?? {}));
        break;
      case "ACCOUNT_READ_ONLY":
        api.dispatch(markReadOnlyHit());
        break;
      case "COMPANY_SUSPENDED":
        if (typeof window !== "undefined" && window.location.pathname !== "/suspended") {
          // Full navigation on purpose: drops every cached company query.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/suspended");
        }
        break;
    }
  },
});
