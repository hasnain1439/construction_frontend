"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HardHat, UserCog } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useGetCompanySettingsQuery } from "@/api/services/company.api";
import { useGetRolesQuery } from "@/api/services/permissions.api";
import { useCreateInvitationMutation } from "@/api/services/team.api";
import type { InvitationSent } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { InviteShare } from "@/components/common/InviteShare";
import { SlideOver } from "@/components/common/SlideOver";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { PhoneField } from "@/components/forms/PhoneInput";
import { RadioCards, type RadioCardOption } from "@/components/forms/RadioCards";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { ToggleField } from "@/components/forms/ToggleField";
import { Button } from "@/components/ui/button";
import { useProjectOptions } from "@/features/projects/hooks/useProjectOptions";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useMe } from "@/store/hooks";
import { useLanguage, useT } from "@/i18n/useT";
import { formatDate } from "@/lib/dates";
import { roleName, rolesForAccount } from "@/lib/permissionCatalog";
import { inviteSchema } from "../schemas";

const FORM_ID = "invite-form";

/** PM / Munshi account type cards, in the current language. */
export function useRoleCards(): RadioCardOption<"PM" | "MUNSHI">[] {
  const t = useT();
  return [
    { value: "PM", title: t("role.PM"), description: t("teamCompany.invite.pmCardDesc"), icon: UserCog },
    { value: "MUNSHI", title: t("role.MUNSHI"), description: t("teamCompany.invite.munshiCardDesc"), icon: HardHat },
  ];
}

function FinancialsToggle() {
  const t = useT();
  const role = useWatch({ name: "role" });
  if (role !== "PM") return null;
  return (
    <ToggleField
      name="canSeeFinancials"
      label={t("teamCompany.invite.financials")}
      description={t("teamCompany.invite.financialsDesc")}
    />
  );
}

/** Optional permission role for the invite; only roles that fit the chosen account type. */
function RoleTemplateSelect({ open }: { open: boolean }) {
  const t = useT();
  const language = useLanguage();
  const account = useWatch({ name: "role" }) as "PM" | "MUNSHI";
  const roleId = useWatch({ name: "roleId" }) as string | null;
  const { setValue } = useFormContext();
  const roles = useGetRolesQuery(undefined, { skip: !open });
  const options = rolesForAccount(roles.data ?? [], account);
  const standard = (roles.data ?? []).find((r) => r.isSystem && r.key === (account === "PM" ? "PROJECT_MANAGER" : "MUNSHI"));
  useEffect(() => {
    // Switching PM ↔ Munshi drops a role that doesn't fit the new account type.
    if (roleId && roles.data && !options.some((r) => r.id === roleId)) setValue("roleId", null);
  }, [roleId, roles.data, options, setValue]);
  return (
    <SelectField
      name="roleId"
      label={t("roles.inviteRole")}
      hint={t("roles.inviteRoleHint")}
      noneLabel={t("roles.inviteRoleDefault", { name: standard ? roleName(standard, language) : t(account === "PM" ? "role.PM" : "role.MUNSHI") })}
      placeholder={t("roles.inviteRoleDefault", { name: standard ? roleName(standard, language) : t(account === "PM" ? "role.PM" : "role.MUNSHI") })}
      options={options.filter((r) => r.id !== standard?.id).map((r) => ({ value: r.id, label: roleName(r, language) }))}
    />
  );
}

export function InviteMemberSlideOver({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const roleCards = useRoleCards();
  const [create, { isLoading }] = useCreateInvitationMutation();
  const { data: settings } = useGetCompanySettingsQuery(undefined, { skip: !open });
  const { options, isLoading: loadingProjects } = useProjectOptions({ skip: !open });
  const me = useMe();
  const [sent, setSent] = useState<(InvitationSent & { name: string; phone: string; email?: string; role: string }) | null>(null);
  const run = useMutationToast();
  const form = useForm<z.input<typeof inviteSchema>, unknown, z.output<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    values: {
      name: "",
      phone: "",
      email: "",
      role: "PM",
      projectIds: [],
      canSeeFinancials: settings?.pmCanSeeFinancials ?? false,
      roleId: null,
    },
    resetOptions: { keepDirtyValues: true },
  });

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setSent(null);
      form.reset();
    }
  };

  const onSubmit = async (values: z.output<typeof inviteSchema>) => {
    const result = await run(
      () =>
        create({
          name: values.name,
          phone: values.phone,
          ...(values.email ? { email: values.email } : {}),
          role: values.role,
          projectIds: values.projectIds,
          ...(values.role === "PM" ? { canSeeFinancials: values.canSeeFinancials } : {}),
          ...(values.roleId ? { roleId: values.roleId } : {}),
        }).unwrap(),
      {
        success: t("teamCompany.invite.sentTo", { name: values.name }),
        setError: form.setError,
        codeFields: { ALREADY_MEMBER: "phone", INVITE_PENDING: "phone", PHONE_TAKEN: "phone", ROLE_NOT_FOR_ACCOUNT: "roleId", GRANT_EXCEEDS_OWN: "roleId" },
      },
    );
    if (result) setSent({ ...result, name: values.name, phone: values.phone, email: values.email || undefined, role: values.role });
  };

  return (
    <SlideOver
      open={open}
      onOpenChange={close}
      title={t("teamCompany.invite.title")}
      description={t("teamCompany.invite.desc")}
      busy={isLoading}
      footer={
        sent ? (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSent(null)}>
              {t("teamCompany.invite.another")}
            </Button>
            <Button onClick={() => close(false)}>{t("action.done")}</Button>
          </div>
        ) : (
          <FormActions formId={FORM_ID} submitLabel={t("teamCompany.invite.send")} loading={isLoading} onCancel={() => close(false)} />
        )
      }
    >
      {sent ? (
        <div className="space-y-4">
          <InlineAlert tone="success" title={t("teamCompany.invite.sentTo", { name: sent.name })}>
            {t("teamCompany.invite.pendingExpires", { date: formatDate(sent.expiresAt) })}
          </InlineAlert>
          {sent.inviteUrl ? (
            <InviteShare
              url={sent.inviteUrl}
              name={sent.name}
              phone={sent.phone}
              email={sent.email}
              companyName={me?.tenant.name}
              roleLabel={sent.role === "PM" ? t("role.PM") : sent.role === "MUNSHI" ? t("role.MUNSHI") : undefined}
            />
          ) : null}
        </div>
      ) : (
        <Form form={form} onSubmit={onSubmit} id={FORM_ID}>
          <FieldGrid>
            <TextField name="name" label={t("field.name")} required />
            <PhoneField name="phone" label={t("field.phone")} required />
          </FieldGrid>
          <TextField name="email" label={t("field.email")} type="email" hint={t("common.optional")} />
          <RadioCards name="role" label={t("field.role")} required options={roleCards} />
          <RoleTemplateSelect open={open} />
          <ComboboxField
            name="projectIds"
            label={t("field.projects")}
            multiple
            options={options}
            loading={loadingProjects}
            placeholder={t("teamCompany.invite.chooseProjects")}
            hint={t("teamCompany.invite.projectsHint")}
          />
          <FinancialsToggle />
        </Form>
      )}
    </SlideOver>
  );
}
