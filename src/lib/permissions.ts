/**
 * Permission checks against the `/auth/me` snapshot. Mirrors the backend
 * (`core/auth/permissions.ts`): THEKEDAR everything; PM projects.manage, rates.view,
 * site.entry (+ billing.view, profit.view when canSeeFinancials); MUNSHI site.entry.
 */
import type { Me, Role } from "@/api/types";

export const PERMISSIONS = [
  "company.update",
  "users.manage",
  "billing.view",
  "profit.view",
  "rates.view",
  "store.manage",
  "projects.manage",
  "site.entry",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

type Subject = Pick<Me, "permissions" | "user"> | null | undefined;

export function hasPermission(me: Subject, permission: Permission): boolean {
  return Boolean(me?.permissions.includes(permission));
}

export function hasAnyPermission(me: Subject, permissions: readonly Permission[]): boolean {
  return permissions.some((p) => hasPermission(me, p));
}

export function hasRole(me: Subject, ...roles: Role[]): boolean {
  return Boolean(me && roles.includes(me.user.role));
}

export const isThekedar = (me: Subject) => hasRole(me, "THEKEDAR");

/** Contract value, billing, stage amounts. */
export const canSeeFinancials = (me: Subject) => hasPermission(me, "billing.view");

/** Rates (price list, supplier rates, labour rates). Never MUNSHI. */
export const canSeeRates = (me: Subject) => hasPermission(me, "rates.view");

/** A rule attached to a nav item, button or field. Every given condition must hold. */
export interface AccessRule {
  permission?: Permission;
  anyPermission?: readonly Permission[];
  roles?: readonly Role[];
}

export function canAccess(me: Subject, rule: AccessRule | undefined): boolean {
  if (!rule) return true;
  if (!me) return false;
  if (rule.permission && !hasPermission(me, rule.permission)) return false;
  if (rule.anyPermission && !hasAnyPermission(me, rule.anyPermission)) return false;
  if (rule.roles && !rule.roles.includes(me.user.role)) return false;
  return true;
}
