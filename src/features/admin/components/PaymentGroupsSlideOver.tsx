"use client";

import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  useCreatePaymentGroupMutation,
  useDeletePaymentGroupMutation,
  useGetAdminPaymentGroupsQuery,
  useRenamePaymentGroupMutation,
} from "@/api/services/admin/paymentAccounts.api";
import type { AdminPaymentGroup } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { QueryState } from "@/components/common/QueryState";
import { RowActions } from "@/components/common/RowActions";
import { SlideOver } from "@/components/common/SlideOver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutationToast } from "@/hooks/useMutationToast";

const MAX_NAME = 60;

function RenameDialog({ group, onClose }: { group: AdminPaymentGroup; onClose: () => void }) {
  const [rename, { isLoading }] = useRenamePaymentGroupMutation();
  const run = useMutationToast();
  const [name, setName] = useState(group.name);
  const trimmed = name.trim();
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Rename ${group.name}`}
      tone="default"
      confirmLabel="Save"
      loading={isLoading}
      confirmDisabled={trimmed.length < 2 || trimmed === group.name}
      onConfirm={async () => {
        const ok = await run(() => rename({ id: group.id, name: trimmed }).unwrap(), { success: "Group renamed" });
        if (ok) onClose();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="payment-group-rename">Group name</Label>
        <Input id="payment-group-rename" value={name} maxLength={MAX_NAME} autoFocus onChange={(e) => setName(e.target.value)} />
      </div>
    </ConfirmDialog>
  );
}

/** Payment Accounts → Manage groups: add, rename, or delete an empty group. */
export function PaymentGroupsSlideOver({ onClose }: { onClose: () => void }) {
  const query = useGetAdminPaymentGroupsQuery();
  const [create, { isLoading: adding }] = useCreatePaymentGroupMutation();
  const [remove, { isLoading: removing }] = useDeletePaymentGroupMutation();
  const run = useMutationToast();
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<AdminPaymentGroup | null>(null);
  const [deleting, setDeleting] = useState<AdminPaymentGroup | null>(null);
  const trimmed = name.trim();

  const add = async () => {
    if (trimmed.length < 2) return;
    const ok = await run(() => create({ name: trimmed }).unwrap(), { success: `${trimmed} added` });
    if (ok) setName("");
  };

  return (
    <>
      <SlideOver open onOpenChange={(o) => !o && onClose()} title="Payment groups" description="Make your own groups, then add accounts inside them. Companies choose a group first, then an account.">
        <div className="space-y-4">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="payment-group-new">Group name</Label>
              <Input id="payment-group-new" value={name} maxLength={MAX_NAME} placeholder="e.g. Mobile wallet" onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" disabled={trimmed.length < 2 || adding}>
              <Plus data-icon="inline-start" />
              Add group
            </Button>
          </form>
          <QueryState query={query}>
            {(groups) =>
              groups.length ? (
                <ul className="divide-y rounded-xl border">
                  {groups.map((g) => (
                    <li key={g.id} className="flex items-center gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{g.name}</p>
                        <p className="text-xs text-muted-foreground">{g.accountCount === 1 ? "1 account" : `${g.accountCount} accounts`}</p>
                      </div>
                      <RowActions
                        name={g.name}
                        actions={[
                          { label: "Rename", icon: Pencil, onSelect: () => setRenaming(g) },
                          { label: "Delete", icon: Trash2, destructive: true, onSelect: () => setDeleting(g), hidden: g.accountCount > 0 },
                        ]}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No groups yet" icon={Layers} compact />
              )
            }
          </QueryState>
        </div>
      </SlideOver>
      {renaming ? <RenameDialog key={renaming.id} group={renaming} onClose={() => setRenaming(null)} /> : null}
      {deleting ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          tone="danger"
          title={`Delete ${deleting.name}?`}
          description="This group has no accounts, so nothing else changes."
          confirmLabel="Delete"
          loading={removing}
          onConfirm={async () => {
            const ok = await run(() => remove(deleting.id).unwrap(), { success: `${deleting.name} deleted` });
            if (ok) setDeleting(null);
          }}
        />
      ) : null}
    </>
  );
}
