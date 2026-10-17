"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BookPlus, ExternalLink, Pencil, Rocket, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  useCreateAdminRulebookMutation,
  useDeleteAdminRulebookMutation,
  useGetAdminRulebookQuery,
  useGetAdminRulebooksQuery,
  usePublishAdminRulebookMutation,
  useUpdateAdminRulebookMutation,
  useUpdateAdminRulebookParameterMutation,
} from "@/api/services/admin/rulebooks.api";
import type { AdminRulebook, AdminRulebookDetail, AdminRulebookParameter, RulebookGroup, RulebookRegion } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ErrorState } from "@/components/common/ErrorState";
import { FilterBar, FilterSelect } from "@/components/common/FilterBar";
import { InlineAlert } from "@/components/common/InlineAlert";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { NumberField } from "@/components/forms/NumberField";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { formatDate } from "@/lib/dates";
import { REGION_LABEL } from "@/lib/options";

/**
 * Platform console → Rulebook (Step 11): estimation rulebook versions per region. A new
 * version is a DRAFT copied from the published one; values and safe ranges change only in a
 * DRAFT, review status any time; publishing makes companies of that region use it.
 * (Platform console — English only, like the rest of it.)
 */
const GROUPS: RulebookGroup[] = ["WALLS", "MASONRY", "CONCRETE", "STEEL", "PLASTER", "FACTORS", "WASTAGE", "WATERPROOFING", "FINISHES", "MEP", "EARTHWORK", "OVERHEADS", "NORMS", "PRODUCTIVITY"];
const GROUP_LABEL: Record<RulebookGroup, string> = {
  WALLS: "Walls",
  MASONRY: "Masonry",
  CONCRETE: "Concrete",
  STEEL: "Steel",
  PLASTER: "Plaster",
  FACTORS: "Dry-volume factors",
  WASTAGE: "Wastage",
  WATERPROOFING: "Waterproofing",
  FINISHES: "Finishes",
  MEP: "Electrical & plumbing",
  EARTHWORK: "Earthwork",
  OVERHEADS: "Overheads & contingency",
  NORMS: "Norms (checks)",
  PRODUCTIVITY: "Productivity & curing",
};
const REGIONS: RulebookRegion[] = ["PUNJAB_KP", "KARACHI_SINDH"];
const n = (v: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(v);

function ReviewBadge({ status }: { status: AdminRulebookParameter["reviewStatus"] }) {
  return status === "REVIEWED" ? <StatusBadge tone="success" label="Reviewed" /> : <StatusBadge tone="warning" label="Pending engineer review" />;
}

// ─── Versions ───────────────────────────────────────────────────────────────

const createSchema = z.object({ region: z.enum(["PUNJAB_KP", "KARACHI_SINDH"]), copyFromId: z.string(), notes: z.string().trim().max(1000) });
type CreateValues = z.input<typeof createSchema>;

function CreateVersionSlideOver({ open, onOpenChange, versions }: { open: boolean; onOpenChange: (open: boolean) => void; versions: AdminRulebook[] }) {
  const router = useRouter();
  const [create, { isLoading }] = useCreateAdminRulebookMutation();
  const run = useMutationToast();
  const form = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: { region: "PUNJAB_KP", copyFromId: "LATEST", notes: "" } });
  const region = useWatch({ control: form.control, name: "region" });
  const sources = versions.filter((v) => v.region === region);
  const onSubmit = async (v: CreateValues) => {
    const r = await run(
      () => create({ region: v.region, ...(v.notes ? { notes: v.notes } : {}), ...(v.copyFromId !== "LATEST" ? { copyFromId: v.copyFromId } : {}) }).unwrap(),
      { success: (d) => `${REGION_LABEL[d.region]} v${d.version} created as a draft`, setError: form.setError, codeFields: { INVALID_SOURCE: "copyFromId" } },
    );
    if (r) {
      onOpenChange(false);
      form.reset();
      router.push(`/admin/rulebook/${r.id}`);
    }
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title="New rulebook version"
      description="A draft copy you can edit and then publish. Companies keep using the published version until then."
      busy={isLoading}
      footer={<FormActions formId="rulebook-create" submitLabel="Create draft" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="rulebook-create">
        <SelectField name="region" label="Region" options={REGIONS.map((r) => ({ value: r, label: REGION_LABEL[r] ?? r }))} />
        <SelectField
          name="copyFromId"
          label="Copy values from"
          options={[{ value: "LATEST", label: "Latest version of the region" }, ...sources.map((s) => ({ value: s.id, label: `v${s.version} · ${s.status === "PUBLISHED" ? "published" : "draft"}` }))]}
        />
        <TextareaField name="notes" label="Notes" rows={3} placeholder="What changes in this version" />
      </Form>
    </SlideOver>
  );
}

export function AdminRulebooksView() {
  const router = useRouter();
  const [region, setRegion] = useState("");
  const { data, isLoading, error, refetch } = useGetAdminRulebooksQuery(region ? { region: region as RulebookRegion } : undefined);
  const all = useGetAdminRulebooksQuery();
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<AdminRulebook | null>(null);
  const [remove, { isLoading: deleting }] = useDeleteAdminRulebookMutation();
  const run = useMutationToast();
  const open = (r: AdminRulebook) => router.push(`/admin/rulebook/${r.id}`);
  const columns: Column<AdminRulebook>[] = [
    { id: "region", header: "Region", cell: (r) => <span className="font-medium">{REGION_LABEL[r.region] ?? r.region}</span>, sortValue: (r) => r.region },
    { id: "version", header: "Version", cell: (r) => <span className="tabular">v{r.version}</span>, sortValue: (r) => r.version },
    { id: "status", header: "Status", cell: (r) => <StatusBadge domain="rulebookVersion" value={r.status} /> },
    { id: "published", header: "Published", cell: (r) => (r.publishedAt ? formatDate(r.publishedAt.slice(0, 10)) : "—") },
    { id: "params", header: "Parameters", align: "right", cell: (r) => <span className="tabular">{r.parameterCount}</span> },
    {
      id: "pending",
      header: "Pending review",
      align: "right",
      cell: (r) => (r.pendingReview ? <StatusBadge tone="warning" label={`${r.pendingReview} pending`} /> : <StatusBadge tone="success" label="All reviewed" />),
    },
    { id: "notes", header: "Notes", cell: (r) => <span className="line-clamp-2 max-w-md text-muted-foreground">{r.notes ?? "—"}</span> },
    {
      ...ACTIONS_COLUMN,
      cell: (r) => (
        <RowActions
          name={`${REGION_LABEL[r.region]} v${r.version}`}
          actions={[
            { label: "Open", icon: ExternalLink, onSelect: () => open(r) },
            ...(r.status === "DRAFT" ? [{ label: "Delete draft", icon: Trash2, destructive: true, separatorBefore: true, onSelect: () => setToDelete(r) }] : []),
          ]}
        />
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Rulebook"
        description="Estimation rules of thumb per region. Edit a draft version, then publish it — approved estimates keep the version they froze."
        breadcrumbs={[{ label: "Rulebook" }]}
        actions={
          <Button onClick={() => setCreating(true)}>
            <BookPlus data-icon="inline-start" />
            New version
          </Button>
        }
      />
      <FilterBar>
        <FilterSelect label="Region" value={region} onChange={setRegion} allLabel="All regions" options={REGIONS.map((r) => ({ value: r, label: REGION_LABEL[r] ?? r }))} />
      </FilterBar>
      <SectionCard flush>
        <DataTable rows={data} columns={columns} getRowId={(r) => r.id} loading={isLoading} error={error} onRetry={refetch} onRowClick={open} clientPageSize={25} empty={{ title: "No rulebook versions yet" }} />
      </SectionCard>
      <CreateVersionSlideOver open={creating} onOpenChange={setCreating} versions={all.data ?? []} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete draft ${toDelete ? `${REGION_LABEL[toDelete.region]} v${toDelete.version}` : ""}?`}
        description="The draft and its values are removed. Published versions are never deleted."
        confirmLabel="Delete draft"
        loading={deleting}
        onConfirm={async () => {
          if (!toDelete) return;
          const r = await run(() => remove(toDelete.id).unwrap(), { success: "Draft deleted" });
          if (r) setToDelete(null);
        }}
      />
    </>
  );
}

// ─── One version ────────────────────────────────────────────────────────────

const paramSchema = z
  .object({
    value: z.number({ error: "Required" }).nullable(),
    safeMin: z.number({ error: "Required" }).nullable(),
    safeMax: z.number({ error: "Required" }).nullable(),
    reviewStatus: z.enum(["PENDING_ENGINEER_REVIEW", "REVIEWED"]),
  })
  .superRefine((v, ctx) => {
    for (const k of ["value", "safeMin", "safeMax"] as const) if (v[k] === null) ctx.addIssue({ code: "custom", path: [k], message: "Required" });
    if (v.safeMin !== null && v.safeMax !== null && v.safeMin > v.safeMax) ctx.addIssue({ code: "custom", path: ["safeMax"], message: "Must be at least the minimum" });
    if (v.value !== null && v.safeMin !== null && v.safeMax !== null && (v.value < v.safeMin || v.value > v.safeMax))
      ctx.addIssue({ code: "custom", path: ["value"], message: "Must be inside the safe range" });
  });
type ParamValues = z.input<typeof paramSchema>;

function ParameterSlideOver({ rulebook, parameter: p, onClose }: { rulebook: AdminRulebookDetail; parameter: AdminRulebookParameter | null; onClose: () => void }) {
  const [update, { isLoading }] = useUpdateAdminRulebookParameterMutation();
  const run = useMutationToast();
  const draft = rulebook.status === "DRAFT";
  const form = useForm<ParamValues>({
    resolver: zodResolver(paramSchema),
    values: { value: p?.value ?? null, safeMin: p?.safeMin ?? null, safeMax: p?.safeMax ?? null, reviewStatus: p?.reviewStatus ?? "PENDING_ENGINEER_REVIEW" },
  });
  const onSubmit = async (v: ParamValues) => {
    if (!p) return;
    const body = draft
      ? { value: v.value as number, safeMin: v.safeMin as number, safeMax: v.safeMax as number, reviewStatus: v.reviewStatus }
      : { reviewStatus: v.reviewStatus };
    const r = await run(() => update({ id: rulebook.id, key: p.key, body }).unwrap(), {
      success: `${p.label.en} saved`,
      setError: form.setError,
      codeFields: { OUT_OF_SAFE_RANGE: "value", INVALID_RANGE: "safeMax" },
    });
    if (r) onClose();
  };
  return (
    <SlideOver
      open={Boolean(p)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={p ? p.label.en : ""}
      description={p ? `${p.key} · ${p.description}` : undefined}
      busy={isLoading}
      footer={<FormActions formId="rulebook-param" submitLabel="Save parameter" loading={isLoading} onCancel={onClose} />}
    >
      {p ? (
        <Form form={form} onSubmit={onSubmit} id="rulebook-param">
          {!draft ? <InlineAlert tone="info">This version is published — only the review status can change. Create a new version to change values.</InlineAlert> : null}
          <NumberField name="value" label="Value" unit={p.unit} decimals={4} allowNegative disabled={!draft} required />
          <FieldGrid>
            <NumberField name="safeMin" label="Safe minimum" unit={p.unit} decimals={4} allowNegative disabled={!draft} required />
            <NumberField name="safeMax" label="Safe maximum" unit={p.unit} decimals={4} allowNegative disabled={!draft} required />
          </FieldGrid>
          <SelectField
            name="reviewStatus"
            label="Engineer review"
            options={[
              { value: "PENDING_ENGINEER_REVIEW", label: "Pending engineer review" },
              { value: "REVIEWED", label: "Reviewed by a civil engineer" },
            ]}
          />
          <dl className="grid gap-1 text-xs text-muted-foreground">
            <div>
              <dt className="inline font-medium">Roman Urdu: </dt>
              <dd className="inline">{p.label.roman}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Urdu: </dt>
              <dd className="inline" dir="rtl">
                {p.label.ur}
              </dd>
            </div>
          </dl>
        </Form>
      ) : null}
    </SlideOver>
  );
}

function NotesSlideOver({ rulebook, open, onOpenChange }: { rulebook: AdminRulebookDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [update, { isLoading }] = useUpdateAdminRulebookMutation();
  const run = useMutationToast();
  const form = useForm<{ notes: string }>({ values: { notes: rulebook.notes ?? "" } });
  const onSubmit = async (v: { notes: string }) => {
    const r = await run(() => update({ id: rulebook.id, notes: v.notes.trim() || null }).unwrap(), { success: "Notes saved" });
    if (r) onOpenChange(false);
  };
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title="Version notes"
      busy={isLoading}
      footer={<FormActions formId="rulebook-notes" submitLabel="Save notes" loading={isLoading} onCancel={() => onOpenChange(false)} />}
    >
      <Form form={form} onSubmit={onSubmit} id="rulebook-notes">
        <TextareaField name="notes" label="Notes" rows={5} />
      </Form>
    </SlideOver>
  );
}

export function AdminRulebookDetailView({ rulebookId }: { rulebookId: string }) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useGetAdminRulebookQuery(rulebookId);
  const [publish, { isLoading: publishing }] = usePublishAdminRulebookMutation();
  const [remove, { isLoading: deleting }] = useDeleteAdminRulebookMutation();
  const run = useMutationToast();
  const [editing, setEditing] = useState<AdminRulebookParameter | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [confirm, setConfirm] = useState<"publish" | "delete" | null>(null);
  const groups = useMemo(
    () => GROUPS.map((g) => ({ group: g, params: (data?.parameters ?? []).filter((p) => p.group === g).sort((a, b) => a.sortOrder - b.sortOrder) })).filter((g) => g.params.length),
    [data],
  );
  if (isLoading) return <CardsSkeleton count={3} height="h-40" />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;
  const draft = data.status === "DRAFT";
  const name = `${REGION_LABEL[data.region] ?? data.region} v${data.version}`;
  const pending = data.parameters.filter((p) => p.reviewStatus === "PENDING_ENGINEER_REVIEW").length;
  const columns: Column<AdminRulebookParameter>[] = [
    {
      id: "parameter",
      header: "Parameter",
      cell: (p) => (
        <div className="min-w-52 max-w-md space-y-0.5">
          <p className="font-medium">{p.label.en}</p>
          <p className="font-mono text-xs text-muted-foreground">{p.key}</p>
          <p className="text-xs text-muted-foreground">{p.description}</p>
        </div>
      ),
    },
    { id: "value", header: "Value", align: "right", cell: (p) => <span className="tabular font-semibold">{`${n(p.value)} ${p.unit}`}</span> },
    { id: "range", header: "Safe range", cell: (p) => <span className="tabular whitespace-nowrap">{`${n(p.safeMin)} – ${n(p.safeMax)}`}</span> },
    { id: "review", header: "Review", cell: (p) => <ReviewBadge status={p.reviewStatus} /> },
    {
      ...ACTIONS_COLUMN,
      cell: (p) => <RowActions name={p.label.en} actions={[{ label: draft ? "Edit" : "Review status", icon: Pencil, onSelect: () => setEditing(p) }]} />,
    },
  ];
  return (
    <>
      <PageHeader
        title={name}
        meta={<StatusBadge domain="rulebookVersion" value={data.status} />}
        description={data.publishedAt ? `Published ${formatDate(data.publishedAt.slice(0, 10))}` : "Draft — companies don't use it until it is published."}
        breadcrumbs={[{ label: "Rulebook", href: "/admin/rulebook" }, { label: name }]}
        actions={
          <span className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setNotesOpen(true)}>
              <Pencil data-icon="inline-start" />
              Notes
            </Button>
            {draft ? (
              <>
                <Button variant="outline" onClick={() => setConfirm("delete")}>
                  <Trash2 data-icon="inline-start" />
                  Delete draft
                </Button>
                <Button onClick={() => setConfirm("publish")}>
                  <Rocket data-icon="inline-start" />
                  Publish
                </Button>
              </>
            ) : null}
          </span>
        }
      />
      <div className="space-y-6">
        {data.notes ? <p className="max-w-3xl text-sm text-muted-foreground">{data.notes}</p> : null}
        {pending ? (
          <InlineAlert tone="warning">
            {pending} of {data.parameters.length} values are still pending civil-engineer review — companies see them flagged.
          </InlineAlert>
        ) : null}
        {groups.map((g) => (
          <SectionCard key={g.group} title={GROUP_LABEL[g.group]} flush>
            <DataTable rows={g.params} columns={columns} getRowId={(p) => p.key} clientPageSize={0} empty={{ title: "No parameters" }} />
          </SectionCard>
        ))}
      </div>
      <ParameterSlideOver rulebook={data} parameter={editing} onClose={() => setEditing(null)} />
      <NotesSlideOver rulebook={data} open={notesOpen} onOpenChange={setNotesOpen} />
      <ConfirmDialog
        open={confirm === "publish"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Publish ${name}?`}
        description={`From now on every company in ${REGION_LABEL[data.region]} estimates with these values. Approved estimates keep the version they froze. A published version can't be edited.`}
        confirmLabel="Publish"
        tone="default"
        loading={publishing}
        onConfirm={async () => {
          const r = await run(() => publish(data.id).unwrap(), { success: `${name} published` });
          if (r) setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Delete draft ${name}?`}
        description="The draft and its values are removed."
        confirmLabel="Delete draft"
        loading={deleting}
        onConfirm={async () => {
          const r = await run(() => remove(data.id).unwrap(), { success: "Draft deleted" });
          if (r) {
            setConfirm(null);
            router.push("/admin/rulebook");
          }
        }}
      />
    </>
  );
}
