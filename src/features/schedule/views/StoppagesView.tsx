"use client";

import { CalendarOff, Check, ImageIcon, Plus, X } from "lucide-react";
import { useState } from "react";
import {
  useApproveStoppageMutation,
  useGetStoppagesQuery,
  useRejectStoppageMutation,
} from "@/api/services/schedule.api";
import type { DelayCategory, Stoppage, StoppageList, StoppageStatus } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { KpiCard, KpiGroup } from "@/components/common/KpiCard";
import { useCan } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useEnumT, useStatusT, useT } from "@/i18n/useT";
import { formatDate, formatDateTime } from "@/lib/dates";
import { LogStoppageSlideOver } from "../components/LogStoppageSlideOver";
import { diffDays } from "../gantt/ganttModel";
import { useDateRange } from "../labels";

const CATEGORIES: DelayCategory[] = ["OWNER", "EXCUSABLE", "CONTRACTOR"];
type Filter = "ALL" | StoppageStatus;

/** Approve (choose who is responsible) or reject (with a reason) a PENDING stoppage. */
function DecisionDialogs({
  projectId,
  approving,
  rejecting,
  onDone,
}: {
  projectId: string;
  approving: Stoppage | null;
  rejecting: Stoppage | null;
  onDone: () => void;
}) {
  const t = useT();
  const te = useEnumT();
  const run = useMutationToast();
  const [approve, { isLoading: approvingBusy }] = useApproveStoppageMutation();
  const [reject, { isLoading: rejectingBusy }] = useRejectStoppageMutation();
  const [category, setCategory] = useState<DelayCategory | null>(null);
  const [note, setNote] = useState("");
  const chosen = category ?? approving?.category ?? "EXCUSABLE";
  const close = () => {
    setCategory(null);
    setNote("");
    onDone();
  };

  return (
    <>
      <ConfirmDialog
        open={Boolean(approving)}
        onOpenChange={(o) => !o && close()}
        tone="default"
        title={t("schedule.stoppages.approveTitle")}
        description={t("schedule.stoppages.approveDesc")}
        confirmLabel={t("schedule.stoppages.approve")}
        loading={approvingBusy}
        onConfirm={async () => {
          if (!approving) return;
          const result = await run(
            () =>
              approve({
                id: approving.id,
                projectId,
                body: { category: chosen, ...(note.trim() ? { note: note.trim() } : {}) },
              }).unwrap(),
            {
              success: (r) =>
                r.shifted.length
                  ? t("schedule.stoppages.approvedShift", {
                      n: r.shifted.length,
                      date: formatDate(r.plannedEnd.to),
                    })
                  : t("schedule.stoppages.approved"),
            },
          );
          if (result) close();
        }}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t("schedule.stoppages.category")}</p>
            <SegmentedControl<DelayCategory>
              ariaLabel={t("schedule.stoppages.category")}
              value={chosen}
              onChange={setCategory}
              options={CATEGORIES.map((c) => ({ value: c, label: te("delayCategory", c) }))}
            />
            <p className="text-xs text-muted-foreground">{te("delayCategoryDesc", chosen)}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="approve-note">{t("field.noteOptional")}</Label>
            <Textarea
              id="approve-note"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(rejecting)}
        onOpenChange={(o) => !o && close()}
        title={t("schedule.stoppages.rejectTitle")}
        description={t("schedule.stoppages.rejectDesc")}
        confirmLabel={t("schedule.stoppages.reject")}
        confirmDisabled={note.trim().length < 3}
        loading={rejectingBusy}
        onConfirm={async () => {
          if (!rejecting) return;
          const result = await run(
            () => reject({ id: rejecting.id, projectId, body: { note: note.trim() } }).unwrap(),
            {
              success: t("schedule.stoppages.rejected"),
            },
          );
          if (result) close();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="reject-note">{t("schedule.stoppages.rejectNote")}</Label>
          <Textarea
            id="reject-note"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-required
          />
          <p className="text-xs text-muted-foreground">{t("schedule.stoppages.rejectNoteRequired")}</p>
        </div>
      </ConfirmDialog>
    </>
  );
}

/** Stoppage list with KPIs, filter and approve / reject (separate from the page shell for tests). */
export function StoppagesBoard({
  projectId,
  data,
  loading,
  canApprove,
}: {
  projectId: string;
  data: StoppageList | undefined;
  loading?: boolean;
  canApprove: boolean;
}) {
  const t = useT();
  const te = useEnumT();
  const ts = useStatusT();
  const range = useDateRange();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [approving, setApproving] = useState<Stoppage | null>(null);
  const [rejecting, setRejecting] = useState<Stoppage | null>(null);
  const rows = (data?.items ?? []).filter((s) => filter === "ALL" || s.status === filter);

  const columns: Column<Stoppage>[] = [
    {
      id: "dates",
      header: t("schedule.stoppages.colDates"),
      cell: (s) => (
        <div>
          <p className="font-medium whitespace-nowrap">
            {diffDays(s.from, s.to) + 1 === s.dates.length
              ? range(s.from, s.to)
              : s.dates.map((d) => formatDate(d)).join(", ")}
          </p>
          <p className={s.warning === "NO_WORKING_DAYS" ? "text-xs text-warning" : "text-xs text-muted-foreground"}>
            {s.warning === "NO_WORKING_DAYS" ? t("schedule.stoppages.noWorkingDays") : t("schedule.stoppages.workingDays", { n: s.days })}
          </p>
        </div>
      ),
      sortValue: (s) => s.from,
    },
    {
      id: "reason",
      header: t("schedule.stoppages.colReason"),
      cell: (s) => (
        <div className="max-w-64">
          <p className="font-medium">{te("stoppageReason", s.reason)}</p>
          {s.note ? (
            <p className="truncate text-xs text-muted-foreground" title={s.note}>
              {s.note}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "category",
      header: t("schedule.stoppages.colCategory"),
      cell: (s) => (
        <span className="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium">
          {te("delayCategory", s.category)}
        </span>
      ),
    },
    {
      id: "status",
      header: t("common.status"),
      cell: (s) => (
        <div>
          <StatusBadge domain="stoppage" value={s.status} />
          {s.decidedBy ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("schedule.stoppages.decided", { name: s.decidedBy.name })}
            </p>
          ) : null}
          {s.decisionNote ? <p className="text-xs text-muted-foreground">{s.decisionNote}</p> : null}
        </div>
      ),
    },
    {
      id: "reported",
      header: t("schedule.stoppages.colReported"),
      cell: (s) => (
        <div className="text-xs">
          {s.reportedBy ? <bdi className="block font-medium">{s.reportedBy.name}</bdi> : null}
          <span className="text-muted-foreground">{formatDateTime(s.reportedAt)}</span>
        </div>
      ),
    },
    {
      id: "photo",
      header: t("schedule.stoppages.colPhoto"),
      cell: (s) =>
        s.photos[0]?.url ? (
          <a
            href={s.photos[0].url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary underline"
          >
            <ImageIcon className="size-4" aria-hidden />
            {t("schedule.stoppages.viewPhoto")}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">{t("schedule.stoppages.noPhoto")}</span>
        ),
    },
    {
      ...ACTIONS_COLUMN,
      hidden: !canApprove,
      cell: (s) => (
        <RowActions
          name={range(s.from, s.to)}
          actions={[
            {
              label: t("schedule.stoppages.approve"),
              icon: Check,
              onSelect: () => setApproving(s),
              hidden: s.status !== "PENDING",
            },
            {
              label: t("schedule.stoppages.reject"),
              icon: X,
              destructive: true,
              onSelect: () => setRejecting(s),
              hidden: s.status !== "PENDING",
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <KpiGroup columns="grid-cols-2 md:grid-cols-4" ariaLabel={t("schedule.crumb.stoppages")}>
        <KpiCard
          variant="tile"
          label={t("schedule.stoppages.kpiPending")}
          value={data?.summary.pending ?? 0}
          tone={data?.summary.pending ? "warning" : "primary"}
          loading={loading}
        />
        <KpiCard
          variant="tile"
          label={t("schedule.stoppages.kpiOwner")}
          value={data?.summary.approvedDays.OWNER ?? 0}
          loading={loading}
        />
        <KpiCard
          variant="tile"
          label={t("schedule.stoppages.kpiExcusable")}
          value={data?.summary.approvedDays.EXCUSABLE ?? 0}
          loading={loading}
        />
        <KpiCard
          variant="tile"
          label={t("schedule.stoppages.kpiContractor")}
          value={data?.summary.approvedDays.CONTRACTOR ?? 0}
          loading={loading}
        />
      </KpiGroup>
      <SectionCard
        title={t("schedule.crumb.stoppages")}
        description={t("schedule.stoppages.desc")}
        actions={
          <SegmentedControl<Filter>
            size="sm"
            ariaLabel={t("schedule.stoppages.filter")}
            value={filter}
            onChange={setFilter}
            options={[
              { value: "ALL", label: t("common.all") },
              ...(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => ({
                value: s,
                label: ts("stoppage", s),
              })),
            ]}
          />
        }
        flush
      >
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(s) => s.id}
          loading={loading}
          clientPageSize={25}
          empty={{
            title: t("schedule.stoppages.emptyTitle"),
            description: t("schedule.stoppages.emptyDesc"),
            icon: CalendarOff,
          }}
        />
      </SectionCard>
      <DecisionDialogs
        projectId={projectId}
        approving={approving}
        rejecting={rejecting}
        onDone={() => {
          setApproving(null);
          setRejecting(null);
        }}
      />
    </div>
  );
}

/** Project → Schedule → Stoppage Days. */
export function StoppagesView({ projectId }: { projectId: string }) {
  const t = useT();
  const { data, isLoading } = useGetStoppagesQuery({ projectId });
  const canLog = useCan("schedule.stoppage.create");
  const canApprove = useCan("schedule.stoppage.approve");
  const [open, setOpen] = useState(false);
  return (
    <ProjectPageShell
      projectId={projectId}
      crumb={t("schedule.crumb.stoppages")}
      actions={(project) =>
        canLog && (project.status === "ACTIVE" || project.status === "DRAFT") ? (
          <Button onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />
            {t("schedule.stoppages.log")}
          </Button>
        ) : null
      }
    >
      {(_project, flags) => (
        <>
          <StoppagesBoard
            projectId={projectId}
            data={data}
            loading={isLoading}
            canApprove={canApprove && !flags.readOnly}
          />
          <LogStoppageSlideOver open={open} onOpenChange={setOpen} projectId={projectId} />
        </>
      )}
    </ProjectPageShell>
  );
}
