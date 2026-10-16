"use client";

import { MessageCircle, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useGetOwnerShoppingListPdfMutation, useGetOwnerShoppingListQuery } from "@/api/services/estimates.api";
import type { BuildStageKey, OwnerShoppingItem, OwnerShoppingList, ProjectDetail } from "@/api/types";
import { BUILD_STAGES } from "@/api/types";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PdfActions, whatsappUrl } from "@/components/common/PdfActions";
import { RequireAccess } from "@/components/common/RequireAccess";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useLanguage, useT } from "@/i18n/useT";
import { projectHref } from "@/lib/navigation";
import type { StatusTone } from "@/lib/status";
import { boqUnit, fmt, fmtUp, pdfLang, stageText } from "./labels";

type T = ReturnType<typeof useT>;

/** Project → Planning → Owner Shopping List: owner-supplied materials by the stage that needs them. */
export function ShoppingListView({ projectId }: { projectId: string }) {
  const t = useT();
  return (
    <RequireAccess permission="projects.estimate.view">
      <ProjectPageShell projectId={projectId} crumb={t("estimates.shopping.crumb")}>
        {(project) => <ShoppingListBody project={project} />}
      </ProjectPageShell>
    </RequireAccess>
  );
}

const SOURCE_TONE: Record<OwnerShoppingList["source"], StatusTone> = { APPROVED: "success", DRAFT: "warning", ESTIMATE: "info", PREVIEW: "neutral" };

/** Items grouped by the stage that needs them first, in build order. */
export function groupByStage(items: OwnerShoppingItem[]): Array<{ stage: BuildStageKey; items: OwnerShoppingItem[] }> {
  return BUILD_STAGES.map((stage) => ({ stage, items: items.filter((i) => i.neededBy === stage) })).filter((g) => g.items.length);
}

/** The list as a WhatsApp message in the UI language (quantities rounded up for buying). */
export function shoppingText(t: T, projectName: string, items: OwnerShoppingItem[]): string {
  return [
    t("estimates.shopping.whatsappIntro", { project: projectName }),
    ...items.map((i) => t("estimates.shopping.whatsappLine", { item: i.description, qty: fmtUp(i.quantity), unit: boqUnit(t, i.unit), stage: stageText(t, i.neededBy) })),
  ].join("\n");
}

export function ShoppingListBody({ project }: { project: ProjectDetail }) {
  const t = useT();
  const language = useLanguage();
  const q = useGetOwnerShoppingListQuery({ projectId: project.id });
  const [getPdf] = useGetOwnerShoppingListPdfMutation();
  if (q.isLoading) return <CardsSkeleton count={2} height="h-40" />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const list = q.data;
  const phone = project.client?.phone ?? null;
  const groups = groupByStage(list.items);
  return (
    <div className="space-y-6">
      <SectionCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="max-w-2xl text-sm text-muted-foreground">{t("estimates.shopping.desc")}</p>
            <div className="flex flex-wrap items-center gap-2" data-testid="shopping-source">
              <StatusBadge tone={SOURCE_TONE[list.source]} label={t(`estimates.shopping.source.${list.source}`, { n: list.revision ?? "—" })} />
              <span className="text-sm text-muted-foreground">{t("estimates.shopping.items", { n: list.items.length })}</span>
            </div>
          </div>
          {list.items.length ? (
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button variant="success" size="sm" asChild>
                <a href={whatsappUrl(phone, shoppingText(t, project.name, list.items))} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden />
                  {t("estimates.shopping.shareText")}
                </a>
              </Button>
              <PdfActions
                load={() => getPdf({ projectId: project.id, lang: pdfLang(language), ...(list.estimateId ? { estimateId: list.estimateId } : {}) }).unwrap()}
                title={t("estimates.shopping.pdfTitle")}
                phone={phone}
              />
            </div>
          ) : null}
        </div>
      </SectionCard>
      {!groups.length ? (
        <SectionCard>
          <EmptyState
            icon={ShoppingCart}
            title={t("estimates.shopping.empty")}
            description={t("estimates.shopping.emptyBody")}
            action={
              <Button asChild variant="outline">
                <Link href={projectHref(project.id, "/planning/supply-split")}>{t("estimates.shopping.openSupplySplit")}</Link>
              </Button>
            }
          />
        </SectionCard>
      ) : (
        groups.map((g) => (
          <SectionCard key={g.stage} title={t("estimates.shopping.neededBy", { stage: stageText(t, g.stage) })} flush>
            <div data-stage={g.stage}>
              <DataTable
                rows={g.items}
                getRowId={(i) => `${i.material}.${i.materialId ?? ""}`}
                clientPageSize={0}
                empty={{ title: t("estimates.shopping.empty") }}
                columns={[
                  { id: "item", header: t("estimates.shopping.col.item"), cell: (i) => <span className="font-medium">{i.description}</span> },
                  { id: "buy", header: t("estimates.shopping.col.buy"), align: "right", cell: (i) => <span className="tabular font-semibold">{fmtUp(i.quantity)}</span> },
                  { id: "exact", header: t("estimates.shopping.col.exact"), align: "right", cell: (i) => <span className="tabular text-muted-foreground">{fmt(i.quantity)}</span> },
                  { id: "unit", header: t("estimates.shopping.col.unit"), cell: (i) => boqUnit(t, i.unit) },
                  {
                    id: "stages",
                    header: t("estimates.shopping.col.stages"),
                    cell: (i) => (
                      <span className="text-sm text-muted-foreground tabular">
                        {i.stages.map((s) => t("estimates.shopping.stageQty", { stage: stageText(t, s.stageKey), qty: fmt(s.quantity) })).join(" · ")}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          </SectionCard>
        ))
      )}
    </div>
  );
}
