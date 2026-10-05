"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "@/store";
import { hydrateUi, type UiState } from "@/store/slices/uiSlice";

const UI_STORAGE_KEY = "cw.ui";

type PersistedUi = Partial<Pick<UiState, "railCollapsed" | "language">>;

function readPersistedUi(): PersistedUi {
  try {
    const raw = window.localStorage.getItem(UI_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedUi) : {};
  } catch {
    return {};
  }
}

/** Remembers a couple of per-browser UI preferences (rail collapsed, language). */
function UiPersistence({ store }: { store: AppStore }) {
  useEffect(() => {
    store.dispatch(hydrateUi(readPersistedUi()));
    let previous = "";
    return store.subscribe(() => {
      const { railCollapsed, language } = store.getState().ui;
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
  return (
    <Provider store={store}>
      <UiPersistence store={store} />
      {children}
    </Provider>
  );
}
