"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { authApi } from "@/api/services/auth.api";
import { languageAfterLogin } from "@/lib/languagePreference";
import { trackLogin, type LoginMethod } from "@/lib/observability/identity";
import { safeNext } from "@/lib/session";
import { useAppDispatch, useAppStore } from "@/store/hooks";
import { setLanguage } from "@/store/slices/uiSlice";

/**
 * After sign-in: load /auth/me, switch to the account's language when this browser has no
 * language choice of its own, send the `login` analytics event (hashed user id + company only;
 * a no-op when analytics is off), then go to `?next=` or the dashboard.
 */
export function useAfterLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const store = useAppStore();
  return useCallback(
    async (nextOverride?: string, method: LoginMethod = "password") => {
      const { data: me } = await dispatch(authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }));
      const language = languageAfterLogin(me, store.getState().ui.language);
      if (language) dispatch(setLanguage(language));
      if (me) void trackLogin({ userId: me.user.id, tenantId: me.tenant.id, role: me.user.role }, method);
      router.replace(safeNext(nextOverride ?? searchParams.get("next"), "/dashboard"));
    },
    [dispatch, router, searchParams, store],
  );
}
