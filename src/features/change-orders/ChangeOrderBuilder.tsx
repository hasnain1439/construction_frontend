"use client";

import { Package, Plus, Trash2, Wrench, Hammer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCreateChangeOrderMutation, useGetChangeOrderQuery, useGetChangeOrderRatesQuery, useUpdateChangeOrderMutation } from "@/api/services/changeOrders.api";
import {
  PROOF_TYPES,
  type ChangeOrderDetail,
  type ChangeOrderLineKind,
  type ChangeOrderProofType,
  type ChangeOrderRateOptions,
  type ChangeOrderType,
  type CreateChangeOrderBody,
} from "@/api/types";
import { FileUpload, type UploadedFile } from "@/components/common/FileUpload";
import { InlineAlert } from "@/components/common/InlineAlert";
import { MoneyText } from "@/components/common/MoneyText";
import { usePermissions } from "@/components/common/PermissionGate";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { QuantityInput } from "@/components/forms/QuantityInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProjectPageShell } from "@/features/projects/views/ProjectModeViews";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { projectHref } from "@/lib/navigation";
import { builderTotals } from "./calc";
import { SignedMoney } from "./shared";

export interface BuilderLine {
  key: string;
  kind: ChangeOrderLineKind;
  materialId: string | null;
  laborRateId: string | null;
  description: string;
  unit: string;
  quantity: string | null;
  /** Cost rate in paisa. */
  ratePaisa: string | null;
  /** The user typed the rate (sent to the API; otherwise the API's default rate is used). */
  rateTouched: boolean;
}

let lineSeq = 0;
const newKey = () => `l${(lineSeq += 1)}`;
const emptyLine = (kind: ChangeOrderLineKind): BuilderLine => ({ key: newKey(), kind, materialId: null, laborRateId: null, description: "", unit: kind === "OTHER" ? "job" : "", quantity: null, ratePaisa: null, rateTouched: false });

function fromDetail(co: ChangeOrderDetail): BuilderLine[] {
  return co.lines.map((l) => ({
    key: newKey(),
    kind: l.kind,
    materialId: l.materialId,
    laborRateId: l.laborRateId,
    description: l.description,
    unit: l.unit,
    quantity: String(l.quantity),
    ratePaisa: l.ratePaisa ?? null,
    // Kept rates go back as they are (a manual one stays manual).
    rateTouched: l.rateSource === "MANUAL",
  }));
}

/** Project → Change Orders → New (or Edit a draft). */
export function ChangeOrderBuilderView({ projectId, changeOrderId }: { projectId: string; changeOrderId?: string }) {
  const t = useT();
  const existing = useGetChangeOrderQuery(changeOrderId ?? "", { skip: !changeOrderId });
  return (
    <ProjectPageShell projectId={projectId} crumb={changeOrderId ? t("changeOrders.builder.crumbEdit", { code: existing.data?.code ?? "" }) : t("changeOrders.builder.crumbNew")}>
      {() =>
        changeOrderId ? (
          <QueryState query={existing} skeleton={<CardsSkeleton count={3} height="h-40" />}>
            {(co) => <BuilderWithRates projectId={projectId} initial={co} />}
          </QueryState>
        ) : (
          <BuilderWithRates projectId={projectId} />
        )
      }
    </ProjectPageShell>
  );
}

function BuilderWithRates({ projectId, initial }: { projectId: string; initial?: ChangeOrderDetail }) {
  const rates = useGetChangeOrderRatesQuery(projectId);
  return (
    <QueryState query={rates} skeleton={<CardsSkeleton count={3} height="h-40" />}>
      {(options) => <ChangeOrderBuilder projectId={projectId} options={options} initial={initial} />}
    </QueryState>
  );
}

/** The mini BoQ form: items with rates, markup, days, affected milestones, proof; live totals. */
export function ChangeOrderBuilder({ projectId, options, initial }: { projectId: string; options: ChangeOrderRateOptions; initial?: ChangeOrderDetail }) {
  const t = useT();
  const router = useRouter();
  const { canSee } = usePermissions();
  const seesRates = canSee("rates");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<ChangeOrderType>(initial?.type ?? "ADDITION");
  const [markup, setMarkup] = useState(String(initial?.markupPercent ?? 0));
  const [days, setDays] = useState(String(initial?.daysImpact ?? 0));
  const [milestoneIds, setMilestoneIds] = useState<string[]>(initial?.affectedMilestones.map((m) => m.id) ?? []);
  const [lines, setLines] = useState<BuilderLine[]>(initial ? fromDetail(initial) : []);
  const [proofType, setProofType] = useState<ChangeOrderProofType | "">(initial?.proofType ?? "");
  const [proofNote, setProofNote] = useState(initial?.proofNote ?? "");
  const [proofFile, setProofFile] = useState<UploadedFile | null>(null);
  const [create, { isLoading: creating }] = useCreateChangeOrderMutation();
  const [update, { isLoading: updating }] = useUpdateChangeOrderMutation();
  const run = useMutationToast();

  const markupNumber = Number(markup) || 0;
  const totals = useMemo(() => builderTotals(lines, markupNumber, type), [lines, markupNumber, type]);
  const material = (id: string | null) => options.materials.find((m) => m.materialId === id);
  const labour = (id: string | null) => options.labour.find((l) => l.laborRateId === id);
  const patch = (key: string, change: Partial<BuilderLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...change } : l)));

  const valid = title.trim().length >= 3 && !(proofType === "VERBAL" && proofNote.trim().length < 3);

  const body = (): CreateChangeOrderBody => ({
    title: title.trim(),
    ...(description.trim() ? { description: description.trim() } : {}),
    type,
    ...(seesRates ? { markupPercent: markupNumber } : {}),
    daysImpact: Math.max(0, Math.round(Number(days) || 0)),
    affectedMilestoneIds: milestoneIds,
    lines: lines.map((l) => ({
      kind: l.kind,
      ...(l.materialId ? { materialId: l.materialId } : {}),
      ...(l.laborRateId ? { laborRateId: l.laborRateId } : {}),
      ...(l.description.trim() ? { description: l.description.trim() } : {}),
      ...(l.unit.trim() ? { unit: l.unit.trim() } : {}),
      quantity: Number(l.quantity ?? 0),
      ...(seesRates && l.ratePaisa && (l.rateTouched || (!l.materialId && !l.laborRateId)) ? { ratePaisa: l.ratePaisa } : {}),
    })),
    ...(proofType ? { proofType } : {}),
    ...(proofNote.trim() ? { proofNote: proofNote.trim() } : {}),
    ...(proofFile ? { proofAttachmentIds: [proofFile.id] } : {}),
  });

  const save = async () => {
    const saved = initial
      ? await run(() => update({ id: initial.id, body: body() }).unwrap(), { success: (r) => t("changeOrders.builder.saved", { code: r.code }) })
      : await run(() => create({ projectId, body: body() }).unwrap(), { success: (r) => t("changeOrders.builder.created", { code: r.code }) });
    if (saved) router.push(projectHref(projectId, `/change-orders/${saved.id}`));
  };

  return (
    <div className="space-y-4">
      <SectionCard title={t("changeOrders.builder.basics")}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="co-title">{t("changeOrders.builder.title")}</Label>
            <Input id="co-title" value={title} maxLength={200} placeholder={t("changeOrders.builder.titlePlaceholder")} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="co-desc">{t("changeOrders.builder.description")}</Label>
            <Textarea id="co-desc" rows={2} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("changeOrders.builder.type")}</Label>
            <SegmentedControl<ChangeOrderType>
              value={type}
              onChange={setType}
              ariaLabel={t("changeOrders.builder.type")}
              options={(["ADDITION", "DEDUCTION"] as const).map((v) => ({ value: v, label: t(`changeOrders.type.${v}`) }))}
            />
            <p className="text-xs text-muted-foreground">{t(`changeOrders.typeHint.${type}`)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {seesRates ? (
              <div className="space-y-1.5">
                <Label htmlFor="co-markup">{t("changeOrders.builder.markup")}</Label>
                <Input id="co-markup" inputMode="decimal" dir="ltr" value={markup} onChange={(e) => setMarkup(e.target.value.replace(/[^\d.]/g, ""))} />
                <p className="text-xs text-muted-foreground">{t("changeOrders.builder.markupHint")}</p>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="co-days">{t("changeOrders.builder.days")}</Label>
              <Input id="co-days" inputMode="numeric" dir="ltr" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} />
              <p className="text-xs text-muted-foreground">{t("changeOrders.builder.daysHint")}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t("changeOrders.builder.lines")}
        description={t("changeOrders.builder.linesHint")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, emptyLine("MATERIAL")])}>
              <Package data-icon="inline-start" />
              {t("changeOrders.builder.addMaterial")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, emptyLine("LABOUR")])}>
              <Hammer data-icon="inline-start" />
              {t("changeOrders.builder.addLabour")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, emptyLine("OTHER")])}>
              <Plus data-icon="inline-start" />
              {t("changeOrders.builder.addOther")}
            </Button>
          </div>
        }
      >
        {!seesRates ? (
          <InlineAlert tone="info" title={t("changeOrders.builder.ratesHidden")}>
            {null}
          </InlineAlert>
        ) : null}
        {lines.length === 0 ? <p className="text-sm text-muted-foreground">{t("changeOrders.builder.noLines")}</p> : null}
        <ul className="space-y-3">
          {lines.map((l, i) => (
            <li key={l.key} className="grid gap-3 rounded-lg border p-3 md:grid-cols-12" data-testid={`line-${i}`}>
              <div className="space-y-1.5 md:col-span-4">
                <Label>{t(`changeOrders.kind.${l.kind}`)}</Label>
                {l.kind === "MATERIAL" ? (
                  <Select
                    value={l.materialId ?? undefined}
                    onValueChange={(id) => {
                      const m = material(id);
                      patch(l.key, { materialId: id, description: m?.name ?? "", unit: m?.unit ?? "", ratePaisa: m?.ratePaisa ?? null, rateTouched: false });
                    }}
                  >
                    <SelectTrigger className="w-full" aria-label={t("changeOrders.builder.material")}>
                      <SelectValue placeholder={t("changeOrders.builder.pickMaterial")} />
                    </SelectTrigger>
                    <SelectContent>
                      {options.materials.map((m) => (
                        <SelectItem key={m.materialId} value={m.materialId}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : l.kind === "LABOUR" ? (
                  <>
                    <Select
                      value={l.laborRateId ?? undefined}
                      onValueChange={(id) => {
                        const r = labour(id);
                        patch(l.key, { laborRateId: id, description: r?.label ?? "", unit: r?.unit ?? "", ratePaisa: r?.ratePaisa ?? null, rateTouched: false });
                      }}
                    >
                      <SelectTrigger className="w-full" aria-label={t("changeOrders.builder.labour")}>
                        <SelectValue placeholder={t("changeOrders.builder.pickLabour")} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.labour.map((r) => (
                          <SelectItem key={r.laborRateId} value={r.laborRateId}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input aria-label={t("changeOrders.builder.item")} value={l.description} maxLength={300} onChange={(e) => patch(l.key, { description: e.target.value })} />
                  </>
                ) : (
                  <Input aria-label={t("changeOrders.builder.item")} value={l.description} maxLength={300} onChange={(e) => patch(l.key, { description: e.target.value })} />
                )}
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>{t("changeOrders.builder.unit")}</Label>
                <Input aria-label={t("changeOrders.builder.unit")} dir="ltr" value={l.unit} maxLength={20} onChange={(e) => patch(l.key, { unit: e.target.value })} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>{t("changeOrders.builder.qty")}</Label>
                <QuantityInput aria-label={t("changeOrders.builder.qty")} value={l.quantity} onChange={(q) => patch(l.key, { quantity: q })} />
              </div>
              {seesRates ? (
                <div className="space-y-1.5 md:col-span-2">
                  <Label>{t("changeOrders.builder.rate")}</Label>
                  <MoneyInput aria-label={t("changeOrders.builder.rate")} value={l.ratePaisa} onChange={(p) => patch(l.key, { ratePaisa: p, rateTouched: true })} />
                </div>
              ) : null}
              <div className="flex items-end justify-between gap-2 md:col-span-2">
                {seesRates ? (
                  <div className="space-y-0.5 text-end">
                    <p className="text-xs text-muted-foreground">{t("changeOrders.builder.price")}</p>
                    <MoneyText paisa={totals.lines[i]?.priceAmountPaisa ?? null} className="font-medium" />
                  </div>
                ) : (
                  <span />
                )}
                <Button type="button" size="icon" variant="ghost" aria-label={t("changeOrders.builder.removeLine", { n: i + 1 })} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {seesRates ? (
          <dl className="mt-4 ms-auto grid max-w-sm grid-cols-2 gap-2 text-sm" data-testid="builder-totals">
            <dt className="text-muted-foreground">{t("changeOrders.builder.totalCost")}</dt>
            <dd className="text-end">
              <MoneyText paisa={totals.costPaisa} />
            </dd>
            <dt className="text-muted-foreground">{t("changeOrders.builder.totalMarkup")}</dt>
            <dd className="text-end">
              <MoneyText paisa={totals.markupPaisa} />
            </dd>
            <dt className="font-semibold">{type === "DEDUCTION" ? t("changeOrders.builder.totalDeduction") : t("changeOrders.builder.totalOwner")}</dt>
            <dd className="text-end font-semibold" data-testid="builder-total">
              <SignedMoney paisa={totals.totalPaisa} />
            </dd>
          </dl>
        ) : null}
        {totals.incomplete && seesRates && lines.length ? <p className="mt-2 text-xs text-warning">{t("changeOrders.builder.incomplete", { n: totals.incomplete })}</p> : null}
      </SectionCard>

      <SectionCard title={t("changeOrders.builder.milestones")} description={t("changeOrders.builder.milestonesHint")}>
        {options.milestones.length ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {options.milestones.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={milestoneIds.includes(m.id)} onCheckedChange={(c) => setMilestoneIds((ids) => (c ? [...ids, m.id] : ids.filter((x) => x !== m.id)))} />
                {m.name}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("changeOrders.builder.noMilestones")}</p>
        )}
      </SectionCard>

      <SectionCard title={t("changeOrders.builder.proof")} description={t("changeOrders.builder.proofHint")}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("changeOrders.builder.proofType")}</Label>
            <Select value={proofType || "NONE"} onValueChange={(v) => setProofType(v === "NONE" ? "" : (v as ChangeOrderProofType))}>
              <SelectTrigger className="w-full" aria-label={t("changeOrders.builder.proofType")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">{t("changeOrders.builder.proofNone")}</SelectItem>
                {PROOF_TYPES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {t(`changeOrders.proof.${p}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {proofType === "VERBAL" ? (
            <div className="space-y-1.5">
              <Label htmlFor="co-proof-note">{t("changeOrders.builder.proofNote")}</Label>
              <Textarea id="co-proof-note" rows={2} maxLength={1000} value={proofNote} onChange={(e) => setProofNote(e.target.value)} aria-invalid={proofNote.trim().length < 3} />
              {proofNote.trim().length < 3 ? <p className="text-xs text-danger">{t("changeOrders.actions.needsNote")}</p> : null}
            </div>
          ) : proofType ? (
            <FileUpload kind="SITE_PHOTO" value={proofFile} onChange={(f) => setProofFile(f)} label={t("changeOrders.builder.proofFile")} />
          ) : null}
        </div>
      </SectionCard>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t("common.cancel")}
        </Button>
        <Button type="button" disabled={!valid || creating || updating} onClick={() => void save()}>
          <Wrench data-icon="inline-start" />
          {t("changeOrders.builder.save")}
        </Button>
      </div>
    </div>
  );
}
