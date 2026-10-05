"use client";

import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetProjectsQuery } from "@/api/services/projects.api";
import { useChangePlanMutation } from "@/api/services/subscription.api";
import type { PlanChange, PlanOption, SubscriptionDetail } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useLanguage } from "@/i18n/useT";
import { getErrorMessage } from "@/lib/apiErrors";
import { formatDate } from "@/lib/dates";
import { formatPKR, toPaisaBigInt } from "@/lib/money";

/**
 * Change plan. Upgrades wait for a paid slip; a downgrade during a paid period starts at
 * the period end. If the target plan allows fewer active projects, the Thekedar chooses
 * which stay active (the rest become read-only).
 */
export function ChangePlanDialog({
  target,
  subscription,
  onClose,
  onUpgradeNeedsPayment,
}: {
  target: PlanOption | null;
  subscription: SubscriptionDetail;
  onClose: () => void;
  onUpgradeNeedsPayment: (planId: string) => void;
}) {
  const language = useLanguage();
  const [change, { isLoading }] = useChangePlanMutation();
  const run = useMutationToast();
  const [keep, setKeep] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const limit = target?.maxActiveProjects ?? null;
  const used = subscription.usage.activeProjects.used;
  const needsPick = target !== null && limit !== null && used > limit;
  const usersOver =
    target !== null && target.maxOfficeUsers !== null && subscription.usage.officeUsers.used > target.maxOfficeUsers;

  const active = useGetProjectsQuery({ status: "ACTIVE", limit: 100 }, { skip: !needsPick });
  const closeout = useGetProjectsQuery({ status: "CLOSEOUT", limit: 100 }, { skip: !needsPick });
  const countedProjects = useMemo(
    () => [...(active.data?.items ?? []), ...(closeout.data?.items ?? [])],
    [active.data, closeout.data],
  );

  const isUpgrade =
    target !== null && (toPaisaBigInt(target.pricePaisa) ?? BigInt(0)) > (toPaisaBigInt(subscription.plan.pricePaisa) ?? BigInt(0));

  const toggle = (id: string) =>
    setKeep((current) => (current.includes(id) ? current.filter((k) => k !== id) : limit !== null && current.length >= limit ? current : [...current, id]));

  const submit = async () => {
    if (!target) return;
    setError(null);
    if (needsPick && keep.length === 0) {
      setError(`Choose up to ${limit} projects to keep active.`);
      return;
    }
    const result: PlanChange | undefined = await run(
      () => change({ planId: target.id, ...(needsPick ? { keepActiveProjectIds: keep } : {}) }).unwrap(),
      {
        onError: (code, err) => {
          if (code === "DOWNGRADE_USERS_OVER_LIMIT" || code === "KEEP_PROJECTS_REQUIRED" || code === "TOO_MANY_PROJECTS") {
            setError(getErrorMessage(err, language));
            return true;
          }
          return false;
        },
      },
    );
    if (!result) return;
    if (result.amountDuePaisa) {
      onClose();
      onUpgradeNeedsPayment(target.id);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={(o) => !o && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {target ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                {isUpgrade ? <ArrowUpRight className="size-5 text-success" aria-hidden /> : <ArrowDownRight className="size-5 text-warning" aria-hidden />}
                Switch to {target.name}
              </DialogTitle>
              <DialogDescription>
                {isUpgrade
                  ? `Upgrades start once your payment of ${formatPKR(target.pricePaisa)} is approved. You'll upload the slip next.`
                  : subscription.status === "ACTIVE" && subscription.currentPeriodEnd
                    ? `The change takes effect at the end of your current period (${formatDate(subscription.currentPeriodEnd)}).`
                    : "The change takes effect once its payment is approved."}
              </DialogDescription>
            </DialogHeader>
            {usersOver ? (
              <InlineAlert tone="warning">
                You have {subscription.usage.officeUsers.used} office users; {target.name} allows {target.maxOfficeUsers}. Deactivate some PMs first.
              </InlineAlert>
            ) : null}
            {needsPick ? (
              <div className="space-y-3">
                <InlineAlert tone="warning">
                  {target.name} allows {limit} active projects and you have {used}. Choose which stay active — the others become read-only.
                </InlineAlert>
                {active.isLoading || closeout.isLoading ? (
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" aria-label="Loading projects" />
                ) : (
                  <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border p-2">
                    {countedProjects.map((p) => {
                      const checked = keep.includes(p.id);
                      const disabled = !checked && limit !== null && keep.length >= limit;
                      return (
                        <li key={p.id}>
                          <label className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted">
                            <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => toggle(p.id)} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{p.name}</span>
                              <span className="text-xs text-muted-foreground">{p.code}</span>
                            </span>
                            <StatusBadge domain="project" value={p.status} />
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {keep.length} of {limit} selected
                </p>
              </div>
            ) : null}
            {error ? <InlineAlert>{error}</InlineAlert> : null}
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={() => void submit()} disabled={isLoading || usersOver}>
                {isLoading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
                {isUpgrade ? "Continue to payment" : "Confirm change"}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
