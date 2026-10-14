"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark, Lock, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  useGetMaterialsQuery,
  useGetSuppliersQuery,
  useGetWorkersQuery,
} from "@/api/services/masterData.api";
import { useCreateOpeningBalanceMutation, useGetOpeningBalancesQuery } from "@/api/services/onboarding.api";
import { useGetProjectsQuery } from "@/api/services/projects.api";
import { useGetUsersQuery } from "@/api/services/team.api";
import type { CreateOpeningBalanceBody, OpeningBalance, OpeningKind } from "@/api/types";
import { DataTable, type Column } from "@/components/common/DataTable";
import { InlineAlert } from "@/components/common/InlineAlert";
import { MoneyText } from "@/components/common/MoneyText";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ComboboxField, type ComboboxOption } from "@/components/forms/ComboboxField";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { NumberField } from "@/components/forms/NumberField";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { msg } from "@/i18n/message";
import { useT, type TranslationKey } from "@/i18n/useT";
import { formatDate, todayPK } from "@/lib/dates";
import { formatPKR } from "@/lib/money";

const KINDS: OpeningKind[] = ["SUPPLIER_UDHAAR", "CASH_IN_HAND", "STORE_STOCK", "WORKER_PESHGI"];
const kindLabel = (k: OpeningKind) => `opening.kind${k}` as TranslationKey;
const kindHint = (k: OpeningKind) => `opening.hint${k}` as TranslationKey;

const schema = z
  .object({
    kind: z.enum(["SUPPLIER_UDHAAR", "CASH_IN_HAND", "STORE_STOCK", "WORKER_PESHGI"]),
    entityId: z.string().nullable(),
    projectId: z.string().nullable(),
    amountPaisa: z.string().nullable(),
    quantity: z.number().nullable(),
    ratePaisa: z.string().nullable(),
    date: z.string().min(1),
    note: z.string().max(300),
  })
  .superRefine((v, ctx) => {
    const need = (ok: unknown, path: string) =>
      !ok ? ctx.addIssue({ code: "custom", path: [path], message: msg("opening.required") }) : undefined;
    need(v.entityId, "entityId");
    if (v.kind === "STORE_STOCK") {
      need(v.quantity && v.quantity > 0, "quantity");
      need(v.ratePaisa !== null && v.ratePaisa !== "", "ratePaisa");
    } else need(v.amountPaisa && v.amountPaisa !== "0", "amountPaisa");
    if (v.kind === "WORKER_PESHGI") need(v.projectId, "projectId");
  });
type Values = z.infer<typeof schema>;

function toBody(v: Values): CreateOpeningBalanceBody {
  const base = { date: v.date, ...(v.note.trim() ? { note: v.note.trim() } : {}) };
  switch (v.kind) {
    case "SUPPLIER_UDHAAR":
      return { ...base, kind: v.kind, supplierId: v.entityId!, amountPaisa: v.amountPaisa! };
    case "CASH_IN_HAND":
      return { ...base, kind: v.kind, holderUserId: v.entityId!, amountPaisa: v.amountPaisa! };
    case "STORE_STOCK":
      return {
        ...base,
        kind: v.kind,
        materialId: v.entityId!,
        quantity: v.quantity!,
        ratePaisa: v.ratePaisa!,
      };
    case "WORKER_PESHGI":
      return {
        ...base,
        kind: v.kind,
        workerId: v.entityId!,
        projectId: v.projectId!,
        amountPaisa: v.amountPaisa!,
      };
  }
}

/** Options for the item picker of a kind; items that already have an opening balance are disabled. */
function useItemOptions(kind: OpeningKind, locked: Set<string>, open: boolean) {
  const suppliers = useGetSuppliersQuery({ limit: 100 }, { skip: !open || kind !== "SUPPLIER_UDHAAR" });
  const users = useGetUsersQuery(
    { limit: 100, status: "ACTIVE" },
    { skip: !open || kind !== "CASH_IN_HAND" },
  );
  const materials = useGetMaterialsQuery({}, { skip: !open || kind !== "STORE_STOCK" });
  const workers = useGetWorkersQuery(
    { limit: 100, isActive: "true" },
    { skip: !open || kind !== "WORKER_PESHGI" },
  );
  // Items that already have an opening balance are locked — they are not offered again.
  const free = (options: ComboboxOption[]) => options.filter((o) => !locked.has(o.value));
  switch (kind) {
    case "SUPPLIER_UDHAAR":
      return {
        loading: suppliers.isFetching,
        options: free(
          (suppliers.data?.items ?? []).map((s) => ({
            value: s.id,
            label: s.name,
            description: s.category ?? undefined,
          })),
        ),
      };
    case "CASH_IN_HAND":
      return {
        loading: users.isFetching,
        options: free(
          (users.data?.items ?? [])
            .filter((u) => u.role !== "THEKEDAR")
            .map((u) => ({ value: u.id, label: u.name, description: u.role })),
        ),
      };
    case "STORE_STOCK":
      return {
        loading: materials.isFetching,
        options: free(
          (materials.data ?? []).map((m) => ({ value: m.id, label: m.name, description: m.unit })),
        ),
      };
    case "WORKER_PESHGI":
      return {
        loading: workers.isFetching,
        options: free((workers.data?.items ?? []).map((w) => ({ value: w.id, label: w.name }))),
      };
  }
}

function OpeningSlideOver({
  open,
  onOpenChange,
  locked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locked: Record<OpeningKind, Set<string>>;
}) {
  const t = useT();
  const run = useMutationToast();
  const [create, { isLoading }] = useCreateOpeningBalanceMutation();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: "SUPPLIER_UDHAAR",
      entityId: null,
      projectId: null,
      amountPaisa: null,
      quantity: null,
      ratePaisa: null,
      date: todayPK(),
      note: "",
    },
  });
  const kind = useWatch({ control: form.control, name: "kind" });
  const items = useItemOptions(kind, locked[kind], open);
  const projects = useGetProjectsQuery(
    { limit: 100, status: "ACTIVE" },
    { skip: !open || kind !== "WORKER_PESHGI" },
  );
  const entityLabel: Record<OpeningKind, TranslationKey> = {
    SUPPLIER_UDHAAR: "opening.supplier",
    CASH_IN_HAND: "opening.holder",
    STORE_STOCK: "opening.material",
    WORKER_PESHGI: "opening.worker",
  };

  const onSubmit = async (v: Values) => {
    const ok = await run(() => create(toBody(v)).unwrap(), {
      setError: form.setError,
      success: t("opening.saved"),
    });
    if (ok) {
      form.reset({
        ...form.getValues(),
        entityId: null,
        projectId: null,
        amountPaisa: null,
        quantity: null,
        ratePaisa: null,
        note: "",
      });
      onOpenChange(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      busy={isLoading}
      title={t("opening.add")}
      description={t("opening.desc")}
      footer={
        <FormActions
          formId="opening-form"
          submitLabel={t("opening.save")}
          loading={isLoading}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <Form form={form} onSubmit={onSubmit} id="opening-form">
        <SelectField
          name="kind"
          label={t("opening.kind")}
          required
          options={KINDS.map((k) => ({ value: k, label: t(kindLabel(k)) }))}
          onValueChange={() => form.setValue("entityId", null)}
        />
        <p className="text-sm text-muted-foreground">{t(kindHint(kind))}</p>
        <ComboboxField
          name="entityId"
          label={t(entityLabel[kind])}
          required
          options={items.options}
          loading={items.loading}
          placeholder={t("opening.pick")}
          searchPlaceholder={t("common.searchPlaceholder")}
          emptyText={t("opening.noMatch")}
        />
        {kind === "WORKER_PESHGI" ? (
          <ComboboxField
            name="projectId"
            label={t("opening.project")}
            required
            loading={projects.isFetching}
            placeholder={t("opening.pick")}
            searchPlaceholder={t("common.searchPlaceholder")}
            options={(projects.data?.items ?? []).map((p) => ({
              value: p.id,
              label: p.name,
              description: p.code,
            }))}
          />
        ) : null}
        {kind === "STORE_STOCK" ? (
          <FieldGrid>
            <NumberField name="quantity" label={t("opening.quantity")} required decimals={3} />
            <MoneyField name="ratePaisa" label={t("opening.rate")} required />
          </FieldGrid>
        ) : (
          <MoneyField name="amountPaisa" label={t("opening.amount")} required />
        )}
        <FieldGrid>
          <DateField name="date" label={t("opening.date")} required max={todayPK()} />
          <TextField name="note" label={t("opening.note")} />
        </FieldGrid>
        <InlineAlert tone="warning">{t("opening.lockWarning")}</InlineAlert>
      </Form>
    </SlideOver>
  );
}

/** Settings → Opening balances: what was owed / held / in stock before the app, entered once per item and locked. */
export function OpeningBalancesView() {
  const t = useT();
  const readOnly = useReadOnly();
  const { data, isLoading, isFetching, error, refetch } = useGetOpeningBalancesQuery();
  const [adding, setAdding] = useState(false);
  const locked = useMemo(() => {
    const out: Record<OpeningKind, Set<string>> = {
      SUPPLIER_UDHAAR: new Set(),
      CASH_IN_HAND: new Set(),
      STORE_STOCK: new Set(),
      WORKER_PESHGI: new Set(),
    };
    for (const o of data ?? []) out[o.kind].add(o.entity.id);
    return out;
  }, [data]);

  const columns: Column<OpeningBalance>[] = [
    {
      id: "item",
      header: t("opening.colItem"),
      sortValue: (o) => o.entity.name,
      cell: (o) => <span className="font-medium">{o.entity.name}</span>,
    },
    { id: "type", header: t("opening.colType"), sortValue: (o) => o.kind, cell: (o) => t(kindLabel(o.kind)) },
    {
      id: "detail",
      header: t("opening.colDetail"),
      cell: (o) =>
        o.kind === "STORE_STOCK" ? (
          <span className="tabular" dir="ltr">
            {t("opening.stockDetail", {
              qty: o.quantity ?? 0,
              unit: o.entity.unit ?? "",
              rate: formatPKR(o.ratePaisa ?? "0"),
            })}
          </span>
        ) : o.project ? (
          `${o.project.name} (${o.project.code})`
        ) : (
          "—"
        ),
    },
    {
      id: "amount",
      header: t("opening.colAmount"),
      align: "right",
      sortValue: (o) => Number(o.amountPaisa),
      cell: (o) => <MoneyText paisa={o.amountPaisa} className="font-medium" />,
    },
    { id: "date", header: t("opening.colDate"), sortValue: (o) => o.date, cell: (o) => formatDate(o.date) },
    {
      id: "by",
      header: t("opening.colBy"),
      cell: (o) => <span className="text-sm">{o.createdBy?.name ?? "—"}</span>,
    },
    {
      id: "locked",
      header: "",
      cell: () => <StatusBadge tone="neutral" icon={Lock} label={t("opening.locked")} />,
    },
  ];

  return (
    <>
      <PageHeader
        title={t("opening.title")}
        description={t("opening.desc")}
        breadcrumbs={[{ label: t("crumb.settings") }, { label: t("opening.title") }]}
        actions={
          readOnly ? null : (
            <Button onClick={() => setAdding(true)}>
              <Plus data-icon="inline-start" />
              {t("opening.add")}
            </Button>
          )
        }
      />
      <SectionCard flush>
        <DataTable
          rows={data}
          columns={columns}
          getRowId={(o) => o.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          empty={{ title: t("opening.empty"), description: t("opening.emptyDesc"), icon: Landmark }}
        />
      </SectionCard>
      <OpeningSlideOver open={adding} onOpenChange={setAdding} locked={locked} />
    </>
  );
}
