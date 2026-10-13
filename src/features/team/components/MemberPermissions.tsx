"use client";

import { Banknote, Plus, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useGetPermissionCatalogQuery,
  useGetRolesQuery,
  useGetUserPermissionsQuery,
  useSetUserOverridesMutation,
  useSetUserRoleMutation,
} from "@/api/services/permissions.api";
import type {
  CatalogPermission,
  PermissionCatalog,
  PermissionOverride,
  PermissionScope,
  TeamUserDetail,
  UserPermissions,
} from "@/api/types";
import { ErrorState } from "@/components/common/ErrorState";
import { InlineAlert } from "@/components/common/InlineAlert";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CardsSkeleton } from "@/components/common/TableSkeleton";
import { Combobox } from "@/components/forms/ComboboxField";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutationToast } from "@/hooks/useMutationToast";
import { useLanguage, useT } from "@/i18n/useT";
import { formatPKR } from "@/lib/money";
import { catalogLabel, roleName, rolesForAccount } from "@/lib/permissionCatalog";
import type { UiLanguage } from "@/store/slices/uiSlice";

type Effect = PermissionOverride["effect"];
type OverrideDraft = Pick<PermissionOverride, "key" | "effect" | "scope" | "maxAmountPaisa" | "note">;

const toDraft = (o: PermissionOverride): OverrideDraft => ({
  key: o.key,
  effect: o.effect,
  scope: o.scope,
  maxAmountPaisa: o.maxAmountPaisa,
  note: o.note,
});
const sameOverrides = (a: OverrideDraft[], b: OverrideDraft[]) => JSON.stringify(a) === JSON.stringify(b);

function overridesBody(list: OverrideDraft[], byKey: Map<string, CatalogPermission>) {
  return list.map((o) => {
    const p = byKey.get(o.key);
    const allow = o.effect === "ALLOW";
    return {
      key: o.key,
      effect: o.effect,
      ...(allow && p?.scoped ? { scope: o.scope ?? "ASSIGNED_PROJECTS" } : {}),
      ...(allow && p?.limit && o.maxAmountPaisa ? { maxAmountPaisa: o.maxAmountPaisa } : {}),
      ...(o.note ? { note: o.note } : {}),
    };
  });
}

/** Module label of a key, for grouping the preview. */
function moduleLabel(catalog: PermissionCatalog, module: string, language: UiLanguage) {
  const m = catalog.modules.find((x) => x.key === module);
  return m ? catalogLabel(m.label, language) : module;
}

// ─── Role select ────────────────────────────────────────────────────────────

function RolePicker({
  user,
  data,
  disabled,
}: {
  user: TeamUserDetail;
  data: UserPermissions;
  disabled: boolean;
}) {
  const t = useT();
  const language = useLanguage();
  const roles = useGetRolesQuery();
  const [setRole, { isLoading }] = useSetUserRoleMutation();
  const run = useMutationToast();
  const options = rolesForAccount(roles.data ?? [], user.role);
  return (
    <div className="space-y-1.5">
      <Label htmlFor="member-permission-role">{t("roles.memberRole")}</Label>
      <Select
        value={data.role?.id ?? undefined}
        disabled={disabled || isLoading || roles.isLoading}
        onValueChange={(roleId) => {
          const role = options.find((r) => r.id === roleId);
          void run(() => setRole({ userId: user.id, body: { roleId } }).unwrap(), {
            success: t("roles.roleChanged", { name: user.name, role: role ? roleName(role, language) : "" }),
          });
        }}
      >
        <SelectTrigger id="member-permission-role" className="w-full">
          <SelectValue placeholder={data.role?.name ?? "—"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((role) => (
            <SelectItem key={role.id} value={role.id}>
              {roleName(role, language)}
              {role.isSystem ? null : (
                <span className="text-xs text-muted-foreground"> · {t("roles.custom")}</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{t("roles.memberRoleHint")}</p>
    </div>
  );
}

// ─── Overrides ──────────────────────────────────────────────────────────────

function OverridesEditor({
  user,
  data,
  catalog,
  disabled,
}: {
  user: TeamUserDetail;
  data: UserPermissions;
  catalog: PermissionCatalog;
  disabled: boolean;
}) {
  const t = useT();
  const language = useLanguage();
  const [save, { isLoading }] = useSetUserOverridesMutation();
  const run = useMutationToast();
  const base = useMemo(() => data.overrides.map(toDraft), [data.overrides]);
  const [draft, setDraft] = useState<OverrideDraft[] | null>(null);
  const list = draft ?? base;
  const dirty = draft !== null && !sameOverrides(draft, base);
  const [pick, setPick] = useState<string | null>(null);
  const [effect, setEffect] = useState<Effect>("ALLOW");
  const byKey = useMemo(() => new Map(catalog.permissions.map((p) => [p.key, p])), [catalog]);
  const fromRole = useMemo(
    () => new Set([...data.effective.filter((e) => e.source === "role").map((e) => e.key), ...data.denied]),
    [data],
  );
  const listed = new Set(list.map((o) => o.key));
  // Extra = keys the role doesn't give; Remove = keys the role gives. Owner-only keys never.
  const candidates = catalog.permissions.filter(
    (p) =>
      !p.ownerOnly && !listed.has(p.key) && (effect === "ALLOW" ? !fromRole.has(p.key) : fromRole.has(p.key)),
  );
  const options = candidates.map((p) => ({
    value: p.key,
    label: catalogLabel(p.label, language),
    description: moduleLabel(catalog, p.module, language),
  }));
  const label = (key: string) => (byKey.get(key) ? catalogLabel(byKey.get(key)!.label, language) : key);

  const update = (key: string, patch: Partial<OverrideDraft>) =>
    setDraft(list.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  const add = () => {
    if (!pick) return;
    const p = byKey.get(pick);
    setDraft([
      ...list,
      {
        key: pick,
        effect,
        scope: effect === "ALLOW" && p?.scoped ? "ASSIGNED_PROJECTS" : null,
        maxAmountPaisa: null,
        note: null,
      },
    ]);
    setPick(null);
  };
  const addFinancial = () => {
    const extra = catalog.financialBundle.filter((key) => !fromRole.has(key) && !listed.has(key));
    setDraft([
      ...list.filter((o) => !(o.effect === "DENY" && catalog.financialBundle.includes(o.key))),
      ...extra.map((key) => ({
        key,
        effect: "ALLOW" as const,
        scope: byKey.get(key)?.scoped ? ("ASSIGNED_PROJECTS" as const) : null,
        maxAmountPaisa: null,
        note: null,
      })),
    ]);
  };
  const submit = async () => {
    const saved = await run(
      () => save({ userId: user.id, body: { overrides: overridesBody(list, byKey) } }).unwrap(),
      {
        success: t("roles.overridesSaved", { name: user.name }),
      },
    );
    if (saved) setDraft(null);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <p className="text-sm font-semibold">{t("roles.overridesTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("roles.overridesDesc")}</p>
      </div>
      {list.length ? (
        <ul className="divide-y rounded-2xl border" data-testid="override-list">
          {list.map((o) => {
            const p = byKey.get(o.key);
            const name = label(o.key);
            return (
              <li key={o.key} className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <StatusBadge
                      tone={o.effect === "ALLOW" ? "success" : "danger"}
                      label={o.effect === "ALLOW" ? t("roles.allow") : t("roles.deny")}
                    />
                    <span className={o.effect === "DENY" ? "text-sm line-through" : "text-sm"}>{name}</span>
                  </div>
                  {!disabled ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 shrink-0"
                      aria-label={t("roles.removeOverride", { name })}
                      onClick={() => setDraft(list.filter((x) => x.key !== o.key))}
                    >
                      <X aria-hidden />
                    </Button>
                  ) : null}
                </div>
                {o.effect === "ALLOW" && (p?.scoped || p?.limit) ? (
                  <div className="grid gap-2 ps-1 sm:grid-cols-2">
                    {p?.scoped ? (
                      <Select
                        value={o.scope ?? "ASSIGNED_PROJECTS"}
                        onValueChange={(v) => update(o.key, { scope: v as PermissionScope })}
                        disabled={disabled}
                      >
                        <SelectTrigger
                          size="sm"
                          className="w-full"
                          aria-label={t("roles.scopeFor", { name })}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ASSIGNED_PROJECTS">
                            {t("roles.scope.ASSIGNED_PROJECTS")}
                          </SelectItem>
                          <SelectItem value="ALL_PROJECTS">{t("roles.scope.ALL_PROJECTS")}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : null}
                    {p?.limit ? (
                      <MoneyInput
                        value={o.maxAmountPaisa}
                        onChange={(paisa) =>
                          update(o.key, { maxAmountPaisa: paisa && paisa !== "0" ? paisa : null })
                        }
                        placeholder={t("roles.noLimit")}
                        aria-label={t("roles.limitFor", { name })}
                        disabled={disabled}
                        className="[&_input]:h-8"
                      />
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed p-3 text-sm text-muted-foreground">
          {t("roles.noOverrides")}
        </p>
      )}
      {!disabled ? (
        <div className="space-y-2 rounded-2xl bg-muted/50 p-3">
          <SegmentedControl
            size="sm"
            value={effect}
            onChange={(v) => {
              setEffect(v);
              setPick(null);
            }}
            ariaLabel={t("roles.overridesTitle")}
            options={[
              { value: "ALLOW", label: t("roles.giveExtra") },
              { value: "DENY", label: t("roles.takeAway") },
            ]}
          />
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <Combobox
                value={pick}
                onChange={(v) => setPick((v as string | null) ?? null)}
                options={options}
                placeholder={t("roles.pickPermission")}
                ariaLabel={t("roles.pickPermission")}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={add}
              disabled={!pick}
              aria-label={t("common.add")}
            >
              <Plus aria-hidden />
            </Button>
          </div>
          {user.role !== "MUNSHI" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addFinancial}
              title={t("roles.addFinancialHint")}
            >
              <Banknote data-icon="inline-start" />
              {t("roles.addFinancial")}
            </Button>
          ) : null}
        </div>
      ) : null}
      {dirty ? (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setDraft(null)} disabled={isLoading}>
            {t("roles.discard")}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={isLoading}>
            {t("roles.saveOverrides")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// ─── Effective preview ──────────────────────────────────────────────────────

export function EffectivePermissions({
  data,
  catalog,
}: {
  data: UserPermissions;
  catalog: PermissionCatalog;
}) {
  const t = useT();
  const language = useLanguage();
  const byKey = useMemo(() => new Map(catalog.permissions.map((p) => [p.key, p])), [catalog]);
  const groups = useMemo(() => {
    const out = new Map<string, UserPermissions["effective"]>();
    for (const e of data.effective) {
      const mod = byKey.get(e.key)?.module ?? e.key.split(".")[0]!;
      out.set(mod, [...(out.get(mod) ?? []), e]);
    }
    // Catalogue module order.
    return catalog.modules
      .filter((m) => out.has(m.key))
      .map((m) => ({ module: m.key, items: out.get(m.key)! }));
  }, [data.effective, byKey, catalog.modules]);
  const label = (key: string) => (byKey.get(key) ? catalogLabel(byKey.get(key)!.label, language) : key);

  return (
    <div className="space-y-3" data-testid="effective-permissions">
      <div className="space-y-0.5">
        <p className="text-sm font-semibold">{t("roles.effectiveTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("roles.effectiveDesc")}</p>
      </div>
      {groups.length ? (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.module} className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {moduleLabel(catalog, g.module, language)}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {g.items.map((e) => (
                  <li
                    key={e.key}
                    className={
                      e.source === "override"
                        ? "inline-flex items-center gap-1 rounded-full border border-success/40 bg-success-soft px-2 py-0.5 text-xs"
                        : "inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-xs"
                    }
                    title={t(`roles.source.${e.source}`)}
                  >
                    {label(e.key)}
                    {e.source === "override" ? (
                      <span className="font-semibold text-success">· {t("roles.source.override")}</span>
                    ) : null}
                    {e.scope === "ALL_PROJECTS" ? (
                      <span className="text-muted-foreground">· {t("roles.scope.ALL_PROJECTS")}</span>
                    ) : null}
                    {e.maxAmountPaisa ? (
                      <span className="text-muted-foreground">
                        · {t("roles.limitTag", { amount: formatPKR(e.maxAmountPaisa) })}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("roles.noneEffective")}</p>
      )}
      {data.denied.length ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            {t("roles.removedFromRole")}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {data.denied.map((key) => (
              <li
                key={key}
                className="rounded-full border border-danger/30 bg-danger-soft px-2 py-0.5 text-xs line-through"
              >
                {label(key)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ─── Section ────────────────────────────────────────────────────────────────

/**
 * Member slide-over → "Role & permissions": the role template, extra / removed permissions
 * (ALLOW / DENY overrides) and the effective permissions with their source.
 */
export function MemberPermissions({
  user,
  isSelf,
  readOnly,
}: {
  user: TeamUserDetail;
  isSelf: boolean;
  readOnly: boolean;
}) {
  const t = useT();
  const owner = user.role === "THEKEDAR";
  const perms = useGetUserPermissionsQuery(user.id, { skip: owner });
  const catalog = useGetPermissionCatalogQuery(undefined, { skip: owner });

  return (
    <section className="space-y-4 rounded-2xl border p-4" aria-labelledby="member-permissions-title">
      <h3 id="member-permissions-title" className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4 text-primary" aria-hidden />
        {t("roles.memberSection")}
      </h3>
      {owner ? (
        <p className="text-sm text-muted-foreground">{t("roles.ownerAll")}</p>
      ) : perms.error || catalog.error ? (
        <ErrorState error={perms.error ?? catalog.error} onRetry={() => void perms.refetch()} compact />
      ) : !perms.data || !catalog.data ? (
        <CardsSkeleton count={2} height="h-20" />
      ) : (
        <>
          {isSelf ? <InlineAlert tone="info">{t("roles.selfNote")}</InlineAlert> : null}
          <RolePicker user={user} data={perms.data} disabled={readOnly || isSelf} />
          <OverridesEditor
            key={JSON.stringify(perms.data.overrides)}
            user={user}
            data={perms.data}
            catalog={catalog.data}
            disabled={readOnly || isSelf}
          />
          <EffectivePermissions data={perms.data} catalog={catalog.data} />
        </>
      )}
    </section>
  );
}
