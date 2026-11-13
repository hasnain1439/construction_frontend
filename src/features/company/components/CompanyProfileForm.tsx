"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, MapPin, Pencil, Phone } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useUpdateCompanyMutation } from "@/api/services/company.api";
import type { Company } from "@/api/types";
import { FileUpload } from "@/components/common/FileUpload";
import { InfoList } from "@/components/common/InfoList";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SectionCard } from "@/components/common/SectionCard";
import { FieldGrid, Form, FormSection } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { FormField } from "@/components/forms/FormField";
import { PhoneField } from "@/components/forms/PhoneInput";
import { RadioCards } from "@/components/forms/RadioCards";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useT, type TranslationKey } from "@/i18n/useT";
import { formatPhone } from "@/lib/phone";
import { companyProfileSchema } from "../schemas";

type Values = z.input<typeof companyProfileSchema>;

const REGIONS = ["PUNJAB_KP", "KARACHI_SINDH"] as const;
const MARLAS = ["225", "272.25"] as const;

const defaults = (company: Company, t: (key: TranslationKey) => string): Values => ({
  name: company.name,
  ntn: company.ntn ?? "",
  address: company.address ?? "",
  phone: company.phone ? formatPhone(company.phone) : "",
  email: company.email ?? "",
  region: company.region,
  marlaStandard: company.marlaStandard === 272.25 ? "272.25" : "225",
  logo: company.logoAttachmentId
    ? { id: company.logoAttachmentId, url: company.logoUrl, fileName: t("teamCompany.profile.currentLogo"), mimeType: "image/png" }
    : null,
});

/** How the company appears on PDFs (quotes, receipts) — updates live while typing. */
function LetterheadPreview() {
  const t = useT();
  const [name, address, phone, email, ntn, logo] = useWatch({ name: ["name", "address", "phone", "email", "ntn", "logo"] }) as [
    string,
    string,
    string,
    string,
    string,
    Values["logo"],
  ];
  return (
    <SectionCard title={t("teamCompany.profile.preview")} description={t("teamCompany.profile.previewDesc")}>
      <div className="rounded-2xl border bg-popover p-5 text-popover-foreground shadow-card">
        <div className="flex items-start gap-4 border-b-2 border-sand pb-4">
          {logo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo.url} alt="" className="size-16 rounded object-contain" />
          ) : (
              <span className="flex size-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {(name || "?").charAt(0)}
              </span>
          )}
          <div className="min-w-0 space-y-1">
            <p className="text-lg leading-tight font-bold">{name || t("teamCompany.profile.companyName")}</p>
            {address ? (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" aria-hidden /> {address}
              </p>
            ) : null}
            <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {phone ? (
                <span className="flex items-center gap-1">
                  <Phone className="size-3" aria-hidden /> <bdi dir="ltr">{phone}</bdi>
                </span>
              ) : null}
              {email ? (
                <span className="flex items-center gap-1">
                  <Mail className="size-3" aria-hidden /> {email}
                </span>
              ) : null}
            </p>
            {ntn ? <p className="text-xs text-muted-foreground">{t("field.ntn")} <bdi dir="ltr">{ntn}</bdi></p> : null}
          </div>
        </div>
        <div className="space-y-2 pt-4" aria-hidden>
          <div className="h-2 w-3/4 rounded-full bg-muted" />
          <div className="h-2 w-2/3 rounded-full bg-muted" />
          <div className="h-2 w-1/2 rounded-full bg-muted" />
        </div>
      </div>
    </SectionCard>
  );
}

/** The saved profile, read-only: what opens first. */
function CompanyProfileDetails({ company }: { company: Company }) {
  const t = useT();
  const te = useEnumT();
  const marla = company.marlaStandard === 272.25 ? "272.25" : "225";
  return (
    <div className="space-y-6" data-testid="company-profile-view">
      <FormSection title={t("teamCompany.profile.identity")}>
        <InfoList
          items={[
            { label: t("teamCompany.profile.companyName"), value: company.name },
            { label: t("field.ntn"), value: company.ntn ? <bdi dir="ltr">{company.ntn}</bdi> : null },
            {
              label: t("teamCompany.profile.logo"),
              value: company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logoUrl} alt="" className="size-16 rounded object-contain" />
              ) : null,
            },
          ]}
        />
      </FormSection>
      <FormSection title={t("teamCompany.profile.contact")}>
        <InfoList
          items={[
            { label: t("field.address"), value: company.address || null },
            { label: t("teamCompany.profile.officePhone"), value: company.phone ? <bdi dir="ltr">{formatPhone(company.phone)}</bdi> : null },
            { label: t("field.email"), value: company.email || null },
          ]}
        />
      </FormSection>
      <FormSection title={t("teamCompany.profile.defaults")}>
        <InfoList
          items={[
            { label: t("teamCompany.profile.region"), value: te("region", company.region) },
            { label: t("teamCompany.profile.marla"), value: `${marla} ${t("field.sqft")}` },
          ]}
        />
      </FormSection>
    </div>
  );
}

export function CompanyProfileForm({ company }: { company: Company }) {
  // Opens read-only; Edit turns the same card into the form.
  const [editing, setEditing] = useState(false);
  const t = useT();
  const te = useEnumT();
  const readOnly = useReadOnly();
  const [update, { isLoading }] = useUpdateCompanyMutation();
  const run = useMutationToast();
  const form = useForm<Values, unknown, z.output<typeof companyProfileSchema>>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: defaults(company, t),
  });

  const onSubmit = async (values: z.output<typeof companyProfileSchema>) => {
    const result = await run(
      () =>
        update({
          name: values.name,
          ntn: values.ntn || null,
          address: values.address || null,
          phone: values.phone ?? null,
          email: values.email ?? null,
          region: values.region,
          marlaStandard: Number(values.marlaStandard) as 225 | 272.25,
          logoAttachmentId: values.logo?.id ?? null,
        }).unwrap(),
      { success: t("teamCompany.profile.saved"), setError: form.setError },
    );
    if (result) {
      form.reset(defaults(result, t));
      setEditing(false);
    }
  };

  const stopEditing = () => {
    form.reset();
    setEditing(false);
  };

  return (
    <Form form={form} onSubmit={onSubmit}>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <SectionCard
          title={t("teamCompany.profile.details")}
          actions={
            !editing && !readOnly ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="size-4" aria-hidden />
                {t("common.edit")}
              </Button>
            ) : null
          }
        >
          {!editing ? (
            <CompanyProfileDetails company={company} />
          ) : (
          <div className="space-y-6">
            <FormSection title={t("teamCompany.profile.identity")}>
              <FieldGrid>
                <TextField name="name" label={t("teamCompany.profile.companyName")} required />
                <TextField name="ntn" label={t("field.ntn")} placeholder="1234567-8" dir="ltr" />
              </FieldGrid>
              <FormField label={t("teamCompany.profile.logo")} hint={t("teamCompany.profile.logoHint")}>
                {() => (
                  <Controller
                    name="logo"
                    control={form.control}
                    render={({ field }) => (
                      <FileUpload kind="LOGO" value={field.value} onChange={field.onChange} disabled={readOnly} label={t("teamCompany.profile.uploadLogo")} />
                    )}
                  />
                )}
              </FormField>
            </FormSection>
            <FormSection title={t("teamCompany.profile.contact")}>
              <TextareaField name="address" label={t("field.address")} rows={2} />
              <FieldGrid>
                <PhoneField name="phone" label={t("teamCompany.profile.officePhone")} allowLandline />
                <TextField name="email" label={t("field.email")} type="email" />
              </FieldGrid>
            </FormSection>
            <FormSection title={t("teamCompany.profile.defaults")}>
              <InlineAlert tone="info">{t("teamCompany.profile.defaultsNote")}</InlineAlert>
              <RadioCards
                name="region"
                label={t("teamCompany.profile.region")}
                required
                options={REGIONS.map((value) => ({ value, title: te("region", value), description: te("regionDesc", value) }))}
              />
              <SegmentedField
                name="marlaStandard"
                label={t("teamCompany.profile.marla")}
                options={MARLAS.map((value) => ({ value, label: `${value} ${t("field.sqft")}` }))}
              />
            </FormSection>
            <FormActions
              submitLabel={t("common.saveChanges")}
              loading={isLoading}
              disabled={readOnly || !form.formState.isDirty}
              onCancel={stopEditing}
            />
          </div>
          )}
        </SectionCard>
        <div>
          <LetterheadPreview />
        </div>
      </div>
    </Form>
  );
}
