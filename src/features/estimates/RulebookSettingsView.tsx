"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PencilLine, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDeleteRulebookOverrideMutation, useGetCompanyRulebookQuery, useSetRulebookOverridesMutation } from "@/api/services/estimates.api";
import type { CompanyRulebook, CompanyRulebookParameter, RulebookGroup } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { InlineAlert } from "@/components/common/InlineAlert";
import { useCan } from "@/components/common/PermissionGate";
import { RequireAccess } from "@/components/common/RequireAccess";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { NumberField } from "@/components/forms/NumberField";
import { TextareaField } from "@/components/forms/TextareaField";
import { PageHeader } from "@/components/layout/PageHeader";
import { Switch } from "@/components/ui/switch";
import { useMutationToast } from "@/hooks/useMutationToast";
import { msg } from "@/i18n/message";
import { useEnumT, useLanguage, useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { fmt, localized } from "./labels";

const GROUPS: RulebookGroup[] = ["WALLS", "MASONRY", "CONCRETE", "STEEL", "PLASTER", "FACTORS", "WASTAGE", "WATERPROOFING", "FINISHES", "MEP", "EARTHWORK", "OVERHEADS", "NORMS", "PRODUCTIVITY"];

/** Settings → Rulebook: the resolved company rulebook with the company's own values (Step 11). */
export function RulebookSettingsView() {
  const t = useT();
  return (
    <RequireAccess permission="rulebook.override.view">
      <PageHeader title={t("estimates.rulebook.title")} description={t("estimates.rulebook.desc")} breadcrumbs={[{ label: t("crumb.settings") }, { label: t("estimates.rulebook.title") }]} />
      <RulebookBody />
    </RequireAccess>
  );
}

export function RulebookBody() {
  const t = useT();
  const te = useEnumT();
  const language = useLanguage();
  const canManage = useCan("rulebook.override.manage");
  const q = useGetCompanyRulebookQuery();
  const [search, setSearch] = useState("");
  const [onlyCompany, setOnlyCompany] = useState(false);
  const [editing, setEditing] = useState<CompanyRulebookParameter | null>(null);
  const [removing, setRemoving] = useState<CompanyRulebookParameter | null>(null);
  const [remove, { isLoading: removingBusy }] = useDeleteRulebookOverrideMutation();
  const run = useMutationToast();
  const label = (p: CompanyRulebookParameter) => localized(p.label, language);
  const groups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const params = (q.data?.parameters ?? []).filter(
      (p) =>
        (!onlyCompany || p.companyValue !== null) &&
        (!needle || [p.key, p.label.en, p.label.roman, p.label.ur, p.description].some((s) => s.toLowerCase().includes(needle))),
    );
    return GROUPS.map((g) => ({ group: g, params: params.filter((p) => p.group === g) })).filter((g) => g.params.length);
  }, [q.data, search, onlyCompany]);

  if (q.isLoading) return <CardsSkeleton count={3} height="h-40" />;
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const rb = q.data;

  const columns: Column<CompanyRulebookParameter>[] = [
    {
      id: "parameter",
      header: t("estimates.rulebook.col.parameter"),
      cell: (p) => (
        <div className="min-w-52 max-w-md space-y-0.5">
          <p className="font-medium">{label(p)}</p>
          <p className="text-xs text-muted-foreground">{p.description}</p>
          {p.projectOverridable ? <p className="text-xs text-muted-foreground">{t("estimates.rulebook.projectOverridable")}</p> : null}
        </div>
      ),
    },
    {
      id: "value",
      header: t("estimates.rulebook.col.value"),
      align: "right",
      cell: (p) => (
        <div className="space-y-1">
          <p className="tabular font-semibold">
            <bdi>
              {fmt(p.value)} {p.unit}
            </bdi>
          </p>
          <StatusBadge tone={p.source === "COMPANY" ? "info" : "neutral"} label={t(`estimates.rulebook.source.${p.source}`)} />
        </div>
      ),
    },
    { id: "platform", header: t("estimates.rulebook.col.platform"), align: "right", cell: (p) => <span className="tabular text-muted-foreground">{fmt(p.platformValue)}</span> },
    {
      id: "company",
      header: t("estimates.rulebook.col.company"),
      cell: (p) =>
        p.companyValue === null ? (
          "—"
        ) : (
          <div className="max-w-60 space-y-0.5">
            <p className="tabular font-medium">{fmt(p.companyValue)}</p>
            {p.companyNote ? <p className="text-xs text-muted-foreground">{p.companyNote}</p> : null}
          </div>
        ),
    },
    {
      id: "range",
      header: t("estimates.rulebook.col.range"),
      cell: (p) => <span className="tabular whitespace-nowrap">{t("estimates.rulebook.range", { min: fmt(p.safeMin), max: fmt(p.safeMax) })}</span>,
    },
    {
      id: "review",
      header: t("estimates.rulebook.col.review"),
      cell: (p) => (
        <StatusBadge tone={p.reviewStatus === "REVIEWED" ? "success" : "warning"} label={t(`estimates.rulebook.review.${p.reviewStatus}`)} />
      ),
    },
    {
      ...ACTIONS_COLUMN,
      hidden: !canManage,
      cell: (p) => (
        <RowActions
          name={label(p)}
          actions={[
            { label: t("estimates.rulebook.edit"), icon: PencilLine, onSelect: () => setEditing(p) },
            ...(p.companyValue !== null ? [{ label: t("estimates.rulebook.remove"), icon: Undo2, destructive: true, separatorBefore: true, onSelect: () => setRemoving(p) }] : []),
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 text-sm">
            <p className="font-medium">{t("estimates.rulebook.region", { region: te("region", rb.region) })}</p>
            <p className="text-muted-foreground" data-testid="rulebook-version">
              {rb.rulebook ? t("estimates.rulebook.version", { n: rb.rulebook.version, date: formatDate(rb.rulebook.publishedAt?.slice(0, 10)) }) : t("estimates.rulebook.builtIn")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <SearchInput value={search} onChange={setSearch} placeholder={t("estimates.rulebook.search")} className="w-64 max-w-full" />
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={onlyCompany} onCheckedChange={setOnlyCompany} />
              {t("estimates.rulebook.onlyCompany")}
            </label>
          </div>
        </div>
      </SectionCard>
      {rb.parameters.some((p) => p.reviewStatus === "PENDING_ENGINEER_REVIEW") ? <InlineAlert tone="warning">{t("estimates.rulebook.pendingNote")}</InlineAlert> : null}
      {!groups.length ? (
        <SectionCard>
          <p className="text-sm text-muted-foreground">{t("estimates.rulebook.noMatch")}</p>
        </SectionCard>
      ) : (
        groups.map((g) => (
          <SectionCard key={g.group} title={t(`estimates.rulebook.group.${g.group}`)} flush>
            <div data-group={g.group}>
              <DataTable rows={g.params} columns={columns} getRowId={(p) => p.key} clientPageSize={0} empty={{ title: t("estimates.rulebook.noMatch") }} />
            </div>
          </SectionCard>
        ))
      )}
      <OverrideSlideOver rulebook={rb} parameter={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(o) => (!o ? setRemoving(null) : undefined)}
        title={removing ? t("estimates.rulebook.removeTitle", { parameter: label(removing) }) : ""}
        description={removing ? t("estimates.rulebook.removeBody", { value: `${fmt(removing.platformValue)} ${removing.unit}` }) : undefined}
        confirmLabel={t("estimates.rulebook.remove")}
        loading={removingBusy}
        onConfirm={async () => {
          if (!removing) return;
          const r = await run(() => remove(removing.key).unwrap(), { success: t("estimates.rulebook.removed") });
          if (r) setRemoving(null);
        }}
      />
    </div>
  );
}

/** Form rules of one company value: inside the parameter's safe range (the API checks again). */
export function overrideValueSchema(p: Pick<CompanyRulebookParameter, "safeMin" | "safeMax">) {
  return z.object({
    value: z
      .number({ error: msg("validation.required", { label: "estimates.rulebook.valueLabel" }) })
      .nullable()
      .refine((v): v is number => v !== null, msg("validation.required", { label: "estimates.rulebook.valueLabel" }))
      .refine((v) => v === null || v >= p.safeMin, msg("validation.atLeast", { label: "estimates.rulebook.valueLabel", n: p.safeMin }))
      .refine((v) => v === null || v <= p.safeMax, msg("validation.atMost", { label: "estimates.rulebook.valueLabel", n: p.safeMax })),
    note: z.string().trim().max(300),
  });
}

function OverrideSlideOver({ rulebook, parameter: p, onClose }: { rulebook: CompanyRulebook; parameter: CompanyRulebookParameter | null; onClose: () => void }) {
  const t = useT();
  const te = useEnumT();
  const language = useLanguage();
  const [save, { isLoading }] = useSetRulebookOverridesMutation();
  const run = useMutationToast();
  const schema = useMemo(() => overrideValueSchema(p ?? { safeMin: -Infinity, safeMax: Infinity }), [p]);
  type Values = z.input<typeof schema>;
  const form = useForm<Values>({ resolver: zodResolver(schema), values: { value: p?.companyValue ?? p?.value ?? null, note: p?.companyNote ?? "" } });
  const onSubmit = async (v: Values) => {
    if (!p || v.value === null) return;
    const r = await run(() => save({ overrides: [{ key: p.key, value: v.value as number, ...(v.note.trim() ? { note: v.note.trim() } : {}) }] }).unwrap(), {
      success: t("estimates.rulebook.saved", { parameter: localized(p.label, language) }),
      setError: form.setError,
      codeFields: { OUT_OF_SAFE_RANGE: "value", UNKNOWN_PARAMETER: "value" },
    });
    if (r) onClose();
  };
  return (
    <SlideOver
      open={Boolean(p)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={p ? localized(p.label, language) : ""}
      description={p?.description}
      busy={isLoading}
      footer={<FormActions formId="rulebook-override" submitLabel={t("common.save")} loading={isLoading} onCancel={onClose} />}
    >
      {p ? (
        <Form form={form} onSubmit={onSubmit} id="rulebook-override">
          <NumberField
            name="value"
            label={t("estimates.rulebook.valueLabel")}
            required
            unit={p.unit}
            decimals={4}
            allowNegative={p.safeMin < 0}
            hint={t("estimates.rulebook.valueHint", { min: fmt(p.safeMin), max: fmt(p.safeMax), platform: fmt(p.platformValue) })}
          />
          <TextareaField name="note" label={t("estimates.rulebook.noteLabel")} rows={2} />
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={p.reviewStatus === "REVIEWED" ? "success" : "warning"} label={t(`estimates.rulebook.review.${p.reviewStatus}`)} />
            <span className="text-xs text-muted-foreground">{te("region", rulebook.region)}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t("estimates.rulebook.appliesNote")}</p>
        </Form>
      ) : null}
    </SlideOver>
  );
}
