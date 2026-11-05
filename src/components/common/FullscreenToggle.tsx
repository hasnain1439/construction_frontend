"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/useT";

const subscribe = (onChange: () => void) => {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
};
const isFull = () => Boolean(document.fullscreenElement);
const canFull = () => Boolean(document.fullscreenEnabled);

/**
 * Full screen / exit full screen (the browser's Fullscreen API — also in the Windows desktop app).
 * Hidden on phones and where the browser does not allow it; Esc leaves full screen as usual.
 */
export function FullscreenToggle() {
  const t = useT();
  const full = useSyncExternalStore(subscribe, isFull, () => false);
  const enabled = useSyncExternalStore(subscribe, canFull, () => false);
  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  }, []);
  if (!enabled) return null;
  const label = full ? t("shell.exitFullScreen") : t("shell.fullScreen");
  return (
    <Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label={label} title={label} aria-pressed={full} onClick={toggle}>
      {full ? <Minimize2 /> : <Maximize2 />}
    </Button>
  );
}
