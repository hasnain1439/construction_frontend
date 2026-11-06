"use client";

import { Landmark, Layers, Pencil, Plus, Power, ScrollText, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import {
  useDeleteCompanyAccountMutation,
  useGetCompanyAccountGroupsQuery,
  useGetCompanyAccountsQuery,
  useUpdateCompanyAccountMutation,
} from "@/api/services/companyAccounts.api";
import type { CompanyAccount } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { MoneyText } from "@/components/common/MoneyText";
import { useCan } from "@/components/common/PermissionGate";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { CompanyAccountGroupsSlideOver } from "@/features/finance/components/CompanyAccountGroupsSlideOver";
import { CompanyAccountSlideOver } from "@/features/finance/components/CompanyAccountSlideOver";
import { CompanyAccountStatement } from "@/features/finance/components/CompanyAccountStatement";
import { ImportButton } from "@/features/onboarding/components/ImportWizard";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useT } from "@/i18n/useT";
import { formatPKR, sumPaisa } from "@/lib/money";

const ALL = "ALL";

/** The company's payment groups and the accounts in them: add, change, switch off, delete. */
export function CompanyAccountsView() {
  const t = useT();
  const readOnly = useReadOnly();
  const canManage = useCan("finance.account.manage") && !readOnly;
  const groups = useGetCompanyAccountGroupsQuery();
  const { data, isLoading, isFetching, error, refetch } = useGetCompanyAccountsQuery();
  const [update] = useUpdateCompanyAccountMutation();
  const [remove, { isLoading: removing }] = useDeleteCompanyAccountMutation();
  const run = useMutationToast();
  const [picked, setPicked] = useState(ALL);
  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState<CompanyAccount | null>(null);
  const [deleting, setDeleting] = useState<CompanyAccount | null>(null);
  const [statement, setStatement] = useState<CompanyAccount | null>(null);
  const total = sumPaisa((groups.data ?? []).map((g) => g.balancePaisa ?? "0"));
  // A group deleted while it was picked falls back to All.
  const tab = groups.data?.some((g) => g.id === picked) ? picked : ALL;

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
      sortValue: (a) => a.group.name,
      cell: (a) => a.group.name,
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
      id: "balance",
      header: t("cashSite.accounts.balance"),
      align: "right",
      sortValue: (a) => Number(a.balancePaisa ?? 0),
      cell: (a) => (
        <MoneyText
          paisa={a.balancePaisa ?? "0"}
          className={a.balancePaisa?.startsWith("-") ? "font-medium text-danger" : "font-medium"}
        />
      ),
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
            { label: t("cashSite.accounts.statement"), icon: ScrollText, onSelect: () => setStatement(a) },
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
            <>
              <Button variant="outline" onClick={() => setManaging(true)}>
                <Layers data-icon="inline-start" />
                {t("cashSite.accounts.manageGroups")}
              </Button>
              <ImportButton entity="company-accounts" />
              <Button onClick={() => setAdding(true)}>
                <Plus data-icon="inline-start" />
                {t("cashSite.accounts.add")}
              </Button>
            </>
          ) : null
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="account-totals">
        <KpiCard
          label={t("cashSite.accounts.totalBalance")}
          icon={Wallet}
          highlight
          loading={groups.isLoading}
          value={formatPKR(total)}
        />
        {(groups.data ?? []).map((g) => (
          <KpiCard
            key={g.id}
            label={g.name}
            icon={Landmark}
            value={formatPKR(g.balancePaisa ?? "0")}
            tone={g.balancePaisa?.startsWith("-") ? "danger" : undefined}
            hint={t(g.accountCount === 1 ? "cashSite.accounts.oneAccount" : "cashSite.accounts.nAccounts", {
              n: g.accountCount,
            })}
          />
        ))}
      </div>
      <div className="mb-4 overflow-x-auto">
        <SegmentedControl<string>
          value={tab}
          onChange={setPicked}
          ariaLabel={t("cashSite.accounts.group")}
          options={[
            { value: ALL, label: t("cashSite.accounts.all") },
            ...(groups.data ?? []).map((g) => ({ value: g.id, label: g.name })),
          ]}
        />
      </div>
      <SectionCard flush>
        <DataTable
          rows={tab === ALL ? data : data?.filter((a) => a.group.id === tab)}
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
      {managing ? <CompanyAccountGroupsSlideOver onClose={() => setManaging(false)} /> : null}
      {adding ? (
        <CompanyAccountSlideOver
          account={null}
          groupId={tab === ALL ? null : tab}
          onClose={() => setAdding(false)}
        />
      ) : null}
      {editing ? (
        <CompanyAccountSlideOver key={editing.id} account={editing} onClose={() => setEditing(null)} />
      ) : null}
      {statement ? (
        <CompanyAccountStatement key={statement.id} account={statement} onClose={() => setStatement(null)} />
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
