"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, X } from "lucide-react";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
import { useGetClientsQuery } from "@/api/services/clients.api";
import { useCreateProjectMutation, useSetTeamMutation, useUpdateBasicMutation } from "@/api/services/projects.api";
import { useGetUsersQuery } from "@/api/services/team.api";
import type { ProjectDetail } from "@/api/types";
import { useCan } from "@/components/common/PermissionGate";
import { SectionCard } from "@/components/common/SectionCard";
import { ComboboxField } from "@/components/forms/ComboboxField";
import { DateField } from "@/components/forms/DateField";
import { FieldGrid, Form, FormSection } from "@/components/forms/Form";
import { PhoneField } from "@/components/forms/PhoneInput";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/button";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useT } from "@/i18n/useT";
import { normaliseAnyPhone } from "@/lib/phone";
import { basicSchema } from "./schemas";
import { useReportForm, useWizard, WIZARD_FORM_ID } from "./WizardContext";

type Values = z.input<typeof basicSchema>;

const toValues = (p: ProjectDetail | null): Values => ({
  name: p?.name ?? "",
  code: p?.code ?? "",
  clientMode: "existing",
  clientId: p?.client?.id ?? "",
  newClientName: "",
  newClientPhone: "",
  siteAddress: p?.siteAddress ?? "",
  city: p?.city ?? "",
  startDate: p?.startDate ?? "",
  endDate: p?.endDate ?? "",
  pmId: p?.team.pm?.id ?? null,
  munshiIds: p?.team.munshis.map((m) => m.id) ?? [],
});

/** Typed form API for nested components. */
const useWizardForm = () => useFormContext<Values>();

function ClientPicker({ disabled }: { disabled: boolean }) {
  const t = useT();
  const mode = useWatch({ name: "clientMode" }) as Values["clientMode"];
  const clients = useGetClientsQuery({ limit: 100 });
  const options = (clients.data?.items ?? []).map((c) => ({ value: c.id, label: c.name, description: c.phone }));
  const { setValue } = useWizardForm();
  if (mode === "new") {
    return (
      <div className="space-y-3 rounded-xl border border-dashed p-4 sm:col-span-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{t("projects.basic.newClient")}</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setValue("clientMode", "existing", { shouldDirty: true })} disabled={disabled}>
            <X data-icon="inline-start" />
            {t("projects.basic.pickExisting")}
          </Button>
        </div>
        <FieldGrid>
          <TextField name="newClientName" label={t("projects.basic.clientName")} required disabled={disabled} />
          <PhoneField name="newClientPhone" label={t("projects.basic.clientPhone")} required allowLandline disabled={disabled} />
        </FieldGrid>
      </div>
    );
  }
  return (
    <ComboboxField
      name="clientId"
      label={t("field.client")}
      required
      options={options}
      loading={clients.isLoading}
      placeholder={t("projects.basic.searchClients")}
      createLabel={t("projects.basic.newClient")}
      onCreate={() => setValue("clientMode", "new", { shouldDirty: true })}
      disabled={disabled}
    />
  );
}


/** Tab 1 — creates the draft (POST /projects) or updates it (PATCH basic + PUT team). */
export function BasicTab() {
  const t = useT();
  const { projectId, project, locked, onSaved } = useWizard();
  // Picking the PM / munshis needs the team permission and the member list.
  const isOwner = useCan({ allPermissions: ["projects.team.manage", "team.member.view"] });
  const [create] = useCreateProjectMutation();
  const [updateBasic] = useUpdateBasicMutation();
  const [setTeam] = useSetTeamMutation();
  const run = useMutationToast();
  const pms = useGetUsersQuery({ role: "PM", status: "ACTIVE", limit: 100 }, { skip: !isOwner });
  const munshis = useGetUsersQuery({ role: "MUNSHI", status: "ACTIVE", limit: 100 }, { skip: !isOwner });
  const form = useForm<Values, unknown, z.output<typeof basicSchema>>({ resolver: zodResolver(basicSchema), values: toValues(project) });
  useReportForm(form);

  const codeFields = { PROJECT_CODE_TAKEN: "code", INVALID_DATES: "endDate", CLIENT_PHONE_TAKEN: "newClientPhone", INVALID_CLIENT: "clientId" };

  const onSubmit = async (v: z.output<typeof basicSchema>) => {
    const client =
      v.clientMode === "new"
        ? { newClient: { name: v.newClientName, phone: normaliseAnyPhone(v.newClientPhone) as string } }
        : { clientId: v.clientId };
    if (!projectId) {
      const created = await run(
        () =>
          create({
            name: v.name,
            ...(v.code ? { code: v.code } : {}),
            ...client,
            siteAddress: v.siteAddress,
            city: v.city,
            startDate: v.startDate,
            endDate: v.endDate,
            ...(isOwner && v.pmId ? { pmId: v.pmId } : {}),
            ...(isOwner && v.munshiIds[0] ? { munshiId: v.munshiIds[0] } : {}),
          }).unwrap(),
        { success: (p) => t("projects.basic.draftCreated", { code: p.code }), setError: form.setError, codeFields: { ...codeFields, INVALID_PM: "pmId", INVALID_MUNSHI: "munshiIds" } },
      );
      if (!created) return;
      if (isOwner && v.munshiIds.length > 1) {
        await run(() => setTeam({ id: created.id, body: { munshiIds: v.munshiIds } }).unwrap());
      }
      onSaved(created);
      return;
    }
    const dirty = form.formState.dirtyFields;
    const basicChanged = ["name", "code", "clientMode", "clientId", "newClientName", "newClientPhone", "siteAddress", "city", "startDate", "endDate"].some(
      (k) => dirty[k as keyof Values],
    );
    let saved: ProjectDetail | undefined = project ?? undefined;
    if (basicChanged || !project?.wizardCompletedSteps?.includes(1)) {
      saved = await run(
        () =>
          updateBasic({
            id: projectId,
            body: {
              name: v.name,
              ...(v.code ? { code: v.code } : {}),
              ...client,
              siteAddress: v.siteAddress,
              city: v.city,
              startDate: v.startDate,
              endDate: v.endDate,
            },
          }).unwrap(),
        { setError: form.setError, codeFields },
      );
      if (!saved) return;
    }
    if (isOwner && (dirty.pmId || dirty.munshiIds)) {
      saved = await run(() => setTeam({ id: projectId, body: { pmId: v.pmId, munshiIds: v.munshiIds } }).unwrap(), {
        setError: form.setError,
        codeFields: { INVALID_PM: "pmId", INVALID_MUNSHI: "munshiIds" },
      });
      if (!saved) return;
    }
    form.reset(toValues(saved ?? null));
    onSaved(saved);
  };

  return (
    <Form form={form} onSubmit={onSubmit} id={WIZARD_FORM_ID}>
      <SectionCard title={t("field.project")}>
        <div className="space-y-5">
          <FieldGrid columns={3}>
            <TextField name="name" label={t("projects.basic.projectName")} required placeholder={t("projects.basic.namePlaceholder")} className="lg:col-span-2" disabled={locked} />
            <TextField name="code" label={t("projects.basic.contractRef")} uppercase placeholder={t("projects.basic.codePlaceholder")} hint={projectId ? undefined : t("projects.basic.codeHint")} disabled={locked} />
          </FieldGrid>
          <FieldGrid>
            <ClientPicker disabled={locked} />
          </FieldGrid>
        </div>
      </SectionCard>
      <SectionCard title={t("projects.basic.siteDates")}>
        <div className="space-y-4">
          <FieldGrid columns={3}>
            <TextField name="siteAddress" label={t("projects.basic.siteAddress")} required className="lg:col-span-2" disabled={locked} />
            <TextField name="city" label={t("field.city")} required placeholder={t("projects.basic.cityPlaceholder")} disabled={locked} />
          </FieldGrid>
          <FieldGrid columns={3}>
            <DateField name="startDate" label={t("projects.basic.startDate")} required disabled={locked} />
            <DateField name="endDate" label={t("projects.basic.endDate")} required disabled={locked} />
          </FieldGrid>
        </div>
      </SectionCard>
      {isOwner ? (
        <SectionCard title={t("field.team")} description={t("projects.basic.teamDesc")}>
          <FormSection title={t("projects.basic.people")}>
            <FieldGrid>
              <SelectField
                name="pmId"
                label={t("field.projectManager")}
                options={(pms.data?.items ?? []).map((u) => ({ value: u.id, label: u.name }))}
                noneLabel={t("projects.list.noPmYet")}
                placeholder={t("projects.list.noPmYet")}
                disabled={locked && project?.status !== "CLOSEOUT"}
              />
              <ComboboxField
                name="munshiIds"
                label={t("field.munshi")}
                multiple
                options={(munshis.data?.items ?? []).map((u) => ({ value: u.id, label: u.name, description: u.phone }))}
                loading={munshis.isLoading}
                placeholder={t("projects.basic.chooseMunshis")}
                disabled={locked && project?.status !== "CLOSEOUT"}
              />
            </FieldGrid>
            {!(pms.data?.items.length || munshis.data?.items.length) && !pms.isLoading ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <UserPlus className="size-3.5" aria-hidden />
                {t("projects.basic.inviteHint")}
              </p>
            ) : null}
          </FormSection>
        </SectionCard>
      ) : null}
    </Form>
  );
}
