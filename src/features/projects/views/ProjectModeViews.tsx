"use client";

import { Calculator, Pencil, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useChangeProjectStatusMutation, useDeleteProjectMutation, useGetFloorsQuery, useGetProjectQuery } from "@/api/services/projects.api";
import type { ProjectDetail, ProjectStatus } from "@/api/types";
import { ComingSoonCard } from "@/components/common/ComingSoonCard";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { InlineAlert } from "@/components/common/InlineAlert";
import { useCan } from "@/components/common/PermissionGate";
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
import { projectHref } from "@/lib/navigation";
import { statusMeta } from "@/lib/status";
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
import { LOCKED_STATUSES, OPENING_LABEL, ROOM_TYPE_LABEL, STATUS_TRANSITIONS } from "../constants";
import { formatArea } from "../utils/calc";
import { wizardHref } from "../utils/links";

/** Loads the project and tells pages what the user may do with it. */
function useProjectPage(projectId: string) {
  const query = useGetProjectQuery(projectId);
  const readOnly = useReadOnly();
  const canManage = useCan({ permission: "projects.manage" });
  const status = query.data?.status;
  const locked = readOnly || (status ? LOCKED_STATUSES.includes(status) : false);
  return { query, canEdit: canManage && !locked, locked, readOnly };
}

function LockedNotice({ project, readOnly }: { project: ProjectDetail; readOnly: boolean }) {
  if (!LOCKED_STATUSES.includes(project.status)) return null;
  if (readOnly && project.status !== "READ_ONLY") return null;
  return <ReadOnlyBanner message={`This project is ${statusMeta("project", project.status).label.toLowerCase()} — its records are read-only.`} />;
}

function ProjectPageShell({
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
  const { query, canEdit, readOnly } = useProjectPage(projectId);
  return (
    <QueryState query={query} skeleton={<CardsSkeleton count={4} height="h-40" />}>
      {(project) => (
        <>
          <PageHeader
            title={title ?? project.name}
            meta={<StatusBadge domain="project" value={project.status} />}
            description={`${project.code}${project.client ? ` · ${project.client.name}` : ""}`}
            breadcrumbs={[
              { label: "Projects", href: "/projects" },
              { label: project.name, href: projectHref(project.id, "/overview") },
              ...(crumb ? [{ label: crumb }] : []),
            ]}
            actions={actions?.(project)}
          />
          <LockedNotice project={project} readOnly={readOnly} />
          {children(project, { canEdit, readOnly })}
        </>
      )}
    </QueryState>
  );
}

function StatusActions({ project }: { project: ProjectDetail }) {
  const router = useRouter();
  const isOwner = useCan({ roles: ["THEKEDAR"] });
  const readOnly = useReadOnly();
  const [changeStatus, { isLoading }] = useChangeProjectStatusMutation();
  const [remove, { isLoading: deleting }] = useDeleteProjectMutation();
  const [target, setTarget] = useState<{ to: ProjectStatus; label: string; tone: "default" | "danger" } | null>(null);
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const run = useMutationToast();
  if (!isOwner || readOnly) return null;
  const transitions = STATUS_TRANSITIONS[project.status] ?? [];

  return (
    <>
      {project.status === "DRAFT" ? (
        <Button variant="destructive-soft" onClick={() => setConfirmDelete(true)}>
          <Trash2 data-icon="inline-start" />
          Delete draft
        </Button>
      ) : null}
      {transitions.map((t) => (
        <Button key={t.to} variant={t.tone === "danger" ? "destructive-soft" : "outline"} onClick={() => setTarget(t)}>
          {t.label}
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
        title={`${target?.label ?? "Change status"}?`}
        description={
          target?.to === "ACTIVE"
            ? "Reopening counts against your plan's active projects again."
            : target?.to === "CLOSED"
              ? "A closed project stays read-only for your records."
              : `The project moves to “${target ? statusMeta("project", target.to).label : ""}”.`
        }
        confirmLabel={target?.label ?? "Confirm"}
        loading={isLoading}
        onConfirm={async () => {
          if (!target) return;
          const ok = await run(() => changeStatus({ id: project.id, body: { status: target.to as "ACTIVE" | "CLOSEOUT" | "HANDED_OVER" | "CLOSED", ...(note ? { note } : {}) } }).unwrap(), {
            success: `Project is now ${statusMeta("project", target.to).label.toLowerCase()}`,
          });
          if (ok) {
            setTarget(null);
            setNote("");
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="status-note">Note (optional)</Label>
          <Textarea id="status-note" rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete draft ${project.name}?`}
        description="Drafts don't count against your plan. This can't be undone."
        confirmLabel="Delete draft"
        loading={deleting}
        onConfirm={async () => {
          const ok = await run(() => remove(project.id).unwrap(), { success: "Draft deleted" });
          if (ok) router.push("/projects");
        }}
      />
    </>
  );
}

export function ProjectOverviewView({ projectId }: { projectId: string }) {
  const canManage = useCan({ permission: "projects.manage" });
  const isMunshi = useCan({ roles: ["MUNSHI"] });
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb="Project Summary"
      actions={(project) => (
        <>
          <StatusActions project={project} />
          {canManage && project.status === "DRAFT" ? (
            <Button asChild>
              <Link href={wizardHref(project.id)}>
                <Play data-icon="inline-start" />
                Continue setup
              </Link>
            </Button>
          ) : canManage && !LOCKED_STATUSES.includes(project.status) ? (
            <Button asChild variant="outline">
              <Link href={wizardHref(project.id)}>
                <Pencil data-icon="inline-start" />
                Edit setup
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
              <InlineAlert tone="info" title="This project is a draft">
                Finish the 6 setup steps and activate it to start site work. Drafts don&apos;t count against your plan.
              </InlineAlert>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <ClientCard project={project} canEdit={canEdit} />
              <ContractCard project={project} canEdit={canEdit} />
              <TeamCard project={project} canEdit={canEdit && !isMunshi} />
              <PlotCard project={project} canEdit={canEdit} />
              <StructureCard project={project} canEdit={canEdit} />
              <CoverageCard project={project} canEdit={canEdit} />
            </div>
            <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
              <RoomsSummaryCard project={project} canEdit={canEdit} />
              <ComingSoonCard title="Estimate (BoQ)" icon={Calculator} description="Material quantities and costs from your rooms — comes in Phase 2." />
            </div>
          </>
        )
      }
    </ProjectPageShell>
  );
}

export function SiteSetupView({ projectId }: { projectId: string }) {
  return (
    <ProjectPageShell projectId={projectId} crumb="Site Setup">
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
  return (
    <ProjectPageShell projectId={projectId} crumb="Supply Split">
      {(project, { canEdit }) => <SupplyRulesCard project={project} canEdit={canEdit} />}
    </ProjectPageShell>
  );
}

function FloorsDetail({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { data, isLoading } = useGetFloorsQuery(projectId);
  if (isLoading) return <CardsSkeleton count={2} height="h-48" />;
  return (
    <div className="space-y-4">
      {(data?.floors ?? []).map((floor) => (
        <SectionCard
          key={floor.id}
          title={floor.name}
          description={`${floor.calculations.rooms} rooms · ${formatArea(floor.calculations.totalFloorAreaSqft)} sq ft · ceiling ${floor.ceilingHeightFt} ft`}
          flush
          actions={
            canEdit ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={wizardHref(projectId, 5)}>
                  <Pencil data-icon="inline-start" />
                  Edit rooms
                </Link>
              </Button>
            ) : null
          }
        >
          <DataTable
            rows={floor.rooms}
            getRowId={(r) => r.id}
            clientPageSize={0}
            empty={{ title: "No rooms on this floor" }}
            columns={[
              {
                id: "room",
                header: "Room",
                cell: (r) => (
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{ROOM_TYPE_LABEL[r.type]}</p>
                  </div>
                ),
              },
              { id: "size", header: "L × W × H", cell: (r) => `${r.lengthFt} × ${r.widthFt} × ${r.heightFt} ft` },
              {
                id: "openings",
                header: "Openings",
                cell: (r) =>
                  r.openings.length ? r.openings.map((o) => `${o.quantity}× ${OPENING_LABEL[o.type]} ${o.widthFt}×${o.heightFt}`).join(", ") : "—",
              },
              { id: "wet", header: "Wet", cell: (r) => (r.isWet ? <StatusBadge tone="info" label="Wet" /> : "Dry") },
              { id: "floor", header: "Floor area", align: "right", cell: (r) => `${formatArea(r.calculations.floorAreaSqft)} sq ft` },
              { id: "net", header: "Net wall", align: "right", cell: (r) => `${formatArea(r.calculations.netWallAreaSqft)} sq ft` },
            ]}
          />
        </SectionCard>
      ))}
    </div>
  );
}

export function FloorsRoomsView({ projectId }: { projectId: string }) {
  return (
    <ProjectPageShell projectId={projectId} crumb="Floors & Rooms">
      {(project, { canEdit }) => (
        <>
          <RoomsSummaryCard project={project} title="Totals" />
          <FloorsDetail projectId={project.id} canEdit={canEdit} />
        </>
      )}
    </ProjectPageShell>
  );
}
