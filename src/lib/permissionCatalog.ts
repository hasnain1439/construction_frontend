/**
 * Pure helpers around GET /permissions/catalog for the Roles & Permissions screens:
 * labels in the UI language, the module × action matrix and grant lists.
 */
import type {
  CatalogLabel,
  CatalogPermission,
  PermissionCatalog,
  PermissionRole,
  PermissionScope,
  SetRolePermissionsBody,
} from "@/api/types";
import type { UiLanguage } from "@/store/slices/uiSlice";

export const ACTIONS = ["view", "create", "edit", "approve", "manage"] as const;
export type PermissionAction = (typeof ACTIONS)[number];

/** Data-visibility keys (`fields.*`) are toggles, not matrix cells. */
export const FIELD_MODULE = "fields";

/** Catalogue label in the UI language (`en` / `roman` / `urdu`). */
export function catalogLabel(label: CatalogLabel, language: UiLanguage): string {
  if (language === "ur") return label.urdu || label.roman || label.en;
  if (language === "roman-ur") return label.roman || label.en;
  return label.en;
}

/** The action column of a key: its last segment (`subscription.manage` → manage). */
export function actionOf(permission: Pick<CatalogPermission, "key" | "action">): PermissionAction | null {
  const last = permission.key.split(".").pop() ?? "";
  const action = (ACTIONS as readonly string[]).includes(permission.action) ? permission.action : last;
  return (ACTIONS as readonly string[]).includes(action) ? (action as PermissionAction) : null;
}

export interface MatrixRow {
  module: string;
  label: CatalogLabel;
  cells: Record<PermissionAction, CatalogPermission[]>;
  /** Keys of the row that can be granted (not owner-only). */
  grantable: string[];
}

/** Modules as rows, actions as columns; each cell lists the keys of that module + action. */
export function buildMatrix(catalog: Pick<PermissionCatalog, "modules" | "permissions">): MatrixRow[] {
  const rows: MatrixRow[] = [];
  for (const mod of catalog.modules) {
    if (mod.key === FIELD_MODULE) continue;
    const cells = Object.fromEntries(
      ACTIONS.map((a) => [a, [] as CatalogPermission[]]),
    ) as MatrixRow["cells"];
    const grantable: string[] = [];
    for (const permission of catalog.permissions) {
      if (permission.module !== mod.key || permission.field) continue;
      const action = actionOf(permission);
      if (!action) continue;
      cells[action].push(permission);
      if (!permission.ownerOnly) grantable.push(permission.key);
    }
    if (ACTIONS.some((a) => cells[a].length))
      rows.push({ module: mod.key, label: mod.label, cells, grantable });
  }
  return rows;
}

export const fieldPermissions = (catalog: Pick<PermissionCatalog, "permissions">) =>
  catalog.permissions.filter((p) => p.field);

// ─── Grants (the editable state of a role) ──────────────────────────────────

export interface GrantDraft {
  scope: PermissionScope | null;
  /** Paisa string; null = no limit. */
  maxAmountPaisa: string | null;
}

/** key → grant. */
export type GrantMap = Record<string, GrantDraft>;

export function grantsFromRole(role: Pick<PermissionRole, "permissions">): GrantMap {
  return Object.fromEntries(
    role.permissions.map((g) => [g.key, { scope: g.scope, maxAmountPaisa: g.maxAmountPaisa }]),
  );
}

/** A new grant for `permission`: scoped keys start on the user's assigned projects, no limit. */
export function defaultGrant(permission: Pick<CatalogPermission, "scoped">): GrantDraft {
  return { scope: permission.scoped ? "ASSIGNED_PROJECTS" : null, maxAmountPaisa: null };
}

/** Body of PUT /roles/:id/permissions — scope / limit only where the key supports them. */
export function grantsToBody(
  grants: GrantMap,
  catalog: Pick<PermissionCatalog, "permissions">,
): SetRolePermissionsBody["permissions"] {
  const byKey = new Map(catalog.permissions.map((p) => [p.key, p]));
  return Object.entries(grants)
    .filter(([key]) => byKey.has(key) && !byKey.get(key)!.ownerOnly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, grant]) => {
      const p = byKey.get(key)!;
      return {
        key,
        ...(p.scoped ? { scope: grant.scope ?? "ASSIGNED_PROJECTS" } : {}),
        ...(p.limit ? { maxAmountPaisa: grant.maxAmountPaisa || null } : {}),
      };
    });
}

/** Do two grant maps hold the same keys, scopes and limits? */
export function sameGrants(a: GrantMap, b: GrantMap): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every(
    (k) =>
      b[k] &&
      (a[k].scope ?? null) === (b[k].scope ?? null) &&
      (a[k].maxAmountPaisa ?? null) === (b[k].maxAmountPaisa ?? null),
  );
}

// ─── Roles ──────────────────────────────────────────────────────────────────

/** Role name in the UI language (falls back to the English name). */
export function roleName(
  role: Pick<PermissionRole, "name" | "nameRoman" | "nameUrdu">,
  language: UiLanguage,
): string {
  if (language === "ur") return role.nameUrdu || role.nameRoman || role.name;
  if (language === "roman-ur") return role.nameRoman || role.name;
  return role.name;
}

/** Roles a member of this account type can be given (baseRole PM / MUNSHI / OTHER). */
export function rolesForAccount<R extends Pick<PermissionRole, "baseRole">>(
  roles: R[],
  account: "THEKEDAR" | "PM" | "MUNSHI",
): R[] {
  if (account === "THEKEDAR") return [];
  return roles.filter((r) => r.baseRole === "OTHER" || r.baseRole === account);
}
