"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import {
  useDeactivateUserMutation,
  useGetUserQuery,
  useReactivateUserMutation,
  useSetUserProjectsMutation,
  useUpdateUserMutation,
} from "@/api/services/team.api";
import type { TeamUserDetail } from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ErrorState } from "@/components/common/ErrorState";
import { InfoList } from "@/components/common/InfoList";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SlideOver } from "@/components/common/SlideOver";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { FieldGrid, Form, FormSection } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { PhoneField } from "@/components/forms/PhoneInput";
import { RadioCards } from "@/components/forms/RadioCards";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/apiErrors";
import { formatPKR } from "@/lib/money";
import { useProjectOptions } from "@/features/projects/hooks/useProjectOptions";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { LANGUAGE_LABEL } from "@/lib/options";
import { formatPhone } from "@/lib/phone";
import { useMe } from "@/store/hooks";
import { editMemberSchema } from "../schemas";
import { ROLE_CARDS } from "./InviteMemberSlideOver";
import { RoleBadge } from "./TeamBits";

const FORM_ID = "edit-member-form";
type Values = z.input<typeof editMemberSchema>;

const defaults = (u: TeamUserDetail): Values => ({
  name: u.name,
  phone: formatPhone(u.phone),
  role: u.role,
  canSeeFinancials: u.canSeeFinancials,
  projectIds: u.projects.map((p) => p.id),
});

function RoleWarnings({ user }: { user: TeamUserDetail }) {
  const role = useWatch({ name: "role" });
  if (user.role === "MUNSHI" && role === "PM") {
    return <InlineAlert tone="warning">Making a Munshi a PM uses an office seat on your plan.</InlineAlert>;
  }
  return role === "PM" ? (
    <ToggleField name="canSeeFinancials" label="Can see contract value, billing & profit" description="Takes effect within 15 minutes." />
  ) : null;
}

function MemberForm({ user, onDone }: { user: TeamUserDetail; onDone: () => void }) {
  const me = useMe();
  const readOnly = useReadOnly();
  const isSelf = me?.user.id === user.id;
  const isOwner = user.role === "THEKEDAR";
  const { options, isLoading: loadingProjects } = useProjectOptions();
  const [update, { isLoading: saving }] = useUpdateUserMutation();
  const [setProjects, { isLoading: savingProjects }] = useSetUserProjectsMutation();
  const [deactivate, { isLoading: deactivating }] = useDeactivateUserMutation();
  const [reactivate, { isLoading: reactivating }] = useReactivateUserMutation();
  const [confirm, setConfirm] = useState<"deactivate" | "reactivate" | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const run = useMutationToast();
  const form = useForm<Values, unknown, z.output<typeof editMemberSchema>>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: defaults(user),
  });

  const onSubmit = async (values: z.output<typeof editMemberSchema>) => {
    const dirty = form.formState.dirtyFields;
    const body = {
      ...(dirty.name ? { name: values.name } : {}),
      ...(dirty.phone ? { phone: values.phone } : {}),
      ...(dirty.role && !isOwner && values.role !== "THEKEDAR" ? { role: values.role } : {}),
      ...(dirty.canSeeFinancials && values.role === "PM" ? { canSeeFinancials: values.canSeeFinancials } : {}),
    };
    if (Object.keys(body).length) {
      const ok = await run(() => update({ id: user.id, body }).unwrap(), {
        setError: form.setError,
        codeFields: { PHONE_TAKEN: "phone", CANNOT_CHANGE_OWN_ROLE: "role", CANNOT_CHANGE_OWNER_ROLE: "role" },
      });
      if (!ok) return;
    }
    if (dirty.projectIds && !isOwner) {
      const ok = await run(() => setProjects({ id: user.id, body: { projectIds: values.projectIds } }).unwrap(), {
        setError: form.setError,
        codeFields: { INVALID_PROJECT: "projectIds" },
      });
      if (!ok) return;
    }
    toast.success(`${values.name} updated`);
    onDone();
  };

  const toggleActive = async () => {
    if (confirm === "deactivate") {
      const ok = await run(() => deactivate(user.id).unwrap(), {
        success: `${user.name} deactivated`,
        onError: (code, error) => {
          if (code !== "CASH_BALANCE_OPEN") return false;
          const balance = isApiError(error) ? (error.details as { balancePaisa?: string } | undefined)?.balancePaisa : undefined;
          setBlocked(`${user.name} still holds ${balance ? formatPKR(balance) : "site cash"}. Record a cash handover (or a count) first, then deactivate.`);
          setConfirm(null);
          return true;
        },
      });
      if (ok) setConfirm(null);
    } else if (confirm === "reactivate") {
      const ok = await run(() => reactivate(user.id).unwrap(), { success: `${user.name} reactivated` });
      if (ok) setConfirm(null);
    }
  };

  const inactive = user.status === "INACTIVE";

  return (
    <div className="space-y-6">
      <InfoList
        items={[
          { label: "Status", value: <StatusBadge domain="user" value={user.status} /> },
          { label: "Role", value: <RoleBadge role={user.role} /> },
          { label: "Last active", value: formatRelative(user.lastActiveAt, "Never") },
          { label: "Last sign-in", value: formatDateTime(user.lastLoginAt, "Never") },
          { label: "Active devices", value: user.activeDeviceCount },
          { label: "Language", value: LANGUAGE_LABEL[user.language] ?? user.language },
        ]}
      />
      {blocked ? (
        <InlineAlert
          tone="warning"
          title="Cash balance open"
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/finance/cash-floats">Open cash floats</Link>
            </Button>
          }
        >
          {blocked}
        </InlineAlert>
      ) : null}
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        {!isOwner ? (
          <FormSection title="Where they work">
            <ComboboxField
              name="projectIds"
              label="Projects"
              multiple
              options={options}
              loading={loadingProjects}
              hint="This replaces their full project list."
              disabled={readOnly}
            />
          </FormSection>
        ) : null}
        {!isOwner && !isSelf ? (
          <FormSection title="What they can do">
            <RadioCards name="role" label="Role" options={ROLE_CARDS} disabled={readOnly} />
            <RoleWarnings user={user} />
          </FormSection>
        ) : null}
        <FormSection title="Details">
          <FieldGrid>
            <TextField name="name" label="Name" required disabled={readOnly} />
            <PhoneField name="phone" label="Phone" required disabled={readOnly} />
          </FieldGrid>
        </FormSection>
        {!readOnly ? (
          <FormActions formId={FORM_ID} submitLabel="Save changes" loading={saving || savingProjects} disabled={!form.formState.isDirty} />
        ) : null}
      </Form>
      {!isSelf && !isOwner && !readOnly ? (
        <section className="space-y-3 rounded-xl border border-danger/30 p-4">
          <p className="text-sm font-semibold text-danger">Danger zone</p>
          {inactive ? (
            <Button variant="outline" onClick={() => setConfirm("reactivate")}>
              <UserCheck data-icon="inline-start" />
              Reactivate member
            </Button>
          ) : (
            <Button variant="destructive-soft" onClick={() => setConfirm("deactivate")}>
              <UserX data-icon="inline-start" />
              Deactivate member
            </Button>
          )}
        </section>
      ) : null}
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        tone={confirm === "reactivate" ? "default" : "danger"}
        title={confirm === "reactivate" ? `Reactivate ${user.name}?` : `Deactivate ${user.name}?`}
        description={
          confirm === "reactivate"
            ? user.role === "PM"
              ? "A PM uses an office seat on your plan."
              : "They can sign in again with their phone."
            : "Their devices are logged out at once. Past entries are kept."
        }
        confirmLabel={confirm === "reactivate" ? "Reactivate" : "Deactivate"}
        loading={deactivating || reactivating}
        onConfirm={toggleActive}
      />
    </div>
  );
}

/** Edit member slide-over: projects, role, financial access, details, (de)activation. */
export function EditMemberSlideOver({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { data, isLoading, error, refetch } = useGetUserQuery(userId ?? "", { skip: !userId });
  return (
    <SlideOver open={Boolean(userId)} onOpenChange={(o) => !o && onClose()} title={data?.name ?? "Member"} description={data ? formatPhone(data.phone) : undefined}>
      {isLoading || (!data && !error) ? (
        <CardsSkeleton count={2} height="h-32" />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} compact />
      ) : data ? (
        <MemberForm key={data.id} user={data} onDone={onClose} />
      ) : null}
    </SlideOver>
  );
}
