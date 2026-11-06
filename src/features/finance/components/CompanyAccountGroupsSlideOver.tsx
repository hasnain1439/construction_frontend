"use client";

import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  useCreateCompanyAccountGroupMutation,
  useDeleteCompanyAccountGroupMutation,
  useGetCompanyAccountGroupsQuery,
  useRenameCompanyAccountGroupMutation,
} from "@/api/services/companyAccounts.api";
import type { CompanyAccountGroup, CompanyAccountType } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { QueryState } from "@/components/common/QueryState";
import { RowActions } from "@/components/common/RowActions";
import { SlideOver } from "@/components/common/SlideOver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMPANY_ACCOUNT_TYPES } from "@/features/finance/schemas";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useEnumT, useT } from "@/i18n/useT";

const MAX_NAME = 60;

/** Rename one group; its accounts stay in it. A name another group has is refused. */
function RenameDialog({ group, onClose }: { group: CompanyAccountGroup; onClose: () => void }) {
  const t = useT();
  const [rename, { isLoading }] = useRenameCompanyAccountGroupMutation();
  const run = useMutationToast();
  const [name, setName] = useState(group.name);
  const trimmed = name.trim();
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("cashSite.accounts.renameGroupTitle", { name: group.name })}
      confirmLabel={t("common.save")}
      loading={isLoading}
      confirmDisabled={trimmed.length < 2 || trimmed === group.name}
      onConfirm={async () => {
        const ok = await run(() => rename({ id: group.id, name: trimmed }).unwrap(), {
          success: t("cashSite.accounts.groupRenamed"),
        });
        if (ok) onClose();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="account-group-rename">{t("cashSite.accounts.groupName")}</Label>
        <Input
          id="account-group-rename"
          value={name}
          maxLength={MAX_NAME}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </ConfirmDialog>
  );
}

/**
 * Accounts → Manage groups: the company's own payment groups (Bank, Cash, Online …). Add, rename, or
 * delete an empty one. A group's type says which details its accounts need; it cannot change later.
 */
export function CompanyAccountGroupsSlideOver({ onClose }: { onClose: () => void }) {
  const t = useT();
  const te = useEnumT();
  const query = useGetCompanyAccountGroupsQuery();
  const [create, { isLoading: adding }] = useCreateCompanyAccountGroupMutation();
  const [remove, { isLoading: removing }] = useDeleteCompanyAccountGroupMutation();
  const run = useMutationToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<CompanyAccountType>("BANK");
  const [renaming, setRenaming] = useState<CompanyAccountGroup | null>(null);
  const [deleting, setDeleting] = useState<CompanyAccountGroup | null>(null);
  const trimmed = name.trim();

  const add = async () => {
    if (trimmed.length < 2) return;
    const ok = await run(() => create({ name: trimmed, type }).unwrap(), {
      success: t("cashSite.accounts.groupAdded", { name: trimmed }),
    });
    if (ok) setName("");
  };

  return (
    <>
      <SlideOver
        open
        onOpenChange={(o) => !o && onClose()}
        title={t("cashSite.accounts.groupsTitle")}
        description={t("cashSite.accounts.groupsDesc")}
      >
        <div className="space-y-4">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="account-group-new">{t("cashSite.accounts.groupName")}</Label>
                <Input
                  id="account-group-new"
                  value={name}
                  maxLength={MAX_NAME}
                  placeholder={t("cashSite.accounts.groupNamePh")}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="account-group-type">{t("cashSite.accounts.groupType")}</Label>
                <Select value={type} onValueChange={(v) => setType(v as CompanyAccountType)}>
                  <SelectTrigger id="account-group-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_ACCOUNT_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {te("companyAccountType", value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("cashSite.accounts.groupTypeHint")}</p>
            <Button type="submit" disabled={trimmed.length < 2 || adding}>
              <Plus data-icon="inline-start" />
              {t("cashSite.accounts.addGroup")}
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
                        <p className="text-xs text-muted-foreground">
                          {te("companyAccountType", g.type)} ·{" "}
                          {t(
                            g.accountCount === 1
                              ? "cashSite.accounts.oneAccount"
                              : "cashSite.accounts.nAccounts",
                            {
                              n: g.accountCount,
                            },
                          )}
                        </p>
                      </div>
                      <RowActions
                        name={g.name}
                        actions={[
                          {
                            label: t("cashSite.accounts.renameGroup"),
                            icon: Pencil,
                            onSelect: () => setRenaming(g),
                          },
                          {
                            label: t("common.delete"),
                            icon: Trash2,
                            destructive: true,
                            onSelect: () => setDeleting(g),
                            hidden: g.accountCount > 0,
                          },
                        ]}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title={t("cashSite.accounts.noGroups")} icon={Layers} compact />
              )
            }
          </QueryState>
        </div>
      </SlideOver>
      {renaming ? (
        <RenameDialog key={renaming.id} group={renaming} onClose={() => setRenaming(null)} />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          tone="danger"
          title={t("cashSite.accounts.deleteTitle", { name: deleting.name })}
          description={t("cashSite.accounts.deleteGroupDesc")}
          confirmLabel={t("common.delete")}
          loading={removing}
          onConfirm={async () => {
            const ok = await run(() => remove(deleting.id).unwrap(), {
              success: t("cashSite.accounts.deleted", { name: deleting.name }),
            });
            if (ok) setDeleting(null);
          }}
        />
      ) : null}
    </>
  );
}
