"use client";

import { Landmark, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  useDeleteCompanyAccountMutation,
  useGetCompanyAccountsQuery,
  useUpdateCompanyAccountMutation,
} from "@/api/services/companyAccounts.api";
import type { CompanyAccount, CompanyAccountType } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { useCan } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { CompanyAccountSlideOver } from "@/features/finance/components/CompanyAccountSlideOver";
import { COMPANY_ACCOUNT_TYPES } from "@/features/finance/schemas";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useT } from "@/i18n/useT";

type Tab = "ALL" | CompanyAccountType;

/** The accounts the company receives money in, by group: add, change, switch off, delete. */
export function CompanyAccountsView() {
  const t = useT();
  const te = useEnumT();
  const readOnly = useReadOnly();
  const canManage = useCan("finance.account.manage") && !readOnly;
  const { data, isLoading, isFetching, error, refetch } = useGetCompanyAccountsQuery();
  const [update] = useUpdateCompanyAccountMutation();
  const [remove, { isLoading: removing }] = useDeleteCompanyAccountMutation();
  const run = useMutationToast();
  const [tab, setTab] = useState<Tab>("ALL");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CompanyAccount | null>(null);
  const [deleting, setDeleting] = useState<CompanyAccount | null>(null);

  const switchTo = (a: CompanyAccount, isActive: boolean) =>
    run(() => update({ id: a.id, body: { isActive } }).unwrap(), {
      success: t(isActive ? "cashSite.accounts.switchedOn" : "cashSite.accounts.switchedOff", {
        name: a.name,
      }),
    });

  const columns: Column<CompanyAccount>[] = [
    {
      id: "name",
      header: t("cashSite.accounts.name"),
      sortValue: (a) => a.name,
      cell: (a) => (
        <div className="min-w-0">
          <p className="font-medium">{a.name}</p>
          {a.note ? <p className="truncate text-xs text-muted-foreground">{a.note}</p> : null}
        </div>
      ),
    },
    {
      id: "group",
      header: t("cashSite.accounts.group"),
      sortValue: (a) => COMPANY_ACCOUNT_TYPES.indexOf(a.type),
      cell: (a) => te("companyAccountType", a.type),
    },
    {
      id: "title",
      header: t("cashSite.accounts.accountTitle"),
      cell: (a) => a.accountTitle ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: "number",
      header: t("cashSite.accounts.accountNumber"),
      cell: (a) =>
        a.accountNumber ? (
          <div className="min-w-0">
            <p className="tabular">{a.accountNumber}</p>
            {a.iban || a.branch ? (
              <p className="text-xs text-muted-foreground">
                {[a.iban, a.branch].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "payments",
      header: t("cashSite.accounts.payments"),
      align: "right",
      sortValue: (a) => a.paymentCount,
      cell: (a) => <span className="tabular">{a.paymentCount}</span>,
    },
    {
      id: "status",
      header: t("field.status"),
      cell: (a) => (
        <StatusBadge
          tone={a.isActive ? "success" : "neutral"}
          label={t(a.isActive ? "cashSite.accounts.on" : "cashSite.accounts.off")}
        />
      ),
    },
    {
      ...ACTIONS_COLUMN,
      cell: (a) => (
        <RowActions
          name={a.name}
          actions={[
            { label: t("common.edit"), icon: Pencil, onSelect: () => setEditing(a), hidden: !canManage },
            {
              label: t(a.isActive ? "cashSite.accounts.switchOff" : "cashSite.accounts.switchOn"),
              icon: Power,
              onSelect: () => void switchTo(a, !a.isActive),
              hidden: !canManage,
            },
            // An account with payments stays, so those payments keep showing its name.
            {
              label: t("common.delete"),
              icon: Trash2,
              destructive: true,
              onSelect: () => setDeleting(a),
              hidden: !canManage || a.paymentCount > 0,
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("cashSite.accounts.title")}
        description={t("cashSite.accounts.description")}
        breadcrumbs={[{ label: t("crumb.finance") }, { label: t("cashSite.accounts.title") }]}
        actions={
          canManage ? (
            <Button onClick={() => setAdding(true)}>
              <Plus data-icon="inline-start" />
              {t("cashSite.accounts.add")}
            </Button>
          ) : null
        }
      />
      <div className="mb-4">
        <SegmentedControl<Tab>
          value={tab}
          onChange={setTab}
          ariaLabel={t("cashSite.accounts.group")}
          options={[
            { value: "ALL", label: t("cashSite.accounts.all") },
            ...COMPANY_ACCOUNT_TYPES.map((value) => ({ value, label: te("companyAccountType", value) })),
          ]}
        />
      </div>
      <SectionCard flush>
        <DataTable
          rows={tab === "ALL" ? data : data?.filter((a) => a.type === tab)}
          columns={columns}
          getRowId={(a) => a.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{
            title: t("cashSite.accounts.emptyTitle"),
            description: t("cashSite.accounts.emptyDesc"),
            icon: Landmark,
          }}
        />
      </SectionCard>
      {adding ? (
        <CompanyAccountSlideOver
          account={null}
          type={tab === "ALL" ? "CASH" : tab}
          onClose={() => setAdding(false)}
        />
      ) : null}
      {editing ? (
        <CompanyAccountSlideOver key={editing.id} account={editing} onClose={() => setEditing(null)} />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          tone="danger"
          title={t("cashSite.accounts.deleteTitle", { name: deleting.name })}
          description={t("cashSite.accounts.deleteDesc")}
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
