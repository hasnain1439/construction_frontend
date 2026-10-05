"use client";

import { ArrowLeft, Construction } from "lucide-react";
import { notFound, useParams, usePathname, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { pickLabel, useLanguage, useT } from "@/i18n/useT";
import { findNavItem } from "@/lib/navigation";
import { EmptyState } from "./EmptyState";
import { SectionCard } from "./SectionCard";

/**
 * "Coming in the next phase" page for menu items whose backend doesn't exist yet.
 * Title and breadcrumb come from the navigation config for the current path.
 */
export function ComingSoon({ title, note }: { title?: string; note?: string }) {
  const t = useT();
  const language = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ projectId?: string }>();
  const match = findNavItem(pathname, params.projectId);

  const heading = title ?? (match ? pickLabel(match.item.label, language) : t("common.comingSoon"));
  const sectionLabel = match && match.section !== match.item ? pickLabel(match.section.label, language) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={heading}
        breadcrumbs={[...(sectionLabel ? [{ label: sectionLabel }] : []), { label: heading }]}
      />
      <SectionCard>
        <EmptyState
          icon={Construction}
          title={t("common.comingSoon")}
          description={note ?? match?.item.comingSoonNote ?? t("common.comingSoonBody")}
          action={
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft data-icon="inline-start" />
              {t("common.goBack")}
            </Button>
          }
        />
      </SectionCard>
    </div>
  );
}

/**
 * Catch-all route body: shows ComingSoon for menu items that exist in the navigation
 * config, and a real 404 for anything else.
 */
export function ComingSoonRoute() {
  const pathname = usePathname();
  const params = useParams<{ projectId?: string }>();
  const match = findNavItem(pathname, params.projectId);
  if (!match || match.item.available) notFound();
  return <ComingSoon />;
}
