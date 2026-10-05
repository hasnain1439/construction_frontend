"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";
import { useAppDispatch } from "@/store/hooks";
import { setTheme as setThemeAction, type ThemePreference } from "@/store/slices/uiSlice";

/**
 * Light / dark switch. next-themes applies the `dark` class (no flash on load); the
 * preference is mirrored into uiSlice so the rest of the app can read it.
 */
export function ThemeToggle() {
  const t = useT();
  const dispatch = useAppDispatch();
  const { theme, resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    if (theme) dispatch(setThemeAction(theme as ThemePreference));
  }, [theme, dispatch]);

  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? t("shell.light") : t("shell.dark")}
      title={t("shell.theme")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
