/**
 * THE navigation config. Drives the icon rail, the flyout and the command search for
 * company mode, project mode and the platform-admin console.
 *
 * - `access` hides an item (never disables it) for users who may not use it. Rules use
 *   permission keys from `/auth/me` (THEKEDAR = every key), never the account role.
 * - `available: false` → the item still shows and opens a "Coming in the next phase" page.
 * - A section shows on the rail when its own `access` passes AND at least one of its items is
 *   visible (`visibleSections`). Command search checks each item's own `access`.
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
  Database,
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
import { canAccess, type AccessRule, type PermissionKey } from "@/lib/permissions";
import type { Me } from "@/api/types";

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
  /** Live count shown next to the item (project mode: incoming deliveries). */
  badge?: "incoming" | "pendingPayments";
}

export interface NavSection {
  id: string;
  label: Label;
  icon: LucideIcon;
  mode: NavMode;
  access?: AccessRule;
  items: NavItem[];
}

const L = (en: string, ur: string, urdu: string): Label => ({ en, ur, urdu });
/** Shorthand for "must hold this permission key" (PERMISSIONS_API.md §6). */
const P = (permission: PermissionKey): AccessRule => ({ permission });
const ANY = (...anyPermission: PermissionKey[]): AccessRule => ({ anyPermission });
const ALL = (...allPermissions: PermissionKey[]): AccessRule => ({ allPermissions });
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
    label: L("Dashboard", "Dashboard", "ڈیش بورڈ"),
    icon: LayoutDashboard,
    mode: "company",
    items: [
      {
        id: "dashboard.overview",
        label: L("Company Overview", "Company ka jaiza", "کمپنی کا جائزہ"),
        href: "/dashboard",
        available: true,
      },
      {
        id: "dashboard.approvals",
        label: L("My Approvals", "Meri approvals", "میری منظوریاں"),
        href: "/dashboard/approvals",
        available: true,
        access: P("approvals.inbox.view"),
      },
      {
        id: "dashboard.alerts",
        label: L("Alerts & Notifications", "Alerts aur itla'at", "الرٹس اور اطلاعات"),
        href: "/dashboard/alerts",
        available: true,
        keywords: ["notifications", "bell", "bounced", "overdue"],
      },
    ],
  },
  {
    id: "projects",
    label: L("Projects", "Projects", "پراجیکٹس"),
    icon: FolderKanban,
    mode: "company",
    items: [
      {
        id: "projects.all",
        label: L("All Projects", "Tamam projects", "تمام پراجیکٹس"),
        href: "/projects",
        available: true,
        access: P("projects.project.view"),
      },
      {
        id: "projects.new",
        label: L("New Project", "Naya project", "نیا پراجیکٹ"),
        href: "/projects/new",
        available: true,
        access: P("projects.project.create"),
        keywords: ["create", "wizard"],
      },
      {
        id: "projects.closed",
        label: L("Closed & Archived", "Band aur archive", "بند اور محفوظ شدہ"),
        href: "/projects/closed",
        available: true,
        access: P("projects.project.view"),
      },
    ],
  },
  {
    id: "sales",
    label: L("Sales", "Sales", "سیلز"),
    icon: Handshake,
    mode: "company",
    items: [
      {
        id: "sales.clients",
        label: L("Clients (Owners)", "Clients (Maalikaan)", "کلائنٹس (مالکان)"),
        href: "/sales/clients",
        available: true,
        access: P("clients.client.view"),
        keywords: ["owner", "customer"],
      },
      soon(
        "sales.quotes",
        L("Quote Pipeline", "Quote pipeline", "کوٹیشن پائپ لائن"),
        "/sales/quotes",
        P("clients.client.create"),
      ),
      soon(
        "sales.newQuote",
        L("New Quote", "Naya quote", "نیا کوٹیشن"),
        "/sales/quotes/new",
        P("clients.client.create"),
      ),
      soon(
        "sales.insights",
        L("Win / Loss Insights", "Jeet / haar ka jaiza", "جیت / ہار کا جائزہ"),
        "/sales/insights",
        P("finance.companyreports.view"),
      ),
    ],
  },
  {
    id: "suppliers-stock",
    label: L("Suppliers & Stock", "Suppliers aur stock", "سپلائرز اور اسٹاک"),
    icon: PackageSearch,
    mode: "company",
    items: [
      {
        id: "stock.suppliers",
        label: L("All Suppliers", "Tamam suppliers", "تمام سپلائرز"),
        href: "/suppliers-stock/suppliers",
        available: true,
        access: P("masterdata.supplier.view"),
        keywords: ["dealer", "vendor"],
      },
      {
        id: "stock.purchases",
        label: L("Purchases", "Maal kharida", "مال خریدا"),
        href: "/suppliers-stock/purchases",
        available: true,
        access: P("procurement.purchase.view"),
        keywords: ["challan", "purchase", "buy"],
      },
      {
        id: "stock.returns",
        label: L("Purchase Returns", "Maal wapsi", "مال واپسی"),
        href: "/suppliers-stock/purchase-returns",
        available: true,
        access: P("procurement.return.view"),
      },
      {
        id: "stock.store",
        label: L("Store Stock", "Godown stock", "گودام اسٹاک"),
        href: "/suppliers-stock/store-stock",
        available: true,
        access: P("inventory.store.view"),
        keywords: ["godown", "inventory", "low stock"],
      },
      {
        id: "stock.dispatches",
        label: L("Dispatches (Sent to Sites)", "Site bheja gaya maal", "سائٹ پر بھیجا گیا مال"),
        href: "/suppliers-stock/dispatches",
        available: true,
        access: P("procurement.dispatch.view"),
        keywords: ["gate pass", "gp", "truck"],
      },
      {
        id: "stock.shortages",
        label: L("Shortages", "Kami", "کمی"),
        href: "/suppliers-stock/shortages",
        available: true,
        access: P("procurement.shortage.view"),
        keywords: ["short", "damaged"],
      },
      {
        id: "stock.ledger",
        label: L("Supplier Ledger", "Supplier khata", "سپلائر کھاتہ"),
        href: "/suppliers-stock/ledger",
        available: true,
        access: P("procurement.ledger.view"),
        keywords: ["udhaar", "khata", "balance"],
      },
      {
        id: "stock.orders",
        label: L("Purchase Orders", "Purchase orders", "پرچیز آرڈرز"),
        href: "/suppliers-stock/purchase-orders",
        available: true,
        access: P("procurement.order.view"),
        keywords: ["po", "order"],
      },
      {
        id: "stock.payments",
        label: L("Supplier Payments", "Supplier adaigiyan", "سپلائر ادائیگیاں"),
        href: "/suppliers-stock/payments",
        available: true,
        access: P("procurement.payment.view"),
        keywords: ["cheque", "pay"],
      },
    ],
  },
  {
    id: "workforce",
    label: L("Workforce", "Mazdoor", "افرادی قوت"),
    icon: HardHat,
    mode: "company",
    items: [
      {
        id: "workforce.workers",
        label: L("Workers Directory", "Mazdooron ki fehrist", "مزدوروں کی فہرست"),
        href: "/workforce/workers",
        available: true,
        access: P("masterdata.worker.view"),
        keywords: ["mistri", "mazdoor", "labour"],
      },
      {
        id: "workforce.workerTypes",
        label: L("Worker Types", "Kaam ki qismein", "کام کی اقسام"),
        href: "/workforce/worker-types",
        available: true,
        access: P("masterdata.laborrate.view"),
        keywords: ["type", "trade", "electrician", "mason", "qisam", "wages"],
      },
      {
        id: "workforce.subcontractors",
        label: L("Sub-contractors", "Theke daar team", "ٹھیکیدار"),
        href: "/workforce/subcontractors",
        available: true,
        access: P("masterdata.subcontractor.view"),
        keywords: ["team", "trade"],
      },
    ],
  },
  {
    id: "equipment",
    label: L("Equipment", "Saaz-o-saman", "ساز و سامان"),
    icon: Forklift,
    mode: "company",
    items: [
      {
        id: "equipment.map",
        label: L("Allocation Map", "Allocation map", "تقسیم کا نقشہ"),
        href: "/equipment/allocation",
        available: true,
        access: P("equipment.view"),
        keywords: ["where", "shuttering", "plates", "yard"],
      },
      {
        id: "equipment.owned",
        label: L("Owned Equipment", "Apna saman", "اپنا سامان"),
        href: "/equipment/owned",
        available: true,
        access: P("equipment.view"),
        keywords: ["register", "mixer", "vibrator", "props", "stock in"],
      },
      {
        id: "equipment.rentals",
        label: L("Rentals", "Kiraye ka saman", "کرائے کا سامان"),
        href: "/equipment/rentals",
        available: true,
        access: P("equipment.view"),
        keywords: ["hire", "kiraya", "yard supplier", "deposit"],
      },
      {
        id: "equipment.movements",
        label: L("Movements", "Naql-o-harkat", "نقل و حرکت"),
        href: "/equipment/movements",
        available: true,
        access: P("equipment.view"),
        keywords: ["transfer", "dispatch", "return", "receive"],
      },
      {
        id: "equipment.loss",
        label: L("Loss & Damage", "Nuqsan", "نقصان"),
        href: "/equipment/loss-damage",
        available: true,
        access: P("equipment.view"),
        keywords: ["missing", "damaged", "gum"],
      },
      {
        id: "equipment.charges",
        label: L("Hire & Rent Charges", "Kiraya charges", "کرایہ چارجز"),
        href: "/equipment/charges",
        available: true,
        access: P("equipment.view"),
        keywords: ["internal hire", "daily", "rent"],
      },
      // Wave 3: shuttering demand planner (needs the Step 13 schedule) — ComingSoon until then.
      soon(
        "equipment.shuttering",
        L("Shuttering Demand", "Shuttering ki talab", "شٹرنگ کی طلب"),
        "/equipment/shuttering",
        P("equipment.view"),
      ),
    ],
  },
  {
    id: "finance",
    label: L("Finance", "Hisaab", "حساب کتاب"),
    icon: Wallet,
    mode: "company",
    items: [
      {
        id: "finance.receivables",
        label: L("Receivables", "Wasooliyan", "وصولیاں"),
        href: "/finance/receivables",
        available: true,
        access: P("finance.receivables.view"),
        keywords: ["outstanding", "overdue", "wasooli"],
      },
      {
        id: "finance.cashflow",
        label: L("Cash Flow Outlook", "Cash flow", "کیش فلو"),
        href: "/finance/cash-flow",
        available: true,
        access: P("finance.cashflow.view"),
        keywords: ["forecast", "outlook", "udhaar"],
      },
      {
        id: "finance.pl",
        label: L("Profit & Loss", "Nafa aur nuqsan", "نفع و نقصان"),
        href: "/finance/profit-loss",
        available: true,
        access: P("finance.pnl.view"),
        keywords: ["profit", "margin", "p&l"],
      },
      {
        id: "finance.floats",
        label: L("Cash Floats Overview", "Cash floats", "کیش فلوٹس کا جائزہ"),
        href: "/finance/cash-floats",
        available: true,
        access: P("cashbook.float.view"),
        keywords: ["site cash", "kharcha", "munshi"],
      },
    ],
  },
  {
    id: "reports",
    label: L("Reports", "Reports", "رپورٹس"),
    icon: ChartColumn,
    mode: "company",
    items: [
      {
        id: "reports.summary",
        label: L("Project Summary", "Project khulasa", "پراجیکٹ کا خلاصہ"),
        href: "/reports/project-summary",
        available: true,
        access: ALL("finance.reports.view", "fields.amounts"),
      },
      {
        id: "reports.material",
        label: L("Material Audit", "Maal ka audit", "مال کا آڈٹ"),
        href: "/reports/material-audit",
        available: true,
        access: P("finance.reports.view"),
      },
      {
        id: "reports.labor",
        label: L("Labor & Advances", "Mazdoori aur peshgi", "مزدوری اور پیشگی"),
        href: "/reports/labor-peshgi",
        available: true,
        access: P("finance.reports.view"),
      },
      {
        id: "reports.cashbook",
        label: L("Cash Book", "Cash book", "کیش بک"),
        href: "/reports/cash-book",
        available: true,
        access: P("finance.reports.view"),
      },
      {
        id: "reports.ageing",
        label: L("Supplier Ageing", "Supplier udhaar ki umar", "سپلائر ادھار کی مدت"),
        href: "/reports/supplier-ageing",
        available: true,
        access: ALL("finance.reports.view", "finance.companyreports.view"),
      },
      {
        id: "reports.receivables",
        label: L("Receivables Ageing", "Wasooli ki umar", "وصولیوں کی مدت"),
        href: "/reports/receivables-ageing",
        available: true,
        access: ALL("finance.reports.view", "finance.companyreports.view"),
      },
      {
        id: "reports.stock",
        label: L("Stock Valuation", "Stock ki qeemat", "اسٹاک کی قیمت"),
        href: "/reports/stock-valuation",
        available: true,
        access: ALL("finance.reports.view", "finance.companyreports.view"),
      },
      soon(
        "reports.delay",
        L("Delay Analysis", "Takheer ka jaiza", "تاخیر کا جائزہ"),
        "/reports/delay-analysis",
        P("finance.reports.view"),
      ),
    ],
  },
  {
    id: "team",
    label: L("Team", "Team", "ٹیم"),
    icon: UsersRound,
    mode: "company",
    items: [
      {
        id: "team.members",
        label: L("Members", "Members", "ممبرز"),
        href: "/team/members",
        available: true,
        access: ANY("team.member.view", "team.member.manage"),
        // PM may view the member list read-only (reachable from search).
        keywords: ["users", "staff", "pm", "munshi"],
      },
      {
        id: "team.invitations",
        label: L("Invitations", "Daawat naame", "دعوت نامے"),
        href: "/team/invitations",
        available: true,
        access: P("team.member.manage"),
        keywords: ["invite"],
      },
      {
        id: "team.devices",
        label: L("Devices", "Devices", "ڈیوائسز"),
        href: "/team/devices",
        available: true,
        access: P("team.member.manage"),
        keywords: ["phone", "logout"],
      },
      {
        id: "team.roles",
        label: L("Roles & Permissions", "Roles aur ijazatein", "رولز اور اجازتیں"),
        href: "/team/roles",
        available: true,
        access: P("team.member.manage"),
        keywords: ["permissions", "access", "ijazat", "role", "template", "accountant", "store keeper"],
      },
    ],
  },
  {
    id: "settings",
    label: L("Settings", "Settings", "ترتیبات"),
    icon: Settings,
    mode: "company",
    items: [
      {
        id: "settings.company",
        label: L("Company Profile", "Company profile", "کمپنی پروفائل"),
        href: "/settings/company",
        available: true,
        access: P("company.settings.manage"),
        keywords: ["logo", "ntn"],
      },
      {
        id: "settings.openingBalances",
        label: L("Opening Balances", "Opening balance", "ابتدائی بیلنس"),
        href: "/settings/opening-balances",
        available: true,
        access: P("company.opening.manage"),
        keywords: ["udhaar", "opening", "cash in hand", "stock", "peshgi"],
      },
      {
        id: "settings.materials",
        label: L("Materials", "Materials", "میٹیریلز"),
        href: "/settings/materials",
        available: true,
        access: P("masterdata.material.view"),
        keywords: ["cement", "steel", "bricks"],
      },
      {
        id: "settings.priceList",
        label: L("Price List", "Rate list", "ریٹ لسٹ"),
        href: "/settings/price-list",
        available: true,
        access: P("masterdata.pricelist.view"),
        keywords: ["rates", "quality"],
      },
      {
        id: "settings.laborRates",
        label: L("Labor Rates", "Mazdoori rates", "مزدوری کے ریٹ"),
        href: "/settings/labor-rates",
        available: true,
        access: ALL("masterdata.laborrate.view", "fields.rates"),
        keywords: ["wages"],
      },
      soon(
        "settings.rulebook",
        L("Rulebook", "Qawaid", "قواعد"),
        "/settings/rulebook",
        P("company.settings.manage"),
      ),
      {
        id: "settings.paymentTemplates",
        label: L("Payment Templates", "Adaigi templates", "ادائیگی کے سانچے"),
        href: "/settings/payment-templates",
        available: true,
        access: P("masterdata.template.view"),
        keywords: ["stages", "billing"],
      },
      {
        id: "settings.holidays",
        label: L("Holidays", "Chhuttiyan", "چھٹیاں"),
        href: "/settings/holidays",
        available: true,
        access: P("company.holiday.manage"),
      },
      {
        id: "settings.auditLog",
        label: L("Audit Log", "Audit log", "آڈٹ لاگ"),
        href: "/settings/audit-log",
        available: true,
        access: P("company.audit.view"),
        keywords: ["history", "platform support", "who changed"],
      },
      {
        id: "settings.alerts",
        label: L("Alerts & Limits", "Alerts aur hadein", "الرٹس اور حدود"),
        href: "/settings/alerts",
        available: true,
        access: P("company.settings.manage"),
      },
      soon("settings.tax", L("Tax", "Tax", "ٹیکس"), "/settings/tax", P("company.settings.manage")),
      {
        id: "settings.subscription",
        label: L("Subscription", "Subscription", "سبسکرپشن"),
        href: "/settings/subscription",
        available: true,
        access: P("subscription.manage"),
        keywords: ["plan", "payment", "renew"],
      },
    ],
  },
];

// ─── Project mode (hrefs relative to /projects/:id) ─────────────────────────

/** Billing screens and the money cards that link to them: billing view + billing amounts. */
export const BILLING_ACCESS = ALL("billing.invoice.view", "fields.amounts");

export const PROJECT_NAV: NavSection[] = [
  {
    id: "p.overview",
    label: L("Overview", "Jaiza", "جائزہ"),
    icon: LayoutGrid,
    mode: "project",
    items: [
      {
        id: "p.overview.summary",
        label: L("Project Summary", "Project khulasa", "پراجیکٹ کا خلاصہ"),
        href: "/overview",
        available: true,
      },
    ],
  },
  {
    id: "p.planning",
    label: L("Planning", "Mansooba", "منصوبہ بندی"),
    icon: ClipboardList,
    mode: "project",
    items: [
      {
        id: "p.planning.site",
        label: L("Site Setup", "Site setup", "سائٹ سیٹ اپ"),
        href: "/planning/site-setup",
        available: true,
      },
      {
        id: "p.planning.rooms",
        label: L("Floors & Rooms", "Manzilein aur kamre", "منزلیں اور کمرے"),
        href: "/planning/floors-rooms",
        available: true,
      },
      {
        id: "p.planning.supply",
        label: L("Supply Split", "Supply ki taqseem", "سپلائی کی تقسیم"),
        href: "/planning/supply-split",
        available: true,
      },
      {
        id: "p.planning.estimate",
        label: L("Estimate (BoQ)", "Andaza (BoQ)", "تخمینہ (BoQ)"),
        href: "/planning/estimate",
        available: true,
        access: P("projects.estimate.view"),
        keywords: ["boq", "andaza", "material estimate", "cement", "bricks", "steel", "quantity"],
      },
      {
        ...soon(
          "p.planning.revisions",
          L("Estimate Revisions", "Estimate revisions", "تخمینے میں ترمیم"),
          "/planning/estimate-revisions",
        ),
        comingSoonNote: "Estimate comes in Phase 2.",
      },
      soon(
        "p.planning.shopping",
        L("Owner Shopping List", "Maalik ki shopping list", "مالک کی خریداری کی فہرست"),
        "/planning/shopping-list",
      ),
    ],
  },
  {
    id: "p.schedule",
    label: L("Schedule", "Schedule", "شیڈول"),
    icon: CalendarRange,
    mode: "project",
    items: [
      {
        id: "p.schedule.gantt",
        label: L("Gantt", "Gantt", "گینٹ"),
        href: "/schedule/gantt",
        available: true,
        access: P("schedule.plan.view"),
        keywords: ["schedule", "timeline", "milestones", "curing", "re-plan", "shedule"],
      },
      {
        id: "p.schedule.milestones",
        label: L("Milestones & Quotas", "Milestones aur quota", "سنگ میل اور کوٹے"),
        href: "/schedule/milestones",
        available: true,
        access: P("schedule.plan.view"),
        keywords: ["quota", "planned vs used", "material quota"],
      },
      {
        id: "p.schedule.stoppages",
        label: L("Stoppage Days", "Kaam band din", "کام بند دن"),
        href: "/schedule/stoppages",
        available: true,
        access: P("schedule.plan.view"),
        keywords: ["rain", "smog", "holiday", "stoppage", "delay"],
      },
      {
        id: "p.schedule.versions",
        label: L("Plan Versions", "Plan ke versions", "منصوبے کے ورژن"),
        href: "/schedule/versions",
        available: true,
        access: P("schedule.plan.view"),
        keywords: ["baseline", "re-plan", "history"],
      },
    ],
  },
  {
    id: "p.site",
    label: L("Site", "Site", "سائٹ"),
    icon: Building2,
    mode: "project",
    items: [
      {
        id: "p.site.logs",
        label: L("Daily Logs & Photos", "Rozana log", "روزانہ لاگ اور تصاویر"),
        href: "/site/daily-logs",
        available: true,
        access: P("dailylog.log.view"),
        keywords: ["diary", "photos", "voice note", "site log"],
      },
      {
        id: "p.site.incoming",
        label: L("Incoming Material", "Aane wala maal", "آنے والا مال"),
        href: "/site/incoming",
        available: true,
        access: P("procurement.dispatch.view"),
        badge: "incoming",
        keywords: ["receive", "gate pass"],
      },
      {
        id: "p.site.deliveries",
        label: L("Deliveries", "Maal aaya", "مال آیا"),
        href: "/site/deliveries",
        available: true,
        access: ANY("inventory.ownerdelivery.view", "procurement.purchase.view"),
        keywords: ["owner delivery"],
      },
      {
        id: "p.site.usage",
        label: L("Material Usage", "Maal lag gaya", "مال لگ گیا"),
        href: "/site/usage",
        available: true,
        access: P("inventory.stock.view"),
      },
      {
        id: "p.site.stock",
        label: L("Site Stock", "Site stock", "سائٹ اسٹاک"),
        href: "/site/stock",
        available: true,
        access: P("inventory.stock.view"),
      },
      {
        id: "p.site.counts",
        label: L("Stock Counts & Transfers", "Ginti aur transfer", "گنتی اور منتقلی"),
        href: "/site/counts",
        available: true,
        access: P("inventory.count.view"),
      },
      {
        id: "p.site.equipment",
        label: L("Equipment on Site", "Site par saman", "سائٹ پر سامان"),
        href: "/site/equipment",
        available: true,
        access: P("equipment.view"),
        keywords: ["shuttering", "plates", "mixer", "receive equipment"],
      },
    ],
  },
  {
    id: "p.labor",
    label: L("Labor", "Mazdoori", "مزدوری"),
    icon: Users,
    mode: "project",
    items: [
      {
        id: "p.labor.team",
        label: L("Team on Site", "Site par team", "سائٹ پر ٹیم"),
        href: "/labor/team",
        available: true,
        access: P("labor.team.view"),
        keywords: ["assign", "workers", "sub-contract"],
      },
      {
        id: "p.labor.hazri",
        label: L("Attendance Register", "Hazri register", "حاضری رجسٹر"),
        href: "/labor/hazri",
        available: true,
        access: P("labor.attendance.view"),
        keywords: ["attendance", "present"],
      },
      {
        id: "p.labor.accounts",
        label: L("Sub-contractor Accounts", "Theke daar hisaab", "ٹھیکیداروں کا حساب"),
        href: "/labor/subcontractor-accounts",
        available: true,
        access: P("labor.account.view"),
        keywords: ["retention", "theka"],
      },
      {
        id: "p.labor.measurements",
        label: L("Work Measurements", "Kaam ki paimaish", "کام کی پیمائش"),
        href: "/labor/measurements",
        available: true,
        access: P("labor.measurement.view"),
        keywords: ["sqft", "measurement"],
      },
      {
        id: "p.labor.peshgi",
        label: L("Advances", "Peshgi", "پیشگی"),
        href: "/labor/peshgi",
        available: true,
        access: P("labor.advance.view"),
        keywords: ["advance"],
      },
      {
        id: "p.labor.settlements",
        label: L("Weekly Settlements", "Hafta war hisaab", "ہفتہ وار حساب"),
        href: "/labor/settlements",
        available: true,
        access: P("labor.settlement.view"),
        keywords: ["wages", "payroll"],
      },
    ],
  },
  {
    id: "p.cash",
    label: L("Cash Book", "Cash book", "کیش بک"),
    icon: BookOpen,
    mode: "project",
    items: [
      {
        id: "p.cash.kharcha",
        label: L("Site Expenses", "Site kharcha", "سائٹ خرچہ"),
        href: "/cash-book/kharcha",
        available: true,
        access: P("cashbook.expense.view"),
        keywords: ["expense", "petty cash"],
      },
      {
        id: "p.cash.floats",
        label: L("Cash Floats", "Cash floats", "کیش فلوٹس"),
        href: "/cash-book/floats",
        available: true,
        access: P("cashbook.account.view"),
        keywords: ["acknowledge", "easypaisa"],
      },
      {
        id: "p.cash.topups",
        label: L("Top-up Requests", "Top-up darkhwastein", "ٹاپ اپ درخواستیں"),
        href: "/cash-book/top-ups",
        available: true,
        access: P("cashbook.topup.view"),
      },
      {
        id: "p.cash.counts",
        label: L("Cash Counts & Handover", "Cash ginti aur hawalgi", "کیش گنتی اور حوالگی"),
        href: "/cash-book/counts",
        available: true,
        access: P("cashbook.account.view"),
      },
    ],
  },
  {
    id: "p.changes",
    label: L("Change Orders", "Tabdeeli orders", "تبدیلی آرڈرز"),
    icon: FilePen,
    mode: "project",
    items: [
      soon(
        "p.changes.all",
        L("All Change Orders", "Tamam tabdeeli orders", "تمام تبدیلی آرڈرز"),
        "/change-orders",
        P("projects.project.edit"),
      ),
      soon(
        "p.changes.new",
        L("New Change Order", "Naya tabdeeli order", "نیا تبدیلی آرڈر"),
        "/change-orders/new",
        P("projects.project.edit"),
      ),
    ],
  },
  {
    id: "p.billing",
    label: L("Billing", "Billing", "بلنگ"),
    icon: Receipt,
    mode: "project",
    items: [
      {
        id: "p.billing.schedule",
        label: L("Payment Schedule", "Adaigi schedule", "ادائیگی کا شیڈول"),
        href: "/billing/schedule",
        available: true,
        access: P("billing.invoice.view"),
        keywords: ["stages", "mark ready", "running bill"],
      },
      {
        id: "p.billing.invoices",
        label: L("Invoices & Running Bills", "Invoices aur bills", "انوائسز اور بل"),
        href: "/billing/invoices",
        available: true,
        access: P("billing.invoice.view"),
        keywords: ["invoice", "bill"],
      },
      {
        id: "p.billing.received",
        label: L("Payments Received", "Wasool adaigiyan", "وصول شدہ ادائیگیاں"),
        href: "/billing/payments",
        available: true,
        access: P("billing.payment.view"),
        keywords: ["cheque", "receipt"],
      },
      {
        id: "p.billing.statement",
        label: L("Owner Statement", "Maalik ka statement", "مالک کا اسٹیٹمنٹ"),
        href: "/billing/statement",
        available: true,
        access: P("billing.invoice.view"),
        keywords: ["statement", "hisaab"],
      },
    ],
  },
  {
    id: "p.control",
    label: L("Control", "Control", "کنٹرول"),
    icon: Gauge,
    mode: "project",
    items: [
      soon(
        "p.control.material",
        L("Material Variance", "Maal ka farq", "مال کا فرق"),
        "/control/material-variance",
        P("finance.pnl.view"),
      ),
      soon(
        "p.control.cost",
        L("Cost Variance", "Lagat ka farq", "لاگت کا فرق"),
        "/control/cost-variance",
        P("finance.pnl.view"),
      ),
      soon(
        "p.control.burn",
        L("Burn Rate vs Progress", "Kharch vs taraqqi", "خرچ بمقابلہ پیش رفت"),
        "/control/burn-rate",
        P("finance.pnl.view"),
      ),
      soon(
        "p.control.delay",
        L("Delay Analysis", "Takheer ka jaiza", "تاخیر کا جائزہ"),
        "/control/delay",
        P("finance.pnl.view"),
      ),
    ],
  },
  {
    id: "p.documents",
    label: L("Documents & Closeout", "Kaghzaat aur ikhtitaam", "کاغذات اور اختتام"),
    icon: FolderArchive,
    mode: "project",
    items: [
      // Step 17 · Closeout
      {
        id: "p.docs.drawings",
        label: L("Drawings", "Naqshe", "نقشے"),
        href: "/documents/drawings",
        available: true,
        access: P("closeout.drawing.view"),
        keywords: ["naqsha", "plan", "revision", "society approved"],
      },
      {
        id: "p.docs.snags",
        label: L("Snag List", "Kamiyon ki list", "خامیوں کی فہرست"),
        href: "/documents/snags",
        available: true,
        access: P("closeout.snag.view"),
        keywords: ["snag", "defect", "punch list", "kami"],
      },
      {
        id: "p.docs.handover",
        label: L("Handover", "Hawalgi", "حوالگی"),
        href: "/documents/handover",
        available: true,
        access: P("closeout.handover.manage"),
        keywords: ["keys", "certificate", "sign-off"],
      },
      {
        id: "p.docs.retention",
        label: L("Retention", "Retention", "روکی گئی رقم"),
        href: "/documents/retention",
        available: true,
        access: P("closeout.retention.view"),
        keywords: ["retention", "defect period"],
      },
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
  {
    id: "admin.overview",
    label: L("Overview", "Jaiza", "جائزہ"),
    href: "/admin/overview",
    available: true,
    icon: LayoutDashboard,
  },
  {
    id: "admin.companies",
    label: L("Companies", "Companies", "کمپنیاں"),
    href: "/admin/companies",
    available: true,
    icon: Building2,
  },
  // Pick a company and work in its own screens (projects, team, stock, purchases …) — read and edit.
  {
    id: "admin.data",
    label: L("Company Data", "Company ka data", "کمپنی کا ڈیٹا"),
    href: "/admin/data",
    available: true,
    icon: Database,
    keywords: ["tenant", "impersonate", "projects", "employees", "stock", "purchases"],
  },
  {
    id: "admin.payments",
    label: L("Payments", "Adaigiyan", "ادائیگیاں"),
    href: "/admin/payments",
    available: true,
    icon: CreditCard,
    badge: "pendingPayments",
  },
  {
    id: "admin.plans",
    label: L("Plans", "Plans", "پلانز"),
    href: "/admin/plans",
    available: true,
    icon: Layers,
  },
  {
    id: "admin.materials",
    label: L("Material Catalog", "Material catalog", "میٹیریل کیٹلاگ"),
    href: "/admin/materials",
    available: true,
    icon: Boxes,
  },
  {
    id: "admin.holidays",
    label: L("Holiday Calendar", "Chhuttiyon ka calendar", "چھٹیوں کا کیلنڈر"),
    href: "/admin/holidays",
    available: true,
    icon: CalendarDays,
  },
  {
    id: "admin.audit",
    label: L("Audit Logs", "Audit logs", "آڈٹ لاگز"),
    href: "/admin/audit-logs",
    available: true,
    icon: ScrollText,
  },
  {
    id: "admin.rulebook",
    label: L("Rulebook", "Qawaid", "قواعد"),
    href: "/admin/rulebook",
    available: false,
    icon: BookOpen,
  },
  {
    id: "admin.communication",
    label: L("Communication", "Rabta", "رابطہ"),
    href: "/admin/communication",
    available: false,
    icon: Megaphone,
  },
  {
    id: "admin.security",
    label: L("Security", "Security", "سیکیورٹی"),
    href: "/admin/security",
    available: false,
    icon: ShieldCheck,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

export const projectBase = (projectId: string) => `/projects/${encodeURIComponent(projectId)}`;
export const projectHref = (projectId: string, href: string) => `${projectBase(projectId)}${href}`;

type AccessSubject = Pick<Me, "permissions" | "user"> & Partial<Me>;

/**
 * Sections and items the user may see: a section needs its own `access` and at least one
 * visible item; items are filtered by their `access`.
 */
export function visibleSections(me: AccessSubject | null | undefined, sections: NavSection[]): NavSection[] {
  return sections
    .filter((section) => canAccess(me, section.access))
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccess(me, item.access)) }))
    .filter((section) => section.items.length > 0);
}

/** Item ids the user may see, e.g. for tests and command search. */
export const visibleItemIds = (me: AccessSubject | null | undefined, sections: NavSection[]) =>
  visibleSections(me, sections).flatMap((section) => section.items.map((item) => item.id));

/** Section whose items contain `pathname` (longest match wins). */
export function activeSection(
  sections: NavSection[],
  pathname: string,
  projectId?: string,
): NavSection | undefined {
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
    for (const section of PROJECT_NAV)
      for (const item of section.items) consider(section, item, projectHref(projectId, item.href));
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
  {
    id: "create.project",
    label: L("New project", "Naya project", "نیا پراجیکٹ"),
    href: "/projects/new",
    available: true,
    access: P("projects.project.create"),
  },
  {
    id: "create.client",
    label: L("New client", "Naya client", "نیا کلائنٹ"),
    href: "/sales/clients?new=1",
    available: true,
    access: P("clients.client.create"),
  },
  {
    id: "create.invite",
    label: L("Invite member", "Member bulayein", "ممبر کو مدعو کریں"),
    href: "/team/invitations?new=1",
    available: true,
    access: P("team.member.manage"),
  },
  {
    id: "create.supplier",
    label: L("New supplier", "Naya supplier", "نیا سپلائر"),
    href: "/suppliers-stock/suppliers?new=1",
    available: true,
    access: P("masterdata.supplier.create"),
  },
  {
    id: "create.worker",
    label: L("New worker", "Naya mazdoor", "نیا مزدور"),
    href: "/workforce/workers?new=1",
    available: true,
    access: P("masterdata.worker.create"),
  },
  {
    id: "create.quote",
    label: L("New quote", "Naya quote", "نیا کوٹیشن"),
    href: "/sales/quotes/new",
    available: false,
    access: P("clients.client.create"),
  },
  {
    id: "create.purchase",
    label: L("New purchase", "Nayi kharidari", "نئی خریداری"),
    href: "/suppliers-stock/purchases/new",
    available: true,
    access: P("procurement.purchase.create"),
  },
  {
    id: "create.dispatch",
    label: L("Dispatch to site", "Site bhejein", "سائٹ پر بھیجیں"),
    href: "/suppliers-stock/dispatches",
    available: true,
    access: P("procurement.dispatch.create"),
  },
];

/** Sticky footer: only quick actions that work today. */
export const FOOTER_ACTIONS = CREATE_ACTIONS.filter(
  (a) => a.id === "create.project" || a.id === "create.invite",
);
