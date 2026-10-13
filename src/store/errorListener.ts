import { createListenerMiddleware, isRejectedWithValue } from "@reduxjs/toolkit";
import { toast } from "sonner";
import { baseApi } from "@/api/baseApi";
import { getErrorMessage, isApiError, planLimitDetails } from "@/lib/apiErrors";
import { markReadOnlyHit, showPlanLimit, type UiLanguage } from "@/store/slices/uiSlice";

/** /auth/me is refetched at most this often after a PERMISSION_DENIED (the snapshot may be stale). */
const ME_REFRESH_MS = 10_000;
let lastMeRefresh = 0;

/**
 * App-wide reactions to specific API errors, wherever they happen:
 *   402 PLAN_LIMIT_REACHED → upgrade dialog
 *   403 ACCOUNT_READ_ONLY  → read-only banner
 *   403 COMPANY_SUSPENDED  → /suspended
 *   403 ACT_AS_SESSION_*   → the admin's support session is gone (baseApi already left the
 *                            company): one toast explaining why
 *   403 PERMISSION_DENIED  → refresh /auth/me (permissions may have changed) and, for page
 *                            data (queries), a friendly toast. Mutations already toast through
 *                            useMutationToast.
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
      case "PERMISSION_DENIED": {
        const now = Date.now();
        if (now - lastMeRefresh > ME_REFRESH_MS) {
          lastMeRefresh = now;
          api.dispatch(baseApi.util.invalidateTags(["Me"]));
        }
        const kind = (action as { meta?: { arg?: { type?: string } } }).meta?.arg?.type;
        if (kind === "query") {
          const language = (api.getState() as { ui?: { language?: UiLanguage } }).ui?.language ?? "en";
          // One toast however many queries fail at once.
          toast.error(getErrorMessage(error, language), { id: "permission-denied" });
        }
        break;
      }
      case "ACT_AS_SESSION_REQUIRED":
      case "ACT_AS_SESSION_INVALID":
      case "ACT_AS_SESSION_EXPIRED":
      case "ACT_AS_SESSION_ENDED": {
        const language = (api.getState() as { ui?: { language?: UiLanguage } }).ui?.language ?? "en";
        toast.error(getErrorMessage(error, language), { id: "act-as-session" });
        break;
      }
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
