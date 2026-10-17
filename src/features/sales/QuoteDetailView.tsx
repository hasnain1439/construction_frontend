"use client";

import { FilePlus2, FileText, Handshake, MessageCircle, Send, ThumbsDown, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import {
  useDeleteQuoteMutation,
  useGetQuotePdfMutation,
  useGetQuoteQuery,
  useGetQuoteRevisionsQuery,
  useMarkQuoteLostMutation,
  useMarkQuoteWonMutation,
  useRecordNegotiationMutation,
  useSendQuoteMutation,
} from "@/api/services/sales.api";
import { useGetSubscriptionQuery } from "@/api/services/subscription.api";
import { LOST_REASONS, type QuoteDetail, type QuoteLostReason, type QuoteRevision, type SharedPdf } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { InfoList } from "@/components/common/InfoList";
import { InlineAlert } from "@/components/common/InlineAlert";
import { MoneyText } from "@/components/common/MoneyText";
import { usePdfActions, whatsappUrl } from "@/components/common/PdfActions";
import { useCan } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useT, type TranslationKey } from "@/i18n/useT";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { CustomerPanel, InternalPanel, QuoteStatusBadge, useLostReasonLabel } from "./shared";

const OPEN = ["DRAFT", "SENT", "NEGOTIATION", "EXPIRED"];
const nf = (n: number) => n.toLocaleString("en-PK", { maximumFractionDigits: 2 });

/** Two revisions side by side: inputs, price, cost and each work section (delta = b − a). */
/** A money change with its sign: "+Rs 1,26,000" / "−Rs 123". */
function SignedMoney({ paisa }: { paisa: bigint }) {
  const zero = BigInt(0);
  if (paisa === zero) return <MoneyText paisa="0" />;
  return (
    <span className="inline-flex items-baseline" dir="ltr">
      {paisa > zero ? "+" : "−"}
      <MoneyText paisa={String(paisa > zero ? paisa : -paisa)} />
    </span>
  );
}

function RevisionCompare({ quoteId, latest }: { quoteId: string; latest: number }) {
  const t = useT();
  const enumT = useEnumT();
  const { data } = useGetQuoteRevisionsQuery(quoteId, { skip: latest < 2 });
  const [a, setA] = useState(String(Math.max(1, latest - 1)));
  const [b, setB] = useState(String(latest));
  const ra = data?.find((r) => String(r.revision) === a);
  const rb = data?.find((r) => String(r.revision) === b);
  const rows = useMemo(() => {
    if (!ra || !rb) return [];
    const money = (label: string, pa: string | null | undefined, pb: string | null | undefined) => ({
      label,
      a: <MoneyText paisa={pa} />,
      b: <MoneyText paisa={pb} />,
      delta: pa !== undefined && pb !== undefined && pa !== null && pb !== null ? <SignedMoney paisa={BigInt(pb) - BigInt(pa)} /> : null,
    });
    // QA-A-16: numbers show the signed change ("+200", "+1"); other values only that they changed.
    const num = (label: string, va: number, vb: number) => ({ label, a: nf(va), b: nf(vb), delta: va === vb ? null : <span className="tabular" dir="ltr">{`${vb > va ? "+" : "−"}${nf(Math.abs(vb - va))}`}</span> });
    const text = (label: string, va: string | number, vb: string | number) => ({ label, a: va, b: vb, delta: va === vb ? null : t("sales.detail.changed") });
    const sections = [...new Set([...ra.sections, ...rb.sections].map((s) => s.section))];
    return [
      money(t("sales.live.price"), ra.pricePaisa, rb.pricePaisa),
      money(t("sales.live.perSqft"), ra.perSqftPaisa, rb.perSqftPaisa),
      money(t("sales.live.cost"), ra.costPaisa, rb.costPaisa),
      money(t("sales.live.margin"), ra.marginPaisa, rb.marginPaisa),
      num(t("sales.form.coveredArea"), ra.inputs.coveredAreaSqft, rb.inputs.coveredAreaSqft),
      num(t("sales.form.floors"), ra.inputs.floors, rb.inputs.floors),
      text(t("sales.form.contractType"), enumT("projectContractType", ra.inputs.contractType), enumT("projectContractType", rb.inputs.contractType)),
      text(t("sales.form.structure"), enumT("projectStructureType", ra.inputs.structureType), enumT("projectStructureType", rb.inputs.structureType)),
      ...sections.map((s) =>
        money(
          t(`sales.section.${s}` as TranslationKey),
          ra.sections.find((x) => x.section === s)?.amountPaisa,
          rb.sections.find((x) => x.section === s)?.amountPaisa,
        ),
      ),
    ];
  }, [ra, rb, t, enumT]);
  if (latest < 2) return null;
  const pick = (value: string, onChange: (v: string) => void, label: string) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-28" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(data ?? []).map((r: QuoteRevision) => (
          <SelectItem key={r.revision} value={String(r.revision)}>
            {t("sales.pipeline.revision", { n: r.revision })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  return (
    <SectionCard
      title={t("sales.detail.compare")}
      actions={
        <div className="flex items-center gap-2">
          {pick(a, setA, t("sales.detail.compareWith", { a }))}
          {pick(b, setB, t("sales.detail.compareWith", { a: b }))}
        </div>
      }
      flush
    >
      <table className="w-full text-sm" data-testid="revision-compare">
        <thead>
          <tr className="border-b text-start text-xs text-muted-foreground">
            <th className="px-4 py-2 text-start font-medium">{t("sales.detail.item")}</th>
            <th className="px-4 py-2 text-end font-medium">{t("sales.pipeline.revision", { n: a })}</th>
            <th className="px-4 py-2 text-end font-medium">{t("sales.pipeline.revision", { n: b })}</th>
            <th className="px-4 py-2 text-end font-medium">{t("sales.detail.change")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b last:border-0">
              <td className="px-4 py-2">{r.label}</td>
              <td className="px-4 py-2 text-end">{r.a}</td>
              <td className="px-4 py-2 text-end">{r.b}</td>
              <td className="px-4 py-2 text-end text-muted-foreground">{r.delta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}

function Activity({ quote }: { quote: QuoteDetail }) {
  const t = useT();
  return (
    <SectionCard title={t("sales.detail.activity")}>
      {quote.activity.length ? (
        <ol className="space-y-3 text-sm" data-testid="quote-activity">
          {quote.activity.map((a, i) => {
            const note = typeof a.details?.["note"] === "string" ? (a.details["note"] as string) : null;
            return (
              <li key={`${a.at}-${i}`} className="border-s-2 border-border ps-3">
                <p className="font-medium">{t(`sales.detail.activityAction.${a.action.replace("quote.", "")}` as TranslationKey)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(a.at)} · {a.system ? t("sales.detail.system") : (a.by?.name ?? "—")}
                </p>
                {note ? <p className="mt-0.5 text-muted-foreground">{note}</p> : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">{t("sales.detail.noActivity")}</p>
      )}
    </SectionCard>
  );
}

type Dialog = "send" | "negotiation" | "lost" | "won" | null;

function QuoteDetailBody({ quote }: { quote: QuoteDetail }) {
  const t = useT();
  const router = useRouter();
  const run = useMutationToast();
  const readOnly = useReadOnly();
  const lostLabel = useLostReasonLabel();
  const fieldId = useId();
  const canEdit = useCan("sales.quote.edit");
  const canApprove = useCan("sales.quote.approve");
  const canCreateProject = useCan("projects.project.create");
  const canManage = useCan("sales.quote.manage");
  const seesPrice = useCan("fields.contract");
  const seesCost = useCan("fields.rates");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [shared, setShared] = useState<SharedPdf | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState<QuoteLostReason>("COMPETITOR_CHEAPER");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [send, sending] = useSendQuoteMutation();
  const [negotiate, negotiating] = useRecordNegotiationMutation();
  const [lose, losing] = useMarkQuoteLostMutation();
  const [win, winning] = useMarkQuoteWonMutation();
  // QA-A-20: warn at "won" (not after the whole wizard) when no more projects can be activated.
  const seesPlan = useCan("subscription.manage");
  const plan = useGetSubscriptionQuery(undefined, { skip: dialog !== "won" || !seesPlan });
  const projectsUsage = plan.data?.usage.activeProjects;
  const atPlanLimit = Boolean(projectsUsage && projectsUsage.limit !== null && projectsUsage.used >= projectsUsage.limit);
  const [remove] = useDeleteQuoteMutation();
  const [getPdf] = useGetQuotePdfMutation();
  const customerPdf = usePdfActions({ load: () => getPdf({ id: quote.id, variant: "customer" }).unwrap(), title: quote.number, phone: quote.client.phone });
  const internalPdf = usePdfActions({ load: () => getPdf({ id: quote.id, variant: "internal" }).unwrap(), title: quote.number });

  const open = OPEN.includes(quote.status);
  const write = !readOnly && canEdit;
  const close = () => {
    setDialog(null);
    setNote("");
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      {write && open && quote.status !== "EXPIRED" && seesPrice ? (
        <Button onClick={() => setDialog("send")}>
          <Send data-icon="inline-start" />
          {quote.status === "DRAFT" ? t("sales.detail.action.send") : t("sales.detail.action.resend")}
        </Button>
      ) : null}
      {!readOnly && canApprove && canCreateProject && open ? (
        <Button variant="success" onClick={() => setDialog("won")}>
          <Trophy data-icon="inline-start" />
          {t("sales.detail.action.won")}
        </Button>
      ) : null}
      {quote.wonProject ? (
        <Button variant="outline" asChild>
          <Link href={quote.wonProject.status === "DRAFT" ? `/projects/new?id=${quote.wonProject.id}&tab=5` : `/projects/${quote.wonProject.id}/overview`}>
            {t("sales.detail.wonProject", { code: quote.wonProject.code })}
          </Link>
        </Button>
      ) : null}
      <RowActions
        name={quote.number}
        actions={[
          { label: t("sales.detail.action.addRevision"), icon: FilePlus2, href: `/sales/quotes/${quote.id}/revise`, hidden: !write || !open },
          { label: t("sales.detail.action.negotiation"), icon: Handshake, onSelect: () => setDialog("negotiation"), hidden: !write || (quote.status !== "SENT" && quote.status !== "NEGOTIATION") },
          { label: t("sales.detail.action.lost"), icon: ThumbsDown, onSelect: () => setDialog("lost"), hidden: !write || !open },
          { label: t("sales.detail.action.customerPdf"), icon: FileText, onSelect: () => void customerPdf.act("preview"), hidden: !seesPrice, separatorBefore: true },
          { label: t("sales.detail.action.shareWhatsapp"), icon: MessageCircle, onSelect: () => void customerPdf.act("share"), hidden: !seesPrice },
          { label: t("sales.detail.action.internalPdf"), icon: FileText, onSelect: () => void internalPdf.act("preview"), hidden: !seesCost },
          {
            label: t("sales.detail.action.delete"),
            destructive: true,
            separatorBefore: true,
            hidden: readOnly || !canManage || quote.status === "WON",
            confirm: {
              title: t("sales.detail.action.delete"),
              description: t("sales.detail.deleteDesc"),
              confirmLabel: t("common.delete"),
              tone: "danger",
              onConfirm: async () => {
                const ok = await run(() => remove(quote.id).unwrap(), { success: t("sales.detail.deleted") });
                if (ok) router.push("/sales/quotes");
              },
            },
          },
        ]}
      />
    </div>
  );

  return (
    <>
      <PageHeader
        title={quote.title}
        meta={
          <>
            <QuoteStatusBadge status={quote.status} />
            <span className="text-sm text-muted-foreground tabular" dir="ltr">
              {quote.number} · {t("sales.pipeline.revision", { n: quote.revision })}
            </span>
          </>
        }
        breadcrumbs={[{ label: t("crumb.sales") }, { label: t("sales.crumbQuotes"), href: "/sales/quotes" }, { label: quote.number }]}
        actions={actions}
      />
      {customerPdf.preview}
      {internalPdf.preview}
      {shared ? (
        <InlineAlert
          tone="success"
          title={t("sales.detail.sent")}
          action={
            <Button size="sm" variant="success" asChild>
              <a href={whatsappUrl(shared.clientPhone ?? quote.client.phone, shared.whatsappText)} target="_blank" rel="noopener noreferrer">
                <MessageCircle data-icon="inline-start" />
                {t("sales.detail.action.shareWhatsapp")}
              </a>
            </Button>
          }
        />
      ) : null}
      {quote.status === "LOST" ? (
        <InlineAlert tone="danger" title={t("sales.detail.lostBecause", { reason: lostLabel(quote.lostReason) })}>
          {quote.lostNote}
        </InlineAlert>
      ) : null}
      <SectionCard title={t("sales.detail.info")}>
        <InfoList
          columns={3}
          items={[
            { label: t("sales.detail.client"), value: `${quote.client.name} · ${formatPhone(quote.client.phone)}` },
            { label: t("sales.detail.site"), value: [quote.siteAddress, quote.city].filter(Boolean).join(", ") || null },
            { label: t("sales.detail.validUntil"), value: formatDate(quote.validUntil) },
            { label: t("sales.detail.sentAt"), value: quote.sentAt ? formatDate(quote.sentAt) : null },
            { label: t("sales.detail.lastActivity"), value: formatDateTime(quote.lastActivityAt) },
            { label: t("sales.detail.createdBy"), value: quote.createdBy?.name ?? null },
            { label: t("sales.detail.notes"), value: quote.notes },
          ]}
        />
      </SectionCard>
      <div className="grid gap-6 lg:grid-cols-2">
        <InternalPanel data={quote.latest} />
        <div className="space-y-6">
          <CustomerPanel data={quote.latest} validUntil={quote.validUntil} />
          <SectionCard title={t("sales.detail.revisions")}>
            <ul className="space-y-1 text-sm">
              {quote.revisions.map((r) => (
                <li key={r.revision} className="flex items-center justify-between gap-3">
                  <span>
                    {t("sales.detail.revisionBy", { n: r.revision, date: formatDate(r.createdAt), name: r.createdBy?.name ?? "—" })}
                    {r.note ? <span className="text-muted-foreground"> · {r.note}</span> : null}
                  </span>
                  <MoneyText paisa={r.pricePaisa} />
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
      <RevisionCompare quoteId={quote.id} latest={quote.revision} />
      <Activity quote={quote} />

      <ConfirmDialog
        open={dialog === "send"}
        tone="default"
        onOpenChange={(o) => !o && close()}
        title={t("sales.detail.sendTitle", { number: quote.number })}
        description={t("sales.detail.sendDesc")}
        confirmLabel={t("sales.detail.action.send")}
        loading={sending.isLoading}
        onConfirm={async () => {
          const res = await run(() => send({ id: quote.id, body: {} }).unwrap());
          if (res) {
            setShared(res.share);
            close();
          }
        }}
      />
      <ConfirmDialog
        open={dialog === "negotiation"}
        tone="default"
        onOpenChange={(o) => !o && close()}
        title={t("sales.detail.negotiationTitle")}
        confirmLabel={t("common.save")}
        confirmDisabled={!note.trim()}
        loading={negotiating.isLoading}
        onConfirm={async () => {
          if (await run(() => negotiate({ id: quote.id, note: note.trim() }).unwrap(), { success: t("sales.detail.negotiationSaved") })) close();
        }}
      >
        <Label htmlFor={`${fieldId}-neg`}>{t("sales.detail.negotiationNote")}</Label>
        <Textarea id={`${fieldId}-neg`} value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} />
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "lost"}
        onOpenChange={(o) => !o && close()}
        title={t("sales.detail.lostTitle", { number: quote.number })}
        confirmLabel={t("sales.detail.action.lost")}
        tone="danger"
        confirmDisabled={reason === "OTHER" && !note.trim()}
        loading={losing.isLoading}
        onConfirm={async () => {
          if (await run(() => lose({ id: quote.id, body: { reason, ...(note.trim() ? { note: note.trim() } : {}) } }).unwrap(), { success: t("sales.detail.lostSaved") })) close();
        }}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${fieldId}-reason`}>{t("sales.detail.lostReason")}</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as QuoteLostReason)}>
              <SelectTrigger id={`${fieldId}-reason`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {lostLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${fieldId}-lostnote`}>{t("sales.detail.lostNote")}</Label>
            <Textarea id={`${fieldId}-lostnote`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
            {reason === "OTHER" && !note.trim() ? <p className="text-xs text-danger">{t("sales.detail.lostNoteRequired")}</p> : null}
          </div>
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "won"}
        tone="default"
        onOpenChange={(o) => !o && close()}
        title={t("sales.detail.wonTitle", { number: quote.number })}
        description={t("sales.detail.wonDesc")}
        confirmLabel={t("sales.detail.action.won")}
        loading={winning.isLoading}
        onConfirm={async () => {
          const res = await run(() => win({ id: quote.id, body: { ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) } }).unwrap(), {
            success: (r) => t("sales.detail.wonDone", { code: r.projectCode }),
          });
          if (res) {
            close();
            // The pre-filled draft opens in the New Project wizard (tabs 1–4 done → rooms next)
            router.push(`/projects/new?id=${res.projectId}&tab=5`);
          }
        }}
      >
        {atPlanLimit && projectsUsage ? (
          <InlineAlert tone="warning" title={t("sales.detail.planLimitTitle")}>
            <span data-testid="won-plan-limit">{t("sales.detail.planLimitBody", { used: projectsUsage.used, limit: projectsUsage.limit ?? 0 })}</span>
          </InlineAlert>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${fieldId}-start`}>{t("sales.detail.startDate")}</Label>
            <Input id={`${fieldId}-start`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${fieldId}-end`}>{t("sales.detail.endDate")}</Label>
            <Input id={`${fieldId}-end`} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
}

export function QuoteDetailView({ quoteId }: { quoteId: string }) {
  const query = useGetQuoteQuery(quoteId);
  return <QueryState query={query}>{(quote) => <QuoteDetailBody quote={quote} />}</QueryState>;
}
