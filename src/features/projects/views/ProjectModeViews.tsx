"use client";

import { DemoBadge, DemoProjectBanner } from "@/features/onboarding/components/DemoBadge";
import { Calculator, Pencil, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useChangeProjectStatusMutation, useDeleteProjectMutation, useGetFloorsQuery, useGetProjectQuery } from "@/api/services/projects.api";
import type { ProjectDetail } from "@/api/types";
import { ComingSoonCard } from "@/components/common/ComingSoonCard";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { InlineAlert } from "@/components/common/InlineAlert";
import { useCan, usePermissions } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { ReadOnlyBanner } from "@/components/common/ReadOnlyBanner";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { BILLING_ACCESS, projectHref } from "@/lib/navigation";
import { useEnumT, useStatusT, useT } from "@/i18n/useT";
import {
  ClientCard,
  ContractCard,
  CoverageCard,
  PlotCard,
  RoomsSummaryCard,
  StructureCard,
  SupplyRulesCard,
  TeamCard,
} from "../components/ProjectSections";
import { ProjectMoneyCard } from "@/features/billing/components/ProjectMoneyCard";
import { LOCKED_STATUSES, STATUS_TRANSITIONS, type StatusTransition } from "../constants";
import { formatArea } from "../utils/calc";
import { wizardHref } from "../utils/links";

/** Loads the project and tells pages what the user may do with it. */
function useProjectPage(projectId: string) {
  const query = useGetProjectQuery(projectId);
  const readOnly = useReadOnly();
  const canManage = useCan("projects.project.edit");
  const status = query.data?.status;
  const locked = readOnly || (status ? LOCKED_STATUSES.includes(status) : false);
  return { query, canEdit: canManage && !locked, locked, readOnly };
}

function LockedNotice({ project, readOnly }: { project: ProjectDetail; readOnly: boolean }) {
  const t = useT();
  const ts = useStatusT();
  if (!LOCKED_STATUSES.includes(project.status)) return null;
  if (readOnly && project.status !== "READ_ONLY") return null;
  return <ReadOnlyBanner message={t("projects.mode.lockedNotice", { status: ts("project", project.status) })} />;
}

export function ProjectPageShell({
  projectId,
  title,
  crumb,
  actions,
  children,
}: {
  projectId: string;
  title?: string;
  crumb?: string;
  actions?: (project: ProjectDetail) => ReactNode;
  children: (project: ProjectDetail, flags: { canEdit: boolean; readOnly: boolean }) => ReactNode;
}) {
  const t = useT();
  const { query, canEdit, readOnly } = useProjectPage(projectId);
  return (
    <QueryState query={query} skeleton={<CardsSkeleton count={4} height="h-40" />}>
      {(project) => (
        <>
          <PageHeader
            title={title ?? project.name}
            meta={
              <span className="inline-flex flex-wrap items-center gap-2">
                <StatusBadge domain="project" value={project.status} />
                <DemoBadge isDemo={project.isDemo} />
              </span>
            }
            description={`${project.code}${project.client ? ` · ${project.client.name}` : ""}`}
            breadcrumbs={[
              { label: t("crumb.projects"), href: "/projects" },
              { label: project.name, href: projectHref(project.id, "/overview") },
              ...(crumb ? [{ label: crumb }] : []),
            ]}
            actions={actions?.(project)}
          />
          <LockedNotice project={project} readOnly={readOnly} />
          <DemoProjectBanner isDemo={project.isDemo} />
          {children(project, { canEdit, readOnly })}
        </>
      )}
    </QueryState>
  );
}

function StatusActions({ project }: { project: ProjectDetail }) {
  const t = useT();
  const ts = useStatusT();
  const router = useRouter();
  const isOwner = useCan("projects.project.manage");
  const readOnly = useReadOnly();
  const [changeStatus, { isLoading }] = useChangeProjectStatusMutation();
  const [remove, { isLoading: deleting }] = useDeleteProjectMutation();
  const [target, setTarget] = useState<StatusTransition | null>(null);
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const run = useMutationToast();
  if (!isOwner || readOnly) return null;
  const transitions = STATUS_TRANSITIONS[project.status] ?? [];
  const targetLabel = target ? t(target.labelKey) : t("projects.mode.changeStatus");

  return (
    <>
      {project.status === "DRAFT" ? (
        <Button variant="destructive-soft" onClick={() => setConfirmDelete(true)}>
          <Trash2 data-icon="inline-start" />
          {t("action.deleteDraft")}
        </Button>
      ) : null}
      {transitions.map((tr) => (
        <Button key={tr.to} variant={tr.tone === "danger" ? "destructive-soft" : "outline"} onClick={() => setTarget(tr)}>
          {t(tr.labelKey)}
        </Button>
      ))}
      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(o) => {
          if (!o) {
            setTarget(null);
            setNote("");
          }
        }}
        tone={target?.tone === "danger" ? "danger" : "default"}
        title={t("projects.mode.confirmTitle", { action: targetLabel })}
        description={
          target?.to === "ACTIVE"
            ? t("projects.mode.reopenDesc")
            : target?.to === "CLOSED"
              ? t("projects.mode.closeDesc")
              : t("projects.mode.moveDesc", { status: target ? ts("project", target.to) : "" })
        }
        confirmLabel={target ? targetLabel : t("common.confirm")}
        loading={isLoading}
        onConfirm={async () => {
          if (!target) return;
          const ok = await run(() => changeStatus({ id: project.id, body: { status: target.to as "ACTIVE" | "CLOSEOUT" | "HANDED_OVER" | "CLOSED", ...(note ? { note } : {}) } }).unwrap(), {
            success: t("projects.mode.statusChanged", { status: ts("project", target.to) }),
          });
          if (ok) {
            setTarget(null);
            setNote("");
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="status-note">{t("field.noteOptional")}</Label>
          <Textarea id="status-note" rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("projects.mode.deleteDraftTitle", { name: project.name })}
        description={t("projects.mode.deleteDraftDesc")}
        confirmLabel={t("action.deleteDraft")}
        loading={deleting}
        onConfirm={async () => {
          const ok = await run(() => remove(project.id).unwrap(), { success: t("projects.mode.draftDeleted") });
          if (ok) router.push("/projects");
        }}
      />
    </>
  );
}

export function ProjectOverviewView({ projectId }: { projectId: string }) {
  const t = useT();
  const { can, canAccess } = usePermissions();
  const canManage = can("projects.project.edit");
  // Site staff (no project edit, no office dashboard) get the short summary: client + team.
  const isMunshi = !canManage && !can("dashboard.overview.view");
  const canEditTeam = can("projects.team.manage");
  const seesBilling = canAccess(BILLING_ACCESS);
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("projects.mode.crumbSummary")}
      actions={(project) => (
        <>
          <StatusActions project={project} />
          {canManage && project.status === "DRAFT" ? (
            <Button asChild>
              <Link href={wizardHref(project.id)}>
                <Play data-icon="inline-start" />
                {t("projects.mode.continueSetup")}
              </Link>
            </Button>
          ) : canManage && !LOCKED_STATUSES.includes(project.status) ? (
            <Button asChild variant="outline">
              <Link href={wizardHref(project.id)}>
                <Pencil data-icon="inline-start" />
                {t("projects.mode.editSetup")}
              </Link>
            </Button>
          ) : null}
        </>
      )}
    >
      {(project, { canEdit }) =>
        isMunshi ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <ClientCard project={project} />
            <TeamCard project={project} />
          </div>
        ) : (
          <>
            {project.status === "DRAFT" ? (
              <InlineAlert tone="info" title={t("projects.mode.draftTitle")}>
                {t("projects.mode.draftBody")}
              </InlineAlert>
            ) : null}
            {seesBilling && project.status !== "DRAFT" ? <ProjectMoneyCard projectId={project.id} /> : null}
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <ClientCard project={project} canEdit={canEdit} />
              <ContractCard project={project} canEdit={canEdit} />
              <TeamCard project={project} canEdit={canEdit && canEditTeam} />
              <PlotCard project={project} canEdit={canEdit} />
              <StructureCard project={project} canEdit={canEdit} />
              <CoverageCard project={project} canEdit={canEdit} />
            </div>
            <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
              <RoomsSummaryCard project={project} canEdit={canEdit} />
              <ComingSoonCard title={t("projects.mode.boqTitle")} icon={Calculator} description={t("projects.mode.boqDesc")} />
            </div>
          </>
        )
      }
    </ProjectPageShell>
  );
}

export function SiteSetupView({ projectId }: { projectId: string }) {
  const t = useT();
  return (
    <ProjectPageShell projectId={projectId} crumb={t("projects.mode.crumbSiteSetup")}>
      {(project, { canEdit }) => (
        <div className="grid gap-4 lg:grid-cols-2">
          <ClientCard project={project} canEdit={canEdit} />
          <PlotCard project={project} canEdit={canEdit} />
          <StructureCard project={project} canEdit={canEdit} />
          <CoverageCard project={project} canEdit={canEdit} />
        </div>
      )}
    </ProjectPageShell>
  );
}

export function SupplySplitView({ projectId }: { projectId: string }) {
  const t = useT();
  return (
    <ProjectPageShell projectId={projectId} crumb={t("projects.mode.crumbSupplySplit")}>
      {(project, { canEdit }) => <SupplyRulesCard project={project} canEdit={canEdit} />}
    </ProjectPageShell>
  );
}

function FloorsDetail({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const t = useT();
  const te = useEnumT();
  const { data, isLoading } = useGetFloorsQuery(projectId);
  if (isLoading) return <CardsSkeleton count={2} height="h-48" />;
  const sqft = (v: number) => t("projects.unit.sqftValue", { n: formatArea(v) });
  return (
    <div className="space-y-4">
      {(data?.floors ?? []).map((floor) => (
        <SectionCard
          key={floor.id}
          title={te("projectFloorLevel", floor.level, floor.name)}
          description={t("projects.mode.floorDesc", {
            rooms: floor.calculations.rooms,
            area: formatArea(floor.calculations.totalFloorAreaSqft),
            height: floor.ceilingHeightFt,
          })}
          flush
          actions={
            canEdit ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={wizardHref(projectId, 5)}>
                  <Pencil data-icon="inline-start" />
                  {t("projects.mode.editRooms")}
                </Link>
              </Button>
            ) : null
          }
        >
          <DataTable
            rows={floor.rooms}
            getRowId={(r) => r.id}
            clientPageSize={0}
            empty={{ title: t("projects.mode.noRoomsOnFloor") }}
            columns={[
              {
                id: "room",
                header: t("projects.mode.room"),
                cell: (r) => (
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{te("projectRoomType", r.type)}</p>
                  </div>
                ),
              },
              {
                id: "size",
                header: t("projects.mode.size"),
                cell: (r) => <bdi>{t("projects.mode.sizeValue", { l: r.lengthFt, w: r.widthFt, h: r.heightFt })}</bdi>,
              },
              {
                id: "openings",
                header: t("projects.mode.openings"),
                cell: (r) =>
                  r.openings.length
                    ? r.openings
                        .map((o) => t("projects.mode.openingValue", { qty: o.quantity, type: te("projectOpeningType", o.type), w: o.widthFt, h: o.heightFt }))
                        .join(", ")
                    : "—",
              },
              {
                id: "wet",
                header: t("projects.mode.wet"),
                cell: (r) => (r.isWet ? <StatusBadge tone="info" label={t("projects.mode.wet")} /> : t("projects.mode.dry")),
              },
              { id: "floor", header: t("projects.mode.floorArea"), align: "right", cell: (r) => sqft(r.calculations.floorAreaSqft) },
              { id: "net", header: t("projects.mode.netWall"), align: "right", cell: (r) => sqft(r.calculations.netWallAreaSqft) },
            ]}
          />
        </SectionCard>
      ))}
    </div>
  );
}

export function FloorsRoomsView({ projectId }: { projectId: string }) {
  const t = useT();
  return (
    <ProjectPageShell projectId={projectId} crumb={t("projects.mode.crumbFloorsRooms")}>
      {(project, { canEdit }) => (
        <>
          <RoomsSummaryCard project={project} title={t("projects.mode.totals")} />
          <FloorsDetail projectId={project.id} canEdit={canEdit} />
        </>
      )}
    </ProjectPageShell>
  );
}
