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
const THEKEDAR = { roles: ["THEKEDAR"] } as const satisfies AccessRule;
const OFFICE = { roles: ["THEKEDAR", "PM"] } as const satisfies AccessRule;
/** P&L: the owner, or a PM with profit access. */
const PROFIT_OFFICE = { roles: ["THEKEDAR", "PM"], permission: "profit.view" } as const satisfies AccessRule;
/** The Finance menu: the owner, or a PM who may see profit (they get P&L only). */
const FINANCE = PROFIT_OFFICE;
/** Money reports: the owner, or a PM with financials. */
const FINANCIALS = { roles: ["THEKEDAR", "PM"], permission: "billing.view" } as const satisfies AccessRule;
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
        access: OFFICE,
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
      { id: "projects.all", label: L("All Projects", "Tamam projects", "تمام پراجیکٹس"), href: "/projects", available: true },
      {
        id: "projects.new",
        label: L("New Project", "Naya project", "نیا پراجیکٹ"),
        href: "/projects/new",
        available: true,
        access: { permission: "projects.manage" },
        keywords: ["create", "wizard"],
      },
      {
        id: "projects.closed",
        label: L("Closed & Archived", "Band aur archive", "بند اور محفوظ شدہ"),
        href: "/projects/closed",
        available: true,
      },
    ],
  },
  {
    id: "sales",
    label: L("Sales", "Sales", "سیلز"),
    icon: Handshake,
    mode: "company",
    access: OFFICE,
    items: [
      {
        id: "sales.clients",
        label: L("Clients (Owners)", "Clients (Maalikaan)", "کلائنٹس (مالکان)"),
        href: "/sales/clients",
        available: true,
        access: OFFICE,
        keywords: ["owner", "customer"],
      },
      soon("sales.quotes", L("Quote Pipeline", "Quote pipeline", "کوٹیشن پائپ لائن"), "/sales/quotes", OFFICE),
      soon("sales.newQuote", L("New Quote", "Naya quote", "نیا کوٹیشن"), "/sales/quotes/new", OFFICE),
      soon("sales.insights", L("Win / Loss Insights", "Jeet / haar ka jaiza", "جیت / ہار کا جائزہ"), "/sales/insights", THEKEDAR),
    ],
  },
  {
    id: "suppliers-stock",
    label: L("Suppliers & Stock", "Suppliers aur stock", "سپلائرز اور اسٹاک"),
    icon: PackageSearch,
    mode: "company",
    access: OFFICE,
    items: [
      {
        id: "stock.suppliers",
        label: L("All Suppliers", "Tamam suppliers", "تمام سپلائرز"),
        href: "/suppliers-stock/suppliers",
        available: true,
        access: OFFICE,
        keywords: ["dealer", "vendor"],
      },
      {
        id: "stock.purchases",
        label: L("Purchases", "Maal kharida", "مال خریدا"),
        href: "/suppliers-stock/purchases",
        available: true,
        access: OFFICE,
        keywords: ["challan", "purchase", "buy"],
      },
      {
        id: "stock.returns",
        label: L("Purchase Returns", "Maal wapsi", "مال واپسی"),
        href: "/suppliers-stock/purchase-returns",
        available: true,
        access: OFFICE,
      },
      {
        id: "stock.store",
        label: L("Store Stock", "Godown stock", "گودام اسٹاک"),
        href: "/suppliers-stock/store-stock",
        available: true,
        access: THEKEDAR,
        keywords: ["godown", "inventory", "low stock"],
      },
      {
        id: "stock.dispatches",
        label: L("Dispatches (Sent to Sites)", "Site bheja gaya maal", "سائٹ پر بھیجا گیا مال"),
        href: "/suppliers-stock/dispatches",
        available: true,
        access: THEKEDAR,
        keywords: ["gate pass", "gp", "truck"],
      },
      {
        id: "stock.shortages",
        label: L("Shortages", "Kami", "کمی"),
        href: "/suppliers-stock/shortages",
        available: true,
        access: THEKEDAR,
        keywords: ["short", "damaged"],
      },
      {
        id: "stock.ledger",
        label: L("Supplier Ledger", "Supplier khata", "سپلائر کھاتہ"),
        href: "/suppliers-stock/ledger",
        available: true,
        access: THEKEDAR,
        keywords: ["udhaar", "khata", "balance"],
      },
      {
        id: "stock.orders",
        label: L("Purchase Orders", "Purchase orders", "پرچیز آرڈرز"),
        href: "/suppliers-stock/purchase-orders",
        available: true,
        access: OFFICE,
        keywords: ["po", "order"],
      },
      {
        id: "stock.payments",
        label: L("Supplier Payments", "Supplier adaigiyan", "سپلائر ادائیگیاں"),
        href: "/suppliers-stock/payments",
        available: true,
        access: THEKEDAR,
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
        keywords: ["mistri", "mazdoor", "labour"],
      },
      {
        id: "workforce.subcontractors",
        label: L("Sub-contractors", "Theke daar team", "ٹھیکیدار"),
        href: "/workforce/subcontractors",
        available: true,
        keywords: ["team", "trade"],
      },
    ],
  },
  {
    id: "equipment",
    label: L("Equipment", "Saaz-o-saman", "ساز و سامان"),
    icon: Forklift,
    mode: "company",
    access: OFFICE,
    items: [
      soon("equipment.map", L("Allocation Map", "Allocation map", "تقسیم کا نقشہ"), "/equipment/allocation"),
      soon("equipment.owned", L("Owned Equipment", "Apna saman", "اپنا سامان"), "/equipment/owned"),
      soon("equipment.rentals", L("Rentals", "Kiraye ka saman", "کرائے کا سامان"), "/equipment/rentals"),
      soon("equipment.movements", L("Movements", "Naql-o-harkat", "نقل و حرکت"), "/equipment/movements"),
      soon("equipment.loss", L("Loss & Damage", "Nuqsan", "نقصان"), "/equipment/loss-damage"),
      soon("equipment.shuttering", L("Shuttering Demand", "Shuttering ki talab", "شٹرنگ کی طلب"), "/equipment/shuttering"),
    ],
  },
  {
    id: "finance",
    label: L("Finance", "Hisaab", "حساب کتاب"),
    icon: Wallet,
    mode: "company",
    access: FINANCE,
    items: [
      {
        id: "finance.receivables",
        label: L("Receivables", "Wasooliyan", "وصولیاں"),
        href: "/finance/receivables",
        available: true,
        access: THEKEDAR,
        keywords: ["outstanding", "overdue", "wasooli"],
      },
      {
        id: "finance.cashflow",
        label: L("Cash Flow Outlook", "Cash flow", "کیش فلو"),
        href: "/finance/cash-flow",
        available: true,
        access: THEKEDAR,
        keywords: ["forecast", "outlook", "udhaar"],
      },
      {
        id: "finance.pl",
        label: L("Profit & Loss", "Nafa aur nuqsan", "نفع و نقصان"),
        href: "/finance/profit-loss",
        available: true,
        access: PROFIT_OFFICE,
        keywords: ["profit", "margin", "p&l"],
      },
      {
        id: "finance.floats",
        label: L("Cash Floats Overview", "Cash floats", "کیش فلوٹس کا جائزہ"),
        href: "/finance/cash-floats",
        available: true,
        access: THEKEDAR,
        keywords: ["site cash", "kharcha", "munshi"],
      },
    ],
  },
  {
    id: "reports",
    label: L("Reports", "Reports", "رپورٹس"),
    icon: ChartColumn,
    mode: "company",
    access: OFFICE,
    items: [
      {
        id: "reports.summary",
        label: L("Project Summary", "Project khulasa", "پراجیکٹ کا خلاصہ"),
        href: "/reports/project-summary",
        available: true,
        access: FINANCIALS,
      },
      {
        id: "reports.material",
        label: L("Material Audit", "Maal ka audit", "مال کا آڈٹ"),
        href: "/reports/material-audit",
        available: true,
      },
      {
        id: "reports.labor",
        label: L("Labor & Advances", "Mazdoori aur peshgi", "مزدوری اور پیشگی"),
        href: "/reports/labor-peshgi",
        available: true,
      },
      {
        id: "reports.cashbook",
        label: L("Cash Book", "Cash book", "کیش بک"),
        href: "/reports/cash-book",
        available: true,
      },
      {
        id: "reports.ageing",
        label: L("Supplier Ageing", "Supplier udhaar ki umar", "سپلائر ادھار کی مدت"),
        href: "/reports/supplier-ageing",
        available: true,
        access: THEKEDAR,
      },
      {
        id: "reports.receivables",
        label: L("Receivables Ageing", "Wasooli ki umar", "وصولیوں کی مدت"),
        href: "/reports/receivables-ageing",
        available: true,
        access: THEKEDAR,
      },
      {
        id: "reports.stock",
        label: L("Stock Valuation", "Stock ki qeemat", "اسٹاک کی قیمت"),
        href: "/reports/stock-valuation",
        available: true,
        access: THEKEDAR,
      },
      soon("reports.delay", L("Delay Analysis", "Takheer ka jaiza", "تاخیر کا جائزہ"), "/reports/delay-analysis"),
    ],
  },
  {
    id: "team",
    label: L("Team", "Team", "ٹیم"),
    icon: UsersRound,
    mode: "company",
    access: THEKEDAR,
    items: [
      {
        id: "team.members",
        label: L("Members", "Members", "ممبرز"),
        href: "/team/members",
        available: true,
        // PM may view the member list read-only (reachable from search).
        access: OFFICE,
        keywords: ["users", "staff", "pm", "munshi"],
      },
      {
        id: "team.invitations",
        label: L("Invitations", "Daawat naame", "دعوت نامے"),
        href: "/team/invitations",
        available: true,
        access: THEKEDAR,
        keywords: ["invite"],
      },
      {
        id: "team.devices",
        label: L("Devices", "Devices", "ڈیوائسز"),
        href: "/team/devices",
        available: true,
        access: THEKEDAR,
        keywords: ["phone", "logout"],
      },
    ],
  },
  {
    id: "settings",
    label: L("Settings", "Settings", "ترتیبات"),
    icon: Settings,
    mode: "company",
    access: THEKEDAR,
    items: [
      {
        id: "settings.company",
        label: L("Company Profile", "Company profile", "کمپنی پروفائل"),
        href: "/settings/company",
        available: true,
        access: THEKEDAR,
        keywords: ["logo", "ntn"],
      },
      {
        id: "settings.materials",
        label: L("Materials", "Materials", "میٹیریلز"),
        href: "/settings/materials",
        available: true,
        access: OFFICE,
        keywords: ["cement", "steel", "bricks"],
      },
      {
        id: "settings.priceList",
        label: L("Price List", "Rate list", "ریٹ لسٹ"),
        href: "/settings/price-list",
        available: true,
        access: { roles: ["THEKEDAR", "PM"], permission: "rates.view" },
        keywords: ["rates", "quality"],
      },
      {
        id: "settings.laborRates",
        label: L("Labor Rates", "Mazdoori rates", "مزدوری کے ریٹ"),
        href: "/settings/labor-rates",
        available: true,
        access: THEKEDAR,
        keywords: ["wages"],
      },
      soon("settings.rulebook", L("Rulebook", "Qawaid", "قواعد"), "/settings/rulebook", THEKEDAR),
      {
        id: "settings.paymentTemplates",
        label: L("Payment Templates", "Adaigi templates", "ادائیگی کے سانچے"),
        href: "/settings/payment-templates",
        available: true,
        access: THEKEDAR,
        keywords: ["stages", "billing"],
      },
      {
        id: "settings.holidays",
        label: L("Holidays", "Chhuttiyan", "چھٹیاں"),
        href: "/settings/holidays",
        available: true,
        access: THEKEDAR,
      },
      {
        id: "settings.alerts",
        label: L("Alerts & Limits", "Alerts aur hadein", "الرٹس اور حدود"),
        href: "/settings/alerts",
        available: true,
        access: THEKEDAR,
      },
      soon("settings.tax", L("Tax", "Tax", "ٹیکس"), "/settings/tax", THEKEDAR),
      {
        id: "settings.subscription",
        label: L("Subscription", "Subscription", "سبسکرپشن"),
        href: "/settings/subscription",
        available: true,
        access: THEKEDAR,
        keywords: ["plan", "payment", "renew"],
      },
    ],
  },
];

// ─── Project mode (hrefs relative to /projects/:id) ─────────────────────────

const BILLING = { permission: "billing.view" } as const satisfies AccessRule;
/** Money screens and cards: THEKEDAR, or a PM who may see financials (never a MUNSHI). */
export const BILLING_ACCESS = {
  roles: ["THEKEDAR", "PM"],
  permission: "billing.view",
} as const satisfies AccessRule;
const PROFIT = { permission: "profit.view" } as const satisfies AccessRule;

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
        ...soon("p.planning.estimate", L("Estimate (BoQ)", "Estimate (BoQ)", "تخمینہ (BoQ)"), "/planning/estimate"),
        comingSoonNote: "Estimate comes in Phase 2.",
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
      soon("p.schedule.gantt", L("Gantt", "Gantt", "گینٹ"), "/schedule/gantt"),
      soon("p.schedule.milestones", L("Milestones & Quotas", "Milestones", "سنگ میل اور کوٹے"), "/schedule/milestones"),
      soon("p.schedule.stoppages", L("Stoppage Days", "Kaam band din", "کام بند دن"), "/schedule/stoppages"),
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
        keywords: ["diary", "photos", "voice note", "site log"],
      },
      {
        id: "p.site.incoming",
        label: L("Incoming Material", "Aane wala maal", "آنے والا مال"),
        href: "/site/incoming",
        available: true,
        badge: "incoming",
        keywords: ["receive", "gate pass"],
      },
      {
        id: "p.site.deliveries",
        label: L("Deliveries", "Maal aaya", "مال آیا"),
        href: "/site/deliveries",
        available: true,
        keywords: ["owner delivery"],
      },
      {
        id: "p.site.usage",
        label: L("Material Usage", "Maal lag gaya", "مال لگ گیا"),
        href: "/site/usage",
        available: true,
      },
      { id: "p.site.stock", label: L("Site Stock", "Site stock", "سائٹ اسٹاک"), href: "/site/stock", available: true },
      {
        id: "p.site.counts",
        label: L("Stock Counts & Transfers", "Ginti aur transfer", "گنتی اور منتقلی"),
        href: "/site/counts",
        available: true,
      },
      soon("p.site.equipment", L("Equipment on Site", "Site par saman", "سائٹ پر سامان"), "/site/equipment"),
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
        keywords: ["assign", "workers", "sub-contract"],
      },
      {
        id: "p.labor.hazri",
        label: L("Attendance Register", "Hazri register", "حاضری رجسٹر"),
        href: "/labor/hazri",
        available: true,
        keywords: ["attendance", "present"],
      },
      {
        id: "p.labor.accounts",
        label: L("Sub-contractor Accounts", "Theke daar hisaab", "ٹھیکیداروں کا حساب"),
        href: "/labor/subcontractor-accounts",
        available: true,
        access: OFFICE,
        keywords: ["retention", "theka"],
      },
      {
        id: "p.labor.measurements",
        label: L("Work Measurements", "Kaam ki paimaish", "کام کی پیمائش"),
        href: "/labor/measurements",
        available: true,
        keywords: ["sqft", "measurement"],
      },
      {
        id: "p.labor.peshgi",
        label: L("Advances", "Peshgi", "پیشگی"),
        href: "/labor/peshgi",
        available: true,
        keywords: ["advance"],
      },
      {
        id: "p.labor.settlements",
        label: L("Weekly Settlements", "Hafta war hisaab", "ہفتہ وار حساب"),
        href: "/labor/settlements",
        available: true,
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
        keywords: ["expense", "petty cash"],
      },
      {
        id: "p.cash.floats",
        label: L("Cash Floats", "Cash floats", "کیش فلوٹس"),
        href: "/cash-book/floats",
        available: true,
        keywords: ["acknowledge", "easypaisa"],
      },
      {
        id: "p.cash.topups",
        label: L("Top-up Requests", "Top-up darkhwastein", "ٹاپ اپ درخواستیں"),
        href: "/cash-book/top-ups",
        available: true,
      },
      {
        id: "p.cash.counts",
        label: L("Cash Counts & Handover", "Cash ginti aur hawalgi", "کیش گنتی اور حوالگی"),
        href: "/cash-book/counts",
        available: true,
      },
    ],
  },
  {
    id: "p.changes",
    label: L("Change Orders", "Tabdeeli orders", "تبدیلی آرڈرز"),
    icon: FilePen,
    mode: "project",
    access: OFFICE,
    items: [
      soon("p.changes.all", L("All Change Orders", "Tamam tabdeeli orders", "تمام تبدیلی آرڈرز"), "/change-orders"),
      soon("p.changes.new", L("New Change Order", "Naya tabdeeli order", "نیا تبدیلی آرڈر"), "/change-orders/new"),
    ],
  },
  {
    id: "p.billing",
    label: L("Billing", "Billing", "بلنگ"),
    icon: Receipt,
    mode: "project",
    access: BILLING,
    items: [
      {
        id: "p.billing.schedule",
        label: L("Payment Schedule", "Adaigi schedule", "ادائیگی کا شیڈول"),
        href: "/billing/schedule",
        available: true,
        access: BILLING,
        keywords: ["stages", "mark ready", "running bill"],
      },
      {
        id: "p.billing.invoices",
        label: L("Invoices & Running Bills", "Invoices aur bills", "انوائسز اور بل"),
        href: "/billing/invoices",
        available: true,
        access: BILLING,
        keywords: ["invoice", "bill"],
      },
      {
        id: "p.billing.received",
        label: L("Payments Received", "Wasool adaigiyan", "وصول شدہ ادائیگیاں"),
        href: "/billing/payments",
        available: true,
        access: BILLING,
        keywords: ["cheque", "receipt"],
      },
      {
        id: "p.billing.statement",
        label: L("Owner Statement", "Maalik ka statement", "مالک کا اسٹیٹمنٹ"),
        href: "/billing/statement",
        available: true,
        access: BILLING,
        keywords: ["statement", "hisaab"],
      },
    ],
  },
  {
    id: "p.control",
    label: L("Control", "Control", "کنٹرول"),
    icon: Gauge,
    mode: "project",
    access: PROFIT,
    items: [
      soon(
        "p.control.material",
        L("Material Variance", "Maal ka farq", "مال کا فرق"),
        "/control/material-variance",
        PROFIT,
      ),
      soon("p.control.cost", L("Cost Variance", "Lagat ka farq", "لاگت کا فرق"), "/control/cost-variance", PROFIT),
      soon("p.control.burn", L("Burn Rate vs Progress", "Kharch vs taraqqi", "خرچ بمقابلہ پیش رفت"), "/control/burn-rate", PROFIT),
      soon("p.control.delay", L("Delay Analysis", "Takheer ka jaiza", "تاخیر کا جائزہ"), "/control/delay", PROFIT),
    ],
  },
  {
    id: "p.documents",
    label: L("Documents & Closeout", "Kaghzaat aur ikhtitaam", "کاغذات اور اختتام"),
    icon: FolderArchive,
    mode: "project",
    items: [
      soon("p.docs.drawings", L("Drawings", "Naqshe", "نقشے"), "/documents/drawings"),
      soon("p.docs.snags", L("Snag List", "Kamiyon ki list", "خامیوں کی فہرست"), "/documents/snags"),
      soon("p.docs.handover", L("Handover", "Hawalgi", "حوالگی"), "/documents/handover"),
      soon("p.docs.retention", L("Retention", "Retention", "روکی گئی رقم"), "/documents/retention", BILLING),
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
  { id: "admin.plans", label: L("Plans", "Plans", "پلانز"), href: "/admin/plans", available: true, icon: Layers },
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
    access: { permission: "projects.manage" },
    available: true,
  },
  {
    id: "create.client",
    label: L("New client", "Naya client", "نیا کلائنٹ"),
    href: "/sales/clients?new=1",
    access: OFFICE,
    available: true,
  },
  {
    id: "create.invite",
    label: L("Invite member", "Member bulayein", "ممبر کو مدعو کریں"),
    href: "/team/invitations?new=1",
    access: THEKEDAR,
    available: true,
  },
  {
    id: "create.supplier",
    label: L("New supplier", "Naya supplier", "نیا سپلائر"),
    href: "/suppliers-stock/suppliers?new=1",
    access: OFFICE,
    available: true,
  },
  {
    id: "create.worker",
    label: L("New worker", "Naya mazdoor", "نیا مزدور"),
    href: "/workforce/workers?new=1",
    access: OFFICE,
    available: true,
  },
  {
    id: "create.quote",
    label: L("New quote", "Naya quote", "نیا کوٹیشن"),
    href: "/sales/quotes/new",
    access: OFFICE,
    available: false,
  },
  {
    id: "create.purchase",
    label: L("New purchase", "Nayi kharidari", "نئی خریداری"),
    href: "/suppliers-stock/purchases/new",
    access: OFFICE,
    available: true,
  },
  {
    id: "create.dispatch",
    label: L("Dispatch to site", "Site bhejein", "سائٹ پر بھیجیں"),
    href: "/suppliers-stock/dispatches",
    access: THEKEDAR,
    available: true,
  },
];

/** Sticky footer: only quick actions that work today. */
export const FOOTER_ACTIONS = CREATE_ACTIONS.filter(
  (a) => a.id === "create.project" || a.id === "create.invite",
);
