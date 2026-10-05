"use client";

import type { ReactNode } from "react";
import { canAccess, type AccessRule } from "@/lib/permissions";
import { useMe } from "@/store/hooks";

/**
 * Renders children only when the signed-in user passes `rule` — hidden, never disabled.
 * `fallback` can show something else (e.g. <HiddenForRole />).
 */
export function PermissionGate({
  children,
  fallback = null,
  ...rule
}: AccessRule & { children: ReactNode; fallback?: ReactNode }) {
  const me = useMe();
  return <>{canAccess(me, rule) ? children : fallback}</>;
}

/** Hook form of PermissionGate. */
export function useCan(rule: AccessRule): boolean {
  const me = useMe();
  return canAccess(me, rule);
}
