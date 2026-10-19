"use client";

import { Link2, Link2Off, Loader2 } from "lucide-react";
import { useState } from "react";
import { useListShareLinksQuery, useRevokeShareLinkMutation } from "@/api/services/shareLinks.api";
import type { ShareLink, ShareLinkStatus, ShareRefType } from "@/api/types";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import type { PermissionKey } from "@/lib/permissions";
import type { StatusTone } from "@/lib/status";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";
import { useCan } from "./PermissionGate";
import { QueryState } from "./QueryState";
import { SlideOver } from "./SlideOver";
import { StatusBadge } from "./StatusBadge";

/**
 * Owner decision 2 · the permission that shares each kind of document — the API asks the same one
 * to list / revoke its links (shareLinks.service.ts SHARE_PERMISSION).
 */
export const SHARE_PERMISSION: Record<ShareRefType, PermissionKey> = {
  QUOTE: "sales.quote.view",
  ESTIMATE: "projects.estimate.view",
  SHOPPING_LIST: "projects.estimate.view",
  CHANGE_ORDER: "changeorder.view",
  INVOICE: "billing.invoice.view",
  RECEIPT: "billing.payment.view",
  STATEMENT: "billing.invoice.view",
  HANDOVER: "closeout.handover.manage",
};

const TONE: Record<ShareLinkStatus, StatusTone> = { ACTIVE: "success", EXPIRED: "neutral", REVOKED: "danger" };

/**
 * "Shared links" next to a document's WhatsApp button: a slide-over with every link made for the
 * document (who shared it and when, expiry, status) and "Link band karo" / "Revoke link" with a
 * confirmation. Hidden without the document's share permission.
 */
export function SharedLinksButton({ refType, refId, size = "sm" }: { refType: ShareRefType; refId: string; size?: "sm" | "default" }) {
  const t = useT();
  const allowed = useCan(SHARE_PERMISSION[refType]);
  const [open, setOpen] = useState(false);
  if (!allowed) return null;
  return (
    <>
      <Button type="button" size={size} variant="outline" onClick={() => setOpen(true)}>
        <Link2 aria-hidden />
        {t("app.components.sharedLinks.button")}
      </Button>
      {open ? <SharedLinksPanel refType={refType} refId={refId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function SharedLinksPanel({ refType, refId, onClose }: { refType: ShareRefType; refId: string; onClose: () => void }) {
  const t = useT();
  const query = useListShareLinksQuery({ refType, refId }, { refetchOnMountOrArgChange: true });
  const [revoke, { isLoading }] = useRevokeShareLinkMutation();
  const run = useMutationToast();
  const [confirm, setConfirm] = useState<ShareLink | null>(null);

  const submit = async () => {
    if (!confirm) return;
    const done = await run(() => revoke({ refType, refId, id: confirm.id }).unwrap(), { success: t("app.components.sharedLinks.revoked") });
    if (done) setConfirm(null);
  };

  return (
    <SlideOver open onOpenChange={(o) => (!o ? onClose() : undefined)} title={t("app.components.sharedLinks.title")} description={t("app.components.sharedLinks.desc")}>
      <QueryState query={query}>
        {(links) =>
          links.length === 0 ? (
            <EmptyState icon={Link2} title={t("app.components.sharedLinks.empty")} />
          ) : (
            <ul className="space-y-3" data-testid="shared-links">
              {links.map((l) => (
                <li key={l.id} className="space-y-1.5 rounded-xl border p-3 text-sm" data-testid={`shared-link-${l.id}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-medium" dir="auto">
                      {l.fileName}
                    </span>
                    <StatusBadge tone={TONE[l.status]} label={t(`app.components.sharedLinks.status${l.status}`)} />
                  </div>
                  <p className="text-muted-foreground">
                    {l.createdBy
                      ? t("app.components.sharedLinks.sharedBy", { name: l.createdBy.name, date: formatDate(l.createdAt) })
                      : t("app.components.sharedLinks.sharedOn", { date: formatDate(l.createdAt) })}
                  </p>
                  <p className="text-muted-foreground">
                    {l.status === "REVOKED"
                      ? l.revokedBy
                        ? t("app.components.sharedLinks.revokedBy", { name: l.revokedBy.name, date: formatDate(l.revokedAt) })
                        : t("app.components.sharedLinks.revokedOn", { date: formatDate(l.revokedAt) })
                      : l.status === "EXPIRED"
                        ? t("app.components.sharedLinks.expired", { date: formatDate(l.expiresAt) })
                        : t("app.components.sharedLinks.expires", { date: formatDate(l.expiresAt) })}
                  </p>
                  {l.status === "ACTIVE" ? (
                    <div className="flex justify-end">
                      <Button type="button" size="sm" variant="outline" className="text-danger" onClick={() => setConfirm(l)}>
                        {isLoading && confirm?.id === l.id ? <Loader2 className="animate-spin" aria-hidden /> : <Link2Off aria-hidden />}
                        {t("app.components.sharedLinks.revoke")}
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )
        }
      </QueryState>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => (!o ? setConfirm(null) : undefined)}
        title={t("app.components.sharedLinks.confirmTitle")}
        description={t("app.components.sharedLinks.confirmBody")}
        confirmLabel={t("app.components.sharedLinks.revoke")}
        tone="danger"
        loading={isLoading}
        onConfirm={() => void submit()}
      />
    </SlideOver>
  );
}
