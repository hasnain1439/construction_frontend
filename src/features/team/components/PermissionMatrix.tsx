"use client";

import { Lock } from "lucide-react";
import { useId, useMemo } from "react";
import type { CatalogPermission, PermissionCatalog, PermissionScope } from "@/api/types";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLanguage, useT } from "@/i18n/useT";
import { cn } from "@/lib/cn";
import {
  ACTIONS,
  buildMatrix,
  catalogLabel,
  defaultGrant,
  fieldPermissions,
  type GrantDraft,
  type GrantMap,
  type MatrixRow,
} from "@/lib/permissionCatalog";

const SCOPES: PermissionScope[] = ["ASSIGNED_PROJECTS", "ALL_PROJECTS"];

export interface PermissionMatrixProps {
  catalog: Pick<PermissionCatalog, "modules" | "permissions">;
  value: GrantMap;
  onChange: (next: GrantMap) => void;
  readOnly?: boolean;
}

function withGrant(value: GrantMap, permission: CatalogPermission, on: boolean): GrantMap {
  const next = { ...value };
  if (on) next[permission.key] = value[permission.key] ?? defaultGrant(permission);
  else delete next[permission.key];
  return next;
}

function ScopeSelect({
  value,
  onChange,
  label,
  disabled,
}: {
  value: PermissionScope;
  onChange: (scope: PermissionScope) => void;
  label: string;
  disabled?: boolean;
}) {
  const t = useT();
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PermissionScope)} disabled={disabled}>
      <SelectTrigger size="sm" className="h-7 w-full text-xs" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SCOPES.map((scope) => (
          <SelectItem key={scope} value={scope}>
            {t(`roles.scope.${scope}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PermissionCell({
  permission,
  grant,
  onToggle,
  onGrantChange,
  readOnly,
}: {
  permission: CatalogPermission;
  grant: GrantDraft | undefined;
  onToggle: (on: boolean) => void;
  onGrantChange: (grant: GrantDraft) => void;
  readOnly?: boolean;
}) {
  const t = useT();
  const language = useLanguage();
  const id = useId();
  const label = catalogLabel(permission.label, language);
  const checked = Boolean(grant);
  return (
    <li className="space-y-1.5" data-permission={permission.key}>
      <div className="flex items-start gap-2">
        <Checkbox
          id={id}
          checked={checked}
          disabled={readOnly || permission.ownerOnly}
          onCheckedChange={(v) => onToggle(v === true)}
          className="mt-0.5"
        />
        <label
          htmlFor={id}
          className={cn("min-w-0 text-[13px] leading-5", permission.ownerOnly && "text-muted-foreground")}
          title={language === "en" ? permission.description : undefined}
        >
          {label}
          {permission.ownerOnly ? (
            <span className="ms-1.5 inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
              <Lock className="size-3" aria-hidden />
              {t("roles.ownerOnly")}
            </span>
          ) : null}
        </label>
      </div>
      {checked && permission.scoped ? (
        <div className="ps-6">
          <ScopeSelect
            value={grant!.scope ?? "ASSIGNED_PROJECTS"}
            onChange={(scope) => onGrantChange({ ...grant!, scope })}
            label={t("roles.scopeFor", { name: label })}
            disabled={readOnly}
          />
        </div>
      ) : null}
      {checked && permission.limit ? (
        <div className="ps-6">
          <MoneyInput
            value={grant!.maxAmountPaisa}
            onChange={(paisa) =>
              onGrantChange({ ...grant!, maxAmountPaisa: paisa && paisa !== "0" ? paisa : null })
            }
            placeholder={t("roles.noLimit")}
            aria-label={t("roles.limitFor", { name: label })}
            disabled={readOnly}
            className="[&_input]:h-7 [&_input]:text-xs"
          />
        </div>
      ) : null}
    </li>
  );
}

function RowToggle({
  row,
  value,
  onChange,
  readOnly,
}: {
  row: MatrixRow;
  value: GrantMap;
  onChange: (next: GrantMap) => void;
  readOnly?: boolean;
}) {
  const t = useT();
  const language = useLanguage();
  const id = useId();
  const held = row.grantable.filter((key) => value[key]).length;
  const all = held === row.grantable.length && held > 0;
  const name = catalogLabel(row.label, language);
  const toggle = (on: boolean) => {
    let next = value;
    for (const action of ACTIONS)
      for (const p of row.cells[action]) if (!p.ownerOnly) next = withGrant(next, p, on);
    onChange(next);
  };
  return (
    <div className="space-y-1">
      <p className="font-semibold">{name}</p>
      {row.grantable.length ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            id={id}
            checked={all}
            disabled={readOnly}
            onCheckedChange={(v) => toggle(v === true)}
            aria-label={t("roles.selectRow", { name })}
          />
          <label htmlFor={id} className="tabular">
            {held}/{row.grantable.length}
          </label>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The role editor's grid: modules as rows, actions (view / create / edit / approve / manage) as
 * columns. A cell lists the keys of that module + action as checkboxes; a ticked key gets a
 * project scope select when it is `scoped` and an approval limit when it has a `limit`.
 * Owner-only keys are shown, disabled. Field (data visibility) keys are in `FieldVisibility`.
 */
export function PermissionMatrix({ catalog, value, onChange, readOnly }: PermissionMatrixProps) {
  const t = useT();
  const rows = useMemo(() => buildMatrix(catalog), [catalog]);
  const scopedHeld = useMemo(
    () =>
      catalog.permissions
        .filter((p) => p.scoped && value[p.key])
        .map((p) => value[p.key]!.scope ?? "ASSIGNED_PROJECTS"),
    [catalog, value],
  );
  const commonScope =
    scopedHeld.length && scopedHeld.every((s) => s === scopedHeld[0]) ? scopedHeld[0] : undefined;
  const setAllScopes = (scope: PermissionScope) => {
    const next = { ...value };
    for (const p of catalog.permissions)
      if (p.scoped && next[p.key]) next[p.key] = { ...next[p.key]!, scope };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {scopedHeld.length ? (
        <div className="flex flex-wrap items-center gap-2 px-6 text-sm">
          <span className="text-muted-foreground">{t("roles.setAllScopes")}</span>
          <SegmentedControl
            size="sm"
            value={commonScope}
            onChange={setAllScopes}
            disabled={readOnly}
            ariaLabel={t("roles.setAllScopes")}
            options={SCOPES.map((scope) => ({ value: scope, label: t(`roles.scope.${scope}`) }))}
          />
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-sm" data-testid="permission-matrix">
          <thead>
            <tr className="border-y bg-muted/40 text-xs text-muted-foreground uppercase">
              <th scope="col" className="w-44 px-4 py-2 text-start font-medium sm:ps-6">
                {t("roles.colArea")}
              </th>
              {ACTIONS.map((action) => (
                <th key={action} scope="col" className="px-3 py-2 text-start font-medium">
                  {t(`roles.action.${action}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.module} className="border-b align-top last:border-b-0" data-module={row.module}>
                <th scope="row" className="px-4 py-3 text-start font-normal sm:ps-6">
                  <RowToggle row={row} value={value} onChange={onChange} readOnly={readOnly} />
                </th>
                {ACTIONS.map((action) => (
                  <td key={action} className="px-3 py-3">
                    {row.cells[action].length ? (
                      <ul className="space-y-2.5">
                        {row.cells[action].map((permission) => (
                          <PermissionCell
                            key={permission.key}
                            permission={permission}
                            grant={value[permission.key]}
                            readOnly={readOnly}
                            onToggle={(on) => onChange(withGrant(value, permission, on))}
                            onGrantChange={(grant) => onChange({ ...value, [permission.key]: grant })}
                          />
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground" aria-hidden>
                        —
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Data-visibility toggles (`fields.rates / amounts / profit / contract`). */
export function FieldVisibility({ catalog, value, onChange, readOnly }: PermissionMatrixProps) {
  const language = useLanguage();
  const fields = useMemo(() => fieldPermissions(catalog), [catalog]);
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {fields.map((permission) => (
        <FieldToggle
          key={permission.key}
          fieldKey={permission.key}
          label={catalogLabel(permission.label, language)}
          // Descriptions are English only (catalogue); labels are translated.
          description={language === "en" ? permission.description : undefined}
          checked={Boolean(value[permission.key])}
          disabled={readOnly}
          onChange={(on) => onChange(withGrant(value, permission, on))}
        />
      ))}
    </ul>
  );
}

function FieldToggle({
  fieldKey,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  fieldKey: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) {
  const id = useId();
  return (
    <li
      className="flex items-start justify-between gap-3 rounded-2xl border bg-card p-3"
      data-field={fieldKey}
    >
      <label htmlFor={id} className="min-w-0 space-y-0.5">
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="block text-xs text-muted-foreground">{description}</span> : null}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </li>
  );
}
