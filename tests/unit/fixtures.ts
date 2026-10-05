import type { Me, Role } from "@/api/types";

const PERMS: Record<Role, string[]> = {
  THEKEDAR: [
    "company.update",
    "users.manage",
    "billing.view",
    "profit.view",
    "rates.view",
    "store.manage",
    "projects.manage",
    "site.entry",
  ],
  PM: ["projects.manage", "rates.view", "site.entry"],
  MUNSHI: ["site.entry"],
};

/** A `/auth/me` payload for tests, shaped like the seed accounts. */
export function meFixture(role: Role, options: { canSeeFinancials?: boolean; readOnly?: boolean } = {}): Me {
  const financial = role === "PM" && options.canSeeFinancials;
  return {
    user: {
      id: `user-${role.toLowerCase()}`,
      name: role === "THEKEDAR" ? "Khalid Malik" : role === "PM" ? "Bilal Ahmed" : "Rafaqat Ali",
      phone: "+923001234567",
      email: null,
      role,
      language: "ENGLISH",
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
    permissions: financial ? [...PERMS.PM, "billing.view", "profit.view"] : PERMS[role],
    assignedProjectIds: [],
  };
}
