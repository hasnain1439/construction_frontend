"use client";

import { useState } from "react";
import type { ClientDetail } from "@/api/types";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionCard } from "@/components/common/SectionCard";
import { useT } from "@/i18n/useT";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatementPanel } from "../views/BillingViews";

/** Client detail → Statements: the owner statement of one of their projects, with PDF / WhatsApp. */
export function ClientStatements({ client }: { client: ClientDetail }) {
  const t = useT();
  const projects = client.projects.filter((p) => p.status !== "DRAFT");
  const [picked, setPicked] = useState<string | undefined>(projects[0]?.id);
  if (!projects.length) {
    return (
      <SectionCard>
        <EmptyState title={t("billing.statement.noActiveProjects")} description={t("billing.statement.noActiveProjectsBody")} compact />
      </SectionCard>
    );
  }
  return (
    <div className="space-y-3">
      {projects.length > 1 ? (
        <Select value={picked} onValueChange={setPicked}>
          <SelectTrigger className="w-72" aria-label={t("field.project")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} · {p.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {picked ? <StatementPanel key={picked} projectId={picked} phone={client.phone} /> : null}
    </div>
  );
}
