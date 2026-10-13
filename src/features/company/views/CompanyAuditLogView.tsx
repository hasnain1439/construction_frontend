"use client";

import { LifeBuoy, ScrollText } from "lucide-react";
import { useState } from "react";
import { useGetCompanyAuditLogsQuery } from "@/api/services/company.api";
import type { CompanyAuditEntry } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/layout/PageHeader";
import { useT, type TranslationKey } from "@/i18n/useT";
import { formatDateTime } from "@/lib/dates";

/** Support-session events get a plain-language label; everything else shows its action code. */
const SESSION_ACTIONS: Record<string, TranslationKey> = {
  "admin.act_as_started": "companyAudit.sessionStarted",
  "admin.act_as_ended": "companyAudit.sessionEnded",
};

type Filter = "all" | "support";

/**
 * Settings → Audit log (owner only): who changed what, newest first — including every time
 * platform support opened the company, with the support person's name and reason.
 */
export function CompanyAuditLogView() {
  const t = useT();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { data, isLoading, isFetching, error, refetch } = useGetCompanyAuditLogsQuery({
    page,
    limit: pageSize,
    ...(filter === "support" ? { actorType: "PLATFORM_ADMIN" as const } : {}),
  });

  const actionLabel = (e: CompanyAuditEntry) => {
    if (e.action === "admin.act_as_mode_changed") {
      const to = (e.details as { to?: string } | null)?.to;
      return t(to === "WRITE" ? "companyAudit.sessionWrite" : "companyAudit.sessionReadOnly");
    }
    const key = SESSION_ACTIONS[e.action];
    return key ? t(key) : <span className="font-mono text-xs">{e.action}</span>;
  };

  const columns: Column<CompanyAuditEntry>[] = [
    {
      id: "when",
      header: t("companyAudit.colWhen"),
      cell: (e) => <span className="whitespace-nowrap">{formatDateTime(e.createdAt)}</span>,
    },
    {
      id: "who",
      header: t("companyAudit.colWho"),
      cell: (e) =>
        e.platformSupport ? (
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="danger" icon={LifeBuoy} label={t("companyAudit.supportBadge")} />
            <span>{e.platformSupport.adminName ?? ""}</span>
          </div>
        ) : (
          e.actor.name
        ),
    },
    { id: "what", header: t("companyAudit.colAction"), cell: actionLabel },
    {
      id: "reason",
      header: t("companyAudit.colReason"),
      className: "max-w-md",
      cell: (e) =>
        e.platformSupport?.reason ? (
          <span className="line-clamp-2 text-sm">{e.platformSupport.reason}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("companyAudit.title")}
        description={t("companyAudit.description")}
        breadcrumbs={[{ label: t("companyAudit.settings") }, { label: t("companyAudit.title") }]}
      />
      <InlineAlert tone="info">{t("companyAudit.supportNote")}</InlineAlert>
      <SegmentedControl<Filter>
        ariaLabel={t("companyAudit.colWho")}
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setPage(1);
        }}
        options={[
          { value: "all", label: t("companyAudit.filterAll") },
          { value: "support", label: t("companyAudit.filterSupport"), icon: LifeBuoy },
        ]}
      />
      <SectionCard flush>
        <DataTable
          rows={data?.items}
          columns={columns}
          getRowId={(e) => e.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{ title: t("companyAudit.empty"), icon: ScrollText }}
          pagination={
            data
              ? {
                  page,
                  pageSize,
                  total: data.meta.total,
                  onPageChange: setPage,
                  onPageSizeChange: setPageSize,
                }
              : undefined
          }
        />
      </SectionCard>
    </>
  );
}
