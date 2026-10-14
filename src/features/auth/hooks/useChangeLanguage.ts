"use client";

import { useCallback } from "react";
import { authApi } from "@/api/services/auth.api";
import { disablePreferenceSync, isMissingEndpoint, markLanguageChosen, preferenceSyncDisabled, toServerLanguage } from "@/lib/languagePreference";
import { useAppDispatch, useAppStore } from "@/store/hooks";
import { setLanguage, type UiLanguage } from "@/store/slices/uiSlice";

/**
 * Switch the UI language (LanguageMenu): remembered in this browser and, when signed in, saved on
 * the account (PATCH /auth/me/preferences) so the phone app and other browsers follow. Saving is
 * best-effort: an API without the endpoint (404) is skipped from then on; other failures are silent.
 */
export function useChangeLanguage() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  return useCallback(
    (language: UiLanguage) => {
      dispatch(setLanguage(language));
      markLanguageChosen();
      const signedIn = Boolean(store.getState().auth.me);
      if (!signedIn || preferenceSyncDisabled()) return;
      dispatch(authApi.endpoints.updatePreferences.initiate({ language: toServerLanguage(language) }))
        .unwrap()
        .catch((error: unknown) => {
          if (isMissingEndpoint(error)) disablePreferenceSync();
        });
    },
    [dispatch, store],
  );
}
