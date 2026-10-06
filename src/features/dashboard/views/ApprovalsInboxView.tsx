"use client";

import { CircleCheckBig } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useBulkApproveMutation, useGetApprovalsQuery } from "@/api/services/approvals.api";
import type { ApprovalAction, ApprovalItem as Item, BulkApprovalItem } from "@/api/types";
import { ApprovalItem, APPROVAL_ICON, type ActionInput } from "@/components/common/ApprovalItem";
import { BulkActionBar, commonActions } from "@/components/common/BulkActionBar";
import { EmptyState } from "@/components/common/EmptyState";
import { MoneyText } from "@/components/common/MoneyText";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";

const keyOf = (i: Pick<Item, "type" | "id">) => `${i.type}:${i.id}`;

/** "2 done, 1 failed: Only the owner decides top-ups" */
export function bulkSummary(r: { succeeded: number; failed: number; results: Array<{ ok: boolean; error: { message: string } | null }> }) {
  const failures = [...new Set(r.results.filter((x) => !x.ok).map((x) => x.error?.message).filter(Boolean))];
  return `${r.succeeded} done${r.failed ? `, ${r.failed} failed${failures.length ? `: ${failures.join(" · ")}` : ""}` : ""}`;
}

/**
 * Dashboard → My Approvals: everything waiting on the office in one list, grouped by kind.
 * Items with quick actions can be selected and run together (each through its own module).
 */
export function ApprovalsInboxView() {
  const readOnly = useReadOnly();
  const query = useGetApprovalsQuery(undefined, { refetchOnMountOrArgChange: true });
  const [bulkApprove, bulkState] = useBulkApproveMutation();
  const run = useMutationToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const items = useMemo(() => query.data?.groups.flatMap((g) => g.items) ?? [], [query.data]);
  const chosen = items.filter((i) => selected.has(keyOf(i)));
  const toggle = (item: Item, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(keyOf(item));
      else next.delete(keyOf(item));
      return next;
    });

  const send = async (list: Item[], action: ApprovalAction, input: ActionInput) => {
    const body: BulkApprovalItem[] = list.map((i) => ({ type: i.type, id: i.id, action, ...input }));
    const result = await run(() => bulkApprove({ items: body }).unwrap());
    if (!result) return;
    if (result.failed) toast.warning(bulkSummary(result));
    else toast.success(bulkSummary(result));
    setSelected(new Set());
  };

  return (
    <>
      <PageHeader
        title="My Approvals"
        description="Everything waiting for your decision, in one place."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "My Approvals" }]}
      />
      <QueryState query={query}>
        {(data) =>
          data.total === 0 ? (
            <SectionCard>
              <EmptyState icon={CircleCheckBig} title="Nothing waiting for you" description="New wages, kharcha, top-ups, measurements, shortages and billing items will show up here." />
            </SectionCard>
          ) : (
            <div className="space-y-4">
              {data.groups.map((group) => {
                const Icon = APPROVAL_ICON[group.type];
                const selectable = group.items.filter((i) => i.quickActions.length);
                const allOn = selectable.length > 0 && selectable.every((i) => selected.has(keyOf(i)));
                return (
                  <SectionCard
                    key={group.type}
                    title={
                      <span className="flex items-center gap-2">
                        <Icon className="size-4 text-primary" aria-hidden />
                        {group.label}
                        <span className="rounded-full bg-muted px-2 text-xs font-semibold text-muted-foreground tabular">{group.count}</span>
                      </span>
                    }
                    description={group.totalPaisa !== null ? <>Total <MoneyText paisa={group.totalPaisa} /></> : undefined}
                    actions={
                      selectable.length && !readOnly ? (
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Checkbox checked={allOn} onCheckedChange={(v) => selectable.forEach((i) => toggle(i, v === true))} aria-label={`Select all ${group.label}`} />
                          Select all
                        </label>
                      ) : undefined
                    }
                  >
                    <ul className="space-y-2" aria-label={group.label}>
                      {group.items.map((item) => (
                        <ApprovalItem
                          key={keyOf(item)}
                          item={readOnly ? { ...item, quickActions: [] } : item}
                          selected={selected.has(keyOf(item))}
                          onSelect={readOnly ? undefined : (on) => toggle(item, on)}
                          onAction={(i, action, input) => send([i], action, input)}
                          busy={bulkState.isLoading}
                        />
                      ))}
                    </ul>
                  </SectionCard>
                );
              })}
            </div>
          )
        }
      </QueryState>
      <BulkActionBar
        count={chosen.length}
        actions={commonActions(chosen.map((i) => i.quickActions))}
        onRun={(action, input) => send(chosen, action, input)}
        onClear={() => setSelected(new Set())}
        busy={bulkState.isLoading}
      />
    </>
  );
}
