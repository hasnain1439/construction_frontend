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
  FIELD_MODULE,
} from "@/lib/permissionCatalog";

const SCOPES: PermissionScope[] = ["ASSIGNED_PROJECTS", "ALL_PROJECTS"];

export interface PermissionMatrixProps {
  catalog: Pick<PermissionCatalog, "modules" | "permissions">;
  value: GrantMap;
  onChange: (next: GrantMap) => void;
  readOnly?: boolean;
}

export interface PermissionGridProps extends PermissionMatrixProps {
  /** Grants of the member's roles: those keys get a "from role", hand-made changes are highlighted. */
  baseline?: GrantMap;
  /** Keys this person may not change (shown disabled). Owner-only keys are always disabled. */
  isLocked?: (permission: CatalogPermission) => boolean;
  /** Also show data visibility (fields.*) as a checkbox section (member custom permissions). */
  includeFields?: boolean;
}

/** How a key compares with the baseline (the roles). */
function diffOf(p: CatalogPermission, value: GrantMap, baseline: GrantMap | undefined): Diff | undefined {
  if (!baseline || p.ownerOnly) return undefined;
  const b = baseline[p.key];
  const v = value[p.key];
  if (v && !b) return "added";
  if (b && !v) return "removed";
  if (
    b &&
    v &&
    ((p.scoped && (b.scope ?? "ASSIGNED_PROJECTS") !== (v.scope ?? "ASSIGNED_PROJECTS")) ||
      (p.limit && (b.maxAmountPaisa ?? null) !== (v.maxAmountPaisa ?? null)))
  )
    return "changed";
  return undefined;
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

/** How a key differs from the role it is compared with (checklist only). */
type Diff = "added" | "removed" | "changed";

function PermissionCell({
  permission,
  grant,
  onToggle,
  onGrantChange,
  readOnly,
  locked,
  diff,
  controls = true,
  fromRole,
}: {
  permission: CatalogPermission;
  grant: GrantDraft | undefined;
  onToggle: (on: boolean) => void;
  onGrantChange: (grant: GrantDraft) => void;
  readOnly?: boolean;
  /** Can't be changed by this person (e.g. they don't hold it themselves). */
  locked?: boolean;
  diff?: Diff;
  /** Scope / limit right under the checkbox (checklist); the matrix shows them under the grid. */
  controls?: boolean;
  /** A ticked key the member's roles give (shown with a subtle hint). */
  fromRole?: boolean;
}) {
  const t = useT();
  const language = useLanguage();
  const id = useId();
  const label = catalogLabel(permission.label, language);
  const checked = Boolean(grant);
  const disabled = readOnly || locked;
  return (
    <li
      className={cn(
        "space-y-1.5",
        diff && "-mx-1.5 rounded-lg px-1.5 py-0.5",
        diff === "added" && "bg-success-soft",
        diff === "changed" && "bg-warning-soft",
        diff === "removed" && "bg-danger-soft",
      )}
      data-permission={permission.key}
      data-diff={diff}
      data-from-role={fromRole && !diff ? "" : undefined}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled || permission.ownerOnly}
          onCheckedChange={(v) => onToggle(v === true)}
          className="mt-0.5"
        />
        <label
          htmlFor={id}
          className={cn(
            "min-w-0 text-[13px] leading-5",
            (permission.ownerOnly || locked) && "text-muted-foreground",
            diff === "removed" && "text-danger line-through",
          )}
          title={language === "en" ? permission.description : undefined}
        >
          {label}
          {diff && diff !== "removed" ? (
            <span className="ms-1.5 rounded-full bg-success-soft px-1.5 text-[11px] text-success">
              {t(diff === "added" ? "roles.diff.added" : "roles.diff.changed")}
            </span>
          ) : null}
          {fromRole && !diff ? (
            <span className="ms-1.5 text-[11px] text-muted-foreground">· {t("roles.fromRole")}</span>
          ) : null}
          {locked && !permission.ownerOnly ? (
            <span className="ms-1.5 inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
              <Lock className="size-3" aria-hidden />
              {t("roles.notYours")}
            </span>
          ) : null}
          {permission.ownerOnly ? (
            <span className="ms-1.5 inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
              <Lock className="size-3" aria-hidden />
              {t("roles.ownerOnly")}
            </span>
          ) : null}
        </label>
      </div>
      {controls && checked && permission.scoped ? (
        <div className="ps-6">
          <ScopeSelect
            value={grant!.scope ?? "ASSIGNED_PROJECTS"}
            onChange={(scope) => onGrantChange({ ...grant!, scope })}
            label={t("roles.scopeFor", { name: label })}
            disabled={disabled}
          />
        </div>
      ) : null}
      {controls && checked && permission.limit ? (
        <div className="ps-6">
          <MoneyInput
            value={grant!.maxAmountPaisa}
            onChange={(paisa) =>
              onGrantChange({ ...grant!, maxAmountPaisa: paisa && paisa !== "0" ? paisa : null })
            }
            placeholder={t("roles.noLimit")}
            aria-label={t("roles.limitFor", { name: label })}
            disabled={disabled}
            className="[&_input]:h-7 [&_input]:text-xs"
          />
        </div>
      ) : null}
    </li>
  );
}

/** Scope select + approval limit of one ticked key, as a small inline row under a module grid. */
function GrantControls({
  permission,
  grant,
  onGrantChange,
  disabled,
}: {
  permission: CatalogPermission;
  grant: GrantDraft;
  onGrantChange: (grant: GrantDraft) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const language = useLanguage();
  const label = catalogLabel(permission.label, language);
  return (
    <li
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs"
      data-permission-controls={permission.key}
    >
      <span className="min-w-0 flex-1 basis-40 text-muted-foreground">{label}</span>
      {permission.scoped ? (
        <div className="w-40">
          <ScopeSelect
            value={grant.scope ?? "ASSIGNED_PROJECTS"}
            onChange={(scope) => onGrantChange({ ...grant, scope })}
            label={t("roles.scopeFor", { name: label })}
            disabled={disabled}
          />
        </div>
      ) : null}
      {permission.limit ? (
        <div className="w-40">
          <MoneyInput
            value={grant.maxAmountPaisa}
            onChange={(paisa) =>
              onGrantChange({ ...grant, maxAmountPaisa: paisa && paisa !== "0" ? paisa : null })
            }
            placeholder={t("roles.noLimit")}
            aria-label={t("roles.limitFor", { name: label })}
            disabled={disabled}
            className="[&_input]:h-7 [&_input]:text-xs"
          />
        </div>
      ) : null}
    </li>
  );
}

function SelectAll({
  label,
  keys,
  value,
  catalog,
  onChange,
  readOnly,
  strong,
}: {
  label: string;
  keys: CatalogPermission[];
  value: GrantMap;
  catalog: Pick<PermissionCatalog, "permissions">;
  onChange: (next: GrantMap) => void;
  readOnly?: boolean;
  strong?: boolean;
}) {
  const id = useId();
  const held = keys.filter((p) => value[p.key]).length;
  const state = held === 0 ? false : held === keys.length ? true : "indeterminate";
  const toggle = (on: boolean) => {
    let next = value;
    for (const p of keys) next = withGrant(next, p, on);
    onChange(next);
  };
  void catalog;
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={state}
        disabled={readOnly || !keys.length}
        onCheckedChange={(v) => toggle(v === true)}
        aria-label={label}
      />
      <label htmlFor={id} className={cn("text-sm", strong ? "font-semibold" : "text-muted-foreground")}>
        {label}
      </label>
      <span className="tabular text-xs text-muted-foreground">
        {held}/{keys.length}
      </span>
    </div>
  );
}

/**
 * The role editor's permissions: a "Select all" checkbox, then one section per module (heading,
 * its own select-all, the keys as checkboxes in a 3-column grid — 2 on tablets, 1 on phones) and,
 * under the grid, small scope / approval-limit controls for the ticked keys that have them.
 * Owner-only keys are shown, disabled. Data visibility (fields.*) is `FieldVisibility`.
 */
export function PermissionMatrix({
  catalog,
  value,
  onChange,
  readOnly,
  baseline,
  isLocked,
  includeFields,
}: PermissionGridProps) {
  const t = useT();
  const language = useLanguage();
  const sections = useMemo(() => {
    const rows = buildMatrix(catalog).map((row) => ({
      module: row.module,
      label: row.label,
      items: ACTIONS.flatMap((a) => row.cells[a]),
    }));
    const fields = catalog.modules.find((m) => m.key === FIELD_MODULE);
    if (includeFields && fields)
      rows.push({ module: fields.key, label: fields.label, items: fieldPermissions(catalog) });
    return rows;
  }, [catalog, includeFields]);
  const locked = (p: CatalogPermission) => Boolean(isLocked?.(p));
  const grantable = useMemo(
    () => sections.flatMap((s) => s.items).filter((p) => !p.ownerOnly && !isLocked?.(p)),
    [sections, isLocked],
  );
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
    <div className="space-y-4" data-testid="permission-matrix">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/50 px-4 py-3">
        <SelectAll
          label={t("roles.selectAll")}
          keys={grantable}
          value={value}
          catalog={catalog}
          onChange={onChange}
          readOnly={readOnly}
          strong
        />
        {scopedHeld.length ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
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
      </div>
      {sections.map((row) => {
        const name = catalogLabel(row.label, language);
        const items = row.items;
        const controls = items.filter((p) => (p.scoped || p.limit) && value[p.key]);
        const changes = items.filter((p) => diffOf(p, value, baseline)).length;
        return (
          <section key={row.module} className="space-y-3 rounded-2xl border p-4" data-module={row.module}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                {name}
                {changes ? (
                  <span className="rounded-full bg-warning-soft px-1.5 text-[11px] font-normal text-warning">
                    {t("roles.changedCount", { n: changes })}
                  </span>
                ) : null}
              </h4>
              <SelectAll
                label={t("roles.selectRow", { name })}
                keys={items.filter((p) => !p.ownerOnly && !locked(p))}
                value={value}
                catalog={catalog}
                onChange={onChange}
                readOnly={readOnly}
              />
            </div>
            <ul className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((permission) => (
                <PermissionCell
                  key={permission.key}
                  permission={permission}
                  grant={value[permission.key]}
                  readOnly={readOnly}
                  controls={false}
                  locked={!permission.ownerOnly && locked(permission)}
                  diff={diffOf(permission, value, baseline)}
                  fromRole={Boolean(baseline?.[permission.key] && value[permission.key])}
                  onToggle={(on) => onChange(withGrant(value, permission, on))}
                  onGrantChange={(grant) => onChange({ ...value, [permission.key]: grant })}
                />
              ))}
            </ul>
            {controls.length ? (
              <ul className="space-y-2 border-t pt-3">
                {controls.map((permission) => (
                  <GrantControls
                    key={permission.key}
                    permission={permission}
                    grant={value[permission.key]!}
                    disabled={readOnly || locked(permission)}
                    onGrantChange={(grant) => onChange({ ...value, [permission.key]: grant })}
                  />
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
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
