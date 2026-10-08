"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, MapPin, Phone } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useUpdateCompanyMutation } from "@/api/services/company.api";
import type { Company } from "@/api/types";
import { FileUpload } from "@/components/common/FileUpload";
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
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { MARLA_OPTIONS, REGION_OPTIONS } from "@/lib/options";
import { formatPhone } from "@/lib/phone";
import { companyProfileSchema } from "../schemas";

type Values = z.input<typeof companyProfileSchema>;

const defaults = (company: Company): Values => ({
  name: company.name,
  ntn: company.ntn ?? "",
  address: company.address ?? "",
  phone: company.phone ? formatPhone(company.phone) : "",
  email: company.email ?? "",
  region: company.region,
  marlaStandard: company.marlaStandard === 272.25 ? "272.25" : "225",
  logo: company.logoAttachmentId
    ? { id: company.logoAttachmentId, url: company.logoUrl, fileName: "Current logo", mimeType: "image/png" }
    : null,
});

/** How the company appears on PDFs (quotes, receipts) — updates live while typing. */
function LetterheadPreview() {
  const [name, address, phone, email, ntn, logo] = useWatch({ name: ["name", "address", "phone", "email", "ntn", "logo"] }) as [
    string,
    string,
    string,
    string,
    string,
    Values["logo"],
  ];
  return (
    <SectionCard title="Letterhead preview" description="As it appears on PDFs sent to clients.">
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
            <p className="text-lg leading-tight font-bold">{name || "Company name"}</p>
            {address ? (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" aria-hidden /> {address}
              </p>
            ) : null}
            <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {phone ? (
                <span className="flex items-center gap-1">
                  <Phone className="size-3" aria-hidden /> {phone}
                </span>
              ) : null}
              {email ? (
                <span className="flex items-center gap-1">
                  <Mail className="size-3" aria-hidden /> {email}
                </span>
              ) : null}
            </p>
            {ntn ? <p className="text-xs text-muted-foreground">NTN {ntn}</p> : null}
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

export function CompanyProfileForm({ company }: { company: Company }) {
  const readOnly = useReadOnly();
  const [update, { isLoading }] = useUpdateCompanyMutation();
  const run = useMutationToast();
  const form = useForm<Values, unknown, z.output<typeof companyProfileSchema>>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: defaults(company),
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
      { success: "Company profile saved", setError: form.setError },
    );
    if (result) form.reset(defaults(result));
  };

  return (
    <Form form={form} onSubmit={onSubmit}>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <SectionCard title="Company details">
          <div className="space-y-6">
            <FormSection title="Identity">
              <FieldGrid>
                <TextField name="name" label="Company name" required />
                <TextField name="ntn" label="NTN" placeholder="1234567-8" />
              </FieldGrid>
              <FormField label="Logo" hint="JPEG, PNG or WebP · max 10 MB">
                {() => (
                  <Controller
                    name="logo"
                    control={form.control}
                    render={({ field }) => (
                      <FileUpload kind="LOGO" value={field.value} onChange={field.onChange} disabled={readOnly} label="Upload your logo" />
                    )}
                  />
                )}
              </FormField>
            </FormSection>
            <FormSection title="Contact">
              <TextareaField name="address" label="Address" rows={2} />
              <FieldGrid>
                <PhoneField name="phone" label="Office phone" allowLandline />
                <TextField name="email" label="Email" type="email" />
              </FieldGrid>
            </FormSection>
            <FormSection title="Construction defaults">
              <InlineAlert tone="info">Region and Marla changes apply to new projects only.</InlineAlert>
              <RadioCards name="region" label="Region" required options={REGION_OPTIONS} />
              <SegmentedField name="marlaStandard" label="Marla standard" options={MARLA_OPTIONS} />
            </FormSection>
            <FormActions
              submitLabel="Save changes"
              loading={isLoading}
              disabled={readOnly || !form.formState.isDirty}
              onCancel={form.formState.isDirty ? () => form.reset() : undefined}
            />
          </div>
        </SectionCard>
        <div>
          <LetterheadPreview />
        </div>
      </div>
    </Form>
  );
}
