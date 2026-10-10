"use client";

import { useCallback } from "react";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setMobileNav, toggleRail } from "@/store/slices/uiSlice";

/** Below this width (Tailwind `lg`) the rail is a drawer instead of a column. */
const DESKTOP = "(min-width: 1024px)";

/** The menu button: collapses the rail on desktop, opens/closes the drawer on phones and tablets. */
export function useNavToggle() {
  const dispatch = useAppDispatch();
  const mobileOpen = useAppSelector((state) => state.ui.mobileNavOpen);
  return useCallback(() => {
    if (window.matchMedia(DESKTOP).matches) dispatch(toggleRail());
    else dispatch(setMobileNav(!mobileOpen));
  }, [dispatch, mobileOpen]);
}

/**
 * Classes for the rail's wrapper. Desktop: a column that slides to width 0 when collapsed.
 * Phones/tablets: hidden, or a drawer over the page (with `NavBackdrop`) when opened.
 */
export function railWrapperClass(collapsed: boolean, mobileOpen: boolean) {
  return cn(
    "h-full shrink-0 overflow-hidden transition-[width] duration-200 ease-out",
    collapsed ? "lg:w-0" : "lg:w-28 lg:shadow-(--shadow-rail)",
    "max-lg:fixed max-lg:inset-y-0 max-lg:start-0 max-lg:z-40 max-lg:w-20 max-lg:overflow-visible max-lg:bg-background max-lg:shadow-flyout",
    !mobileOpen && "max-lg:hidden",
  );
}

/** Flyout placement next to the rail: always full height; on phones it rides with the drawer (top to bottom of the screen) and never runs off-screen. */
export function flyoutClass(mobileOpen: boolean) {
  return cn("start-28 max-lg:fixed max-lg:inset-y-0 max-lg:start-20 max-lg:z-50 max-lg:w-60 max-lg:max-w-[calc(100vw-6rem)]", !mobileOpen && "max-lg:hidden");
}

/** Dimmed page behind the open drawer; a tap closes it. */
export function NavBackdrop() {
  const t = useT();
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.ui.mobileNavOpen);
  if (!open) return null;
  return (
    <button
      type="button"
      aria-label={t("common.close")}
      onClick={() => dispatch(setMobileNav(false))}
      className="fixed inset-0 z-30 bg-black/35 backdrop-blur-[1px] lg:hidden"
    />
  );
}
