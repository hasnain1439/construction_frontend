"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "@/store";
import { isRtl } from "@/i18n/useT";
import { hydrateUi, normalizeUiLanguage, type UiLanguage, type UiState } from "@/store/slices/uiSlice";

const UI_STORAGE_KEY = "cw.ui";

type PersistedUi = Partial<Pick<UiState, "railCollapsed" | "language">>;

/**
 * The stored UI preferences, validated (QA-B-18 / R2-B-02): anything but a JSON object (`null`, a
 * number, a string, an array, broken JSON) gives the defaults, and each field is kept only when it
 * has the right type — a bad value never reaches the reducer.
 */
export function parsePersistedUi(raw: string | null): PersistedUi {
  if (!raw) return {};
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const { railCollapsed, language } = value as Record<string, unknown>;
  return {
    ...(typeof railCollapsed === "boolean" ? { railCollapsed } : {}),
    ...(typeof language === "string" ? { language: normalizeUiLanguage(language) } : {}),
  };
}

function readPersistedUi(): PersistedUi {
  try {
    return parsePersistedUi(window.localStorage.getItem(UI_STORAGE_KEY));
  } catch {
    return {};
  }
}

/** <html lang dir>: Urdu flips the page right-to-left and switches to the Urdu font (globals.css). */
function applyDocumentLanguage(language: UiLanguage) {
  const el = document.documentElement;
  el.lang = language === "en" ? "en" : language === "ur" ? "ur" : "ur-Latn";
  el.dir = isRtl(language) ? "rtl" : "ltr";
}

/** Remembers a couple of per-browser UI preferences (rail collapsed, language). */
function UiPersistence({ store }: { store: AppStore }) {
  useEffect(() => {
    store.dispatch(hydrateUi(readPersistedUi()));
    applyDocumentLanguage(store.getState().ui.language);
    let previous = "";
    return store.subscribe(() => {
      const { railCollapsed, language } = store.getState().ui;
      applyDocumentLanguage(language);
      const next = JSON.stringify({ railCollapsed, language });
      if (next === previous) return;
      previous = next;
      try {
        window.localStorage.setItem(UI_STORAGE_KEY, next);
      } catch {
        // Storage can be unavailable (private mode); preferences then last for the tab.
      }
    });
  }, [store]);
  return null;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);
  // R2-B-05: the state the server rendered with (English, nothing loaded). React hydrates every part of
  // the page against it, also a Suspense boundary that hydrates after UiPersistence has already switched
  // the language (the login form, pages using search params) — else Urdu client text met English server
  // HTML ("Hydration failed … server rendered text didn't match"). Right after hydrating, the parts
  // re-render with the live state.
  const [serverState] = useState(() => store.getState());
  return (
    <Provider store={store} serverState={serverState}>
      <UiPersistence store={store} />
      {children}
    </Provider>
  );
}
