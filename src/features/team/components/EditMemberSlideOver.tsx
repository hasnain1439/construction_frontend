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
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/apiErrors";
import { formatPKR } from "@/lib/money";
import { useProjectOptions } from "@/features/projects/hooks/useProjectOptions";
import { useMutationToast } from "@/hooks/useMutationToast";
import { MemberPermissions } from "./MemberPermissions";
import { MunshiSignIn } from "./MunshiSignIn";
import { useReadOnly } from "@/hooks/useReadOnly";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { useMe } from "@/store/hooks";
import { editMemberSchema } from "../schemas";
import { useRoleCards } from "./InviteMemberSlideOver";
import { useEnumT, useT } from "@/i18n/useT";
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
  const t = useT();
  const role = useWatch({ name: "role" });
  if (user.role === "MUNSHI" && role === "PM") {
    return <InlineAlert tone="warning">{t("teamCompany.edit.munshiToPm")}</InlineAlert>;
  }
  // Financial access is now a set of extra permissions (Role & permissions below).
  return null;
}

function MemberForm({ user, onDone }: { user: TeamUserDetail; onDone: () => void }) {
  const t = useT();
  const te = useEnumT();
  const roleCards = useRoleCards();
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
    toast.success(t("teamCompany.edit.updated", { name: values.name }));
    onDone();
  };

  const toggleActive = async () => {
    if (confirm === "deactivate") {
      const ok = await run(() => deactivate(user.id).unwrap(), {
        success: t("teamCompany.edit.deactivated", { name: user.name }),
        onError: (code, error) => {
          if (code !== "CASH_BALANCE_OPEN") return false;
          const balance = isApiError(error) ? (error.details as { balancePaisa?: string } | undefined)?.balancePaisa : undefined;
          setBlocked(t("teamCompany.edit.holdsCash", { name: user.name, amount: balance ? formatPKR(balance) : t("teamCompany.edit.siteCash") }));
          setConfirm(null);
          return true;
        },
      });
      if (ok) setConfirm(null);
    } else if (confirm === "reactivate") {
      const ok = await run(() => reactivate(user.id).unwrap(), { success: t("teamCompany.edit.reactivated", { name: user.name }) });
      if (ok) setConfirm(null);
    }
  };

  const inactive = user.status === "INACTIVE";

  return (
    <div className="space-y-6">
      <InfoList
        items={[
          { label: t("field.status"), value: <StatusBadge domain="user" value={user.status} /> },
          { label: t("field.role"), value: <RoleBadge role={user.role} /> },
          { label: t("teamCompany.edit.lastActive"), value: formatRelative(user.lastActiveAt, t("teamCompany.edit.never")) },
          { label: t("teamCompany.edit.lastSignIn"), value: formatDateTime(user.lastLoginAt, t("teamCompany.edit.never")) },
          { label: t("teamCompany.edit.activeDevices"), value: user.activeDeviceCount },
          { label: t("shell.language"), value: te("userLanguage", user.language, user.language) },
        ]}
      />
      {blocked ? (
        <InlineAlert
          tone="warning"
          title={t("teamCompany.edit.cashOpen")}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/finance/cash-floats">{t("teamCompany.edit.openFloats")}</Link>
            </Button>
          }
        >
          {blocked}
        </InlineAlert>
      ) : null}
      <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
        {!isOwner ? (
          <FormSection title={t("teamCompany.edit.whereWork")}>
            <ComboboxField
              name="projectIds"
              label={t("field.projects")}
              multiple
              options={options}
              loading={loadingProjects}
              hint={t("teamCompany.edit.projectsHint")}
              disabled={readOnly}
            />
          </FormSection>
        ) : null}
        {!isOwner && !isSelf ? (
          <FormSection title={t("teamCompany.edit.whatCanDo")}>
            <RadioCards name="role" label={t("field.role")} options={roleCards} disabled={readOnly} />
            <RoleWarnings user={user} />
          </FormSection>
        ) : null}
        <FormSection title={t("roles.details")}>
          <FieldGrid>
            <TextField name="name" label={t("field.name")} required disabled={readOnly} />
            <PhoneField name="phone" label={t("field.phone")} required disabled={readOnly} />
          </FieldGrid>
        </FormSection>
        {!readOnly ? (
          <FormActions formId={FORM_ID} submitLabel={t("common.saveChanges")} loading={saving || savingProjects} disabled={!form.formState.isDirty} />
        ) : null}
      </Form>
      <MemberPermissions user={user} isSelf={isSelf} readOnly={readOnly || inactive} />
      {user.role === "MUNSHI" && !inactive && !readOnly ? <MunshiSignIn userId={user.id} name={user.name} /> : null}
      {!isSelf && !isOwner && !readOnly ? (
        <section className="space-y-3 rounded-xl border border-danger/30 p-4">
          <p className="text-sm font-semibold text-danger">{t("teamCompany.edit.dangerZone")}</p>
          {inactive ? (
            <Button variant="outline" onClick={() => setConfirm("reactivate")}>
              <UserCheck data-icon="inline-start" />
              {t("teamCompany.edit.reactivateMember")}
            </Button>
          ) : (
            <Button variant="destructive-soft" onClick={() => setConfirm("deactivate")}>
              <UserX data-icon="inline-start" />
              {t("teamCompany.edit.deactivateMember")}
            </Button>
          )}
        </section>
      ) : null}
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        tone={confirm === "reactivate" ? "default" : "danger"}
        title={confirm === "reactivate" ? t("teamCompany.edit.reactivateTitle", { name: user.name }) : t("teamCompany.edit.deactivateTitle", { name: user.name })}
        description={
          confirm === "reactivate"
            ? user.role === "PM"
              ? t("teamCompany.edit.reactivatePmBody")
              : t("teamCompany.edit.reactivateBody")
            : t("teamCompany.edit.deactivateBody")
        }
        confirmLabel={confirm === "reactivate" ? t("teamCompany.edit.reactivate") : t("action.deactivate")}
        loading={deactivating || reactivating}
        onConfirm={toggleActive}
      />
    </div>
  );
}

/** Edit member slide-over: projects, account type, role & permissions, details, (de)activation. */
export function EditMemberSlideOver({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const t = useT();
  const { data, isLoading, error, refetch } = useGetUserQuery(userId ?? "", { skip: !userId });
  return (
    <SlideOver open={Boolean(userId)} onOpenChange={(o) => !o && onClose()} title={data?.name ?? t("teamCompany.edit.member")} description={data ? formatPhone(data.phone) : undefined}>
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
