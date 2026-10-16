"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";
import { useGetClientsQuery } from "@/api/services/clients.api";
import { useGetPaymentTemplatesQuery, useGetQualityCategoriesQuery } from "@/api/services/masterData.api";
import { useAddQuoteRevisionMutation, useCreateQuoteMutation, useGetQuoteQuery, usePreviewQuoteMutation } from "@/api/services/sales.api";
import type { QuoteComputed, QuoteDetail } from "@/api/types";
import { QueryState } from "@/components/common/QueryState";
import { SectionCard } from "@/components/common/SectionCard";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { MoneyField } from "@/components/forms/MoneyInput";
import { NumberField } from "@/components/forms/NumberField";
import { PhoneField } from "@/components/forms/PhoneInput";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useCan } from "@/components/common/PermissionGate";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useT } from "@/i18n/useT";
import { newQuoteSchema, revisionSchema, toInputsBody, valuesFromInputs, DEFAULT_INPUT_VALUES, type NewQuoteValues, type QuoteInputValues } from "./schemas";
import { CustomerPanel, InternalPanel } from "./shared";

const FORM_ID = "quote-form";

/** Debounced live quick estimate of the watched inputs (POST /quotes/preview). */
function useLivePreview(control: Control<NewQuoteValues> | Control<QuoteInputValues>) {
  const values = useWatch({ control: control as Control<QuoteInputValues> });
  const body = useMemo(() => toInputsBody(values), [values]);
  const key = JSON.stringify(body);
  const [preview] = usePreviewQuoteMutation();
  const [state, setState] = useState<{ key: string; data: QuoteComputed | null; failed: boolean }>({ key: "", data: null, failed: false });
  const seq = useRef(0);
  useEffect(() => {
    if (!body) return;
    const mine = ++seq.current;
    const timer = setTimeout(() => {
      preview(body)
        .unwrap()
        .then((data) => mine === seq.current && setState({ key, data, failed: false }))
        .catch(() => mine === seq.current && setState((s) => ({ key, data: s.data, failed: true })));
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the serialised body
  }, [key, preview]);
  return { data: body ? state.data : null, loading: Boolean(body) && state.key !== key, failed: Boolean(body) && state.key === key && state.failed };
}

function InputsFields({ contractType, basement }: { contractType: string | undefined; basement: boolean | undefined }) {
  const t = useT();
  const enumT = useEnumT();
  const seesProfitField = useCan("fields.profit");
  const seesPrice = useCan("fields.contract");
  const seesProfit = seesProfitField && seesPrice;
  const { data: categories } = useGetQualityCategoriesQuery();
  const { data: templates } = useGetPaymentTemplatesQuery();
  return (
    <>
      <SectionCard title={t("sales.form.sectionPlot")}>
        <FieldGrid>
          <SegmentedField
            name="plotUnit"
            label={t("sales.form.plotUnit")}
            options={(["MARLA", "KANAL", "SQFT"] as const).map((v) => ({ value: v, label: enumT("projectPlotUnit", v) }))}
          />
          <NumberField name="plotSize" label={t("sales.form.plotSize")} required decimals={2} />
          <NumberField name="frontFt" label={t("sales.form.frontFt")} decimals={2} />
          <NumberField name="depthFt" label={t("sales.form.depthFt")} decimals={2} />
        </FieldGrid>
      </SectionCard>
      <SectionCard title={t("sales.form.sectionBuilding")}>
        <FieldGrid>
          <NumberField name="coveredAreaSqft" label={t("sales.form.coveredArea")} hint={t("sales.form.coveredHint")} required decimals={2} />
          <SegmentedField name="floors" label={t("sales.form.floors")} hint={t("sales.form.floorsHint")} options={(["1", "2", "3", "4"] as const).map((v) => ({ value: v, label: v }))} />
          <SegmentedField
            name="structureType"
            label={t("sales.form.structure")}
            options={(["FRAMED", "LOAD_BEARING"] as const).map((v) => ({ value: v, label: enumT("projectStructureType", v) }))}
          />
        </FieldGrid>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ToggleField name="mumty" label={t("sales.form.mumty")} />
          <ToggleField name="basement" label={t("sales.form.basement")} />
        </div>
        {basement ? <NumberField name="basementHeightFt" label={t("sales.form.basementHeight")} className="mt-4 max-w-xs" decimals={1} /> : null}
      </SectionCard>
      <SectionCard title={t("sales.form.sectionContract")}>
        <FieldGrid>
          <SelectField
            name="contractType"
            label={t("sales.form.contractType")}
            options={(["FULL", "GREY_OWNER_FINISHING", "LABOR_ONLY"] as const).map((v) => ({ value: v, label: enumT("projectContractType", v) }))}
          />
          <SelectField
            name="qualityCategoryId"
            label={t("sales.form.quality")}
            noneLabel={t("sales.form.qualityDefault")}
            placeholder={t("sales.form.qualityDefault")}
            options={(categories ?? []).filter((c) => !c.isArchived).map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectField
            name="paymentTemplateId"
            label={t("sales.form.template")}
            noneLabel={t("sales.form.templateDefault")}
            placeholder={t("sales.form.templateDefault")}
            options={(templates ?? []).map((tp) => ({ value: tp.id, label: tp.name }))}
          />
          {seesProfit ? <NumberField name="marginPercent" label={t("sales.form.margin")} decimals={2} /> : null}
          {seesProfit && contractType === "FULL" ? <NumberField name="finishingAllowancePercent" label={t("sales.form.finishing")} hint={t("sales.form.finishingHint")} decimals={2} /> : null}
          {seesPrice ? <MoneyField name="finalPricePaisa" label={t("sales.form.finalPrice")} hint={t("sales.form.finalPriceHint")} /> : null}
        </FieldGrid>
        <TextField name="note" label={t("sales.form.note")} className="mt-4" />
      </SectionCard>
    </>
  );
}

function LiveColumn({ data, loading, failed }: { data: QuoteComputed | null; loading: boolean; failed: boolean }) {
  const t = useT();
  return (
    <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
      {failed ? <p className="text-sm text-danger">{t("sales.live.failed")}</p> : null}
      <InternalPanel data={data} loading={loading} />
      <CustomerPanel data={data} />
    </div>
  );
}

/** Sales → New quote: inputs on one side, the live internal view + customer summary on the other. */
export function NewQuoteView() {
  const t = useT();
  const router = useRouter();
  const run = useMutationToast();
  const readOnly = useReadOnly();
  const canAddClient = useCan("clients.client.create");
  const [create, { isLoading }] = useCreateQuoteMutation();
  const { data: clients } = useGetClientsQuery({ limit: 100 });
  const form = useForm<NewQuoteValues, unknown, import("zod").output<typeof newQuoteSchema>>({
    resolver: zodResolver(newQuoteSchema),
    defaultValues: { clientMode: "existing", clientId: null, newName: "", newPhone: "", title: "", siteAddress: "", city: "", ...DEFAULT_INPUT_VALUES },
  });
  const live = useLivePreview(form.control);
  const [clientMode, contractType, basement] = useWatch({ control: form.control, name: ["clientMode", "contractType", "basement"] });

  const onSubmit = async (v: import("zod").output<typeof newQuoteSchema>) => {
    const inputs = toInputsBody(v);
    if (!inputs) return;
    const res = await run(
      () =>
        create({
          ...(v.clientMode === "new" ? { newClient: { name: v.newName!, phone: v.newPhone! } } : { clientId: v.clientId! }),
          title: v.title,
          ...(v.siteAddress ? { siteAddress: v.siteAddress } : {}),
          ...(v.city ? { city: v.city } : {}),
          inputs,
          ...(v.note ? { note: v.note } : {}),
        }).unwrap(),
      { setError: form.setError, codeFields: { CLIENT_PHONE_TAKEN: "newPhone", INVALID_CLIENT: "clientId" }, success: (q) => t("sales.form.saved", { number: q.number }) },
    );
    if (res) router.push(`/sales/quotes/${res.id}`);
  };

  return (
    <>
      <PageHeader
        title={t("sales.form.title")}
        description={t("sales.form.description")}
        breadcrumbs={[{ label: t("crumb.sales") }, { label: t("sales.crumbQuotes"), href: "/sales/quotes" }, { label: t("sales.form.title") }]}
        actions={
          !readOnly ? (
            <Button type="submit" form={FORM_ID} disabled={isLoading}>
              {t("sales.form.save")}
            </Button>
          ) : null
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
          <SectionCard title={t("sales.form.sectionClient")}>
            {canAddClient ? (
              <SegmentedField
                name="clientMode"
                label={t("sales.form.client")}
                options={[
                  { value: "existing", label: t("sales.form.existingClient") },
                  { value: "new", label: t("sales.form.newClient") },
                ]}
              />
            ) : null}
            <FieldGrid className="mt-4">
              {clientMode === "new" ? (
                <>
                  <TextField name="newName" label={t("sales.form.clientName")} required />
                  <PhoneField name="newPhone" label={t("sales.form.clientPhone")} required allowLandline />
                </>
              ) : (
                <ComboboxField
                  name="clientId"
                  label={t("sales.form.client")}
                  required
                  placeholder={t("sales.form.chooseClient")}
                  options={(clients?.items ?? []).map((c) => ({ value: c.id, label: c.name, description: c.phone }))}
                />
              )}
              <TextField name="title" label={t("sales.form.quoteTitle")} placeholder={t("sales.form.titlePlaceholder")} required />
              <TextField name="siteAddress" label={t("sales.form.siteAddress")} />
              <TextField name="city" label={t("sales.form.city")} />
            </FieldGrid>
          </SectionCard>
          <InputsFields contractType={contractType} basement={basement} />
        </Form>
        <LiveColumn {...live} />
      </div>
    </>
  );
}

function ReviseBody({ quote }: { quote: QuoteDetail }) {
  const t = useT();
  const router = useRouter();
  const run = useMutationToast();
  const readOnly = useReadOnly();
  const [add, { isLoading }] = useAddQuoteRevisionMutation();
  const form = useForm<QuoteInputValues, unknown, import("zod").output<typeof revisionSchema>>({
    resolver: zodResolver(revisionSchema),
    defaultValues: valuesFromInputs(quote.latest.inputs),
  });
  const live = useLivePreview(form.control);
  const [contractType, basement] = useWatch({ control: form.control, name: ["contractType", "basement"] });
  const onSubmit = async (v: import("zod").output<typeof revisionSchema>) => {
    const inputs = toInputsBody(v);
    if (!inputs) return;
    const res = await run(() => add({ id: quote.id, body: { inputs, ...(v.note ? { note: v.note } : {}) } }).unwrap(), {
      success: (q) => t("sales.form.revisionSaved", { n: q.revision }),
    });
    if (res) router.push(`/sales/quotes/${quote.id}`);
  };
  return (
    <>
      <PageHeader
        title={t("sales.form.revisionTitle", { number: quote.number })}
        description={t("sales.form.revisionDescription")}
        breadcrumbs={[
          { label: t("crumb.sales") },
          { label: t("sales.crumbQuotes"), href: "/sales/quotes" },
          { label: quote.number, href: `/sales/quotes/${quote.id}` },
          { label: t("sales.detail.action.addRevision") },
        ]}
        actions={
          !readOnly ? (
            <Button type="submit" form={FORM_ID} disabled={isLoading}>
              {t("sales.form.saveRevision")}
            </Button>
          ) : null
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
          <InputsFields contractType={contractType} basement={basement} />
        </Form>
        <LiveColumn {...live} />
      </div>
    </>
  );
}

/** Sales → quote → New revision (same two panels, starting from the latest inputs). */
export function ReviseQuoteView({ quoteId }: { quoteId: string }) {
  const query = useGetQuoteQuery(quoteId);
  return <QueryState query={query}>{(quote) => <ReviseBody quote={quote} />}</QueryState>;
}
