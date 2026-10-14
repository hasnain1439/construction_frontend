"use client";

import { Lock } from "lucide-react";
import { useId, useMemo } from "react";
import type { CatalogPermission, PermissionCatalog, PermissionRole } from "@/api/types";
import { InlineAlert } from "@/components/common/InlineAlert";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import { roleName, type GrantMap } from "@/lib/permissionCatalog";
import {
  canGive,
  canGiveRole,
  diffGrants,
  fitsWith,
  orderRoles,
  roleKind,
  type AccountType,
} from "@/lib/rolePermissions";
import { useMe } from "@/store/hooks";
import { PermissionMatrix } from "./PermissionMatrix";

function RoleCard({
  role,
  checked,
  disabled,
  reason,
  onChange,
}: {
  role: PermissionRole;
  checked: boolean;
  disabled: boolean;
  reason?: string;
  onChange: (on: boolean) => void;
}) {
  const t = useT();
  const language = useLanguage();
  const id = useId();
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-2xl border bg-card p-3 transition-colors",
        checked && "border-primary/50 bg-primary/5",
        disabled && !checked && "opacity-60",
      )}
      data-role={role.key}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-0.5"
      />
      <label htmlFor={id} className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-sm font-medium">
          <bdi>{roleName(role, language)}</bdi>
          {role.isSystem ? null : (
            <span className="ms-1.5 rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
              {t("roles.custom")}
            </span>
          )}
        </span>
        <span className="block text-xs text-muted-foreground">
          {t(`roles.kind.${roleKind(role)}`)} · {t("roles.permissionsCount", { n: role.permissions.length })}
        </span>
        {reason ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="size-3" aria-hidden />
            {reason}
          </span>
        ) : null}
      </label>
    </li>
  );
}

/**
 * Every role as a checkbox card (3 columns, 2 on tablets, 1 on phones): Administrator first, then
 * the other templates, then the company's custom roles. Several may be ticked; office and site
 * roles can't be mixed, and roles beyond the manager's own permissions are disabled.
 */
export function RoleGrid({
  roles,
  catalog,
  selected,
  onChange,
  fixedAccount,
  disabled,
}: {
  roles: PermissionRole[];
  catalog: PermissionCatalog;
  selected: string[];
  onChange: (next: string[]) => void;
  /** Edit member, account type can't follow the roles (e.g. own account): only fitting roles. */
  fixedAccount?: AccountType;
  disabled?: boolean;
}) {
  const t = useT();
  const me = useMe();
  const ordered = useMemo(() => orderRoles(roles, catalog), [roles, catalog]);
  const ticked = ordered.filter((r) => selected.includes(r.id));
  const blockedByMix = ordered.some((r) => !selected.includes(r.id) && !fitsWith(r, ticked, fixedAccount));
  return (
    <div className="space-y-3">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="role-grid">
        {ordered.map((role) => {
          const checked = selected.includes(role.id);
          const mine = canGiveRole(me, role, catalog);
          const fits = fitsWith(
            role,
            ticked.filter((r) => r.id !== role.id),
            fixedAccount,
          );
          return (
            <RoleCard
              key={role.id}
              role={role}
              checked={checked}
              disabled={Boolean(disabled) || (!checked && (!mine || !fits))}
              reason={!mine ? t("roles.notYours") : !fits && !checked ? t("roles.mixBlocked") : undefined}
              onChange={(on) =>
                onChange(
                  on
                    ? ordered.filter((r) => r.id === role.id || selected.includes(r.id)).map((r) => r.id)
                    : selected.filter((id) => id !== role.id),
                )
              }
            />
          );
        })}
      </ul>
      {blockedByMix ? <InlineAlert tone="info">{t("roles.mixNote")}</InlineAlert> : null}
    </div>
  );
}

/**
 * Custom permissions tab: every permission as a checkbox, pre-ticked from the union of the ticked
 * roles ("from role" hint). Ticking a key the roles don't give = ALLOW override, unticking one
 * they give = DENY; hand-made changes are highlighted and summed up at the top.
 */
export function CustomPermissions({
  catalog,
  base,
  ticked,
  onChange,
  roleNames,
  disabled,
}: {
  catalog: PermissionCatalog;
  /** Union of the ticked roles. */
  base: GrantMap;
  ticked: GrantMap;
  onChange: (next: GrantMap) => void;
  roleNames: string[];
  disabled?: boolean;
}) {
  const t = useT();
  const me = useMe();
  const diff = diffGrants(base, ticked, catalog);
  const roles = roleNames.join(" + ");
  const summary = !roleNames.length
    ? t("roles.noRoleTicked")
    : diff.overrides.length
      ? t("roles.diffSummary", { added: diff.added.length, removed: diff.removed.length, role: roles }) +
        (diff.changed.length ? ` · ${t("roles.diffChanged", { n: diff.changed.length })}` : "")
      : t("roles.diffNone", { role: roles });
  const isLocked = (p: CatalogPermission) => !canGive(me, p);
  return (
    <div className="space-y-4" data-testid="custom-permissions">
      <div className="space-y-1 rounded-2xl border bg-muted/40 px-4 py-3">
        <p className="tabular text-sm font-semibold" data-testid="permission-diff-summary" aria-live="polite">
          {summary}
        </p>
        <p className="text-xs text-muted-foreground">{t("roles.overridesDesc")}</p>
      </div>
      <PermissionMatrix
        catalog={catalog}
        value={ticked}
        onChange={onChange}
        readOnly={disabled}
        baseline={base}
        isLocked={isLocked}
        includeFields
      />
    </div>
  );
}
