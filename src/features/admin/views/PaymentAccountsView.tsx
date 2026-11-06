"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark, Pencil, Plus, Power } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
  useCreatePaymentAccountMutation,
  useGetAdminPaymentAccountsQuery,
  useUpdatePaymentAccountMutation,
} from "@/api/services/admin/paymentAccounts.api";
import type { AdminPaymentAccount } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type Column } from "@/components/common/DataTable";
import { ACTIONS_COLUMN, RowActions } from "@/components/common/RowActions";
import { SectionCard } from "@/components/common/SectionCard";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { SelectField } from "@/components/forms/SelectField";
import { TextareaField } from "@/components/forms/TextareaField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHOD_OPTIONS } from "@/lib/options";
import { paymentAccountSchema } from "../schemas";

const FORM_ID = "payment-account-form";
type Values = z.input<typeof paymentAccountSchema>;

const toValues = (a: AdminPaymentAccount | null): Values => ({
  name: a?.name ?? "",
  method: a?.method ?? "IBFT",
  accountTitle: a?.accountTitle ?? "",
  accountNumber: a?.accountNumber ?? "",
  iban: a?.iban ?? "",
  note: a?.note ?? "",
  isActive: a?.isActive ?? true,
});

/** Add (account = null) or change an account. Mounted only while open, so the form starts fresh. */
function PaymentAccountSlideOver({ account, onClose }: { account: AdminPaymentAccount | null; onClose: () => void }) {
  const [create, { isLoading: creating }] = useCreatePaymentAccountMutation();
  const [update, { isLoading: updating }] = useUpdatePaymentAccountMutation();
  const run = useMutationToast();
  const form = useForm<Values, unknown, z.output<typeof paymentAccountSchema>>({ resolver: zodResolver(paymentAccountSchema), defaultValues: toValues(account) });

  const onSubmit = async (v: z.output<typeof paymentAccountSchema>) => {
    const body = { ...v, iban: v.iban || null, note: v.note || null };
    const options = { success: `${v.name} saved`, setError: form.setError, codeFields: { PAYMENT_ACCOUNT_EXISTS: "accountNumber" } };
    const result = account ? await run(() => update({ id: account.id, body }).unwrap(), options) : await run(() => create(body).unwrap(), options);
    if (result) onClose();
  };

  return (
    <SlideOver
      open
      onOpenChange={(o) => !o && onClose()}
      title={account ? `Edit ${account.name}` : "Add payment account"}
      description="Companies see open accounts when they renew. Payments already made keep the details they were sent to."
      busy={creating || updating}
      footer={<FormActions formId={FORM_ID} submitLabel="Save" loading={creating || updating} onCancel={onClose} />}
    >
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        <FieldGrid>
          <TextField name="name" label="Name" required placeholder="HBL" />
          <SelectField name="method" label="Companies pay by" required options={[...PAYMENT_METHOD_OPTIONS]} />
        </FieldGrid>
        <FieldGrid>
          <TextField name="accountTitle" label="Account title" required />
          <TextField name="accountNumber" label="Account number" required dir="ltr" />
        </FieldGrid>
        <TextField name="iban" label="IBAN" uppercase dir="ltr" />
        <TextareaField name="note" label="Note" rows={2} hint="Shown to the company next to the account." />
        <ToggleField name="isActive" label="Open" description="A closed account is no longer offered to companies." />
      </Form>
    </SlideOver>
  );
}

export function PaymentAccountsView() {
  const { data, isLoading, isFetching, error, refetch } = useGetAdminPaymentAccountsQuery();
  const [update, { isLoading: saving }] = useUpdatePaymentAccountMutation();
  const run = useMutationToast();
  const [editing, setEditing] = useState<AdminPaymentAccount | "new" | null>(null);
  const [closing, setClosing] = useState<AdminPaymentAccount | null>(null);

  const reopen = (a: AdminPaymentAccount) => run(() => update({ id: a.id, body: { isActive: true } }).unwrap(), { success: `${a.name} is open` });

  const columns: Column<AdminPaymentAccount>[] = [
    { id: "name", header: "Name", cell: (a) => <span className="font-medium">{a.name}</span>, sortValue: (a) => a.name },
    { id: "method", header: "Companies pay by", cell: (a) => PAYMENT_METHOD_LABEL[a.method] ?? a.method },
    { id: "title", header: "Account title", cell: (a) => a.accountTitle },
    { id: "number", header: "Account number", cell: (a) => <span className="font-mono text-xs">{a.accountNumber}</span> },
    { id: "iban", header: "IBAN", cell: (a) => (a.iban ? <span className="font-mono text-xs">{a.iban}</span> : "—") },
    { id: "status", header: "Status", cell: (a) => <StatusBadge tone={a.isActive ? "success" : "neutral"} label={a.isActive ? "Open" : "Closed"} /> },
    {
      ...ACTIONS_COLUMN,
      cell: (a) => (
        <RowActions
          name={a.name}
          actions={[
            { label: "Edit", icon: Pencil, onSelect: () => setEditing(a) },
            { label: a.isActive ? "Close" : "Open", icon: Power, onSelect: () => (a.isActive ? setClosing(a) : void reopen(a)) },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Payment Accounts"
        description="Where companies send their subscription money."
        breadcrumbs={[{ label: "Payment Accounts" }]}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus data-icon="inline-start" />
            Add account
          </Button>
        }
      />
      <SectionCard flush>
        <DataTable
          rows={data}
          columns={columns}
          getRowId={(a) => a.id}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          onRowClick={(a) => setEditing(a)}
          empty={{ title: "No accounts yet", description: "Until you add one, companies only choose a method on their slip form and see no account details.", icon: Landmark }}
        />
      </SectionCard>
      {editing ? <PaymentAccountSlideOver account={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={Boolean(closing)}
        onOpenChange={(o) => !o && setClosing(null)}
        title={`Close ${closing?.name ?? ""}?`}
        description="Companies will no longer see it when they renew. Payments already made keep its details. If no open account is left, the slip form asks for the method only."
        confirmLabel="Close account"
        loading={saving}
        onConfirm={async () => {
          if (!closing) return;
          const ok = await run(() => update({ id: closing.id, body: { isActive: false } }).unwrap(), { success: `${closing.name} closed` });
          if (ok) setClosing(null);
        }}
      />
    </>
  );
}
