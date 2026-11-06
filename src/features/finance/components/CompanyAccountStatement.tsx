"use client";

import { useState } from "react";
import { useGetCompanyAccountEntriesQuery } from "@/api/services/companyAccounts.api";
import type { CompanyAccount, CompanyAccountEntry } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { MoneyText } from "@/components/common/MoneyText";
import { SlideOver } from "@/components/common/SlideOver";
import { useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";

const PAGE_SIZE = 25;
const negative = (paisa: string) => paisa.startsWith("-");

/** One account's statement, newest first: what came in, what went out, and the balance after each. */
export function CompanyAccountStatement({
  account,
  onClose,
}: {
  account: CompanyAccount;
  onClose: () => void;
}) {
  const t = useT();
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, error, refetch } = useGetCompanyAccountEntriesQuery({
    id: account.id,
    page,
    limit: PAGE_SIZE,
  });
  const columns: Column<CompanyAccountEntry>[] = [
    {
      id: "date",
      header: t("field.date"),
      cell: (e) => <span className="whitespace-nowrap">{formatDate(e.occurredAt)}</span>,
    },
    { id: "what", header: t("cashSite.accounts.details"), cell: (e) => e.description },
    {
      id: "in",
      header: t("cashSite.accounts.moneyIn"),
      align: "right",
      cell: (e) =>
        negative(e.amountPaisa) ? null : <MoneyText paisa={e.amountPaisa} className="text-success" />,
    },
    {
      id: "out",
      header: t("cashSite.accounts.moneyOut"),
      align: "right",
      cell: (e) =>
        negative(e.amountPaisa) ? <MoneyText paisa={e.amountPaisa.slice(1)} className="text-danger" /> : null,
    },
    {
      id: "balance",
      header: t("cashSite.accounts.balance"),
      align: "right",
      cell: (e) => (
        <MoneyText
          paisa={e.balancePaisa}
          className={negative(e.balancePaisa) ? "font-medium text-danger" : "font-medium"}
        />
      ),
    },
  ];
  return (
    <SlideOver
      open
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={t("cashSite.accounts.statementTitle", { name: account.name })}
      description={account.accountNumber ?? account.group.name}
    >
      <DataTable
        rows={data?.items}
        columns={columns}
        getRowId={(e) => e.id}
        loading={isLoading || isFetching}
        error={error}
        onRetry={refetch}
        empty={{ title: t("cashSite.accounts.statementEmpty") }}
        pagination={
          data
            ? {
                page,
                pageSize: PAGE_SIZE,
                total: data.meta.total,
                onPageChange: setPage,
                onPageSizeChange: () => undefined,
              }
            : undefined
        }
      />
    </SlideOver>
  );
}
