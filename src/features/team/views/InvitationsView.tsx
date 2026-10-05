"use client";

import { MailPlus, RotateCw, X } from "lucide-react";
import { useState } from "react";
import { useCancelInvitationMutation, useGetInvitationsQuery, useResendInvitationMutation } from "@/api/services/team.api";
import type { Invitation, InvitationStatus } from "@/api/types";
import { AvatarName } from "@/components/common/AvatarName";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar } from "@/components/common/FilterBar";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useListState } from "@/hooks/useListState";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useSearchFlag } from "@/hooks/useSearchFlag";
import { formatDate, formatRelative } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { InviteMemberSlideOver } from "../components/InviteMemberSlideOver";
import { ProjectChips, RoleBadge } from "../components/TeamBits";

const STATUS_OPTIONS: Array<{ value: InvitationStatus; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function InvitationsView() {
  const readOnly = useReadOnly();
  const [status, setStatus] = useState<InvitationStatus>("PENDING");
  const { page, setPage, pageSize, setPageSize } = useListState({});
  const { data, isLoading, isFetching, error, refetch } = useGetInvitationsQuery({ status, page, limit: pageSize });
  const [resend] = useResendInvitationMutation();
  const [cancel, { isLoading: cancelling }] = useCancelInvitationMutation();
  const [inviteOpen, setInviteOpen] = useSearchFlag();
  const [toCancel, setToCancel] = useState<Invitation | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const run = useMutationToast();

  const columns: Column<Invitation>[] = [
    { id: "name", header: "Name", cell: (i) => <AvatarName name={i.name} subtitle={formatPhone(i.phone)} />, sortValue: (i) => i.name },
    { id: "role", header: "Role", cell: (i) => <RoleBadge role={i.role} /> },
    { id: "projects", header: "Projects", cell: (i) => <ProjectChips projects={i.projects} /> },
    { id: "status", header: "Status", cell: (i) => <StatusBadge domain="invitation" value={i.status} /> },
    {
      id: "sent",
      header: "Sent",
      cell: (i) => <span className="text-muted-foreground">{formatRelative(i.lastResentAt ?? i.createdAt)}</span>,
      sortValue: (i) => i.lastResentAt ?? i.createdAt,
    },
    { id: "expires", header: "Expires", cell: (i) => formatDate(i.expiresAt), sortValue: (i) => i.expiresAt },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (i) =>
        readOnly ? null : (
          <div className="flex justify-end gap-1">
            {i.status === "PENDING" || i.status === "EXPIRED" ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={resending === i.id}
                onClick={async () => {
                  setResending(i.id);
                  await run(() => resend(i.id).unwrap(), { success: `New link sent to ${i.name}` });
                  setResending(null);
                }}
              >
                <RotateCw data-icon="inline-start" />
                Resend
              </Button>
            ) : null}
            {i.status === "PENDING" ? (
              <Button variant="ghost" size="sm" className="text-danger" onClick={() => setToCancel(i)}>
                <X data-icon="inline-start" />
                Cancel
              </Button>
            ) : null}
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Invitations"
        breadcrumbs={[{ label: "Team" }, { label: "Invitations" }]}
        actions={
          !readOnly ? (
            <Button onClick={() => setInviteOpen(true)}>
              <MailPlus data-icon="inline-start" />
              Invite member
            </Button>
          ) : null
        }
      />
      <FilterBar>
        <SegmentedControl<InvitationStatus>
          ariaLabel="Invitation status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
        />
      </FilterBar>
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(i) => i.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{
            title: `No ${status.toLowerCase()} invitations`,
            description: status === "PENDING" ? "Invite PMs and Munshis to work on your projects." : undefined,
            icon: MailPlus,
          }}
          pagination={
            data
              ? { page, pageSize, total: data.meta.total, onPageChange: setPage, onPageSizeChange: setPageSize }
              : undefined
          }
        />
      </SectionCard>
      <InviteMemberSlideOver open={inviteOpen} onOpenChange={setInviteOpen} />
      <ConfirmDialog
        open={Boolean(toCancel)}
        onOpenChange={(o) => !o && setToCancel(null)}
        title={`Cancel the invite for ${toCancel?.name ?? ""}?`}
        description="The link stops working immediately. You can invite them again later."
        confirmLabel="Cancel invite"
        loading={cancelling}
        onConfirm={async () => {
          if (!toCancel) return;
          const ok = await run(() => cancel(toCancel.id).unwrap(), { success: "Invite cancelled" });
          if (ok) setToCancel(null);
        }}
      />
    </>
  );
}
