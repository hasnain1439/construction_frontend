"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { useT } from "@/i18n/useT";
import {
  approvalLimitOf,
  can,
  canAccess,
  canAll,
  canAny,
  canSeeField,
  scopeOf,
  withinLimit,
  type AccessRule,
  type FieldName,
  type PermissionKey,
} from "@/lib/permissions";
import { useMe } from "@/store/hooks";

/**
 * Renders children only when the signed-in user passes `rule` — hidden, never disabled.
 * `fallback` can show something else (e.g. <HiddenForRole />).
 *
 *   <PermissionGate permission="team.member.manage">…</PermissionGate>
 */
export function PermissionGate({
  children,
  fallback = null,
  ...rule
}: AccessRule & { children: ReactNode; fallback?: ReactNode }) {
  const me = useMe();
  return <>{canAccess(me, rule) ? children : fallback}</>;
}

/** Hook form of PermissionGate: `useCan("labor.settlement.approve")` or `useCan({ anyPermission: [...] })`. */
export function useCan(rule: AccessRule | PermissionKey): boolean {
  const me = useMe();
  return typeof rule === "string" ? can(me, rule) : canAccess(me, rule);
}

/**
 * `limitHint(key, amountPaisa)` → a translated reason when the amount is above the user's approval
 * limit for `key` (use it to disable an Approve button), otherwise undefined.
 */
export function useApprovalLimitHint() {
  const me = useMe();
  const t = useT();
  return useCallback(
    (key: PermissionKey, amountPaisa: string | number | bigint | null | undefined) =>
      can(me, key) && !withinLimit(me, key, amountPaisa) ? t("permissions.aboveLimit") : undefined,
    [me, t],
  );
}

/**
 * All permission helpers bound to the signed-in user:
 *
 *   const { can, canSee, limit } = usePermissions();
 *   can("cashbook.expense.approve") && withinLimit("cashbook.expense.approve", amountPaisa)
 */
export function usePermissions() {
  const me = useMe();
  return useMemo(
    () => ({
      me,
      can: (key: PermissionKey) => can(me, key),
      canAny: (keys: readonly PermissionKey[]) => canAny(me, keys),
      canAll: (keys: readonly PermissionKey[]) => canAll(me, keys),
      canAccess: (rule: AccessRule | undefined) => canAccess(me, rule),
      canSee: (field: FieldName) => canSeeField(me, field),
      scope: (key: PermissionKey) => scopeOf(me, key),
      limit: (key: PermissionKey) => approvalLimitOf(me, key),
      withinLimit: (key: PermissionKey, amountPaisa: string | number | bigint | null | undefined) =>
        withinLimit(me, key, amountPaisa),
    }),
    [me],
  );
}
