import type { Me, PermissionCatalog, PermissionRole, Role } from "@/api/types";
import { PERMISSION_KEYS, type PermissionKey } from "@/lib/permissions";
import catalogJson from "./catalogFixture.json";
import { FINANCIAL_BUNDLE, MUNSHI_TEMPLATE, PM_TEMPLATE } from "./permissionTemplates";

/** Snapshot of GET /permissions/catalog from the dev API. */
export const catalogFixture = catalogJson as unknown as PermissionCatalog;

const SCOPED = new Set(catalogFixture.permissions.filter((p) => p.scoped).map((p) => p.key));

/** Effective keys of a seed account (THEKEDAR every key; PM / MUNSHI their default template). */
export function permissionsFor(role: Role, options: { canSeeFinancials?: boolean } = {}): PermissionKey[] {
  if (role === "THEKEDAR") return [...PERMISSION_KEYS];
  if (role === "MUNSHI") return [...MUNSHI_TEMPLATE];
  return options.canSeeFinancials ? [...new Set([...PM_TEMPLATE, ...FINANCIAL_BUNDLE])] : [...PM_TEMPLATE];
}

/**
 * A `/auth/me` payload for tests, shaped like the seed accounts. `permissions` replaces the
 * template keys (a custom role); `deny` removes keys (DENY overrides).
 */
export function meFixture(
  role: Role,
  options: {
    canSeeFinancials?: boolean;
    readOnly?: boolean;
    permissions?: PermissionKey[];
    deny?: PermissionKey[];
    approvalLimits?: Record<string, string | null>;
  } = {},
): Me {
  const financial = role === "PM" && options.canSeeFinancials;
  const keys = (options.permissions ?? permissionsFor(role, options)).filter(
    (k) => !options.deny?.includes(k),
  );
  const has = (k: PermissionKey) => keys.includes(k);
  return {
    user: {
      id: `user-${role.toLowerCase()}`,
      name: role === "THEKEDAR" ? "Khalid Malik" : role === "PM" ? "Bilal Ahmed" : "Rafaqat Ali",
      phone: "+923001234567",
      email: null,
      role,
      language: "en",
      photoUrl: null,
      canSeeFinancials: Boolean(financial),
    },
    tenant: {
      id: "tenant-1",
      name: "Malik & Sons Builders",
      slug: "malik-and-sons-builders",
      logoUrl: null,
      status: options.readOnly ? "READ_ONLY" : "ACTIVE",
      readOnly: Boolean(options.readOnly),
      region: "PUNJAB_KP",
      marlaStandard: 225,
    },
    subscription: {
      plan: { code: "PROFESSIONAL", name: "Professional" },
      status: "ACTIVE",
      renewsOn: "2026-10-16T17:42:53.471Z",
      trialEndsAt: null,
    },
    permissions: [...keys].sort(),
    legacyPermissions: [],
    fieldAccess: {
      rates: has("fields.rates"),
      amounts: has("fields.amounts"),
      profit: has("fields.profit"),
      contract: has("fields.contract"),
    },
    scopes: Object.fromEntries(
      keys
        .filter((k) => SCOPED.has(k))
        .map((k) => [k, role === "THEKEDAR" ? "ALL_PROJECTS" : "ASSIGNED_PROJECTS"]),
    ),
    approvalLimits: options.approvalLimits ?? {},
    permissionRole:
      role === "THEKEDAR"
        ? null
        : {
            id: `role-${role.toLowerCase()}`,
            key: role === "PM" ? "PROJECT_MANAGER" : "MUNSHI",
            name: role === "PM" ? "Project Manager" : "Munshi",
          },
    permissionRoles:
      role === "THEKEDAR"
        ? []
        : [
            {
              id: `role-${role.toLowerCase()}`,
              key: role === "PM" ? "PROJECT_MANAGER" : "MUNSHI",
              name: role === "PM" ? "Project Manager" : "Munshi",
            },
          ],
    assignedProjectIds: [],
  };
}

/** GET /roles as a company sees it: the system templates of the catalogue (+ optional custom roles). */
export function rolesFixture(custom: PermissionRole[] = []): PermissionRole[] {
  const templates: PermissionRole[] = catalogFixture.templates.map((t) => ({
    id: `role-${t.key.toLowerCase()}`,
    key: t.key,
    name: t.name.en,
    nameRoman: t.name.roman,
    nameUrdu: t.name.urdu,
    description: t.description,
    isSystem: true,
    baseRole: t.baseRole,
    userCount: 0,
    permissions: t.permissions.map((key) => ({
      key,
      scope: SCOPED.has(key) ? (t.key === "ADMINISTRATOR" || t.key === "ACCOUNTANT" ? ("ALL_PROJECTS" as const) : ("ASSIGNED_PROJECTS" as const)) : null,
      maxAmountPaisa: null,
    })),
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  }));
  // The API lists system roles by name; the UI orders them (Administrator first).
  return [...templates].sort((a, b) => a.name.localeCompare(b.name)).concat(custom);
}
