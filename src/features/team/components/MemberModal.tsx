"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, HardHat, UserCheck, UserCog, UserX } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import {
  useGetPermissionCatalogQuery,
  useGetRolesQuery,
  useGetUserPermissionsQuery,
  useSetUserOverridesMutation,
  useSetUserRolesMutation,
} from "@/api/services/permissions.api";
import {
  useCreateInvitationMutation,
  useDeactivateUserMutation,
  useGetUserQuery,
  useReactivateUserMutation,
  useSetUserProjectsMutation,
  useUpdateUserMutation,
} from "@/api/services/team.api";
import type {
  InvitationSent,
  PermissionCatalog,
  PermissionRole,
  TeamUserDetail,
  UserPermissions,
} from "@/api/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ErrorState } from "@/components/common/ErrorState";
import { FormTabsList, TAB_CONTENT_CLASS } from "@/components/common/FormTabs";
import { InfoList } from "@/components/common/InfoList";
import { InlineAlert } from "@/components/common/InlineAlert";
import { InviteShare } from "@/components/common/InviteShare";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { WideModal } from "@/components/common/WideModal";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { FieldGrid, Form } from "@/components/forms/Form";
import { PhoneField } from "@/components/forms/PhoneInput";
import { RadioCards, type RadioCardOption } from "@/components/forms/RadioCards";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useProjectOptions } from "@/features/projects/hooks/useProjectOptions";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useReadOnly } from "@/hooks/useReadOnly";
import { useEnumT, useLanguage, useT } from "@/i18n/useT";
import { isApiError } from "@/lib/apiErrors";
import { formatDate, formatDateTime, formatRelative } from "@/lib/dates";
import { formatPKR } from "@/lib/money";
import { roleName, sameGrants, type GrantMap } from "@/lib/permissionCatalog";
import { formatPhone } from "@/lib/phone";
import {
  accountOfRoles,
  canGiveRole,
  reapplyChanges,
  resolveRoles,
  unionGrants,
  type AccountType,
} from "@/lib/rolePermissions";
import { useMe } from "@/store/hooks";
import { editMemberSchema, inviteSchema } from "../schemas";
import { CustomPermissions, RoleGrid } from "./MemberRoles";
import { MunshiSignIn } from "./MunshiSignIn";
import { RoleBadge } from "./TeamBits";

type Tab = "details" | "roles" | "custom";
const TABS: Tab[] = ["details", "roles", "custom"];

/** Back / Next between the tabs (Save sits next to them on every tab). */
function StepButtons({
  tab,
  setTab,
  disabled,
}: {
  tab: Tab;
  setTab: (tab: Tab) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const i = TABS.indexOf(tab);
  return (
    <>
      {i > 0 ? (
        <Button type="button" variant="outline" onClick={() => setTab(TABS[i - 1]!)} disabled={disabled}>
          <ArrowLeft data-icon="inline-start" className="rtl:rotate-180" />
          {t("roles.back")}
        </Button>
      ) : null}
      {i < TABS.length - 1 ? (
        <Button type="button" variant="outline" onClick={() => setTab(TABS[i + 1]!)} disabled={disabled}>
          {t("roles.next")}
          <ArrowRight data-icon="inline-end" className="rtl:rotate-180" />
        </Button>
      ) : null}
    </>
  );
}
const INVITE_FORM = "invite-form";
const EDIT_FORM = "edit-member-form";

/** PM / Munshi account type cards, in the current language. */
export function useRoleCards(): RadioCardOption<"PM" | "MUNSHI">[] {
  const t = useT();
  return [
    { value: "PM", title: t("role.PM"), description: t("teamCompany.invite.pmCardDesc"), icon: UserCog },
    {
      value: "MUNSHI",
      title: t("role.MUNSHI"),
      description: t("teamCompany.invite.munshiCardDesc"),
      icon: HardHat,
    },
  ];
}

/**
 * Account type: decided by the ticked roles (any office role → office / PM, only site roles →
 * site / Munshi). Only when the roles fit both (custom "any account" roles, or none yet) can the
 * person choose.
 */
function AccountTypeField({ decided, disabled }: { decided: AccountType | null; disabled?: boolean }) {
  const t = useT();
  const cards = useRoleCards();
  if (!decided)
    return (
      <RadioCards name="role" label={t("roles.accountType")} required options={cards} disabled={disabled} />
    );
  return (
    <div className="space-y-1" data-testid="account-type">
      <p className="text-sm font-medium">{t("roles.accountType")}</p>
      <p className="text-sm text-muted-foreground">
        {t("roles.accountFromRole", { account: t(`roles.baseRole.${decided}`) })}
      </p>
    </div>
  );
}

/** Roles ticked + checklist; changing the roles keeps the person's own extra / removed changes. */
function useRoleSelection(
  roles: PermissionRole[] | undefined,
  catalog: PermissionCatalog | undefined,
  initial: { selected: string[]; ticked?: GrantMap } | null,
) {
  const [selectedState, setSelected] = useState<string[] | null>(null);
  const [tickedState, setTicked] = useState<GrantMap | null>(null);
  const selected = selectedState ?? initial?.selected ?? [];
  const resolved = resolveRoles({
    roles: roles ?? [],
    catalog: catalog ?? { permissions: [] },
    selected,
    ticked: {},
  });
  const ticked = tickedState ?? initial?.ticked ?? resolved.base;
  const { diff } = resolveRoles({
    roles: roles ?? [],
    catalog: catalog ?? { permissions: [] },
    selected,
    ticked,
  });
  const changeRoles = (next: string[]) => {
    if (!catalog || !roles) return;
    const nextBase = unionGrants(
      next.map((id) => roles.find((r) => r.id === id)).filter((r): r is PermissionRole => Boolean(r)),
    );
    setTicked(reapplyChanges(resolved.base, ticked, nextBase, catalog));
    setSelected(next);
  };
  const reset = () => {
    setSelected(null);
    setTicked(null);
  };
  return {
    selected,
    ticked,
    setTicked,
    changeRoles,
    reset,
    roles: resolved.roles,
    base: resolved.base,
    diff,
  };
}

const hasErrors = (errors: FieldErrors) => Object.keys(errors).length > 0;

// ─── Add member (invite) ────────────────────────────────────────────────────

export function InviteMemberModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const language = useLanguage();
  const me = useMe();
  const [create, { isLoading }] = useCreateInvitationMutation();
  const rolesQuery = useGetRolesQuery(undefined, { skip: !open });
  const catalogQuery = useGetPermissionCatalogQuery(undefined, { skip: !open });
  const { options, isLoading: loadingProjects } = useProjectOptions({ skip: !open });
  const [sent, setSent] = useState<
    (InvitationSent & { name: string; phone: string; email?: string; role: string }) | null
  >(null);
  const [tab, setTab] = useState<Tab>("details");
  const [noRole, setNoRole] = useState(false);
  const run = useMutationToast();
  const form = useForm<z.input<typeof inviteSchema>, unknown, z.output<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", phone: "", email: "", role: "PM", projectIds: [] },
  });
  const roles = rolesQuery.data;
  const catalog = catalogQuery.data;
  // Until something is ticked: the Project Manager template (if this manager may give it).
  const initial = useMemo(() => {
    if (!roles || !catalog) return null;
    const pm = roles.find((r) => r.isSystem && r.key === "PROJECT_MANAGER");
    return { selected: pm && canGiveRole(me, pm, catalog) ? [pm.id] : [] };
  }, [roles, catalog, me]);
  const sel = useRoleSelection(roles, catalog, initial);
  const formAccount = useWatch({ control: form.control, name: "role" }) as AccountType;
  const decided = accountOfRoles(sel.roles);
  const account = decided ?? formAccount;

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setSent(null);
      setTab("details");
      setNoRole(false);
      sel.reset();
      form.reset();
    }
  };

  const onSubmit = async (values: z.output<typeof inviteSchema>) => {
    if (!sel.selected.length) {
      setNoRole(true);
      setTab("roles");
      return;
    }
    const result = await run(
      () =>
        create({
          name: values.name,
          phone: values.phone,
          ...(values.email ? { email: values.email } : {}),
          role: account,
          projectIds: values.projectIds,
          // The roles + checklist are the whole truth: no extra financial bundle from the company setting.
          ...(account === "PM" ? { canSeeFinancials: false } : {}),
          roleIds: sel.selected,
          ...(sel.diff.overrides.length ? { permissionOverrides: sel.diff.overrides } : {}),
        }).unwrap(),
      {
        success: t("teamCompany.invite.sentTo", { name: values.name }),
        setError: form.setError,
        codeFields: {
          ALREADY_MEMBER: "phone",
          INVITE_PENDING: "phone",
          PHONE_TAKEN: "phone",
          EMAIL_TAKEN: "email",
        },
      },
    );
    if (result)
      setSent({
        ...result,
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
        role: account,
      });
    else if (hasErrors(form.formState.errors)) setTab("details");
  };

  const permissionsError = rolesQuery.error ?? catalogQuery.error;
  return (
    <WideModal
      open={open}
      onOpenChange={close}
      title={t("teamCompany.invite.title")}
      description={t("teamCompany.invite.desc")}
      busy={isLoading}
      testId="member-modal"
      footer={
        sent ? (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSent(null);
                setTab("details");
              }}
            >
              {t("teamCompany.invite.another")}
            </Button>
            <Button onClick={() => close(false)}>{t("action.done")}</Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="me-auto"
              onClick={() => close(false)}
              disabled={isLoading}
            >
              {t("common.cancel")}
            </Button>
            <StepButtons tab={tab} setTab={setTab} disabled={isLoading} />
            <Button type="submit" form={INVITE_FORM} disabled={isLoading || !roles || !catalog}>
              {t("teamCompany.invite.send")}
            </Button>
          </div>
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
              roleLabel={
                sent.role === "PM" ? t("role.PM") : sent.role === "MUNSHI" ? t("role.MUNSHI") : undefined
              }
            />
          ) : null}
        </div>
      ) : (
        <Form form={form} onSubmit={onSubmit} onInvalid={() => setTab("details")} id={INVITE_FORM}>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-5">
            <FormTabsList
              tabs={[
                { value: "details", label: t("roles.tabDetails"), error: hasErrors(form.formState.errors) },
                { value: "roles", label: t("roles.tabRoles"), error: noRole && !sel.selected.length },
                { value: "custom", label: t("roles.tabCustom") },
              ]}
            />
            <TabsContent value="details" forceMount className={TAB_CONTENT_CLASS}>
              <FieldGrid>
                <TextField name="name" label={t("field.name")} required />
                <PhoneField name="phone" label={t("field.phone")} required />
              </FieldGrid>
              <TextField name="email" label={t("field.email")} type="email" hint={t("common.optional")} />
              <AccountTypeField decided={decided} />
              <ComboboxField
                name="projectIds"
                label={t("field.projects")}
                multiple
                options={options}
                loading={loadingProjects}
                placeholder={t("teamCompany.invite.chooseProjects")}
                hint={t("teamCompany.invite.projectsHint")}
              />
            </TabsContent>
            <TabsContent value="roles" forceMount className={TAB_CONTENT_CLASS}>
              {permissionsError ? (
                <ErrorState
                  error={permissionsError}
                  onRetry={() => {
                    void rolesQuery.refetch();
                    void catalogQuery.refetch();
                  }}
                  compact
                />
              ) : !roles || !catalog ? (
                <CardsSkeleton count={3} height="h-16" />
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">{t("roles.rolesHint")}</p>
                  {noRole && !sel.selected.length ? (
                    <InlineAlert tone="danger">{t("roles.chooseRole")}</InlineAlert>
                  ) : null}
                  <RoleGrid
                    roles={roles}
                    catalog={catalog}
                    selected={sel.selected}
                    onChange={sel.changeRoles}
                  />
                </>
              )}
            </TabsContent>
            <TabsContent value="custom" forceMount className={TAB_CONTENT_CLASS}>
              {roles && catalog ? (
                <CustomPermissions
                  catalog={catalog}
                  base={sel.base}
                  ticked={sel.ticked}
                  onChange={sel.setTicked}
                  roleNames={sel.roles.map((r) => roleName(r, language))}
                />
              ) : null}
            </TabsContent>
          </Tabs>
        </Form>
      )}
    </WideModal>
  );
}

// ─── Edit member ────────────────────────────────────────────────────────────

type EditValues = z.input<typeof editMemberSchema>;

const effectiveGrants = (data: UserPermissions): GrantMap =>
  Object.fromEntries(
    data.effective.map((e) => [e.key, { scope: e.scope, maxAmountPaisa: e.maxAmountPaisa }]),
  );

function EditMemberForm({
  user,
  perms,
  roles,
  catalog,
  onDone,
}: {
  user: TeamUserDetail;
  perms: UserPermissions | undefined;
  roles: PermissionRole[] | undefined;
  catalog: PermissionCatalog | undefined;
  onDone: () => void;
}) {
  const t = useT();
  const te = useEnumT();
  const language = useLanguage();
  const me = useMe();
  const readOnly = useReadOnly();
  const isSelf = me?.user.id === user.id;
  const isOwner = user.role === "THEKEDAR";
  const inactive = user.status === "INACTIVE";
  const { options, isLoading: loadingProjects } = useProjectOptions();
  const [update, { isLoading: saving }] = useUpdateUserMutation();
  const [setProjects, { isLoading: savingProjects }] = useSetUserProjectsMutation();
  const [setRoles, { isLoading: savingRoles }] = useSetUserRolesMutation();
  const [setOverrides, { isLoading: savingOverrides }] = useSetUserOverridesMutation();
  const [deactivate, { isLoading: deactivating }] = useDeactivateUserMutation();
  const [reactivate, { isLoading: reactivating }] = useReactivateUserMutation();
  const [confirm, setConfirm] = useState<"deactivate" | "reactivate" | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("details");
  const run = useMutationToast();
  const form = useForm<EditValues, unknown, z.output<typeof editMemberSchema>>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      name: user.name,
      phone: formatPhone(user.phone),
      role: user.role,
      canSeeFinancials: user.canSeeFinancials,
      projectIds: user.projects.map((p) => p.id),
    },
  });
  const initial = useMemo(
    () =>
      perms
        ? {
            selected: perms.roles.map((r) => r.id).filter((id): id is string => Boolean(id)),
            ticked: effectiveGrants(perms),
          }
        : null,
    [perms],
  );
  const sel = useRoleSelection(roles, catalog, initial);
  const lockedRoles = isOwner || isSelf || readOnly || inactive;
  const formAccount = useWatch({ control: form.control, name: "role" });
  const decided = isOwner || isSelf ? null : accountOfRoles(sel.roles);
  const account = (decided ?? formAccount) as EditValues["role"];
  const rolesChanged = Boolean(initial) && sel.selected.join(",") !== initial!.selected.join(",");
  const overridesChanged = Boolean(initial) && !sameGrants(sel.ticked, initial!.ticked ?? {});
  const busy = saving || savingProjects || savingRoles || savingOverrides;
  // Read during render so react-hook-form tracks them (formState is a subscription proxy).
  const { dirtyFields } = form.formState;
  const dirty = form.formState.isDirty || account !== user.role || rolesChanged || overridesChanged;

  const onSubmit = async (values: z.output<typeof editMemberSchema>) => {
    if (!isOwner && !lockedRoles && !sel.selected.length) {
      setTab("roles");
      return;
    }
    const body = {
      ...(dirtyFields.name ? { name: values.name } : {}),
      ...(dirtyFields.phone ? { phone: values.phone } : {}),
      ...(!isOwner && !isSelf && account !== user.role && account !== "THEKEDAR" ? { role: account } : {}),
    };
    const fail = () => {
      if (hasErrors(form.formState.errors)) setTab("details");
    };
    if (Object.keys(body).length) {
      const ok = await run(() => update({ id: user.id, body }).unwrap(), {
        setError: form.setError,
        codeFields: {
          PHONE_TAKEN: "phone",
          CANNOT_CHANGE_OWN_ROLE: "role",
          CANNOT_CHANGE_OWNER_ROLE: "role",
        },
      });
      if (!ok) return fail();
    }
    if (dirtyFields.projectIds && !isOwner) {
      const ok = await run(
        () => setProjects({ id: user.id, body: { projectIds: values.projectIds } }).unwrap(),
        {
          setError: form.setError,
          codeFields: { INVALID_PROJECT: "projectIds" },
        },
      );
      if (!ok) return fail();
    }
    // A new account type resets the roles on the server, so roles + overrides are sent again.
    const accountChanged = "role" in body;
    if (!lockedRoles && (rolesChanged || accountChanged)) {
      const ok = await run(() => setRoles({ userId: user.id, body: { roleIds: sel.selected } }).unwrap());
      if (!ok) return;
    }
    if (!lockedRoles && (rolesChanged || overridesChanged || accountChanged) && perms) {
      const notes = new Map(perms.overrides.map((o) => [`${o.key}:${o.effect}`, o.note]));
      const overrides = sel.diff.overrides.map((o) => {
        const note = notes.get(`${o.key}:${o.effect}`);
        return note ? { ...o, note } : o;
      });
      const ok = await run(() => setOverrides({ userId: user.id, body: { overrides } }).unwrap());
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
          const balance = isApiError(error)
            ? (error.details as { balancePaisa?: string } | undefined)?.balancePaisa
            : undefined;
          setBlocked(
            t("teamCompany.edit.holdsCash", {
              name: user.name,
              amount: balance ? formatPKR(balance) : t("teamCompany.edit.siteCash"),
            }),
          );
          setConfirm(null);
          return true;
        },
      });
      if (ok) setConfirm(null);
    } else if (confirm === "reactivate") {
      const ok = await run(() => reactivate(user.id).unwrap(), {
        success: t("teamCompany.edit.reactivated", { name: user.name }),
      });
      if (ok) setConfirm(null);
    }
  };

  return (
    <WideModal
      open
      onOpenChange={(o) => !o && onDone()}
      title={user.name}
      description={formatPhone(user.phone)}
      busy={busy}
      testId="member-modal"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" className="me-auto" onClick={onDone} disabled={busy}>
            {t("common.cancel")}
          </Button>
          {!isOwner ? <StepButtons tab={tab} setTab={setTab} disabled={busy} /> : null}
          {!readOnly ? (
            <Button type="submit" form={EDIT_FORM} disabled={busy || !dirty}>
              {t("common.saveChanges")}
            </Button>
          ) : null}
        </div>
      }
    >
      <Form form={form} onSubmit={onSubmit} onInvalid={() => setTab("details")} id={EDIT_FORM}>
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-5">
          <FormTabsList
            tabs={[
              { value: "details", label: t("roles.tabDetails"), error: hasErrors(form.formState.errors) },
              { value: "roles", label: t("roles.tabRoles") },
              ...(isOwner ? [] : [{ value: "custom", label: t("roles.tabCustom") }]),
            ]}
          />
          <TabsContent value="details" forceMount className={TAB_CONTENT_CLASS}>
            <InfoList
              items={[
                { label: t("field.status"), value: <StatusBadge domain="user" value={user.status} /> },
                { label: t("field.role"), value: <RoleBadge role={user.role} /> },
                {
                  label: t("teamCompany.edit.lastActive"),
                  value: formatRelative(user.lastActiveAt, t("teamCompany.edit.never")),
                },
                {
                  label: t("teamCompany.edit.lastSignIn"),
                  value: formatDateTime(user.lastLoginAt, t("teamCompany.edit.never")),
                },
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
            <FieldGrid>
              <TextField name="name" label={t("field.name")} required disabled={readOnly} />
              <PhoneField name="phone" label={t("field.phone")} required disabled={readOnly} />
            </FieldGrid>
            {!isOwner && !isSelf ? <AccountTypeField decided={decided} disabled={readOnly} /> : null}
            {user.role === "MUNSHI" && account === "PM" ? (
              <InlineAlert tone="warning">{t("teamCompany.edit.munshiToPm")}</InlineAlert>
            ) : null}
            {!isOwner ? (
              <ComboboxField
                name="projectIds"
                label={t("field.projects")}
                multiple
                options={options}
                loading={loadingProjects}
                hint={t("teamCompany.edit.projectsHint")}
                disabled={readOnly}
              />
            ) : null}
            {user.role === "MUNSHI" && !inactive && !readOnly ? (
              <MunshiSignIn userId={user.id} name={user.name} />
            ) : null}
            {!isSelf && !isOwner && !readOnly ? (
              <section className="space-y-3 rounded-xl border border-danger/30 p-4">
                <p className="text-sm font-semibold text-danger">{t("teamCompany.edit.dangerZone")}</p>
                {inactive ? (
                  <Button type="button" variant="outline" onClick={() => setConfirm("reactivate")}>
                    <UserCheck data-icon="inline-start" />
                    {t("teamCompany.edit.reactivateMember")}
                  </Button>
                ) : (
                  <Button type="button" variant="destructive-soft" onClick={() => setConfirm("deactivate")}>
                    <UserX data-icon="inline-start" />
                    {t("teamCompany.edit.deactivateMember")}
                  </Button>
                )}
              </section>
            ) : null}
          </TabsContent>
          <TabsContent value="roles" forceMount className={TAB_CONTENT_CLASS}>
            {isOwner ? (
              <p className="text-sm text-muted-foreground">{t("roles.ownerAll")}</p>
            ) : !perms || !roles || !catalog ? (
              <CardsSkeleton count={3} height="h-16" />
            ) : (
              <>
                {isSelf ? <InlineAlert tone="info">{t("roles.selfNote")}</InlineAlert> : null}
                <p className="text-sm text-muted-foreground">{t("roles.rolesHint")}</p>
                {!sel.selected.length && !lockedRoles ? (
                  <InlineAlert tone="danger">{t("roles.chooseRole")}</InlineAlert>
                ) : null}
                <RoleGrid
                  roles={roles}
                  catalog={catalog}
                  selected={sel.selected}
                  onChange={sel.changeRoles}
                  disabled={lockedRoles}
                  fixedAccount={isSelf ? (user.role as AccountType) : undefined}
                />
              </>
            )}
          </TabsContent>
          {!isOwner ? (
            <TabsContent value="custom" forceMount className={TAB_CONTENT_CLASS}>
              {perms && roles && catalog ? (
                <CustomPermissions
                  catalog={catalog}
                  base={sel.base}
                  ticked={sel.ticked}
                  onChange={sel.setTicked}
                  roleNames={sel.roles.map((r) => roleName(r, language))}
                  disabled={lockedRoles}
                />
              ) : null}
            </TabsContent>
          ) : null}
        </Tabs>
      </Form>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        tone={confirm === "reactivate" ? "default" : "danger"}
        title={
          confirm === "reactivate"
            ? t("teamCompany.edit.reactivateTitle", { name: user.name })
            : t("teamCompany.edit.deactivateTitle", { name: user.name })
        }
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
    </WideModal>
  );
}

/** Edit member: Details (profile, account type, projects, sign-in help, (de)activation) | Roles. */
export function EditMemberModal({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const t = useT();
  const user = useGetUserQuery(userId ?? "", { skip: !userId });
  const owner = user.data?.role === "THEKEDAR";
  const perms = useGetUserPermissionsQuery(userId ?? "", { skip: !userId || !user.data || owner });
  const roles = useGetRolesQuery(undefined, { skip: !userId || owner });
  const catalog = useGetPermissionCatalogQuery(undefined, { skip: !userId || owner });
  const error = user.error ?? perms.error ?? roles.error ?? catalog.error;
  if (userId && user.data && !error && (owner || perms.data)) {
    return (
      <EditMemberForm
        // Re-mount when the server state changes (after a save).
        key={`${user.data.id}:${perms.data ? JSON.stringify([perms.data.roles, perms.data.overrides]) : "-"}`}
        user={user.data}
        perms={perms.data}
        roles={roles.data}
        catalog={catalog.data}
        onDone={onClose}
      />
    );
  }
  return (
    <WideModal
      open={Boolean(userId)}
      onOpenChange={(o) => !o && onClose()}
      title={user.data?.name ?? t("teamCompany.edit.member")}
      testId="member-modal"
    >
      {error ? (
        <ErrorState error={error} onRetry={() => void user.refetch()} compact />
      ) : (
        <CardsSkeleton count={2} height="h-32" />
      )}
    </WideModal>
  );
}
