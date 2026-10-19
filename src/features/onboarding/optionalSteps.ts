import { BookOpen, Calculator, CalendarRange, FileDiff, FileText, Forklift, KeyRound, Receipt, Siren, type LucideIcon } from "lucide-react";
import type { TranslationKey } from "@/i18n/useT";
import type { AccessRule } from "@/lib/permissions";

/**
 * Owner decision 5 · optional next steps under the setup checklist: links only (they don't count in
 * the progress). The first four are shown; the rest sit under a collapsed "Show more". Each is gated
 * by the key its page needs and opens a real page (tests/unit/lib/navigationRoutes.test.ts). A step on
 * a project page (`projectHref`, relative to /projects/:id) opens the newest real project
 * (`latestProject` of the checklist); without one it opens `href` when it has one, else it is hidden.
 */
export interface OptionalStep {
  id: string;
  icon: LucideIcon;
  label: TranslationKey;
  access: AccessRule;
  /** Company page (also the fallback of a project step without a project). */
  href?: string;
  /** Access of `href` when it differs from `access` (a project step's fallback page). */
  hrefAccess?: AccessRule;
  /** Project page, relative to /projects/:id. */
  projectHref?: string;
}

export const OPTIONAL_STEPS: OptionalStep[] = [
  { id: "quote", href: "/sales/quotes/new", icon: FileText, label: "onboarding.moreQUOTE", access: { permission: "sales.quote.create" } },
  {
    id: "estimate",
    projectHref: "/planning/estimate",
    href: "/projects/new",
    hrefAccess: { permission: "projects.project.create" },
    icon: Calculator,
    label: "onboarding.moreESTIMATE",
    access: { permission: "projects.estimate.view" },
  },
  { id: "rulebook", href: "/settings/rulebook", icon: BookOpen, label: "onboarding.moreRULEBOOK", access: { permission: "rulebook.override.view" } },
  { id: "equipment", href: "/equipment/owned", icon: Forklift, label: "onboarding.moreEQUIPMENT", access: { allPermissions: ["equipment.view", "equipment.manage"] } },
];

export const MORE_OPTIONAL_STEPS: OptionalStep[] = [
  { id: "schedule", projectHref: "/schedule/gantt", icon: CalendarRange, label: "onboarding.moreSCHEDULE", access: { permission: "schedule.plan.view" } },
  { id: "alerts", href: "/settings/alerts", icon: Siren, label: "onboarding.moreALERTS", access: { permission: "company.settings.manage" } },
  { id: "changeOrders", projectHref: "/change-orders", icon: FileDiff, label: "onboarding.moreCHANGE_ORDERS", access: { permission: "changeorder.view" } },
  { id: "closeout", projectHref: "/documents/handover", icon: KeyRound, label: "onboarding.moreCLOSEOUT", access: { permission: "closeout.handover.manage" } },
  { id: "tax", href: "/settings/tax", icon: Receipt, label: "onboarding.moreTAX", access: { permission: "tax.view" } },
];

/** Where a step opens and the rule to show it (null = nowhere to go yet). */
export function resolveStep(step: OptionalStep, latestProjectId: string | null): { href: string; access: AccessRule } | null {
  if (step.projectHref && latestProjectId) return { href: `/projects/${encodeURIComponent(latestProjectId)}${step.projectHref}`, access: step.access };
  if (step.href) return { href: step.href, access: step.projectHref ? (step.hrefAccess ?? step.access) : step.access };
  return null;
}
