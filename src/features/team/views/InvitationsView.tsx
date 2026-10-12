"use client";

import { MailPlus, RotateCw, X } from "lucide-react";
import { useState } from "react";
import { useCancelInvitationMutation, useGetInvitationsQuery, useResendInvitationMutation } from "@/api/services/team.api";
import type { Invitation, InvitationStatus } from "@/api/types";
import { AvatarName } from "@/components/common/AvatarName";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterBar } from "@/components/common/FilterBar";
import { InviteShare } from "@/components/common/InviteShare";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n/useT";
import { useMe } from "@/store/hooks";
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
  /** After a resend: the fresh link, ready to share (the old link stops working). */
  const [shared, setShared] = useState<{ invitation: Invitation; url: string } | null>(null);
  const t = useT();
  const me = useMe();
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
      ...ACTIONS_COLUMN,
      cell: (i) =>
        readOnly ? null : (
          <RowActions
            name={i.name}
            actions={[
              {
                label: "Resend / Share link",
                icon: RotateCw,
                hidden: !(i.status === "PENDING" || i.status === "EXPIRED"),
                disabled: resending === i.id,
                onSelect: async () => {
                  setResending(i.id);
                  const result = await run(() => resend(i.id).unwrap(), { success: `New link sent to ${i.name}` });
                  setResending(null);
                  if (result?.inviteUrl) setShared({ invitation: i, url: result.inviteUrl });
                },
              },
              { label: "Cancel", icon: X, destructive: true, hidden: i.status !== "PENDING", onSelect: () => setToCancel(i) },
            ]}
          />
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
      <Dialog open={Boolean(shared)} onOpenChange={(o) => !o && setShared(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{shared ? `${t("invite.shareTitle")} — ${shared.invitation.name}` : ""}</DialogTitle>
            <DialogDescription>{t("invite.newLinkMade")}</DialogDescription>
          </DialogHeader>
          {shared ? (
            <InviteShare
              url={shared.url}
              name={shared.invitation.name}
              phone={shared.invitation.phone}
              email={shared.invitation.email}
              companyName={me?.tenant.name}
              roleLabel={shared.invitation.role === "PM" ? "Project Manager" : shared.invitation.role === "MUNSHI" ? "Munshi" : undefined}
            />
          ) : null}
        </DialogContent>
      </Dialog>
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
