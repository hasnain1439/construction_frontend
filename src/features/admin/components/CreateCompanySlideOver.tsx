"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, ClipboardCopy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useGetAdminPlansQuery } from "@/api/services/admin/plans.api";
import { useCreateTenantMutation } from "@/api/services/admin/tenants.api";
import type { CreateTenantResult } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form, FormSection } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { MoneyField } from "@/components/forms/MoneyInput";
import { NumberField } from "@/components/forms/NumberField";
import { PhoneField } from "@/components/forms/PhoneInput";
import { RadioCards } from "@/components/forms/RadioCards";
import { SegmentedField } from "@/components/forms/SegmentedField";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { datePlusDays, formatDate, todayPK } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { MARLA_OPTIONS, PAYMENT_METHOD_OPTIONS, REGION_OPTIONS } from "@/lib/options";
import { createCompanySchema } from "../schemas";

const FORM_ID = "create-company-form";
type Values = z.input<typeof createCompanySchema>;

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

const defaults: Values = {
  name: "",
  slug: "",
  phone: "",
  email: "",
  ntn: "",
  address: "",
  region: "PUNJAB_KP",
  marlaStandard: "225",
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  mode: "TRIAL",
  planCode: "",
  trialDays: 14,
  method: "EASYPAISA",
  transactionId: "",
  amountPaisa: null,
  paidOn: todayPK(),
  note: "",
};

function SubscriptionFields({ plans }: { plans: Array<{ code: string; name: string; pricePaisa: string }> }) {
  const mode = useWatch({ name: "mode" }) as Values["mode"];
  const planCode = useWatch({ name: "planCode" }) as string;
  const plan = plans.find((p) => p.code === planCode);
  return (
    <FormSection title="Subscription">
      <SegmentedField
        name="mode"
        label="Start as"
        options={[
          { value: "TRIAL", label: "Trial" },
          { value: "PAID", label: "Paid" },
        ]}
      />
      <FieldGrid>
        <SelectField name="planCode" label="Plan" required options={plans.map((p) => ({ value: p.code, label: `${p.name} — ${formatPKR(p.pricePaisa)}/month` }))} />
        {mode === "TRIAL" ? <NumberField name="trialDays" label="Trial days" required unit="days" decimals={0} /> : null}
      </FieldGrid>
      {mode === "PAID" ? (
        <>
          {plan ? <InlineAlert tone="info">Amount must equal the plan price: {formatPKR(plan.pricePaisa)}. Paid starts 30 days of service with a receipt.</InlineAlert> : null}
          <FieldGrid>
            <SelectField name="method" label="Method" required options={[...PAYMENT_METHOD_OPTIONS]} />
            <TextField name="transactionId" label="Transaction ID" required uppercase />
            <MoneyField name="amountPaisa" label="Amount" required />
            <DateField name="paidOn" label="Paid on" required min={datePlusDays(-30)} max={todayPK()} />
          </FieldGrid>
        </>
      ) : null}
    </FormSection>
  );
}

function Success({ result, onClose }: { result: CreateTenantResult; onClose: () => void }) {
  const invite = result.owner.invitation;
  return (
    <div className="space-y-4">
      <InlineAlert tone="success" title={`${result.tenant.name} created`}>
        {result.subscription.plan.name} · {result.subscription.status === "TRIAL" ? `trial until ${formatDate(result.subscription.trialEndsAt)}` : `paid until ${formatDate(result.subscription.currentPeriodEnd)}`}
        {result.subscription.receiptNo ? ` · receipt ${result.subscription.receiptNo}` : ""}
      </InlineAlert>
      <div className="space-y-2 rounded-xl border p-4">
        <p className="text-sm font-semibold">Owner invitation</p>
        <p className="text-sm">
          {result.owner.name} · {result.owner.phone}
        </p>
        <div className="flex items-center gap-2">
          <StatusBadge domain="invitation" value={invite.status} />
          <span className="text-xs text-muted-foreground">expires {formatDate(invite.expiresAt)} · sent by SMS</span>
        </div>
        {invite.devInviteUrl ? (
          <div className="space-y-1 pt-2">
            <p className="text-xs break-all text-muted-foreground">{invite.devInviteUrl}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(invite.devInviteUrl!);
                toast.success("Link copied");
              }}
            >
              <ClipboardCopy data-icon="inline-start" />
              Copy invite link (dev)
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button asChild>
          <Link href={`/admin/companies/${result.tenant.id}`}>
            <CircleCheck data-icon="inline-start" />
            View company
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** Create a company with a TRIAL or PAID subscription and an owner invitation. */
export function CreateCompanySlideOver({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const plans = useGetAdminPlansQuery(undefined, { skip: !open });
  const [create, { isLoading }] = useCreateTenantMutation();
  const [result, setResult] = useState<CreateTenantResult | null>(null);
  const run = useMutationToast();
  const form = useForm<Values, unknown, z.output<typeof createCompanySchema>>({ resolver: zodResolver(createCompanySchema), defaultValues: defaults });
  const activePlans = (plans.data ?? []).filter((p) => p.isActive && p.code !== "TRIAL");

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setResult(null);
      form.reset(defaults);
    }
  };

  const onSubmit = async (v: z.output<typeof createCompanySchema>) => {
    const created = await run(
      () =>
        create({
          company: {
            name: v.name,
            ...(v.slug || slugify(v.name) ? { slug: v.slug || slugify(v.name) } : {}),
            phone: v.phone,
            ...(v.email ? { email: v.email } : {}),
            ...(v.ntn ? { ntn: v.ntn } : {}),
            ...(v.address ? { address: v.address } : {}),
            region: v.region,
            marlaStandard: Number(v.marlaStandard) as 225 | 272.25,
          },
          owner: { name: v.ownerName, phone: v.ownerPhone, ...(v.ownerEmail ? { email: v.ownerEmail } : {}) },
          subscription:
            v.mode === "TRIAL"
              ? { mode: "TRIAL", planCode: v.planCode, trialDays: v.trialDays ?? 14 }
              : {
                  mode: "PAID",
                  planCode: v.planCode,
                  payment: { method: v.method, transactionId: v.transactionId, amountPaisa: v.amountPaisa as string, paidOn: v.paidOn },
                },
          ...(v.note ? { note: v.note } : {}),
        }).unwrap(),
      {
        success: (r) => `${r.tenant.name} created`,
        setError: form.setError,
        fieldMap: { "company.name": "name", "company.slug": "slug", "company.phone": "phone", "owner.phone": "ownerPhone", "owner.name": "ownerName" },
        codeFields: { SLUG_TAKEN: "slug", PHONE_TAKEN: "ownerPhone", DUPLICATE_TRANSACTION: "transactionId", AMOUNT_MISMATCH: "amountPaisa", INVALID_PLAN: "planCode" },
      },
    );
    if (created) setResult(created);
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={close}
      size="lg"
      title="Create company"
      description="The owner sets their own password from the SMS invite link."
      busy={isLoading}
      footer={result ? undefined : <FormActions formId={FORM_ID} submitLabel="Create company" loading={isLoading} onCancel={() => close(false)} />}
    >
      {result ? (
        <Success result={result} onClose={() => close(false)} />
      ) : (
        <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
          <FormSection title="Company">
            <FieldGrid>
              <TextField name="name" label="Company name" required />
              <TextField name="slug" label="Slug" placeholder="auto from name" hint="Leave empty to make one from the name." />
              <PhoneField name="phone" label="Phone" required allowLandline />
              <TextField name="email" label="Email" type="email" />
              <TextField name="ntn" label="NTN" placeholder="1234567-8" />
              <SegmentedField name="marlaStandard" label="Marla standard" options={MARLA_OPTIONS} />
            </FieldGrid>
            <TextareaField name="address" label="Address" rows={2} />
            <RadioCards name="region" label="Region" required options={REGION_OPTIONS} />
          </FormSection>
          <FormSection title="Owner" description="Owner sets their own password via an invite link sent by SMS/WhatsApp. You never see it.">
            <FieldGrid>
              <TextField name="ownerName" label="Owner name" required />
              <PhoneField name="ownerPhone" label="Owner phone" required />
              <TextField name="ownerEmail" label="Owner email" type="email" />
            </FieldGrid>
          </FormSection>
          <SubscriptionFields plans={activePlans} />
          <TextareaField name="note" label="Note" rows={2} hint="Internal — saved in the audit log." />
        </Form>
      )}
    </SlideOver>
  );
}
