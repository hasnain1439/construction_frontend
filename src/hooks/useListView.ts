"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

export type ListView = "cards" | "table";

/** Below Tailwind's `md` breakpoint: a phone. */
export const PHONE_QUERY = "(max-width: 767px)";

/** Whether a CSS media query matches, kept in sync with the window (false while rendering on the server). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener?.("change", onChange);
      return () => list.removeEventListener?.("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => typeof window.matchMedia === "function" && window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Cards / Table toggle of a list (the Projects pattern, QA R-02): cards on a phone and a table on
 * wider screens until the user picks one.
 */
export function useListView(): [ListView, (view: ListView) => void] {
  const phone = useMediaQuery(PHONE_QUERY);
  const [chosen, setChosen] = useState<ListView | null>(null);
  return [chosen ?? (phone ? "cards" : "table"), setChosen];
}
