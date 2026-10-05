/**
 * THE navigation config. Drives the icon rail, the flyout and the command search for
 * company mode, project mode and the platform-admin console.
 *
 * - `access` hides an item (never disables it) for users who may not use it.
 * - `available: false` → the item still shows and opens a "Coming in the next phase" page.
 * - A section's `access` controls its rail button; command search checks each item's
 *   own `access`, so e.g. a PM can still find Materials / Price List.
 */
import {
  BookOpen,
  Boxes,
  Building2,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  ClipboardList,
  CreditCard,
  FilePen,
  FolderArchive,
  FolderKanban,
  Forklift,
  Gauge,
  Handshake,
  HardHat,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  Megaphone,
  PackageSearch,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Label } from "@/i18n/useT";
import type { AccessRule } from "@/lib/permissions";

export type NavMode = "company" | "project" | "admin";

export interface NavItem {
  id: string;
  label: Label;
  /** Absolute path; project items are relative to `/projects/:id` (see `projectHref`). */
  href: string;
  access?: AccessRule;
  /** false → opens the ComingSoon page. */
  available: boolean;
  /** Custom ComingSoon wording, e.g. "Estimate comes in Phase 2". */
  comingSoonNote?: string;
  keywords?: string[];
}

export interface NavSection {
  id: string;
  label: Label;
  icon: LucideIcon;
  mode: NavMode;
  access?: AccessRule;
  items: NavItem[];
}

const L = (en: string, ur: string): Label => ({ en, ur });
const THEKEDAR = { roles: ["THEKEDAR"] } as const satisfies AccessRule;
const OFFICE = { roles: ["THEKEDAR", "PM"] } as const satisfies AccessRule;
const soon = (id: string, label: Label, href: string, access?: AccessRule): NavItem => ({
  id,
  label,
  href,
  access,
  available: false,
});

// ─── Company mode ───────────────────────────────────────────────────────────

export const COMPANY_NAV: NavSection[] = [
  {
    id: "dashboard",
    label: L("Dashboard", "Dashboard"),
    icon: LayoutDashboard,
    mode: "company",
    items: [
      { id: "dashboard.overview", label: L("Company Overview", "Company ka jaiza"), href: "/dashboard", available: true },
      soon("dashboard.approvals", L("My Approvals", "Meri approvals"), "/dashboard/approvals", OFFICE),
      soon("dashboard.alerts", L("Alerts & Notifications", "Alerts aur itla'at"), "/dashboard/alerts"),
    ],
  },
  {
    id: "projects",
    label: L("Projects", "Projects"),
    icon: FolderKanban,
    mode: "company",
    items: [
      { id: "projects.all", label: L("All Projects", "Tamam projects"), href: "/projects", available: true },
      {
        id: "projects.new",
        label: L("New Project", "Naya project"),
        href: "/projects/new",
        available: true,
        access: { permission: "projects.manage" },
        keywords: ["create", "wizard"],
      },
      { id: "projects.closed", label: L("Closed & Archived", "Band aur archive"), href: "/projects/closed", available: true },
    ],
  },
  {
    id: "sales",
    label: L("Sales", "Sales"),
    icon: Handshake,
    mode: "company",
    access: OFFICE,
    items: [
      {
        id: "sales.clients",
        label: L("Clients (Owners)", "Clients (Maalikaan)"),
        href: "/sales/clients",
        available: true,
        access: OFFICE,
        keywords: ["owner", "customer"],
      },
      soon("sales.quotes", L("Quote Pipeline", "Quote pipeline"), "/sales/quotes", OFFICE),
      soon("sales.newQuote", L("New Quote", "Naya quote"), "/sales/quotes/new", OFFICE),
      soon("sales.insights", L("Win / Loss Insights", "Jeet / haar ka jaiza"), "/sales/insights", THEKEDAR),
    ],
  },
  {
    id: "suppliers-stock",
    label: L("Suppliers & Stock", "Suppliers aur stock"),
    icon: PackageSearch,
    mode: "company",
    access: OFFICE,
    items: [
      {
        id: "stock.suppliers",
        label: L("All Suppliers", "Tamam suppliers"),
        href: "/suppliers-stock/suppliers",
        available: true,
        access: OFFICE,
        keywords: ["dealer", "vendor"],
      },
      soon("stock.purchases", L("Purchases (Maal Kharida)", "Maal kharida"), "/suppliers-stock/purchases", OFFICE),
      soon("stock.returns", L("Purchase Returns", "Maal wapsi"), "/suppliers-stock/purchase-returns", OFFICE),
      soon("stock.store", L("Store Stock", "Godown stock"), "/suppliers-stock/store-stock", THEKEDAR),
      soon("stock.dispatches", L("Dispatches (Sent to Sites)", "Site bheja gaya maal"), "/suppliers-stock/dispatches", THEKEDAR),
      soon("stock.shortages", L("Shortages", "Kami"), "/suppliers-stock/shortages", THEKEDAR),
      soon("stock.ledger", L("Supplier Ledger (Khata)", "Supplier khata"), "/suppliers-stock/ledger", THEKEDAR),
      soon("stock.orders", L("Purchase Orders", "Purchase orders"), "/suppliers-stock/purchase-orders", OFFICE),
      soon("stock.payments", L("Supplier Payments", "Supplier adaigiyan"), "/suppliers-stock/payments", THEKEDAR),
    ],
  },
  {
    id: "workforce",
    label: L("Workforce", "Mazdoor"),
    icon: HardHat,
    mode: "company",
    items: [
      {
        id: "workforce.workers",
        label: L("Workers Directory", "Mazdooron ki fehrist"),
        href: "/workforce/workers",
        available: true,
        keywords: ["mistri", "mazdoor", "labour"],
      },
      {
        id: "workforce.subcontractors",
        label: L("Sub-contractors", "Theke daar team"),
        href: "/workforce/subcontractors",
        available: true,
        keywords: ["team", "trade"],
      },
    ],
  },
  {
    id: "equipment",
    label: L("Equipment", "Saaz-o-saman"),
    icon: Forklift,
    mode: "company",
    access: OFFICE,
    items: [
      soon("equipment.map", L("Allocation Map", "Allocation map"), "/equipment/allocation"),
      soon("equipment.owned", L("Owned Equipment", "Apna saman"), "/equipment/owned"),
      soon("equipment.rentals", L("Rentals", "Kiraye ka saman"), "/equipment/rentals"),
      soon("equipment.movements", L("Movements", "Naql-o-harkat"), "/equipment/movements"),
      soon("equipment.loss", L("Loss & Damage", "Nuqsan"), "/equipment/loss-damage"),
      soon("equipment.shuttering", L("Shuttering Demand", "Shuttering ki talab"), "/equipment/shuttering"),
    ],
  },
  {
    id: "finance",
    label: L("Finance", "Hisaab"),
    icon: Wallet,
    mode: "company",
    access: THEKEDAR,
    items: [
      soon("finance.receivables", L("Receivables", "Wasooliyan"), "/finance/receivables", THEKEDAR),
      soon("finance.cashflow", L("Cash Flow Outlook", "Cash flow"), "/finance/cash-flow", THEKEDAR),
      soon("finance.pl", L("Profit & Loss", "Nafa aur nuqsan"), "/finance/profit-loss", THEKEDAR),
      soon("finance.floats", L("Cash Floats Overview", "Cash floats"), "/finance/cash-floats", THEKEDAR),
    ],
  },
  {
    id: "reports",
    label: L("Reports", "Reports"),
    icon: ChartColumn,
    mode: "company",
    access: OFFICE,
    items: [
      soon("reports.summary", L("Project Summary", "Project khulasa"), "/reports/project-summary"),
      soon("reports.material", L("Material Audit", "Maal ka audit"), "/reports/material-audit"),
      soon("reports.labor", L("Labor & Peshgi", "Mazdoori aur peshgi"), "/reports/labor-peshgi"),
      soon("reports.cashbook", L("Cash Book", "Cash book"), "/reports/cash-book"),
      soon("reports.ageing", L("Supplier Ageing", "Supplier udhaar ki umar"), "/reports/supplier-ageing", THEKEDAR),
      soon("reports.delay", L("Delay Analysis", "Takheer ka jaiza"), "/reports/delay-analysis"),
    ],
  },
  {
    id: "team",
    label: L("Team", "Team"),
    icon: UsersRound,
    mode: "company",
    access: THEKEDAR,
    items: [
      {
        id: "team.members",
        label: L("Members", "Members"),
        href: "/team/members",
        available: true,
        // PM may view the member list read-only (reachable from search).
        access: OFFICE,
        keywords: ["users", "staff", "pm", "munshi"],
      },
      {
        id: "team.invitations",
        label: L("Invitations", "Daawat naame"),
        href: "/team/invitations",
        available: true,
        access: THEKEDAR,
        keywords: ["invite"],
      },
      {
        id: "team.devices",
        label: L("Devices", "Devices"),
        href: "/team/devices",
        available: true,
        access: THEKEDAR,
        keywords: ["phone", "logout"],
      },
    ],
  },
  {
    id: "settings",
    label: L("Settings", "Settings"),
    icon: Settings,
    mode: "company",
    access: THEKEDAR,
    items: [
      { id: "settings.company", label: L("Company Profile", "Company profile"), href: "/settings/company", available: true, access: THEKEDAR, keywords: ["logo", "ntn"] },
      {
        id: "settings.materials",
        label: L("Materials", "Materials"),
        href: "/settings/materials",
        available: true,
        access: OFFICE,
        keywords: ["cement", "steel", "bricks"],
      },
      {
        id: "settings.priceList",
        label: L("Price List", "Rate list"),
        href: "/settings/price-list",
        available: true,
        access: { roles: ["THEKEDAR", "PM"], permission: "rates.view" },
        keywords: ["rates", "quality"],
      },
      { id: "settings.laborRates", label: L("Labor Rates", "Mazdoori rates"), href: "/settings/labor-rates", available: true, access: THEKEDAR, keywords: ["wages"] },
      soon("settings.rulebook", L("Rulebook", "Qawaid"), "/settings/rulebook", THEKEDAR),
      { id: "settings.paymentTemplates", label: L("Payment Templates", "Adaigi templates"), href: "/settings/payment-templates", available: true, access: THEKEDAR, keywords: ["stages", "billing"] },
      { id: "settings.holidays", label: L("Holidays", "Chhuttiyan"), href: "/settings/holidays", available: true, access: THEKEDAR },
      { id: "settings.alerts", label: L("Alerts & Limits", "Alerts aur hadein"), href: "/settings/alerts", available: true, access: THEKEDAR },
      soon("settings.tax", L("Tax", "Tax"), "/settings/tax", THEKEDAR),
      { id: "settings.subscription", label: L("Subscription", "Subscription"), href: "/settings/subscription", available: true, access: THEKEDAR, keywords: ["plan", "payment", "renew"] },
    ],
  },
];

// ─── Project mode (hrefs relative to /projects/:id) ─────────────────────────

const BILLING = { permission: "billing.view" } as const satisfies AccessRule;
const PROFIT = { permission: "profit.view" } as const satisfies AccessRule;

export const PROJECT_NAV: NavSection[] = [
  {
    id: "p.overview",
    label: L("Overview", "Jaiza"),
    icon: LayoutGrid,
    mode: "project",
    items: [{ id: "p.overview.summary", label: L("Project Summary", "Project khulasa"), href: "/overview", available: true }],
  },
  {
    id: "p.planning",
    label: L("Planning", "Mansooba"),
    icon: ClipboardList,
    mode: "project",
    items: [
      { id: "p.planning.site", label: L("Site Setup", "Site setup"), href: "/planning/site-setup", available: true },
      { id: "p.planning.rooms", label: L("Floors & Rooms", "Manzilein aur kamre"), href: "/planning/floors-rooms", available: true },
      { id: "p.planning.supply", label: L("Supply Split", "Supply ki taqseem"), href: "/planning/supply-split", available: true },
      { ...soon("p.planning.estimate", L("Estimate (BoQ)", "Estimate (BoQ)"), "/planning/estimate"), comingSoonNote: "Estimate comes in Phase 2." },
      { ...soon("p.planning.revisions", L("Estimate Revisions", "Estimate revisions"), "/planning/estimate-revisions"), comingSoonNote: "Estimate comes in Phase 2." },
      soon("p.planning.shopping", L("Owner Shopping List", "Maalik ki shopping list"), "/planning/shopping-list"),
    ],
  },
  {
    id: "p.schedule",
    label: L("Schedule", "Schedule"),
    icon: CalendarRange,
    mode: "project",
    items: [
      soon("p.schedule.gantt", L("Gantt", "Gantt"), "/schedule/gantt"),
      soon("p.schedule.milestones", L("Milestones & Quotas", "Milestones"), "/schedule/milestones"),
      soon("p.schedule.stoppages", L("Stoppage Days", "Kaam band din"), "/schedule/stoppages"),
    ],
  },
  {
    id: "p.site",
    label: L("Site", "Site"),
    icon: Building2,
    mode: "project",
    items: [
      soon("p.site.logs", L("Daily Logs & Photos", "Rozana log"), "/site/daily-logs"),
      soon("p.site.incoming", L("Incoming Material", "Aane wala maal"), "/site/incoming"),
      soon("p.site.deliveries", L("Deliveries (Maal Aaya)", "Maal aaya"), "/site/deliveries"),
      soon("p.site.usage", L("Material Usage (Maal Lag Gaya)", "Maal lag gaya"), "/site/usage"),
      soon("p.site.stock", L("Site Stock", "Site stock"), "/site/stock"),
      soon("p.site.counts", L("Stock Counts & Transfers", "Ginti aur transfer"), "/site/counts"),
      soon("p.site.equipment", L("Equipment on Site", "Site par saman"), "/site/equipment"),
    ],
  },
  {
    id: "p.labor",
    label: L("Labor", "Mazdoori"),
    icon: Users,
    mode: "project",
    items: [
      soon("p.labor.hazri", L("Hazri Register", "Hazri register"), "/labor/hazri"),
      soon("p.labor.accounts", L("Sub-contractor Accounts", "Theke daar hisaab"), "/labor/subcontractor-accounts"),
      soon("p.labor.measurements", L("Work Measurements", "Kaam ki paimaish"), "/labor/measurements"),
      soon("p.labor.peshgi", L("Peshgi", "Peshgi"), "/labor/peshgi"),
      soon("p.labor.settlements", L("Weekly Settlements", "Hafta war hisaab"), "/labor/settlements"),
    ],
  },
  {
    id: "p.cash",
    label: L("Cash Book", "Cash book"),
    icon: BookOpen,
    mode: "project",
    items: [
      soon("p.cash.kharcha", L("Site Kharcha", "Site kharcha"), "/cash-book/kharcha"),
      soon("p.cash.floats", L("Cash Floats", "Cash floats"), "/cash-book/floats"),
      soon("p.cash.topups", L("Top-up Requests", "Top-up darkhwastein"), "/cash-book/top-ups"),
      soon("p.cash.counts", L("Cash Counts & Handover", "Cash ginti aur hawalgi"), "/cash-book/counts"),
    ],
  },
  {
    id: "p.changes",
    label: L("Change Orders", "Tabdeeli orders"),
    icon: FilePen,
    mode: "project",
    access: OFFICE,
    items: [
      soon("p.changes.all", L("All Change Orders", "Tamam tabdeeli orders"), "/change-orders"),
      soon("p.changes.new", L("New Change Order", "Naya tabdeeli order"), "/change-orders/new"),
    ],
  },
  {
    id: "p.billing",
    label: L("Billing", "Billing"),
    icon: Receipt,
    mode: "project",
    access: BILLING,
    items: [
      soon("p.billing.schedule", L("Payment Schedule", "Adaigi schedule"), "/billing/schedule", BILLING),
      soon("p.billing.invoices", L("Invoices & Running Bills", "Invoices aur bills"), "/billing/invoices", BILLING),
      soon("p.billing.received", L("Payments Received", "Wasool adaigiyan"), "/billing/payments", BILLING),
      soon("p.billing.statement", L("Owner Statement", "Maalik ka statement"), "/billing/statement", BILLING),
    ],
  },
  {
    id: "p.control",
    label: L("Control", "Control"),
    icon: Gauge,
    mode: "project",
    access: PROFIT,
    items: [
      soon("p.control.material", L("Material Variance", "Maal ka farq"), "/control/material-variance", PROFIT),
      soon("p.control.cost", L("Cost Variance", "Lagat ka farq"), "/control/cost-variance", PROFIT),
      soon("p.control.burn", L("Burn Rate vs Progress", "Kharch vs taraqqi"), "/control/burn-rate", PROFIT),
      soon("p.control.delay", L("Delay Analysis", "Takheer ka jaiza"), "/control/delay", PROFIT),
    ],
  },
  {
    id: "p.documents",
    label: L("Documents & Closeout", "Kaghzaat aur ikhtitaam"),
    icon: FolderArchive,
    mode: "project",
    items: [
      soon("p.docs.drawings", L("Drawings", "Naqshe"), "/documents/drawings"),
      soon("p.docs.snags", L("Snag List", "Kamiyon ki list"), "/documents/snags"),
      soon("p.docs.handover", L("Handover", "Hawalgi"), "/documents/handover"),
      soon("p.docs.retention", L("Retention", "Retention"), "/documents/retention", BILLING),
    ],
  },
];

// ─── Platform admin console ─────────────────────────────────────────────────

export interface AdminNavItem extends NavItem {
  icon: LucideIcon;
  /** Show the pending-payments count badge. */
  badge?: "pendingPayments";
}

export const ADMIN_NAV: AdminNavItem[] = [
  { id: "admin.overview", label: L("Overview", "Jaiza"), href: "/admin/overview", available: true, icon: LayoutDashboard },
  { id: "admin.companies", label: L("Companies", "Companies"), href: "/admin/companies", available: true, icon: Building2 },
  { id: "admin.payments", label: L("Payments", "Adaigiyan"), href: "/admin/payments", available: true, icon: CreditCard, badge: "pendingPayments" },
  { id: "admin.plans", label: L("Plans", "Plans"), href: "/admin/plans", available: true, icon: Layers },
  { id: "admin.materials", label: L("Material Catalog", "Material catalog"), href: "/admin/materials", available: true, icon: Boxes },
  { id: "admin.holidays", label: L("Holiday Calendar", "Chhuttiyon ka calendar"), href: "/admin/holidays", available: true, icon: CalendarDays },
  { id: "admin.audit", label: L("Audit Logs", "Audit logs"), href: "/admin/audit-logs", available: true, icon: ScrollText },
  { id: "admin.rulebook", label: L("Rulebook", "Qawaid"), href: "/admin/rulebook", available: false, icon: BookOpen },
  { id: "admin.communication", label: L("Communication", "Rabta"), href: "/admin/communication", available: false, icon: Megaphone },
  { id: "admin.security", label: L("Security", "Security"), href: "/admin/security", available: false, icon: ShieldCheck },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

export const projectBase = (projectId: string) => `/projects/${encodeURIComponent(projectId)}`;
export const projectHref = (projectId: string, href: string) => `${projectBase(projectId)}${href}`;

/** Section whose items contain `pathname` (longest match wins). */
export function activeSection(sections: NavSection[], pathname: string, projectId?: string): NavSection | undefined {
  let best: { section: NavSection; length: number } | undefined;
  for (const section of sections) {
    for (const item of section.items) {
      const href = projectId && section.mode === "project" ? projectHref(projectId, item.href) : item.href;
      if (pathname === href || pathname.startsWith(`${href}/`)) {
        if (!best || href.length > best.length) best = { section, length: href.length };
      }
    }
  }
  return best?.section;
}

/** Item for a path (exact or the closest parent), used by ComingSoon pages and breadcrumbs. */
export function findNavItem(
  pathname: string,
  projectId?: string,
): { section: NavSection | AdminNavItem; item: NavItem } | undefined {
  let best: { section: NavSection | AdminNavItem; item: NavItem; length: number } | undefined;
  const consider = (section: NavSection | AdminNavItem, item: NavItem, href: string) => {
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      if (!best || href.length > best.length) best = { section, item, length: href.length };
    }
  };
  for (const section of COMPANY_NAV) for (const item of section.items) consider(section, item, item.href);
  if (projectId) {
    for (const section of PROJECT_NAV) for (const item of section.items) consider(section, item, projectHref(projectId, item.href));
  }
  for (const item of ADMIN_NAV) consider(item, item, item.href);
  return best ? { section: best.section, item: best.item } : undefined;
}


// ─── "+ Create" menu and footer quick actions ───────────────────────────────

export interface QuickAction {
  id: string;
  label: Label;
  href: string;
  access?: AccessRule;
  available: boolean;
}

/** `?new=1` opens the page's create slide-over. */
export const CREATE_ACTIONS: QuickAction[] = [
  { id: "create.project", label: L("New project", "Naya project"), href: "/projects/new", access: { permission: "projects.manage" }, available: true },
  { id: "create.client", label: L("New client", "Naya client"), href: "/sales/clients?new=1", access: OFFICE, available: true },
  { id: "create.invite", label: L("Invite member", "Member bulayein"), href: "/team/invitations?new=1", access: THEKEDAR, available: true },
  { id: "create.supplier", label: L("New supplier", "Naya supplier"), href: "/suppliers-stock/suppliers?new=1", access: OFFICE, available: true },
  { id: "create.worker", label: L("New worker", "Naya mazdoor"), href: "/workforce/workers?new=1", access: OFFICE, available: true },
  { id: "create.quote", label: L("New quote", "Naya quote"), href: "/sales/quotes/new", access: OFFICE, available: false },
  { id: "create.purchase", label: L("New purchase", "Nayi kharidari"), href: "/suppliers-stock/purchases", access: OFFICE, available: false },
  { id: "create.dispatch", label: L("Dispatch to site", "Site bhejein"), href: "/suppliers-stock/dispatches", access: THEKEDAR, available: false },
];

/** Sticky footer: only quick actions that work today. */
export const FOOTER_ACTIONS = CREATE_ACTIONS.filter((a) => a.id === "create.project" || a.id === "create.invite");
