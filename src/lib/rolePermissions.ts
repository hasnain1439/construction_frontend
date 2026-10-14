/**
 * Roles + checklist → `roleIds` + `permissionOverrides` (Add / Edit member).
 *
 * A member may hold SEVERAL roles: their permissions are the UNION of the roles (a key in several
 * roles gets the widest project scope and the highest approval limit — "no limit" wins), the
 * same rule as the API. The "Extra / removed permissions" checklist starts as that union; what
 * is sent is the role list plus the DIFFERENCE between the checklist and the union:
 *   - ticked, not in any role                 → ALLOW (with scope / limit where the key has them)
 *   - in a role, unticked                     → DENY
 *   - in a role, scope or limit changed       → ALLOW with the new scope / limit
 */
import type { CatalogPermission, Me, PermissionCatalog, PermissionRole, PermissionScope } from "@/api/types";
import { grantsFromRole, type GrantDraft, type GrantMap } from "./permissionCatalog";
import { approvalLimitOf, can, isThekedar, scopeOf } from "./permissions";
import type { PermissionKey } from "./permissionKeys";

export type AccountType = "PM" | "MUNSHI";

type RoleLike = Pick<PermissionRole, "id" | "key" | "name" | "isSystem" | "baseRole" | "permissions">;
type Catalog = Pick<PermissionCatalog, "permissions"> & Partial<Pick<PermissionCatalog, "templates">>;

export interface OverrideItem {
  key: string;
  effect: "ALLOW" | "DENY";
  scope?: PermissionScope;
  maxAmountPaisa?: string;
  note?: string;
}

export interface GrantDiff {
  /** Ticked keys no role gives. */
  added: string[];
  /** Role keys that were unticked. */
  removed: string[];
  /** Keys in both whose scope or approval limit differs from the roles. */
  changed: string[];
  /** Body for `permissionOverrides` / PUT /users/:id/permission-overrides. */
  overrides: OverrideItem[];
}

const norm = (p: Pick<CatalogPermission, "scoped" | "limit">, g: GrantDraft): GrantDraft => ({
  scope: p.scoped ? (g.scope ?? "ASSIGNED_PROJECTS") : null,
  maxAmountPaisa: p.limit ? (g.maxAmountPaisa ?? null) : null,
});

function allowItem(p: CatalogPermission, g: GrantDraft): OverrideItem {
  return {
    key: p.key,
    effect: "ALLOW",
    ...(p.scoped ? { scope: g.scope ?? "ASSIGNED_PROJECTS" } : {}),
    ...(p.limit && g.maxAmountPaisa ? { maxAmountPaisa: g.maxAmountPaisa } : {}),
  };
}

/** The checklist compared with the roles' union (catalogue order; owner-only keys never). */
export function diffGrants(base: GrantMap, ticked: GrantMap, catalog: Catalog): GrantDiff {
  const out: GrantDiff = { added: [], removed: [], changed: [], overrides: [] };
  for (const p of catalog.permissions) {
    if (p.ownerOnly) continue;
    const r = base[p.key];
    const t = ticked[p.key];
    if (t && !r) {
      out.added.push(p.key);
      out.overrides.push(allowItem(p, t));
    } else if (r && !t) {
      out.removed.push(p.key);
      out.overrides.push({ key: p.key, effect: "DENY" });
    } else if (r && t && (p.scoped || p.limit)) {
      const a = norm(p, r);
      const b = norm(p, t);
      if (a.scope !== b.scope || a.maxAmountPaisa !== b.maxAmountPaisa) {
        out.changed.push(p.key);
        out.overrides.push(allowItem(p, t));
      }
    }
  }
  return out;
}

const wider = (a: PermissionScope | null, b: PermissionScope | null): PermissionScope | null =>
  a === "ALL_PROJECTS" || b === "ALL_PROJECTS" ? "ALL_PROJECTS" : (a ?? b);
const higher = (a: string | null, b: string | null): string | null =>
  a === null || b === null ? null : BigInt(a) >= BigInt(b) ? a : b;

/** Union of several roles' grants: widest scope, highest limit ("no limit" wins). */
export function unionGrants(roles: ReadonlyArray<Pick<PermissionRole, "permissions">>): GrantMap {
  const out: GrantMap = {};
  for (const role of roles) {
    for (const [key, g] of Object.entries(grantsFromRole(role))) {
      const prev = out[key];
      out[key] = prev
        ? { scope: wider(prev.scope, g.scope), maxAmountPaisa: higher(prev.maxAmountPaisa, g.maxAmountPaisa) }
        : g;
    }
  }
  return out;
}

/**
 * The checklist after the role list changed: the new union with the person's own changes (what
 * they had added / removed / changed against the old union) applied on top.
 */
export function reapplyChanges(
  prevBase: GrantMap,
  ticked: GrantMap,
  nextBase: GrantMap,
  catalog: Catalog,
): GrantMap {
  const diff = diffGrants(prevBase, ticked, catalog);
  const next: GrantMap = { ...nextBase };
  for (const key of diff.removed) delete next[key];
  // A key added by hand that a newly ticked role now gives takes the role's grant (no override).
  for (const key of diff.added) if (!nextBase[key]) next[key] = ticked[key]!;
  for (const key of diff.changed) next[key] = ticked[key]!;
  return next;
}

/**
 * Office or site: a role for PM accounts and the office templates (Administrator, Project
 * Manager, Accountant, Store Keeper) are "office"; a Munshi-type role is "site"; a custom role
 * for any account is "any".
 */
export function roleKind(role: Pick<PermissionRole, "baseRole" | "isSystem">): "office" | "site" | "any" {
  if (role.baseRole === "MUNSHI") return "site";
  if (role.baseRole === "PM" || role.isSystem) return "office";
  return "any";
}

/** Account type the ticked roles decide: office → PM, only site → MUNSHI, else null (person chooses). */
export function accountOfRoles(
  roles: ReadonlyArray<Pick<PermissionRole, "baseRole" | "isSystem">>,
): AccountType | null {
  const kinds = new Set(roles.map(roleKind));
  if (kinds.has("office")) return "PM";
  if (kinds.has("site")) return "MUNSHI";
  return null;
}

/** Can this role be ticked next to the others (no office + site mix; fits a fixed account)? */
export function fitsWith(
  role: Pick<PermissionRole, "baseRole" | "isSystem">,
  ticked: ReadonlyArray<Pick<PermissionRole, "baseRole" | "isSystem">>,
  fixedAccount?: AccountType,
): boolean {
  const kind = roleKind(role);
  if (fixedAccount === "PM" && kind === "site") return false;
  if (fixedAccount === "MUNSHI" && (kind === "office" || role.baseRole === "PM")) return false;
  if (kind === "any") return true;
  return !ticked.some((r) => {
    const k = roleKind(r);
    return k !== "any" && k !== kind;
  });
}

/** System templates in catalogue order (Administrator first), then custom roles by name. */
export function orderRoles<R extends Pick<PermissionRole, "key" | "name" | "isSystem">>(
  roles: R[],
  catalog?: Catalog,
): R[] {
  const order = new Map((catalog?.templates ?? []).map((t, i) => [t.key, i]));
  const rank = (r: R) => (r.isSystem ? (order.get(r.key) ?? 50) : 100);
  return [...roles].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

type Holder = Pick<Me, "permissions" | "user"> & Partial<Pick<Me, "scopes" | "approvalLimits">>;

/** May `me` give this grant (key, scope, limit)? The owner may give everything. */
export function canGive(
  me: Holder | null | undefined,
  p: Pick<CatalogPermission, "key" | "scoped" | "limit">,
  g?: GrantDraft,
): boolean {
  if (!me) return false;
  if (isThekedar(me)) return true;
  const key = p.key as PermissionKey;
  if (!can(me, key)) return false;
  if (p.scoped && g?.scope === "ALL_PROJECTS" && scopeOf(me, key) !== "ALL_PROJECTS") return false;
  if (p.limit) {
    const own = approvalLimitOf(me, key);
    if (own !== null && own !== undefined && (!g?.maxAmountPaisa || BigInt(g.maxAmountPaisa) > BigInt(own)))
      return false;
  }
  return true;
}

/** May `me` give this whole role (the API checks every grant of it)? */
export function canGiveRole(
  me: Holder | null | undefined,
  role: Pick<PermissionRole, "permissions">,
  catalog: Catalog,
): boolean {
  if (me && isThekedar(me)) return true;
  const byKey = new Map(catalog.permissions.map((p) => [p.key, p]));
  return role.permissions.every((g) => {
    const p = byKey.get(g.key);
    return p ? canGive(me, p, { scope: g.scope, maxAmountPaisa: g.maxAmountPaisa }) : true;
  });
}

/** What to send for the ticked roles + checklist. */
export function resolveRoles<R extends RoleLike>(input: {
  roles: R[];
  catalog: Catalog;
  selected: string[];
  ticked: GrantMap;
}): {
  roles: R[];
  base: GrantMap;
  diff: GrantDiff;
} {
  const roles = input.selected
    .map((id) => input.roles.find((r) => r.id === id))
    .filter((r): r is R => Boolean(r));
  const base = unionGrants(roles);
  return { roles, base, diff: diffGrants(base, input.ticked, input.catalog) };
}
