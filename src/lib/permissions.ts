/**
 * Permission checks against the `/auth/me` snapshot (PERMISSIONS_API.md).
 *
 * - `me.permissions` holds the user's effective keys (`<module>.<resource>.<action>`), already
 *   resolved by the API: role template + ALLOW overrides − DENY overrides.
 * - THEKEDAR (the owner account) always has every key — checked here as well, so an owner is
 *   never locked out by a stale snapshot.
 * - `fieldAccess` says which values the API sends (rates, amounts, profit, contract).
 *
 * Every show / hide decision in the UI goes through `can()` / `canAccess()`. `user.role` is only
 * used for account-type rules that are not configurable (e.g. a MUNSHI gets the site dashboard).
 */
import type { Me, Role } from "@/api/types";
import type { PermissionKey } from "./permissionKeys";

export { PERMISSION_KEYS, type PermissionKey } from "./permissionKeys";

type Subject =
  | (Pick<Me, "permissions" | "user"> & Partial<Pick<Me, "fieldAccess" | "scopes" | "approvalLimits">>)
  | null
  | undefined;

export type FieldName = "rates" | "amounts" | "profit" | "contract";
export type Scope = "ASSIGNED_PROJECTS" | "ALL_PROJECTS";

export const isThekedar = (me: Subject) => me?.user.role === "THEKEDAR";

/** Does the signed-in user hold `key`? THEKEDAR = every key. */
export function can(me: Subject, key: PermissionKey): boolean {
  if (!me) return false;
  if (isThekedar(me)) return true;
  return me.permissions.includes(key);
}

export function canAny(me: Subject, keys: readonly PermissionKey[]): boolean {
  return keys.some((key) => can(me, key));
}

export function canAll(me: Subject, keys: readonly PermissionKey[]): boolean {
  return keys.every((key) => can(me, key));
}

/** Will the API send this kind of value (`fieldAccess`, falling back to the `fields.*` key)? */
export function canSeeField(me: Subject, field: FieldName): boolean {
  if (!me) return false;
  if (isThekedar(me)) return true;
  return me.fieldAccess ? Boolean(me.fieldAccess[field]) : can(me, `fields.${field}`);
}

/** Contract value, billing money, money KPIs. */
export const canSeeFinancials = (me: Subject) => canSeeField(me, "amounts");

/** Rates, purchase amounts, stock values, supplier balances. A default MUNSHI never has it. */
export const canSeeRates = (me: Subject) => canSeeField(me, "rates");

/** Scope of a held scoped key (THEKEDAR: always ALL_PROJECTS); null when not held. */
export function scopeOf(me: Subject, key: PermissionKey): Scope | null {
  if (!can(me, key)) return null;
  if (isThekedar(me)) return "ALL_PROJECTS";
  return me?.scopes?.[key] ?? "ASSIGNED_PROJECTS";
}

/**
 * Approval limit of a held limit key in paisa (string), or null = no limit. Returns
 * `undefined` when the key is not held at all.
 */
export function approvalLimitOf(me: Subject, key: PermissionKey): string | null | undefined {
  if (!can(me, key)) return undefined;
  if (isThekedar(me)) return null;
  return me?.approvalLimits?.[key] ?? null;
}

/** Is `amountPaisa` within the user's approval limit for `key` (false when the key is missing)? */
export function withinLimit(
  me: Subject,
  key: PermissionKey,
  amountPaisa: string | number | bigint | null | undefined,
): boolean {
  const limit = approvalLimitOf(me, key);
  if (limit === undefined) return false;
  if (limit === null || amountPaisa === null || amountPaisa === undefined) return true;
  try {
    return BigInt(amountPaisa) <= BigInt(limit);
  } catch {
    return true;
  }
}

/** Account type check — only for rules that stay with `user.role` (see PERMISSIONS_API.md §1). */
export function hasRole(me: Subject, ...roles: Role[]): boolean {
  return Boolean(me && roles.includes(me.user.role));
}

/** A rule attached to a nav item, button, page or field. Every given condition must hold. */
export interface AccessRule {
  /** Must hold this key. */
  permission?: PermissionKey;
  /** Must hold at least one of these keys. */
  anyPermission?: readonly PermissionKey[];
  /** Must hold all of these keys. */
  allPermissions?: readonly PermissionKey[];
  /** Account type (not configurable): only for MUNSHI-vs-office rules. Prefer keys. */
  roles?: readonly Role[];
}

export function canAccess(me: Subject, rule: AccessRule | undefined): boolean {
  if (!rule) return true;
  if (!me) return false;
  if (rule.permission && !can(me, rule.permission)) return false;
  if (rule.anyPermission && !canAny(me, rule.anyPermission)) return false;
  if (rule.allPermissions && !canAll(me, rule.allPermissions)) return false;
  if (rule.roles && !rule.roles.includes(me.user.role)) return false;
  return true;
}
