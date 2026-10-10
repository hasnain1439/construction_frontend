"use client";

import {
  ArrowLeft,
  Boxes,
  Building2,
  CircleCheck,
  Ellipsis,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useGetAdminHealthQuery, useGetAdminOverviewQuery } from "@/api/services/admin/overview.api";
import { useCompanyData } from "@/features/admin/companyData/useCompanyData";
import { useT, type Label } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { DATA_BASE } from "@/lib/companyRoutes";
import { ADMIN_NAV, type AdminNavItem, type NavItem, type NavSection } from "@/lib/navigation";
import { Flyout } from "./Flyout";
import { IconRail, RailLogoutButton } from "./IconRail";
import { flyoutClass } from "./navDrawer";

const CATALOG_IDS = ["admin.materials", "admin.holidays"];

const ALL_PROJECTS: NavSection = {
  id: "data.allProjects",
  label: { en: "All projects", ur: "Tamam projects", urdu: "تمام پراجیکٹس" },
  icon: ArrowLeft,
  mode: "company",
  items: [
    {
      id: "data.allProjects.item",
      label: { en: "All projects", ur: "Tamam projects", urdu: "تمام پراجیکٹس" },
      href: "/projects",
      available: true,
    },
  ],
};

/**
 * The platform's own pages, grouped like the company app's sections: a group of one opens
 * its page; a larger group opens a flyout.
 */
const PLATFORM_GROUPS: Array<{ id: string; itemIds: string[]; label?: Label; icon?: LucideIcon }> = [
  { id: "admin.g.overview", itemIds: ["admin.overview"] },
  {
    id: "admin.g.companies",
    itemIds: ["admin.companies", "admin.payments", "admin.plans"],
    label: { en: "Companies", ur: "Companies", urdu: "کمپنیاں" },
    icon: Building2,
  },
  { id: "admin.g.audit", itemIds: ["admin.audit"] },
  {
    id: "admin.g.more",
    itemIds: ["admin.rulebook", "admin.communication", "admin.security"],
    label: { en: "More", ur: "Mazeed", urdu: "مزید" },
    icon: Ellipsis,
  },
];

/** Health in one rail item (full card on Overview). */
function RailHealth({ collapsed }: { collapsed?: boolean }) {
  const t = useT();
  const { data, isError } = useGetAdminHealthQuery(undefined, { pollingInterval: 60_000 });
  const ok = !isError && data?.api.ok && data.database.ok;
  const label = data ? (ok ? t("shell.systemsOk") : t("shell.checkSystems")) : t("shell.checking");
  return (
    <Link
      href="/admin/overview"
      title={label}
      aria-label={collapsed ? label : undefined}
      className={cn(
        "flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-center transition-colors hover:bg-sidebar-accent/50",
        ok ? "text-success" : "text-warning",
      )}
    >
      {ok ? (
        <CircleCheck className="size-6" strokeWidth={1.6} aria-hidden />
      ) : (
        <TriangleAlert className="size-6" strokeWidth={1.6} aria-hidden />
      )}
      {collapsed ? null : <span className="text-[11px] leading-tight font-medium">{label}</span>}
    </Link>
  );
}

/**
 * Super admin rail — the same layout as the company dashboard: icons with labels, and a
 * flyout with a section's pages. One list: the platform's pages and the company app's
 * sections (inside a project: the project's sections) together. Each company screen asks
 * which company (tenant) to show.
 */
export function AdminRail({ collapsed, mobileOpen = false, onLogout }: { collapsed?: boolean; mobileOpen?: boolean; onLogout: () => void }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const d = useCompanyData();
  const { data: overview } = useGetAdminOverviewQuery(undefined, { pollingInterval: 120_000 });
  // The flyout belongs to the page it was opened on: navigating closes it.
  const [flyout, setFlyout] = useState<{ id: string; path: string } | null>(null);
  const openId = flyout?.path === pathname ? flyout.id : null;

  const pending = overview?.paymentsAwaitingReview ?? 0;
  const platform: NavSection[] = PLATFORM_GROUPS.map((group) => {
    const items = group.itemIds
      .map((id) => ADMIN_NAV.find((i) => i.id === id))
      .filter((i): i is AdminNavItem => Boolean(i));
    const first = items[0]!;
    // A group of one is the page itself (icon + label of that page).
    const label = group.label ?? first.label;
    const withCount =
      group.itemIds.includes("admin.payments") && pending
        ? { en: `${label.en} (${pending})`, ur: `${label.ur} (${pending})`, ...(label.urdu ? { urdu: `${label.urdu} (${pending})` } : {}) }
        : label;
    return { id: group.id, label: withCount, icon: group.icon ?? first.icon, mode: "admin", items };
  });
  // The platform catalog (materials and holidays for every company) joins the company Settings.
  const catalog: NavItem[] = CATALOG_IDS.map((id) => ADMIN_NAV.find((i) => i.id === id))
    .filter((i): i is AdminNavItem => Boolean(i))
    .map((i) => ({ ...i, label: { en: `${i.label.en} (Platform)`, ur: `${i.label.ur} (Platform)`, ...(i.label.urdu ? { urdu: `${i.label.urdu} (پلیٹ فارم)` } : {}) } }));
  const company: NavSection[] = d.projectId
    ? [
        ALL_PROJECTS,
        ...d.sections,
        {
          id: "admin.g.catalog",
          label: { en: "Catalog", ur: "Catalog", urdu: "کیٹلاگ" },
          icon: Boxes,
          mode: "admin",
          items: catalog,
        },
      ]
    : d.sections.map((section) =>
        section.id === "settings" ? { ...section, items: [...section.items, ...catalog] } : section,
      );
  // One list: Overview + Companies, then the company's sections, then Audit Logs + More.
  const [overviewSection, companiesSection, ...lastPlatform] = platform;
  const sections: NavSection[] = [overviewSection!, companiesSection!, ...company, ...lastPlatform];

  /** Platform pages keep their own address; company screens open under /admin/data. */
  const hrefFor = (section: NavSection, item: NavItem) => {
    if (item.id.startsWith("admin.")) return item.href;
    if (section.id === ALL_PROJECTS.id) return `${DATA_BASE}/projects`;
    return d.hrefOf(item.href);
  };
  const onPlatformPage = (s: NavSection) =>
    s.items.some(
      (i) => i.id.startsWith("admin.") && (pathname === i.href || pathname.startsWith(`${i.href}/`)),
    );
  const activeSectionId =
    sections.find(onPlatformPage)?.id ?? (d.inData ? (d.activeSectionId ?? undefined) : undefined);

  const onSelect = (section: NavSection) => {
    if (section.items.length === 1) {
      router.push(hrefFor(section, section.items[0]!));
      return;
    }
    setFlyout((f) =>
      f?.id === section.id && f.path === pathname ? null : { id: section.id, path: pathname },
    );
  };
  const open = sections.find((s) => s.id === openId) ?? null;

  return (
    <>
      <IconRail
        label={t("shell.platformNav")}
        sections={sections}
        activeSectionId={activeSectionId}
        openSectionId={openId}
        onSelect={onSelect}
        footer={
          <>
            <RailHealth />
            <RailLogoutButton label={t("shell.logout")} onClick={onLogout} />
          </>
        }
      />
      <Flyout
        section={collapsed ? null : open}
        items={open?.items ?? []}
        hrefFor={(item) => (open ? hrefFor(open, item) : item.href)}
        onClose={() => setFlyout(null)}
        badgeFor={(item) => (item.id === "admin.payments" && pending ? pending : undefined)}
        className={flyoutClass(mobileOpen)}
      />
    </>
  );
}
